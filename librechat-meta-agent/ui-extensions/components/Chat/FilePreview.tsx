'use client';

import { useState, useCallback } from 'react';
import { X, Download, ExternalLink, Loader2, FileText, FileCode, FileIcon, Image as ImageIcon, Eye, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { UploadedFile } from './FileUpload';
import { formatFileSize, FileTypeIcon } from './FileUpload';

interface FilePreviewProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
  onDownload?: (file: UploadedFile) => void;
  onPreview?: (file: UploadedFile) => void;
  layout?: 'horizontal' | 'grid';
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

export function FilePreview({
  files,
  onRemove,
  onDownload,
  onPreview,
  layout = 'horizontal',
  showProgress = true,
  compact = false,
  className,
}: FilePreviewProps) {
  if (files.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div className={clsx('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3', className)}>
        {files.map((file) => (
          <FilePreviewCard
            key={file.id}
            file={file}
            onRemove={() => onRemove(file.id)}
            onDownload={onDownload ? () => onDownload(file) : undefined}
            onPreview={onPreview ? () => onPreview(file) : undefined}
            showProgress={showProgress}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx(
      'flex gap-2 overflow-x-auto pb-2',
      compact ? 'gap-1.5' : 'gap-3',
      className
    )}>
      {files.map((file) => (
        compact ? (
          <FilePreviewCompact
            key={file.id}
            file={file}
            onRemove={() => onRemove(file.id)}
          />
        ) : (
          <FilePreviewItem
            key={file.id}
            file={file}
            onRemove={() => onRemove(file.id)}
            onDownload={onDownload ? () => onDownload(file) : undefined}
            onPreview={onPreview ? () => onPreview(file) : undefined}
            showProgress={showProgress}
          />
        )
      ))}
    </div>
  );
}

// Compact file preview (for inline display)
interface FilePreviewCompactProps {
  file: UploadedFile;
  onRemove: () => void;
}

function FilePreviewCompact({ file, onRemove }: FilePreviewCompactProps) {
  return (
    <div className="relative flex-shrink-0 group">
      {file.type === 'image' && file.preview ? (
        <img
          src={file.preview}
          alt={file.name}
          className="h-16 w-16 object-cover rounded-lg border border-stone-200 dark:border-stone-600"
        />
      ) : (
        <div className="h-16 w-16 bg-stone-100 dark:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-600 flex items-center justify-center">
          <FileTypeIcon type={file.type} mimeType={file.mimeType} className="w-6 h-6" />
        </div>
      )}

      {/* Status overlay */}
      {file.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}

      {file.status === 'error' && (
        <div className="absolute inset-0 bg-red-500/30 rounded-lg flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 p-1 bg-stone-900 dark:bg-stone-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
      >
        <X className="w-3 h-3 text-white dark:text-stone-900" />
      </button>
    </div>
  );
}

// Standard file preview item
interface FilePreviewItemProps {
  file: UploadedFile;
  onRemove: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  showProgress?: boolean;
}

function FilePreviewItem({ file, onRemove, onDownload, onPreview, showProgress }: FilePreviewItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={clsx(
        'relative h-20 w-20 rounded-xl border overflow-hidden transition-all duration-200',
        file.status === 'error'
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
          : 'border-stone-200 dark:border-stone-600 bg-stone-100 dark:bg-stone-700'
      )}>
        {/* Image preview */}
        {file.type === 'image' && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-2">
            <FileTypeIcon type={file.type} mimeType={file.mimeType} className="w-8 h-8" />
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 truncate max-w-full px-1">
              {file.name.split('.').pop()?.toUpperCase()}
            </p>
          </div>
        )}

        {/* Upload progress */}
        {showProgress && file.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-xs text-white mt-1">{file.progress}%</span>
          </div>
        )}

        {/* Error state */}
        {file.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
        )}

        {/* Hover overlay with actions */}
        {file.status === 'complete' && isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1">
            {onPreview && file.type === 'image' && (
              <button
                onClick={onPreview}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 p-1.5 bg-stone-900 dark:bg-stone-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
      >
        <X className="w-3 h-3 text-white dark:text-stone-900" />
      </button>

      {/* File name tooltip on hover */}
      {isHovered && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs px-2 py-1 rounded-lg whitespace-nowrap max-w-[200px] truncate shadow-lg z-10">
          {file.name}
        </div>
      )}
    </div>
  );
}

// Card-style file preview for grid layout
interface FilePreviewCardProps {
  file: UploadedFile;
  onRemove: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  showProgress?: boolean;
}

function FilePreviewCard({ file, onRemove, onDownload, onPreview, showProgress }: FilePreviewCardProps) {
  return (
    <div className={clsx(
      'relative rounded-xl border overflow-hidden transition-all duration-200 group',
      file.status === 'error'
        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
        : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 hover:shadow-md'
    )}>
      {/* Preview area */}
      <div className="h-32 bg-stone-100 dark:bg-stone-700 relative">
        {file.type === 'image' && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <FileTypeIcon type={file.type} mimeType={file.mimeType} className="w-12 h-12" />
          </div>
        )}

        {/* Upload progress overlay */}
        {showProgress && file.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <div className="w-3/4 h-1.5 bg-white/30 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
            <span className="text-xs text-white mt-1">{file.progress}%</span>
          </div>
        )}

        {/* Error overlay */}
        {file.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <span className="text-xs text-red-500 mt-2 px-2 text-center">{file.error || 'Upload failed'}</span>
          </div>
        )}

        {/* Hover actions */}
        {file.status === 'complete' && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onPreview && file.type === 'image' && (
              <button
                onClick={onPreview}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-5 h-5 text-white" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            )}
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-3">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        <X className="w-4 h-4 text-stone-500" />
      </button>
    </div>
  );
}

// Image lightbox modal for full preview
interface ImageLightboxProps {
  file: UploadedFile | null;
  onClose: () => void;
}

export function ImageLightbox({ file, onClose }: ImageLightboxProps) {
  if (!file || file.type !== 'image') return null;

  const imageUrl = file.url || file.preview;
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image */}
      <img
        src={imageUrl}
        alt={file.name}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {/* File info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
        <p className="text-white text-sm font-medium">{file.name}</p>
        <p className="text-white/70 text-xs">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
}

export default FilePreview;
