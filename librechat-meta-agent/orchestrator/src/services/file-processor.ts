import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from 'pino';

// Type definitions
export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  path: string;
  thumbnailPath?: string;
  extractedText?: string;
  width?: number;
  height?: number;
  createdAt: Date;
}

export interface ProcessingOptions {
  extractText?: boolean;
  generateThumbnail?: boolean;
  maxImageWidth?: number;
  maxImageHeight?: number;
  thumbnailSize?: number;
}

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];
const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'application/typescript',
];

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go',
  '.rb', '.php', '.swift', '.kt', '.rs', '.scala', '.sh', '.bash', '.sql',
  '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.yaml', '.yml',
  '.json', '.xml', '.md', '.txt',
];

export class FileProcessorService {
  private uploadDir: string;
  private thumbnailDir: string;
  private logger: Logger;

  constructor(logger: Logger, baseDir: string = './uploads') {
    this.logger = logger;
    this.uploadDir = path.join(baseDir, 'files');
    this.thumbnailDir = path.join(baseDir, 'thumbnails');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.thumbnailDir, { recursive: true });
      this.logger.info('Upload directories created/verified');
    } catch (error) {
      this.logger.error({ error }, 'Failed to create upload directories');
      throw error;
    }
  }

  /**
   * Detect file type from buffer and filename
   */
  detectFileType(buffer: Buffer, filename: string): { mimeType: string; category: string } {
    // Check magic numbers for common file types
    const magicNumbers: Record<string, { bytes: number[]; mimeType: string }> = {
      jpeg: { bytes: [0xFF, 0xD8, 0xFF], mimeType: 'image/jpeg' },
      png: { bytes: [0x89, 0x50, 0x4E, 0x47], mimeType: 'image/png' },
      pdf: { bytes: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' },
      webp: { bytes: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp' }, // RIFF
      gif: { bytes: [0x47, 0x49, 0x46, 0x38], mimeType: 'image/gif' },
    };

    for (const [type, { bytes, mimeType }] of Object.entries(magicNumbers)) {
      if (bytes.every((byte, i) => buffer[i] === byte)) {
        return this.categorizeFile(mimeType);
      }
    }

    // Fallback to extension-based detection
    const ext = path.extname(filename).toLowerCase();
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
    };

    const mimeType = extToMime[ext] || 'application/octet-stream';
    return this.categorizeFile(mimeType);
  }

  private categorizeFile(mimeType: string): { mimeType: string; category: string } {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      return { mimeType, category: 'image' };
    } else if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) {
      return { mimeType, category: 'document' };
    } else if (SUPPORTED_TEXT_TYPES.includes(mimeType) || mimeType.startsWith('text/')) {
      return { mimeType, category: 'text' };
    }
    return { mimeType, category: 'other' };
  }

  /**
   * Validate file type and size
   */
  validateFile(buffer: Buffer, filename: string, maxSize: number = 50 * 1024 * 1024): void {
    if (buffer.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    const { category } = this.detectFileType(buffer, filename);

    if (category === 'other') {
      // Check if it's a code file by extension
      const ext = path.extname(filename).toLowerCase();
      if (!CODE_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported file type: ${filename}`);
      }
    }
  }

  /**
   * Calculate file hash for deduplication
   */
  calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Process uploaded file
   */
  async processFile(
    buffer: Buffer,
    originalName: string,
    options: ProcessingOptions = {}
  ): Promise<FileMetadata> {
    try {
      // Validate file
      this.validateFile(buffer, originalName);

      // Detect file type
      const { mimeType, category } = this.detectFileType(buffer, originalName);

      // Calculate hash
      const hash = this.calculateHash(buffer);

      // Generate unique filename
      const ext = path.extname(originalName);
      const filename = `${hash}${ext}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save file
      await fs.writeFile(filePath, buffer);

      const metadata: FileMetadata = {
        id: hash,
        filename,
        originalName,
        mimeType,
        size: buffer.length,
        hash,
        path: filePath,
        createdAt: new Date(),
      };

      // Process based on file type
      if (category === 'image' && options.generateThumbnail) {
        await this.generateThumbnail(buffer, filename, options.thumbnailSize || 200);
        metadata.thumbnailPath = path.join(this.thumbnailDir, filename);

        // Get image dimensions
        const dimensions = await this.getImageDimensions(buffer);
        metadata.width = dimensions.width;
        metadata.height = dimensions.height;
      }

      if (category === 'document' && options.extractText) {
        metadata.extractedText = await this.extractPdfText(filePath);
      }

      if (category === 'text' || CODE_EXTENSIONS.includes(path.extname(originalName).toLowerCase())) {
        metadata.extractedText = buffer.toString('utf-8');
      }

      this.logger.info({ fileId: metadata.id, mimeType, size: metadata.size }, 'File processed');

      return metadata;
    } catch (error) {
      this.logger.error({ error, filename: originalName }, 'File processing failed');
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractPdfText(filePath: string): Promise<string> {
    try {
      // Dynamic import of pdf-parse
      const pdfParse = await import('pdf-parse');
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse.default(buffer);
      return data.text;
    } catch (error) {
      this.logger.warn({ error, filePath }, 'PDF text extraction failed');
      return '';
    }
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const sharp = await import('sharp');
      const metadata = await sharp.default(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.warn({ error }, 'Failed to get image dimensions');
      return { width: 0, height: 0 };
    }
  }

  /**
   * Generate thumbnail for images
   */
  private async generateThumbnail(
    buffer: Buffer,
    filename: string,
    size: number = 200
  ): Promise<void> {
    try {
      const sharp = await import('sharp');
      const thumbnailPath = path.join(this.thumbnailDir, filename);

      await sharp.default(buffer)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      this.logger.debug({ filename, size }, 'Thumbnail generated');
    } catch (error) {
      this.logger.warn({ error, filename }, 'Thumbnail generation failed');
    }
  }

  /**
   * Resize image for API submission
   */
  async resizeImage(
    buffer: Buffer,
    maxWidth: number = 1568,
    maxHeight: number = 1568
  ): Promise<Buffer> {
    try {
      const sharp = await import('sharp');

      const resized = await sharp.default(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      this.logger.debug({ originalSize: buffer.length, resizedSize: resized.length }, 'Image resized');

      return resized;
    } catch (error) {
      this.logger.error({ error }, 'Image resize failed');
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<Buffer | null> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const file = files.find(f => f.startsWith(fileId));

      if (!file) {
        return null;
      }

      const filePath = path.join(this.uploadDir, file);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error({ error, fileId }, 'Failed to get file');
      return null;
    }
  }

  /**
   * Get thumbnail by file ID
   */
  async getThumbnail(fileId: string): Promise<Buffer | null> {
    try {
      const files = await fs.readdir(this.thumbnailDir);
      const file = files.find(f => f.startsWith(fileId));

      if (!file) {
        return null;
      }

      const filePath = path.join(this.thumbnailDir, file);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error({ error, fileId }, 'Failed to get thumbnail');
      return null;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const file = files.find(f => f.startsWith(fileId));

      if (!file) {
        return false;
      }

      const filePath = path.join(this.uploadDir, file);
      await fs.unlink(filePath);

      // Try to delete thumbnail if exists
      const thumbnails = await fs.readdir(this.thumbnailDir);
      const thumbnail = thumbnails.find(f => f.startsWith(fileId));
      if (thumbnail) {
        await fs.unlink(path.join(this.thumbnailDir, thumbnail));
      }

      this.logger.info({ fileId }, 'File deleted');
      return true;
    } catch (error) {
      this.logger.error({ error, fileId }, 'Failed to delete file');
      return false;
    }
  }

  /**
   * Prepare file for AI analysis
   */
  async prepareForAI(fileId: string): Promise<{
    content: string | Buffer;
    mimeType: string;
    type: 'text' | 'image';
  } | null> {
    try {
      const buffer = await this.getFile(fileId);
      if (!buffer) {
        return null;
      }

      const files = await fs.readdir(this.uploadDir);
      const file = files.find(f => f.startsWith(fileId));
      if (!file) {
        return null;
      }

      const { mimeType, category } = this.detectFileType(buffer, file);

      if (category === 'image') {
        // Resize image for API
        const resized = await this.resizeImage(buffer);
        return {
          content: resized,
          mimeType,
          type: 'image',
        };
      }

      if (category === 'text' || category === 'document') {
        // For text and documents, return extracted text
        const filePath = path.join(this.uploadDir, file);
        let text = '';

        if (category === 'document') {
          text = await this.extractPdfText(filePath);
        } else {
          text = buffer.toString('utf-8');
        }

        return {
          content: text,
          mimeType: 'text/plain',
          type: 'text',
        };
      }

      return null;
    } catch (error) {
      this.logger.error({ error, fileId }, 'Failed to prepare file for AI');
      return null;
    }
  }
}
