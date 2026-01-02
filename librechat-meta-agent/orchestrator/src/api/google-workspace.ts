import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { GoogleWorkspaceEngine } from '../services/google-workspace';
import multer from 'multer';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
];

/**
 * Google Workspace API Router
 */
export function createGoogleWorkspaceRouter(
  db: Pool,
  logger: Logger,
  workspaceEngine: GoogleWorkspaceEngine
): Router {
  const router = Router();

  // Setup file upload
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  /**
   * Helper to get userId from request
   */
  const getUserId = (req: Request): string => {
    // TODO: Get from authenticated session
    return req.body.userId || req.query.userId || 'default-user';
  };

  // ===================================
  // OAUTH ROUTES
  // ===================================

  /**
   * GET /api/google/auth
   * Get Google OAuth authorization URL
   */
  router.get('/auth', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authUrl = await workspaceEngine.getAuthUrl(userId, GOOGLE_SCOPES);

      res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate auth URL');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
      });
    }
  });

  /**
   * GET /api/google/callback
   * OAuth callback handler
   */
  router.get('/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const userId = req.query.state as string;

      if (!code || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing code or state parameter',
        });
      }

      await workspaceEngine.handleCallback(userId, code);

      res.json({
        success: true,
        message: 'Google Workspace connected successfully',
      });
    } catch (error) {
      logger.error({ error }, 'OAuth callback failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed',
      });
    }
  });

  /**
   * POST /api/google/revoke
   * Revoke Google Workspace access
   */
  router.post('/revoke', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await workspaceEngine.revokeAccess(userId);

      res.json({
        success: true,
        message: 'Google Workspace access revoked',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to revoke access');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke access',
      });
    }
  });

  /**
   * GET /api/google/status
   * Check connection status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const { rows } = await db.query(
        `SELECT user_id, scope, expires_at, created_at
         FROM google_oauth_tokens
         WHERE user_id = $1`,
        [userId]
      );

      if (rows.length === 0) {
        return res.json({
          success: true,
          connected: false,
        });
      }

      const token = rows[0];
      const isExpired = new Date(token.expires_at) < new Date();

      res.json({
        success: true,
        connected: true,
        scopes: token.scope?.split(' ') || [],
        connectedAt: token.created_at,
        expiresAt: token.expires_at,
        isExpired,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to check status');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check status',
      });
    }
  });

  // ===================================
  // GMAIL ROUTES
  // ===================================

  /**
   * GET /api/google/gmail/messages
   * List emails
   */
  router.get('/gmail/messages', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const query = req.query.query as string;
      const maxResults = parseInt(req.query.maxResults as string) || 20;

      const service = await workspaceEngine.getService(userId);
      const emails = await service.listEmails(query, maxResults);

      res.json({
        success: true,
        emails,
        count: emails.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list emails');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list emails',
      });
    }
  });

  /**
   * GET /api/google/gmail/messages/:id
   * Get single email
   */
  router.get('/gmail/messages/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const service = await workspaceEngine.getService(userId);
      const email = await service.getEmail(id);

      res.json({
        success: true,
        email,
      });
    } catch (error) {
      logger.error({ error, email_id: req.params.id }, 'Failed to get email');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get email',
      });
    }
  });

  /**
   * POST /api/google/gmail/send
   * Send email
   */
  router.post('/gmail/send', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject, body',
        });
      }

      const service = await workspaceEngine.getService(userId);
      await service.sendEmail(to, subject, body);

      res.json({
        success: true,
        message: 'Email sent successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send email');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  });

  /**
   * POST /api/google/gmail/draft
   * Create draft email
   */
  router.post('/gmail/draft', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject, body',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const draft = await service.draftEmail(to, subject, body);

      res.json({
        success: true,
        draft,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create draft');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create draft',
      });
    }
  });

  /**
   * POST /api/google/gmail/reply/:id
   * Reply to email
   */
  router.post('/gmail/reply/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: body',
        });
      }

      const service = await workspaceEngine.getService(userId);
      await service.replyToEmail(id, body);

      res.json({
        success: true,
        message: 'Reply sent successfully',
      });
    } catch (error) {
      logger.error({ error, email_id: req.params.id }, 'Failed to send reply');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reply',
      });
    }
  });

  /**
   * GET /api/google/gmail/labels
   * Get labels
   */
  router.get('/gmail/labels', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const service = await workspaceEngine.getService(userId);
      const labels = await service.getLabels();

      res.json({
        success: true,
        labels,
        count: labels.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get labels');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get labels',
      });
    }
  });

  /**
   * POST /api/google/gmail/summarize
   * AI summarize emails
   */
  router.post('/gmail/summarize', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const query = req.body.query as string;

      const summary = await workspaceEngine.summarizeEmails(userId, query);

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to summarize emails');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to summarize emails',
      });
    }
  });

  /**
   * POST /api/google/gmail/draft-reply
   * AI draft reply
   */
  router.post('/gmail/draft-reply', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { emailId, instructions } = req.body;

      if (!emailId || !instructions) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: emailId, instructions',
        });
      }

      const reply = await workspaceEngine.draftReply(userId, emailId, instructions);

      res.json({
        success: true,
        reply,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to draft reply');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to draft reply',
      });
    }
  });

  // ===================================
  // GOOGLE DOCS ROUTES
  // ===================================

  /**
   * GET /api/google/docs
   * List documents
   */
  router.get('/docs', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const service = await workspaceEngine.getService(userId);
      const documents = await service.listDocuments();

      res.json({
        success: true,
        documents,
        count: documents.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list documents');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list documents',
      });
    }
  });

  /**
   * GET /api/google/docs/:id
   * Get document
   */
  router.get('/docs/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const service = await workspaceEngine.getService(userId);
      const document = await service.getDocument(id);

      res.json({
        success: true,
        document,
      });
    } catch (error) {
      logger.error({ error, doc_id: req.params.id }, 'Failed to get document');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document',
      });
    }
  });

  /**
   * POST /api/google/docs
   * Create document
   */
  router.post('/docs', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { title, content } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: title',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const document = await service.createDocument(title, content);

      res.json({
        success: true,
        document,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create document');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create document',
      });
    }
  });

  /**
   * PUT /api/google/docs/:id
   * Update document
   */
  router.put('/docs/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: content',
        });
      }

      const service = await workspaceEngine.getService(userId);
      await service.updateDocument(id, content);

      res.json({
        success: true,
        message: 'Document updated successfully',
      });
    } catch (error) {
      logger.error({ error, doc_id: req.params.id }, 'Failed to update document');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update document',
      });
    }
  });

  /**
   * GET /api/google/docs/:id/export
   * Export document
   */
  router.get('/docs/:id/export', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const format = (req.query.format as 'pdf' | 'docx' | 'txt') || 'pdf';

      const service = await workspaceEngine.getService(userId);
      const buffer = await service.exportDocument(id, format);

      const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
      };

      res.setHeader('Content-Type', mimeTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename="document.${format}"`);
      res.send(buffer);
    } catch (error) {
      logger.error({ error, doc_id: req.params.id }, 'Failed to export document');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export document',
      });
    }
  });

  // ===================================
  // GOOGLE SHEETS ROUTES
  // ===================================

  /**
   * GET /api/google/sheets
   * List spreadsheets
   */
  router.get('/sheets', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const service = await workspaceEngine.getService(userId);
      const spreadsheets = await service.listSpreadsheets();

      res.json({
        success: true,
        spreadsheets,
        count: spreadsheets.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list spreadsheets');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list spreadsheets',
      });
    }
  });

  /**
   * GET /api/google/sheets/:id
   * Get spreadsheet
   */
  router.get('/sheets/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const service = await workspaceEngine.getService(userId);
      const spreadsheet = await service.getSpreadsheet(id);

      res.json({
        success: true,
        spreadsheet,
      });
    } catch (error) {
      logger.error({ error, sheet_id: req.params.id }, 'Failed to get spreadsheet');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get spreadsheet',
      });
    }
  });

  /**
   * POST /api/google/sheets
   * Create spreadsheet
   */
  router.post('/sheets', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: title',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const spreadsheet = await service.createSpreadsheet(title);

      res.json({
        success: true,
        spreadsheet,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create spreadsheet');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create spreadsheet',
      });
    }
  });

  /**
   * GET /api/google/sheets/:id/values/:range
   * Get spreadsheet values
   */
  router.get('/sheets/:id/values/:range', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id, range } = req.params;

      const service = await workspaceEngine.getService(userId);
      const values = await service.getValues(id, range);

      res.json({
        success: true,
        values,
        rows: values.length,
      });
    } catch (error) {
      logger.error({ error, sheet_id: req.params.id }, 'Failed to get values');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get values',
      });
    }
  });

  /**
   * PUT /api/google/sheets/:id/values/:range
   * Set spreadsheet values
   */
  router.put('/sheets/:id/values/:range', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id, range } = req.params;
      const { values } = req.body;

      if (!values || !Array.isArray(values)) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid field: values (must be array)',
        });
      }

      const service = await workspaceEngine.getService(userId);
      await service.setValues(id, range, values);

      res.json({
        success: true,
        message: 'Values updated successfully',
      });
    } catch (error) {
      logger.error({ error, sheet_id: req.params.id }, 'Failed to set values');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set values',
      });
    }
  });

  /**
   * POST /api/google/sheets/:id/analyze
   * AI analyze spreadsheet
   */
  router.post('/sheets/:id/analyze', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: question',
        });
      }

      const analysis = await workspaceEngine.analyzeSpreadsheet(userId, id, question);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      logger.error({ error, sheet_id: req.params.id }, 'Failed to analyze spreadsheet');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze spreadsheet',
      });
    }
  });

  // ===================================
  // GOOGLE DRIVE ROUTES
  // ===================================

  /**
   * GET /api/google/drive/files
   * List files
   */
  router.get('/drive/files', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const folderId = req.query.folderId as string;

      const service = await workspaceEngine.getService(userId);
      const files = await service.listFiles(folderId);

      res.json({
        success: true,
        files,
        count: files.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list files');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
      });
    }
  });

  /**
   * GET /api/google/drive/search
   * Search files
   */
  router.get('/drive/search', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Missing query parameter: q',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const files = await service.searchFiles(query);

      res.json({
        success: true,
        files,
        count: files.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to search files');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search files',
      });
    }
  });

  /**
   * POST /api/google/drive/upload
   * Upload file
   */
  router.post('/drive/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const file = req.file;
      const folderId = req.body.folderId as string;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const driveFile = await service.uploadFile(
        file.originalname,
        file.buffer,
        file.mimetype,
        folderId
      );

      res.json({
        success: true,
        file: driveFile,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to upload file');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      });
    }
  });

  /**
   * GET /api/google/drive/download/:id
   * Download file
   */
  router.get('/drive/download/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const service = await workspaceEngine.getService(userId);
      const [file, buffer] = await Promise.all([
        service.getFile(id),
        service.downloadFile(id),
      ]);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(buffer);
    } catch (error) {
      logger.error({ error, file_id: req.params.id }, 'Failed to download file');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      });
    }
  });

  /**
   * DELETE /api/google/drive/:id
   * Delete file
   */
  router.delete('/drive/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const service = await workspaceEngine.getService(userId);
      await service.deleteFile(id);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error({ error, file_id: req.params.id }, 'Failed to delete file');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  });

  /**
   * POST /api/google/drive/folder
   * Create folder
   */
  router.post('/drive/folder', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const folder = await service.createFolder(name, parentId);

      res.json({
        success: true,
        folder,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create folder');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create folder',
      });
    }
  });

  /**
   * POST /api/google/drive/:id/share
   * Share file
   */
  router.post('/drive/:id/share', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: email, role',
        });
      }

      const service = await workspaceEngine.getService(userId);
      await service.shareFile(id, email, role);

      res.json({
        success: true,
        message: 'File shared successfully',
      });
    } catch (error) {
      logger.error({ error, file_id: req.params.id }, 'Failed to share file');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share file',
      });
    }
  });

  // ===================================
  // GOOGLE CALENDAR ROUTES
  // ===================================

  /**
   * GET /api/google/calendar
   * List calendars
   */
  router.get('/calendar', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const service = await workspaceEngine.getService(userId);
      const calendars = await service.listCalendars();

      res.json({
        success: true,
        calendars,
        count: calendars.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list calendars');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list calendars',
      });
    }
  });

  /**
   * GET /api/google/calendar/:id/events
   * List events
   */
  router.get('/calendar/:id/events', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const timeMin = req.query.timeMin ? new Date(req.query.timeMin as string) : undefined;
      const timeMax = req.query.timeMax ? new Date(req.query.timeMax as string) : undefined;

      const service = await workspaceEngine.getService(userId);
      const events = await service.listEvents(id, timeMin, timeMax);

      res.json({
        success: true,
        events,
        count: events.length,
      });
    } catch (error) {
      logger.error({ error, calendar_id: req.params.id }, 'Failed to list events');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list events',
      });
    }
  });

  /**
   * POST /api/google/calendar/:id/events
   * Create event
   */
  router.post('/calendar/:id/events', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const eventData = req.body;

      const service = await workspaceEngine.getService(userId);
      const event = await service.createEvent(id, eventData);

      res.json({
        success: true,
        event,
      });
    } catch (error) {
      logger.error({ error, calendar_id: req.params.id }, 'Failed to create event');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      });
    }
  });

  /**
   * PUT /api/google/calendar/:id/events/:eventId
   * Update event
   */
  router.put('/calendar/:id/events/:eventId', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id, eventId } = req.params;
      const updates = req.body;

      const service = await workspaceEngine.getService(userId);
      const event = await service.updateEvent(id, eventId, updates);

      res.json({
        success: true,
        event,
      });
    } catch (error) {
      logger.error({ error, calendar_id: req.params.id, event_id: req.params.eventId }, 'Failed to update event');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event',
      });
    }
  });

  /**
   * DELETE /api/google/calendar/:id/events/:eventId
   * Delete event
   */
  router.delete('/calendar/:id/events/:eventId', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id, eventId } = req.params;

      const service = await workspaceEngine.getService(userId);
      await service.deleteEvent(id, eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      logger.error({ error, calendar_id: req.params.id, event_id: req.params.eventId }, 'Failed to delete event');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event',
      });
    }
  });

  /**
   * POST /api/google/calendar/schedule
   * Natural language scheduling
   */
  router.post('/calendar/schedule', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { input } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: input',
        });
      }

      const event = await workspaceEngine.scheduleFromNaturalLanguage(userId, input);

      res.json({
        success: true,
        event,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to schedule from natural language');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule event',
      });
    }
  });

  /**
   * POST /api/google/calendar/:id/free-time
   * Find free time slots
   */
  router.post('/calendar/:id/free-time', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { duration, start, end } = req.body;

      if (!duration || !start || !end) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: duration, start, end',
        });
      }

      const service = await workspaceEngine.getService(userId);
      const freeSlots = await service.findFreeTime(id, duration, {
        start: new Date(start),
        end: new Date(end),
      });

      res.json({
        success: true,
        freeSlots,
        count: freeSlots.length,
      });
    } catch (error) {
      logger.error({ error, calendar_id: req.params.id }, 'Failed to find free time');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find free time',
      });
    }
  });

  return router;
}
