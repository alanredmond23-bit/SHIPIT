'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Code2,
  Eye,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface HtmlArtifactProps {
  content: string;
  title?: string;
  maxHeight?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  className?: string;
}

type ViewMode = 'preview' | 'code';
type DeviceSize = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceSize, { width: number; label: string }> = {
  desktop: { width: 0, label: 'Desktop (Full)' },
  tablet: { width: 768, label: 'Tablet (768px)' },
  mobile: { width: 375, label: 'Mobile (375px)' },
};

// ============================================================================
// Component
// ============================================================================

export function HtmlArtifact({
  content,
  title = 'HTML Preview',
  maxHeight = '500px',
  onCopy,
  onDownload,
  className,
}: HtmlArtifactProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Wrap content in full HTML document if needed
  const fullHtmlContent = useMemo(() => {
    const trimmed = content.trim();

    // Check if it's already a full HTML document
    if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
      return content;
    }

    // Check if it has a body tag
    if (trimmed.toLowerCase().includes('<body')) {
      return `<!DOCTYPE html><html>${content}</html>`;
    }

    // Wrap in basic HTML structure with styles
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
  }, [content]);

  // Create blob URL for iframe
  const blobUrl = useMemo(() => {
    const blob = new Blob([fullHtmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [fullHtmlContent, key]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [content, onCopy]);

  // Download HTML file
  const handleDownload = useCallback(() => {
    const blob = new Blob([fullHtmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  }, [fullHtmlContent, title, onDownload]);

  // Refresh preview
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Open in new tab
  const handleOpenInNewTab = useCallback(() => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(fullHtmlContent);
      newWindow.document.close();
    }
  }, [fullHtmlContent]);

  // Get device icon
  const DeviceIcon = useMemo(() => {
    switch (deviceSize) {
      case 'tablet':
        return Tablet;
      case 'mobile':
        return Smartphone;
      default:
        return Monitor;
    }
  }, [deviceSize]);

  return (
    <div className={clsx('rounded-xl overflow-hidden bg-stone-900 border border-stone-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-3">
          {/* Title */}
          <span className="text-sm font-medium text-stone-300">{title}</span>

          {/* View mode toggle */}
          <div className="flex items-center bg-stone-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors',
                viewMode === 'preview'
                  ? 'bg-teal-600 text-white'
                  : 'text-stone-400 hover:text-stone-300'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors',
                viewMode === 'code'
                  ? 'bg-teal-600 text-white'
                  : 'text-stone-400 hover:text-stone-300'
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>

          {/* Device size selector (only in preview mode) */}
          {viewMode === 'preview' && (
            <div className="flex items-center bg-stone-800 rounded-lg p-0.5">
              {(Object.entries(DEVICE_SIZES) as [DeviceSize, { width: number; label: string }][]).map(
                ([size, config]) => {
                  const Icon = size === 'tablet' ? Tablet : size === 'mobile' ? Smartphone : Monitor;
                  return (
                    <button
                      key={size}
                      onClick={() => setDeviceSize(size)}
                      className={clsx(
                        'p-1.5 rounded-md transition-colors',
                        deviceSize === size
                          ? 'bg-stone-700 text-teal-400'
                          : 'text-stone-500 hover:text-stone-400'
                      )}
                      title={config.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Refresh (preview mode only) */}
          {viewMode === 'preview' && (
            <button
              onClick={handleRefresh}
              className={clsx(
                'p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors',
                isRefreshing && 'animate-spin'
              )}
              title="Refresh preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Copy HTML"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Download HTML"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open in new tab */}
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="overflow-auto bg-white"
        style={{ maxHeight }}
      >
        {viewMode === 'preview' ? (
          <div
            className="flex justify-center p-4 min-h-[200px]"
            style={{
              backgroundColor: '#f5f5f5',
            }}
          >
            <div
              className="bg-white shadow-lg transition-all duration-300"
              style={{
                width: deviceSize === 'desktop'
                  ? '100%'
                  : `${DEVICE_SIZES[deviceSize].width}px`,
                minHeight: '200px',
              }}
            >
              <iframe
                ref={iframeRef}
                key={key}
                src={blobUrl}
                title={title}
                className="w-full h-full border-0"
                style={{ minHeight: '300px' }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-stone-800 bg-stone-50 overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export default HtmlArtifact;
