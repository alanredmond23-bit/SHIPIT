'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import mermaid from 'mermaid';
import {
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface MermaidArtifactProps {
  content: string;
  title?: string;
  maxHeight?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  className?: string;
}

type ViewMode = 'preview' | 'code';

// ============================================================================
// Initialize Mermaid
// ============================================================================

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    themeVariables: {
      primaryColor: '#14b8a6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#0d9488',
      lineColor: '#64748b',
      secondaryColor: '#475569',
      tertiaryColor: '#1e293b',
      background: '#1e1e1e',
      mainBkg: '#1e293b',
      secondBkg: '#475569',
      tertiaryBkg: '#0f172a',
      nodeBorder: '#64748b',
      clusterBkg: '#1e293b',
      clusterBorder: '#475569',
      defaultLinkColor: '#64748b',
      titleColor: '#f8fafc',
      edgeLabelBackground: '#1e293b',
    },
  });

  mermaidInitialized = true;
}

// ============================================================================
// Component
// ============================================================================

export function MermaidArtifact({
  content,
  title = 'Diagram',
  maxHeight = '500px',
  onCopy,
  onDownload,
  className,
}: MermaidArtifactProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      initMermaid();
      setIsLoading(true);
      setError(null);

      const currentRenderId = ++renderIdRef.current;
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        const { svg } = await mermaid.render(diagramId, content.trim());

        // Check if this is still the latest render request
        if (currentRenderId !== renderIdRef.current) return;

        setSvgContent(svg);
        setIsLoading(false);
      } catch (err: any) {
        if (currentRenderId !== renderIdRef.current) return;

        console.error('Mermaid render error:', err);
        setError(err.message || 'Failed to render diagram');
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [content]);

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

  // Download as SVG
  const handleDownloadSvg = useCallback(() => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  }, [svgContent, title, onDownload]);

  // Download as PNG
  const handleDownloadPng = useCallback(async () => {
    if (!svgContent) return;

    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Set canvas size with some padding
          canvas.width = img.width * 2;
          canvas.height = img.height * 2;

          // Fill white background
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Scale for better quality
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);

          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to download PNG:', error);
    }
  }, [svgContent, title]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

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

          {/* Zoom controls (preview mode only) */}
          {viewMode === 'preview' && !error && (
            <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-stone-400 hover:text-stone-300 rounded-md transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-stone-400 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-stone-400 hover:text-stone-300 rounded-md transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-stone-400 hover:text-stone-300 rounded-md transition-colors"
                title="Reset zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors"
            title="Copy Mermaid code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download SVG button */}
          <button
            onClick={handleDownloadSvg}
            disabled={!svgContent || !!error}
            className="p-1.5 text-stone-400 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {viewMode === 'preview' ? (
          <div
            ref={containerRef}
            className="flex items-center justify-center p-6 min-h-[200px] bg-[#1e1e1e]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-stone-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Rendering diagram...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-center p-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <div className="text-red-400 text-sm font-medium">Failed to render diagram</div>
                <div className="text-stone-500 text-xs max-w-md">{error}</div>
                <button
                  onClick={() => setViewMode('code')}
                  className="mt-2 px-3 py-1.5 text-xs bg-stone-800 text-stone-300 hover:bg-stone-700 rounded-md transition-colors"
                >
                  View Code
                </button>
              </div>
            ) : (
              <div
                className="transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-stone-300 bg-[#1a1a1a] overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export default MermaidArtifact;
