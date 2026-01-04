'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  RotateCcw,
  History,
  FileText,
  Code2,
  Image,
  Database,
  Clock,
  Check,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import CodeArtifact, { CodeLanguage } from './CodeArtifact';

/**
 * Artifact types
 */
export type ArtifactType = 'code' | 'document' | 'diagram' | 'data';

/**
 * Artifact data structure
 */
export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  filename?: string;
  content: string;
  language?: CodeLanguage;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  description?: string;
}

/**
 * Version history entry
 */
export interface ArtifactVersion {
  version: number;
  content: string;
  timestamp: Date;
  description?: string;
}

export interface ArtifactPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Current artifact to display */
  artifact?: Artifact;
  /** Version history for the artifact */
  versions?: ArtifactVersion[];
  /** Callback when artifact content changes */
  onSave?: (artifactId: string, newContent: string) => void;
  /** Callback when version is restored */
  onRestoreVersion?: (artifactId: string, version: number) => void;
  /** Callback when artifact is run (for code) */
  onRun?: (artifactId: string, code: string) => void;
  /** Panel position */
  position?: 'right' | 'bottom';
  /** Whether to allow editing */
  allowEdit?: boolean;
}

/**
 * Sliding panel for displaying and managing artifacts
 * Features: version history, edit mode, save/discard changes
 */
export default function ArtifactPanel({
  isOpen,
  onClose,
  artifact,
  versions = [],
  onSave,
  onRestoreVersion,
  onRun,
  position = 'right',
  allowEdit = true,
}: ArtifactPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);

  // Sync artifact content when changed
  useEffect(() => {
    if (artifact) {
      setEditedContent(artifact.content);
      setHasUnsavedChanges(false);
      setIsEditing(false);
      setSelectedVersion(null);
    }
  }, [artifact]);

  // Handle touch gestures for closing panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = position === 'right'
        ? e.touches[0].clientX
        : e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (position === 'right') {
        const touchX = e.touches[0].clientX;
        const diff = touchX - touchStartRef.current;
        if (diff > 100) {
          onClose();
        }
      } else {
        const touchY = e.touches[0].clientY;
        const diff = touchY - touchStartRef.current;
        if (diff > 100) {
          onClose();
        }
      }
    };

    const panel = panelRef.current;
    panel.addEventListener('touchstart', handleTouchStart);
    panel.addEventListener('touchmove', handleTouchMove);

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, position, onClose]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    setHasUnsavedChanges(newContent !== artifact?.content);
  };

  // Handle save
  const handleSave = () => {
    if (!artifact || !hasUnsavedChanges) return;

    onSave?.(artifact.id, editedContent);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  // Handle discard changes
  const handleDiscard = () => {
    if (!artifact) return;

    setEditedContent(artifact.content);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  // Handle version restore
  const handleRestoreVersion = (version: number) => {
    if (!artifact) return;

    const versionData = versions.find((v) => v.version === version);
    if (versionData) {
      setEditedContent(versionData.content);
      setSelectedVersion(version);
      setHasUnsavedChanges(true);
      setShowVersionHistory(false);
    }
  };

  // Handle run code
  const handleRun = (code: string) => {
    if (!artifact) return;
    onRun?.(artifact.id, code);
  };

  // Get icon for artifact type
  const getTypeIcon = (type: ArtifactType) => {
    switch (type) {
      case 'code':
        return <Code2 className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'diagram':
        return <Image className="w-5 h-5" />;
      case 'data':
        return <Database className="w-5 h-5" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  if (!artifact) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed bg-white border-stone-200 z-50 flex flex-col transition-transform duration-300 ease-out',
          position === 'right' && [
            'top-0 right-0 bottom-0 w-full sm:w-[600px] md:w-[700px] lg:w-[800px] border-l',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          ],
          position === 'bottom' && [
            'left-0 right-0 bottom-0 h-[85vh] sm:h-[80vh] border-t rounded-t-3xl',
            isOpen ? 'translate-y-0' : 'translate-y-full',
          ]
        )}
      >
        {/* Swipe Handle (mobile) */}
        {position === 'bottom' && (
          <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto my-3 sm:hidden" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
              {getTypeIcon(artifact.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{artifact.title}</h2>
              {artifact.description && (
                <p className="text-sm text-stone-500 truncate">{artifact.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Version History Button */}
            {versions.length > 0 && (
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className={clsx(
                  'p-2 rounded-lg transition-colors tap-target',
                  showVersionHistory
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'bg-stone-100 hover:bg-stone-200'
                )}
                aria-label="Version history"
              >
                <History className="w-5 h-5" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors tap-target"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-stone-100/30 border-b border-stone-200/50 text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Updated {formatTimestamp(artifact.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>v{artifact.version}</span>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-400">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Artifact Display */}
          <div className={clsx(
            'flex-1 overflow-auto scroll-container',
            showVersionHistory && 'hidden sm:block sm:w-2/3'
          )}>
            <div className="p-4">
              {artifact.type === 'code' ? (
                <CodeArtifact
                  id={artifact.id}
                  content={editedContent}
                  language={artifact.language}
                  filename={artifact.filename}
                  title={artifact.title}
                  editable={isEditing && allowEdit}
                  onChange={handleContentChange}
                  onRun={artifact.type === 'code' ? handleRun : undefined}
                  showLineNumbers={true}
                  maxHeight="calc(100vh - 300px)"
                />
              ) : (
                <div className="card">
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{editedContent}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Version History Sidebar */}
          {showVersionHistory && (
            <div className={clsx(
              'w-full sm:w-1/3 border-l border-stone-200 bg-white/50 overflow-auto scroll-container',
              'sm:block'
            )}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Version History</h3>
                  <button
                    onClick={() => setShowVersionHistory(false)}
                    className="sm:hidden p-2 hover:bg-stone-100 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.version}
                      className={clsx(
                        'p-3 rounded-xl border transition-colors cursor-pointer',
                        selectedVersion === version.version
                          ? 'bg-indigo-600/20 border-indigo-600'
                          : version.version === artifact.version
                          ? 'bg-stone-100/50 border-stone-200'
                          : 'bg-stone-100/30 border-stone-200/50 hover:bg-stone-100/50'
                      )}
                      onClick={() => handleRestoreVersion(version.version)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">v{version.version}</span>
                            {version.version === artifact.version && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">
                            {formatTimestamp(version.timestamp)}
                          </p>
                          {version.description && (
                            <p className="text-sm text-stone-700 mt-2 line-clamp-2">
                              {version.description}
                            </p>
                          )}
                        </div>
                        {selectedVersion === version.version && (
                          <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}

                  {versions.length === 0 && (
                    <div className="text-center py-8 text-stone-400">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No version history yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-stone-200 bg-white/95 backdrop-blur-sm pb-[calc(0.75rem+var(--safe-area-inset-bottom))]">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-colors tap-target"
              >
                <XCircle className="w-5 h-5" />
                <span>Discard</span>
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-stone-200 disabled:text-stone-400 rounded-xl font-medium transition-colors tap-target"
              >
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {allowEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors tap-target"
                >
                  <Edit3 className="w-5 h-5" />
                  <span>Edit</span>
                </button>
              )}
              {selectedVersion !== null && selectedVersion !== artifact.version && (
                <button
                  onClick={() => {
                    onRestoreVersion?.(artifact.id, selectedVersion);
                    setSelectedVersion(null);
                    setShowVersionHistory(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors tap-target"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Restore v{selectedVersion}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
