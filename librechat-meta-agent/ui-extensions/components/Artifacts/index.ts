/**
 * Artifacts Module
 *
 * Complete artifact/canvas system similar to Claude's Artifacts feature.
 *
 * Features:
 * - Code display with syntax highlighting
 * - Copy, download, and run buttons
 * - Language selector with 25+ languages
 * - Line numbers
 * - Sliding panel with version history
 * - Edit mode with save/discard
 * - Mobile-friendly with touch interactions
 * - Fullscreen mode
 */

export { default as CodeArtifact } from './CodeArtifact';
export type { CodeArtifactProps, CodeLanguage } from './CodeArtifact';

export { default as ArtifactPanel } from './ArtifactPanel';
export type {
  ArtifactPanelProps,
  Artifact,
  ArtifactType,
  ArtifactVersion,
} from './ArtifactPanel';
