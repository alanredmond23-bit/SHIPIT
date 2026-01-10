'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  History,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  GitBranch,
  Image as ImageIcon,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Edit3,
} from 'lucide-react';
import clsx from 'clsx';
import type { Artifact, ArtifactVersion } from '@/hooks/useArtifacts';
import ArtifactPreview from './ArtifactPreview';
import { generateFilename, getMimeType, type CodeLanguage } from '@/lib/artifacts';

// ============================================================================
// Types
// ============================================================================

export interface ArtifactPanelProps {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  selectedVersion?: ArtifactVersion | null;
  isOpen: boolean;
  isFullscreen: boolean;
  onClose: () => void;
  onSelectArtifact: (id: string) => void;
  onCloseArtifact: (id: string) => void;
  onRemoveArtifact: (id: string) => void;
  onToggleFullscreen: () => void;
  onSelectVersion: (versionId: string | null) => void;
  onRevertToVersion: (artifactId: string, versionId: string) => void;
  onOpenInEditor?: (artifact: Artifact) => void;
  className?: string;
}

// ============================================================================
// Artifact Tab Component
// ============================================================================

interface ArtifactTabProps {
  artifact: Artifact;
  isSelected: boolean;
  onClick: () => void;
  onClose?: () => void;
}

function ArtifactTab({ artifact, isSelected, onClick, onClose }: ArtifactTabProps) {
  const Icon = useMemo(() => {
    switch (artifact.type) {
      case 'html':
      case 'svg':
        return ImageIcon;
      case 'markdown':
        return FileText;
      case 'mermaid':
        return GitBranch;
      default:
        return Code2;
    }
  }, [artifact.type]);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg border-b-2 transition-all min-w-0 max-w-[200px]',
        isSelected
          ? 'bg-white dark:bg-stone-800 border-teal-500 text-stone-900 dark:text-white'
          : 'bg-stone-100 dark:bg-stone-900 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
      )}
    >
      <Icon className={clsx('w-4 h-4 flex-shrink-0', isSelected && 'text-teal-500')} />
      <span className="truncate">{artifact.title}</span>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </button>
  );
}

// ============================================================================
// Version History Panel
// ============================================================================

interface VersionHistoryPanelProps {
  versions: ArtifactVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string | null) => void;
  onRevertToVersion: (versionId: string) => void;
  onClose: () => void;
}

function VersionHistoryPanel({
  versions,
  selectedVersionId,
  onSelectVersion,
  onRevertToVersion,
  onClose,
}: VersionHistoryPanelProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-stone-800 border-l border-stone-200 dark:border-stone-700 flex flex-col z-10 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Version History</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
        >
          <X className="w-4 h-4 text-stone-500" />
        </button>
      </div>

      {/* Versions list */}
      <div className="flex-1 overflow-y-auto p-2">
        {versions.slice().reverse().map((version, index) => {
          const isLatest = index === 0;
          const isSelected = version.id === selectedVersionId;

          return (
            <div
              key={version.id}
              className={clsx(
                'p-3 rounded-lg mb-2 cursor-pointer transition-colors',
                isSelected
                  ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-700/50 border border-transparent'
              )}
              onClick={() => onSelectVersion(isSelected ? null : version.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Version {versions.length - index}
                </span>
                {isLatest && (
                  <span className="text-[10px] font-medium text-teal-600 bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded">
                    Latest
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                {version.changeDescription || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">
                  {version.timestamp.toLocaleString()}
                </span>
                {!isLatest && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevertToVersion(version.id);
                    }}
                    className="text-[10px] text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ArtifactPanel({
  artifacts,
  activeArtifact,
  selectedVersion = null,
  isOpen,
  isFullscreen,
  onClose,
  onSelectArtifact,
  onCloseArtifact,
  onRemoveArtifact,
  onToggleFullscreen,
  onSelectVersion,
  onRevertToVersion,
  onOpenInEditor,
  className,
}: ArtifactPanelProps) {
  // Don't render if panel is closed
  if (!isOpen) return null;
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Get current content (selected version or latest)
  const currentContent = useMemo(() => {
    if (selectedVersion) {
      return selectedVersion.content;
    }
    return activeArtifact?.content || '';
  }, [activeArtifact, selectedVersion]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [currentContent, activeArtifact]);

  // Download artifact
  const handleDownload = useCallback(() => {
    if (!activeArtifact) return;

    const filename = generateFilename(
      activeArtifact.title,
      activeArtifact.type,
      activeArtifact.language
    );
    const mimeType = getMimeType(
      activeArtifact.type,
      activeArtifact.language
    );

    const blob = new Blob([currentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeArtifact, currentContent]);

  // Navigate between artifacts
  const currentIndex = useMemo(() => {
    if (!activeArtifact) return -1;
    return artifacts.findIndex(a => a.id === activeArtifact.id);
  }, [artifacts, activeArtifact]);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < artifacts.length - 1;

  const handleNavigatePrev = useCallback(() => {
    if (canNavigatePrev) {
      onSelectArtifact(artifacts[currentIndex - 1].id);
      onSelectVersion(null);
    }
  }, [canNavigatePrev, artifacts, currentIndex, onSelectArtifact, onSelectVersion]);

  const handleNavigateNext = useCallback(() => {
    if (canNavigateNext) {
      onSelectArtifact(artifacts[currentIndex + 1].id);
      onSelectVersion(null);
    }
  }, [canNavigateNext, artifacts, currentIndex, onSelectArtifact, onSelectVersion]);

  // Handle open in editor
  const handleOpenInEditor = useCallback(() => {
    if (activeArtifact && onOpenInEditor) {
      onOpenInEditor(activeArtifact);
    }
  }, [activeArtifact, onOpenInEditor]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (activeArtifact) {
      onRemoveArtifact(activeArtifact.id);
    }
    setShowMenu(false);
  }, [activeArtifact, onRemoveArtifact]);

  if (!activeArtifact) {
    return (
      <div className={clsx(
        'flex flex-col bg-white dark:bg-stone-800 border-l border-stone-200 dark:border-stone-700',
        isFullscreen ? 'fixed inset-0 z-50' : 'w-[480px]',
        className
      )}>
        <div className="flex-1 flex items-center justify-center text-stone-500">
          <div className="text-center">
            <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No artifact selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'flex flex-col bg-white dark:bg-stone-800 border-l border-stone-200 dark:border-stone-700 relative',
      isFullscreen ? 'fixed inset-0 z-50' : 'w-[480px]',
      className
    )}>
      {/* Tab bar */}
      {artifacts.length > 1 && (
        <div className="flex items-center gap-1 px-2 pt-2 bg-stone-100 dark:bg-stone-900 overflow-x-auto">
          {artifacts.map(artifact => (
            <ArtifactTab
              key={artifact.id}
              artifact={artifact}
              isSelected={artifact.id === activeArtifact.id}
              onClick={() => {
                onSelectArtifact(artifact.id);
                onSelectVersion(null);
              }}
              onClose={() => onCloseArtifact(artifact.id)}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <div className="flex items-center gap-3 min-w-0">
          {/* Navigation arrows */}
          {artifacts.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleNavigatePrev}
                disabled={!canNavigatePrev}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-stone-500" />
              </button>
              <span className="text-xs text-stone-400">
                {currentIndex + 1} / {artifacts.length}
              </span>
              <button
                onClick={handleNavigateNext}
                disabled={!canNavigateNext}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          )}

          {/* Title */}
          <h3 className="font-medium text-stone-900 dark:text-white truncate">
            {activeArtifact.title}
          </h3>

          {/* Version indicator */}
          {selectedVersion && (
            <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
              Viewing older version
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Version history */}
          {activeArtifact.versions.length > 1 && (
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                showVersionHistory
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              )}
              title="Version history"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open in editor */}
          {onOpenInEditor && (
            <button
              onClick={handleOpenInEditor}
              className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
              title="Open in Editor"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-50 py-1">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Artifact
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-auto p-4 bg-stone-50 dark:bg-stone-900">
          <ArtifactPreview
            content={currentContent}
            type={activeArtifact.type}
            language={activeArtifact.language}
            title={activeArtifact.title}
            maxHeight={isFullscreen ? 'calc(100vh - 150px)' : '100%'}
          />
        </div>

        {/* Version history sidebar */}
        {showVersionHistory && (
          <VersionHistoryPanel
            versions={activeArtifact.versions}
            selectedVersionId={selectedVersion?.id || null}
            onSelectVersion={onSelectVersion}
            onRevertToVersion={(versionId) => {
              onRevertToVersion(activeArtifact.id, versionId);
              setShowVersionHistory(false);
            }}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
      </div>
    </div>
  );
}

export default ArtifactPanel;
