import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Logger } from 'pino';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { FileProcessorService, FileMetadata } from '../services/file-processor';

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

interface FileRecord extends FileMetadata {
  userId?: string;
  taskId?: string;
  conversationId?: string;
  analysisResult?: any;
}

export function createFileRoutes(
  db: Pool,
  fileProcessor: FileProcessorService,
  logger: Logger
): Router {
  const router = Router();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  /**
   * POST /api/files/upload
   * Upload a file and store metadata in database
   */
  router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file provided' } });
      }

      const { userId, taskId, conversationId } = req.body;

      // Process file
      const metadata = await fileProcessor.processFile(req.file.buffer, req.file.originalname, {
        extractText: true,
        generateThumbnail: true,
      });

      // Store metadata in database
      const query = `
        INSERT INTO files (
          id, filename, original_name, mime_type, size, hash, path,
          thumbnail_path, extracted_text, width, height, user_id, task_id,
          conversation_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        metadata.id,
        metadata.filename,
        metadata.originalName,
        metadata.mimeType,
        metadata.size,
        metadata.hash,
        metadata.path,
        metadata.thumbnailPath,
        metadata.extractedText,
        metadata.width,
        metadata.height,
        userId || null,
        taskId || null,
        conversationId || null,
        metadata.createdAt,
      ];

      const result = await db.query(query, values);

      logger.info({ fileId: metadata.id, userId, taskId }, 'File uploaded successfully');

      res.status(201).json({
        data: {
          id: result.rows[0].id,
          filename: result.rows[0].original_name,
          mimeType: result.rows[0].mime_type,
          size: result.rows[0].size,
          url: `/api/files/${result.rows[0].id}`,
          thumbnailUrl: result.rows[0].thumbnail_path ? `/api/files/${result.rows[0].id}/thumbnail` : null,
          width: result.rows[0].width,
          height: result.rows[0].height,
          createdAt: result.rows[0].created_at,
        },
      });
    } catch (error: any) {
      logger.error({ error }, 'File upload failed');

      if (error.message.includes('Unsupported file type')) {
        return res.status(400).json({ error: { message: error.message } });
      }

      if (error.message.includes('File size exceeds')) {
        return res.status(413).json({ error: { message: error.message } });
      }

      res.status(500).json({ error: { message: 'File upload failed' } });
    }
  });

  /**
   * POST /api/files/upload-multiple
   * Upload multiple files
   */
  router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: { message: 'No files provided' } });
      }

      const { userId, taskId, conversationId } = req.body;
      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          const metadata = await fileProcessor.processFile(file.buffer, file.originalname, {
            extractText: true,
            generateThumbnail: true,
          });

          const query = `
            INSERT INTO files (
              id, filename, original_name, mime_type, size, hash, path,
              thumbnail_path, extracted_text, width, height, user_id, task_id,
              conversation_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
          `;

          const values = [
            metadata.id,
            metadata.filename,
            metadata.originalName,
            metadata.mimeType,
            metadata.size,
            metadata.hash,
            metadata.path,
            metadata.thumbnailPath,
            metadata.extractedText,
            metadata.width,
            metadata.height,
            userId || null,
            taskId || null,
            conversationId || null,
            metadata.createdAt,
          ];

          const result = await db.query(query, values);

          uploadedFiles.push({
            id: result.rows[0].id,
            filename: result.rows[0].original_name,
            mimeType: result.rows[0].mime_type,
            size: result.rows[0].size,
            url: `/api/files/${result.rows[0].id}`,
            thumbnailUrl: result.rows[0].thumbnail_path ? `/api/files/${result.rows[0].id}/thumbnail` : null,
            width: result.rows[0].width,
            height: result.rows[0].height,
            createdAt: result.rows[0].created_at,
          });
        } catch (error) {
          logger.warn({ error, filename: file.originalname }, 'Failed to upload file');
        }
      }

      logger.info({ count: uploadedFiles.length, userId, taskId }, 'Multiple files uploaded');

      res.status(201).json({ data: uploadedFiles });
    } catch (error: any) {
      logger.error({ error }, 'Multiple file upload failed');
      res.status(500).json({ error: { message: 'File upload failed' } });
    }
  });

  /**
   * GET /api/files/:id
   * Get file by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const query = 'SELECT * FROM files WHERE id = $1';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: { message: 'File not found' } });
      }

      const fileRecord = result.rows[0];
      const buffer = await fileProcessor.getFile(id);

      if (!buffer) {
        return res.status(404).json({ error: { message: 'File not found on disk' } });
      }

      res.setHeader('Content-Type', fileRecord.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.original_name}"`);
      res.send(buffer);
    } catch (error: any) {
      logger.error({ error, fileId: req.params.id }, 'Failed to get file');
      res.status(500).json({ error: { message: 'Failed to retrieve file' } });
    }
  });

  /**
   * GET /api/files/:id/metadata
   * Get file metadata only
   */
  router.get('/:id/metadata', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const query = 'SELECT * FROM files WHERE id = $1';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: { message: 'File not found' } });
      }

      const fileRecord = result.rows[0];

      res.json({
        data: {
          id: fileRecord.id,
          filename: fileRecord.original_name,
          mimeType: fileRecord.mime_type,
          size: fileRecord.size,
          url: `/api/files/${fileRecord.id}`,
          thumbnailUrl: fileRecord.thumbnail_path ? `/api/files/${fileRecord.id}/thumbnail` : null,
          width: fileRecord.width,
          height: fileRecord.height,
          extractedText: fileRecord.extracted_text,
          createdAt: fileRecord.created_at,
        },
      });
    } catch (error: any) {
      logger.error({ error, fileId: req.params.id }, 'Failed to get file metadata');
      res.status(500).json({ error: { message: 'Failed to retrieve file metadata' } });
    }
  });

  /**
   * GET /api/files/:id/thumbnail
   * Get file thumbnail
   */
  router.get('/:id/thumbnail', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const query = 'SELECT * FROM files WHERE id = $1';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0 || !result.rows[0].thumbnail_path) {
        return res.status(404).json({ error: { message: 'Thumbnail not found' } });
      }

      const buffer = await fileProcessor.getThumbnail(id);

      if (!buffer) {
        return res.status(404).json({ error: { message: 'Thumbnail not found on disk' } });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (error: any) {
      logger.error({ error, fileId: req.params.id }, 'Failed to get thumbnail');
      res.status(500).json({ error: { message: 'Failed to retrieve thumbnail' } });
    }
  });

  /**
   * POST /api/files/:id/analyze
   * Analyze file with AI
   */
  router.post('/:id/analyze', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { prompt, taskId } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: { message: 'Prompt is required' } });
      }

      // Get file metadata
      const query = 'SELECT * FROM files WHERE id = $1';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: { message: 'File not found' } });
      }

      // Prepare file for AI
      const prepared = await fileProcessor.prepareForAI(id);

      if (!prepared) {
        return res.status(400).json({ error: { message: 'File type not supported for analysis' } });
      }

      let analysis: any;

      if (prepared.type === 'image') {
        // Analyze image
        const base64Image = (prepared.content as Buffer).toString('base64');

        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: prepared.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        });

        analysis = {
          type: 'image',
          prompt,
          response: response.content[0].type === 'text' ? response.content[0].text : '',
          usage: response.usage,
        };
      } else {
        // Analyze text/document
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nFile content:\n${prepared.content}`,
            },
          ],
        });

        analysis = {
          type: 'text',
          prompt,
          response: response.content[0].type === 'text' ? response.content[0].text : '',
          usage: response.usage,
        };
      }

      // Store analysis result
      const updateQuery = `
        UPDATE files
        SET analysis_result = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      await db.query(updateQuery, [JSON.stringify(analysis), id]);

      // If taskId provided, link to task
      if (taskId) {
        const taskQuery = `
          UPDATE tasks
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{fileAnalysis}',
            $1::jsonb
          )
          WHERE id = $2
        `;
        await db.query(taskQuery, [JSON.stringify({ fileId: id, analysis }), taskId]);
      }

      logger.info({ fileId: id, taskId, type: prepared.type }, 'File analyzed successfully');

      res.json({ data: analysis });
    } catch (error: any) {
      logger.error({ error, fileId: req.params.id }, 'File analysis failed');

      if (error.status === 429) {
        return res.status(429).json({ error: { message: 'Rate limit exceeded. Please try again later.' } });
      }

      res.status(500).json({ error: { message: 'File analysis failed' } });
    }
  });

  /**
   * DELETE /api/files/:id
   * Delete a file
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete from database
      const query = 'DELETE FROM files WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: { message: 'File not found' } });
      }

      // Delete from filesystem
      await fileProcessor.deleteFile(id);

      logger.info({ fileId: id }, 'File deleted successfully');

      res.json({ data: { success: true } });
    } catch (error: any) {
      logger.error({ error, fileId: req.params.id }, 'Failed to delete file');
      res.status(500).json({ error: { message: 'Failed to delete file' } });
    }
  });

  /**
   * GET /api/files
   * List files with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { userId, taskId, conversationId, mimeType, limit = '50', offset = '0' } = req.query;

      let query = 'SELECT * FROM files WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (taskId) {
        query += ` AND task_id = $${paramIndex}`;
        params.push(taskId);
        paramIndex++;
      }

      if (conversationId) {
        query += ` AND conversation_id = $${paramIndex}`;
        params.push(conversationId);
        paramIndex++;
      }

      if (mimeType) {
        query += ` AND mime_type = $${paramIndex}`;
        params.push(mimeType);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await db.query(query, params);

      const files = result.rows.map(row => ({
        id: row.id,
        filename: row.original_name,
        mimeType: row.mime_type,
        size: row.size,
        url: `/api/files/${row.id}`,
        thumbnailUrl: row.thumbnail_path ? `/api/files/${row.id}/thumbnail` : null,
        width: row.width,
        height: row.height,
        createdAt: row.created_at,
      }));

      res.json({ data: files });
    } catch (error: any) {
      logger.error({ error }, 'Failed to list files');
      res.status(500).json({ error: { message: 'Failed to list files' } });
    }
  });

  return router;
}
