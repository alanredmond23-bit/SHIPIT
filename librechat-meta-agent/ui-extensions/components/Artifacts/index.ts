/**
 * Artifacts Module
 *
 * Complete artifact/canvas system for Meta Agent Desktop.
 * Displays code, documents, diagrams, and HTML that Claude generates.
 *
 * Features:
 * - Code display with syntax highlighting for 25+ languages
 * - HTML/CSS/JS preview in sandboxed iframe
 * - Mermaid diagram rendering
 * - Markdown preview with GFM support
 * - Version history tracking
 * - Copy, download, and fullscreen actions
 * - Open in Editor placeholder (future VSCode integration)
 * - Responsive split-pane layout
 * - Tabbed interface for multiple artifacts
 * - Dark theme matching overall design
 */

// Main components
export { default as ArtifactPanel } from './ArtifactPanel';
export type { ArtifactPanelProps } from './ArtifactPanel';

export { default as ArtifactPreview } from './ArtifactPreview';
export type { ArtifactPreviewProps } from './ArtifactPreview';

export { default as CodeArtifact } from './CodeArtifact';
export type { CodeArtifactProps } from './CodeArtifact';

export { default as HtmlArtifact } from './HtmlArtifact';
export type { HtmlArtifactProps } from './HtmlArtifact';

export { default as MermaidArtifact } from './MermaidArtifact';
export type { MermaidArtifactProps } from './MermaidArtifact';

export { default as MarkdownArtifact } from './MarkdownArtifact';
export type { MarkdownArtifactProps } from './MarkdownArtifact';

// Re-export types from artifacts lib
export type { ArtifactType, CodeLanguage } from '@/lib/artifacts';

// Re-export hook types
export type { Artifact, ArtifactVersion, UseArtifactsReturn } from '@/hooks/useArtifacts';
