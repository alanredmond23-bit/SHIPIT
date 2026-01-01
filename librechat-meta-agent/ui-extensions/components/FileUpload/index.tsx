'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

interface FileItem {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedData?: {
    id: string;
    url: string;
    thumbnailUrl?: string;
  };
}

interface FileUploadProps {
  onFilesUploaded?: (files: FileItem[]) => void;
  onFileAnalyzed?: (fileId: string, analysis: any) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string[];
  uploadUrl?: string;
  analyzeUrl?: string;
  autoAnalyze?: boolean;
  analysisPrompt?: string;
  className?: string;
  showPreviews?: boolean;
  allowCamera?: boolean;
  disabled?: boolean;
}

const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf'],
  text: [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'text/typescript',
  ],
  code: [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
    '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.scala', '.sh',
    '.bash', '.sql', '.yaml', '.yml', '.xml', '.md', '.txt',
  ],
};

export default function FileUpload({
  onFilesUploaded,
  onFileAnalyzed,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
  accept,
  uploadUrl = '/api/files/upload',
  analyzeUrl = '/api/files/:id/analyze',
  autoAnalyze = false,
  analysisPrompt = 'Analyze this file and provide a detailed summary.',
  className,
  showPreviews = true,
  allowCamera = true,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [files]);

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        await handleFiles(pastedFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, files]);

  const isValidFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit`,
      };
    }

    // Check file type
    if (accept && accept.length > 0) {
      const isAccepted = accept.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type || file.type.startsWith(type.replace('*', ''));
      });

      if (!isAccepted) {
        return { valid: false, error: 'File type not supported' };
      }
    } else {
      // Default validation
      const isImage = SUPPORTED_TYPES.image.includes(file.type);
      const isDocument = SUPPORTED_TYPES.document.includes(file.type);
      const isText = SUPPORTED_TYPES.text.includes(file.type);
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isCode = SUPPORTED_TYPES.code.includes(ext);

      if (!isImage && !isDocument && !isText && !isCode) {
        return { valid: false, error: 'File type not supported' };
      }
    }

    return { valid: true };
  };

  const createPreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const handleFiles = async (newFiles: File[]) => {
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const fileItems: FileItem[] = [];

    for (const file of newFiles) {
      const validation = isValidFile(file);

      if (!validation.valid) {
        fileItems.push({
          id: crypto.randomUUID(),
          file,
          status: 'error',
          progress: 0,
          error: validation.error,
        });
      } else {
        fileItems.push({
          id: crypto.randomUUID(),
          file,
          preview: createPreview(file),
          status: 'pending',
          progress: 0,
        });
      }
    }

    setFiles((prev) => [...prev, ...fileItems]);

    // Auto-upload valid files
    for (const item of fileItems) {
      if (item.status === 'pending') {
        await uploadFile(item);
      }
    }
  };

  const uploadFile = async (fileItem: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading' as const } : f))
    );

    try {
      const formData = new FormData();
      formData.append('file', fileItem.file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, progress } : f))
          );
        }
      });

      // Handle completion
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: 'success' as const,
                    progress: 100,
                    uploadedData: response.data,
                  }
                : f
            )
          );

          // Auto-analyze if enabled
          if (autoAnalyze && response.data?.id) {
            await analyzeFile(fileItem.id, response.data.id);
          }

          // Notify parent
          if (onFilesUploaded) {
            const updatedFiles = files.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: 'success' as const,
                    uploadedData: response.data,
                  }
                : f
            );
            onFilesUploaded(updatedFiles);
          }
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f
          )
        );
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: 'error' as const, error: error.message }
            : f
        )
      );
    }
  };

  const analyzeFile = async (fileItemId: string, uploadedFileId: string) => {
    try {
      const response = await fetch(analyzeUrl.replace(':id', uploadedFileId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();

      if (onFileAnalyzed) {
        onFileAnalyzed(uploadedFileId, data.data);
      }
    } catch (error) {
      console.error('File analysis failed:', error);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      await handleFiles(droppedFiles);
    },
    [disabled, files]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await handleFiles(selectedFiles);
      e.target.value = ''; // Reset input
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const openCameraDialog = () => {
    if (!disabled && allowCamera) {
      cameraInputRef.current?.click();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="w-6 h-6" />;
    }
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <Upload
            className={clsx(
              'w-12 h-12 transition-colors',
              isDragging ? 'text-blue-500' : 'text-gray-400'
            )}
          />

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports images, PDFs, text, and code files (max {(maxSize / (1024 * 1024)).toFixed(0)}MB)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              You can also paste files from clipboard (Ctrl+V / Cmd+V)
            </p>
          </div>

          {allowCamera && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCameraDialog();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              disabled={disabled}
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept?.join(',') || '*'}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {allowCamera && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length}/{maxFiles})
          </h3>

          <div className="space-y-2">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                  {showPreviews && item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                      {getFileIcon(item.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(item.file.size)}
                  </p>

                  {/* Progress bar */}
                  {item.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFile(item.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
