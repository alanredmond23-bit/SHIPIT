'use client';

import React, { useMemo } from 'react';
import { detectArtifactType, detectLanguage, type ArtifactType, type CodeLanguage } from '@/lib/artifacts';
import CodeArtifact from './CodeArtifact';
import HtmlArtifact from './HtmlArtifact';
import MermaidArtifact from './MermaidArtifact';
import MarkdownArtifact from './MarkdownArtifact';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface ArtifactPreviewProps {
  content: string;
  type?: ArtifactType;
  language?: CodeLanguage;
  title?: string;
  filename?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  onCopy?: () => void;
  onDownload?: () => void;
  onOpenInEditor?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ArtifactPreview({
  content,
  type: providedType,
  language: providedLanguage,
  title,
  filename,
  maxHeight = '500px',
  showLineNumbers = true,
  onCopy,
  onDownload,
  onOpenInEditor,
  className,
}: ArtifactPreviewProps) {
  // Detect artifact type if not provided
  const artifactType = useMemo(() => {
    if (providedType) return providedType;
    return detectArtifactType(content, filename);
  }, [content, providedType, filename]);

  // Detect language for code artifacts
  const language = useMemo(() => {
    if (providedLanguage) return providedLanguage;
    if (artifactType === 'code' || artifactType === 'json') {
      return detectLanguage(content, filename);
    }
    return undefined;
  }, [content, providedLanguage, artifactType, filename]);

  // Render appropriate artifact component
  switch (artifactType) {
    case 'mermaid':
      return (
        <MermaidArtifact
          content={content}
          title={title || 'Diagram'}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          className={className}
        />
      );

    case 'html':
      return (
        <HtmlArtifact
          content={content}
          title={title || 'HTML Preview'}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          className={className}
        />
      );

    case 'markdown':
      return (
        <MarkdownArtifact
          content={content}
          title={title || 'Document'}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          className={className}
        />
      );

    case 'svg':
      // SVG can be rendered as HTML
      return (
        <HtmlArtifact
          content={content}
          title={title || 'SVG Image'}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          className={className}
        />
      );

    case 'json':
      // JSON is rendered as code with JSON language
      return (
        <CodeArtifact
          content={content}
          language="json"
          filename={filename}
          title={title || 'JSON'}
          showLineNumbers={showLineNumbers}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          onOpenInEditor={onOpenInEditor}
          className={className}
        />
      );

    case 'code':
    case 'text':
    default:
      return (
        <CodeArtifact
          content={content}
          language={language}
          filename={filename}
          title={title || 'Code'}
          showLineNumbers={showLineNumbers}
          maxHeight={maxHeight}
          onCopy={onCopy}
          onDownload={onDownload}
          onOpenInEditor={onOpenInEditor}
          className={className}
        />
      );
  }
}

export default ArtifactPreview;
