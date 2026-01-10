'use client';

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileIcon, Image as ImageIcon, FileText, FileCode, Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Supported file types
const SUPPORTED_FILE_TYPES = {
  images: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain', 'text/markdown', 'application/json', 'text/csv'],
  code: [
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
    'text/html',
    'text/css',
    'application/xml',
    'text/yaml',
  ],
};

const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_FILE_TYPES.images,
  ...SUPPORTED_FILE_TYPES.documents,
  ...SUPPORTED_FILE_TYPES.code,
];

// File extension to mime type mapping for common files
const EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.jsx': 'text/javascript',
  '.py': 'text/x-python',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-cpp',
  '.h': 'text/x-c',
  '.hpp': 'text/x-cpp',
  '.html': 'text/html',
  '.css': 'text/css',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
};

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'document' | 'code';
  mimeType: string;
  size: number;
  preview?: string; // Base64 data URL for images
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;
  error?: string;
  url?: string; // URL after upload
  thumbnailUrl?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  files: UploadedFile[];
  maxFiles?: number;
  maxFileSize?: number; // In bytes
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

// Helper to determine file category
function getFileCategory(mimeType: string): 'image' | 'document' | 'code' {
  if (SUPPORTED_FILE_TYPES.images.includes(mimeType)) return 'image';
  if (SUPPORTED_FILE_TYPES.documents.includes(mimeType)) return 'document';
  if (SUPPORTED_FILE_TYPES.code.includes(mimeType)) return 'code';
  return 'document'; // Default fallback
}

// Helper to get mime type from file
function getMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }

  // Fallback to extension-based detection
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return EXTENSION_TO_MIME[extension] || 'application/octet-stream';
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to check if file type is supported
function isFileTypeSupported(mimeType: string): boolean {
  return ALL_SUPPORTED_TYPES.includes(mimeType);
}

export function FileUpload({
  onFilesSelected,
  onFileRemove,
  files,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
  compact = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process files and create UploadedFile objects
  const processFiles = useCallback(async (fileList: FileList | File[]): Promise<UploadedFile[]> => {
    const filesArray = Array.from(fileList);
    const processedFiles: UploadedFile[] = [];
    const errors: string[] = [];

    // Check total file count
    if (files.length + filesArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return [];
    }

    for (const file of filesArray) {
      const mimeType = getMimeType(file);

      // Validate file type
      if (!isFileTypeSupported(mimeType)) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds ${formatFileSize(maxFileSize)}`);
        continue;
      }

      const category = getFileCategory(mimeType);
      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        type: category,
        mimeType,
        size: file.size,
        status: 'pending',
        progress: 0,
      };

      // Generate preview for images
      if (category === 'image') {
        try {
          const preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploadedFile.preview = preview;
        } catch (e) {
          console.error('Failed to generate image preview:', e);
        }
      }

      processedFiles.push(uploadedFile);
    }

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError(null);
    }

    return processedFiles;
  }, [files.length, maxFiles, maxFileSize]);

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    if (disabled) return;

    const processedFiles = await processFiles(fileList);
    if (processedFiles.length > 0) {
      onFilesSelected(processedFiles);
    }
  }, [disabled, processFiles, onFilesSelected]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  // Click to select files
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Handle file input change
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  // Clear error after timeout
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_SUPPORTED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || files.length >= maxFiles}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            disabled || files.length >= maxFiles
              ? 'opacity-50 cursor-not-allowed text-stone-400'
              : 'hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-500',
            className
          )}
          title="Attach files"
        >
          <Upload className="w-5 h-5" />
        </button>
      </>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
          isDragOver
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
            : 'border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500',
          disabled && 'opacity-50 cursor-not-allowed',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            isDragOver ? 'bg-teal-100 dark:bg-teal-800' : 'bg-stone-100 dark:bg-stone-700'
          )}>
            <Upload className={clsx(
              'w-6 h-6',
              isDragOver ? 'text-teal-600 dark:text-teal-400' : 'text-stone-500'
            )} />
          </div>

          <div>
            <p className={clsx(
              'text-sm font-medium',
              isDragOver ? 'text-teal-700 dark:text-teal-300' : 'text-stone-700 dark:text-stone-300'
            )}>
              {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              or click to browse
            </p>
          </div>

          <p className="text-xs text-stone-400 dark:text-stone-500">
            PDF, images, code files up to {formatFileSize(maxFileSize)}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 text-right">
          {files.length} / {maxFiles} files
        </p>
      )}
    </div>
  );
}

// File icon component based on type
export function FileTypeIcon({ type, mimeType, className }: { type: 'image' | 'document' | 'code'; mimeType?: string; className?: string }) {
  switch (type) {
    case 'image':
      return <ImageIcon className={clsx('text-pink-500', className)} />;
    case 'code':
      return <FileCode className={clsx('text-green-500', className)} />;
    case 'document':
      if (mimeType === 'application/pdf') {
        return <FileText className={clsx('text-red-500', className)} />;
      }
      return <FileText className={clsx('text-blue-500', className)} />;
    default:
      return <FileIcon className={clsx('text-stone-500', className)} />;
  }
}

export { formatFileSize, getFileCategory, isFileTypeSupported, SUPPORTED_FILE_TYPES };
