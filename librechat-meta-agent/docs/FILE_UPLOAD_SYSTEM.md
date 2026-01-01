# File Upload and Analysis System

A comprehensive file upload and AI-powered analysis system for the Meta Agent, supporting images, PDFs, text files, and code files.

## Features

### Backend (Orchestrator)

- **File Upload**: Multipart file upload with progress tracking
- **File Processing**:
  - Automatic file type detection using magic numbers
  - PDF text extraction
  - Image thumbnail generation
  - Image resizing for AI API submission
  - Text file extraction
- **File Storage**: Filesystem-based storage with PostgreSQL metadata
- **AI Analysis**: Send files to Claude for intelligent analysis
- **Deduplication**: SHA-256 hash-based file deduplication

### Frontend (UI Extensions)

- **Drag and Drop**: Intuitive drag-and-drop file upload
- **Clipboard Support**: Paste images and files directly (Ctrl+V / Cmd+V)
- **Mobile Camera**: Take photos on mobile devices
- **Upload Progress**: Real-time upload progress indicators
- **File Previews**: Thumbnail previews for images
- **Multiple Files**: Upload multiple files at once

## Supported File Types

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

### Documents
- PDF (.pdf)

### Text Files
- Plain text (.txt)
- Markdown (.md)
- CSV (.csv)
- JSON (.json)
- HTML (.html)
- CSS (.css)

### Code Files
- JavaScript (.js, .jsx)
- TypeScript (.ts, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp)
- C# (.cs)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- Swift (.swift)
- Kotlin (.kt)
- Rust (.rs)
- Scala (.scala)
- Shell (.sh, .bash)
- SQL (.sql)
- YAML (.yaml, .yml)
- XML (.xml)

## Installation

### 1. Install Dependencies

```bash
cd orchestrator
npm install
```

This will install:
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `sharp` - Image processing and thumbnail generation

### 2. Set Up Database

Run the database migration:

```bash
psql -U your_user -d librechat_meta -f schemas/003_files_schema.sql
```

### 3. Configure Environment

Add to your `.env` file:

```env
# File upload configuration
UPLOAD_DIR=./uploads           # Directory for uploaded files
ANTHROPIC_API_KEY=your_key     # For AI analysis
```

### 4. Create Upload Directory

```bash
mkdir -p uploads/files uploads/thumbnails
```

## API Endpoints

### POST /api/files/upload

Upload a single file.

**Request:**
```bash
curl -X POST http://localhost:3100/api/files/upload \
  -F "file=@/path/to/file.jpg" \
  -F "userId=user123" \
  -F "taskId=task456"
```

**Response:**
```json
{
  "data": {
    "id": "abc123...",
    "filename": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "url": "/api/files/abc123...",
    "thumbnailUrl": "/api/files/abc123.../thumbnail",
    "width": 1920,
    "height": 1080,
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### POST /api/files/upload-multiple

Upload multiple files.

**Request:**
```bash
curl -X POST http://localhost:3100/api/files/upload-multiple \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.pdf" \
  -F "userId=user123"
```

### GET /api/files/:id

Download a file.

**Request:**
```bash
curl http://localhost:3100/api/files/abc123...
```

### GET /api/files/:id/metadata

Get file metadata without downloading.

**Response:**
```json
{
  "data": {
    "id": "abc123...",
    "filename": "document.pdf",
    "mimeType": "application/pdf",
    "size": 2048000,
    "extractedText": "Document content...",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### GET /api/files/:id/thumbnail

Get file thumbnail (images only).

### POST /api/files/:id/analyze

Analyze file with AI.

**Request:**
```bash
curl -X POST http://localhost:3100/api/files/abc123.../analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is in this image?",
    "taskId": "task456"
  }'
```

**Response:**
```json
{
  "data": {
    "type": "image",
    "prompt": "What is in this image?",
    "response": "This image shows...",
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 567
    }
  }
}
```

### GET /api/files

List files with filters.

**Query Parameters:**
- `userId` - Filter by user
- `taskId` - Filter by task
- `conversationId` - Filter by conversation
- `mimeType` - Filter by MIME type
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Example:**
```bash
curl "http://localhost:3100/api/files?userId=user123&limit=10"
```

### DELETE /api/files/:id

Delete a file.

## Frontend Usage

### Basic Usage

```tsx
import FileUpload from '@/components/FileUpload';

function MyComponent() {
  const handleFilesUploaded = (files) => {
    console.log('Files uploaded:', files);
  };

  const handleFileAnalyzed = (fileId, analysis) => {
    console.log('File analyzed:', fileId, analysis);
  };

  return (
    <FileUpload
      onFilesUploaded={handleFilesUploaded}
      onFileAnalyzed={handleFileAnalyzed}
      maxFiles={5}
      maxSize={10 * 1024 * 1024} // 10MB
      showPreviews={true}
      allowCamera={true}
    />
  );
}
```

### With Auto-Analysis

```tsx
<FileUpload
  autoAnalyze={true}
  analysisPrompt="Analyze this file and extract key information"
  onFileAnalyzed={(fileId, analysis) => {
    console.log('Analysis:', analysis.response);
  }}
/>
```

### Custom File Types

```tsx
<FileUpload
  accept={['image/*', '.pdf', '.txt']}
  maxFiles={3}
  uploadUrl="/api/files/upload"
  analyzeUrl="/api/files/:id/analyze"
/>
```

## Props Reference

### FileUpload Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onFilesUploaded` | `(files: FileItem[]) => void` | - | Callback when files are uploaded |
| `onFileAnalyzed` | `(fileId: string, analysis: any) => void` | - | Callback when file is analyzed |
| `maxFiles` | `number` | `10` | Maximum number of files |
| `maxSize` | `number` | `50MB` | Maximum file size in bytes |
| `accept` | `string[]` | All supported types | Accepted file types |
| `uploadUrl` | `string` | `/api/files/upload` | Upload endpoint |
| `analyzeUrl` | `string` | `/api/files/:id/analyze` | Analysis endpoint |
| `autoAnalyze` | `boolean` | `false` | Automatically analyze after upload |
| `analysisPrompt` | `string` | `"Analyze this file..."` | Prompt for analysis |
| `className` | `string` | - | Additional CSS classes |
| `showPreviews` | `boolean` | `true` | Show image previews |
| `allowCamera` | `boolean` | `true` | Enable mobile camera |
| `disabled` | `boolean` | `false` | Disable uploads |

## Advanced Features

### File Deduplication

Files are automatically deduplicated using SHA-256 hashes. If the same file is uploaded multiple times, only one copy is stored on disk, saving storage space.

### Text Extraction

- **PDFs**: Text is automatically extracted using `pdf-parse`
- **Text/Code Files**: Content is extracted and stored in `extracted_text` field
- **Images**: OCR is not currently supported, but can be added

### Image Processing

- **Thumbnails**: 200x200px thumbnails are generated for all images
- **Resizing**: Images are resized to max 1568x1568px for Claude API submission
- **Format**: Thumbnails are always JPEG with 80% quality

### AI Analysis

Files can be analyzed using Claude:
- **Images**: Sent as base64-encoded images to vision-capable models
- **Text/Documents**: Sent as text content
- **Custom Prompts**: Specify what you want to analyze

### Progress Tracking

Upload progress is tracked in real-time using XHR progress events:
```tsx
{
  id: "file-123",
  status: "uploading", // pending | uploading | success | error
  progress: 45 // 0-100
}
```

## Error Handling

Common error responses:

- `400 Bad Request` - Invalid file type or no file provided
- `413 Payload Too Large` - File size exceeds limit
- `429 Too Many Requests` - AI API rate limit exceeded
- `500 Internal Server Error` - Server error

## Performance Considerations

1. **File Size Limits**: Default 50MB, configurable via `maxSize` prop
2. **Concurrent Uploads**: Files are uploaded sequentially to avoid overwhelming the server
3. **Image Optimization**: Large images are automatically resized before AI analysis
4. **Caching**: Thumbnails are cached with long expiry headers

## Security Best Practices

1. **Validate File Types**: Always validate on both client and server
2. **Scan for Malware**: Consider adding virus scanning for production
3. **Rate Limiting**: Implement rate limits on upload endpoints
4. **Access Control**: Verify user permissions before serving files
5. **Storage Quotas**: Implement per-user storage quotas

## Troubleshooting

### Files not uploading

1. Check upload directory permissions
2. Verify `UPLOAD_DIR` environment variable
3. Check file size limits
4. Ensure `multer` is installed

### Thumbnails not generating

1. Verify `sharp` is installed correctly
2. Check write permissions on thumbnail directory
3. Ensure image file is valid

### PDF text extraction failing

1. Verify `pdf-parse` is installed
2. Check PDF is not encrypted or password-protected
3. Some PDFs may have no extractable text (scanned images)

### AI analysis not working

1. Verify `ANTHROPIC_API_KEY` is set
2. Check API rate limits
3. Ensure file type is supported for analysis

## Example Integration

See the example in `/ui-extensions/app/page.tsx` for a complete integration example with the Meta Agent dashboard.
