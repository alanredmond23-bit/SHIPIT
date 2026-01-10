'use client';

/**
 * EditMessage Component
 * Inline editor for editing user messages with branch creation
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Check,
  X,
  GitFork,
  Eye,
  EyeOff,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileEdit,
} from 'lucide-react';
import clsx from 'clsx';
import type { EditingState, EditMessageOptions } from '@/types/branching';

// ============================================================================
// Types
// ============================================================================

interface EditMessageProps {
  /** Original message content */
  originalContent: string;
  /** Current edited content */
  editedContent: string;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Handler for content changes */
  onContentChange: (content: string) => void;
  /** Handler for saving the edit */
  onSave: (createNewBranch: boolean) => void;
  /** Handler for canceling the edit */
  onCancel: () => void;
  /** Whether to show diff view */
  showDiff?: boolean;
  /** Handler for toggling diff view */
  onToggleDiff?: () => void;
  /** Error message if save failed */
  error?: string | null;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum height of the editor */
  maxHeight?: number;
  /** Whether to auto-focus the editor */
  autoFocus?: boolean;
  /** Whether to select all text on focus */
  selectAllOnFocus?: boolean;
  /** Additional class names */
  className?: string;
}

interface DiffViewProps {
  original: string;
  edited: string;
  className?: string;
}

// ============================================================================
// DiffView Component
// ============================================================================

function DiffView({ original, edited, className }: DiffViewProps) {
  // Simple word-level diff
  const diff = useMemo(() => {
    const originalWords = original.split(/(\s+)/);
    const editedWords = edited.split(/(\s+)/);

    const result: Array<{ text: string; type: 'same' | 'removed' | 'added' }> = [];

    // Simple LCS-based diff for highlighting changes
    let i = 0;
    let j = 0;

    while (i < originalWords.length || j < editedWords.length) {
      if (i >= originalWords.length) {
        // Rest of edited is added
        result.push({ text: editedWords[j], type: 'added' });
        j++;
      } else if (j >= editedWords.length) {
        // Rest of original is removed
        result.push({ text: originalWords[i], type: 'removed' });
        i++;
      } else if (originalWords[i] === editedWords[j]) {
        // Same word
        result.push({ text: originalWords[i], type: 'same' });
        i++;
        j++;
      } else {
        // Look ahead to see if it's a replacement or insertion/deletion
        const foundInEdited = editedWords.slice(j).indexOf(originalWords[i]);
        const foundInOriginal = originalWords.slice(i).indexOf(editedWords[j]);

        if (foundInEdited === -1 && foundInOriginal === -1) {
          // Replacement
          result.push({ text: originalWords[i], type: 'removed' });
          result.push({ text: editedWords[j], type: 'added' });
          i++;
          j++;
        } else if (foundInEdited !== -1 && (foundInOriginal === -1 || foundInEdited <= foundInOriginal)) {
          // Additions in edited
          while (j < editedWords.length && editedWords[j] !== originalWords[i]) {
            result.push({ text: editedWords[j], type: 'added' });
            j++;
          }
        } else {
          // Deletions from original
          while (i < originalWords.length && originalWords[i] !== editedWords[j]) {
            result.push({ text: originalWords[i], type: 'removed' });
            i++;
          }
        }
      }
    }

    return result;
  }, [original, edited]);

  return (
    <div
      className={clsx(
        'p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3 text-sm text-stone-500 dark:text-stone-400">
        <Eye className="w-4 h-4" />
        <span>Changes preview</span>
      </div>

      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {diff.map((part, index) => (
          <span
            key={index}
            className={clsx(
              part.type === 'removed' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through',
              part.type === 'added' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            )}
          >
            {part.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EditMessage({
  originalContent,
  editedContent,
  isSaving,
  onContentChange,
  onSave,
  onCancel,
  showDiff = false,
  onToggleDiff,
  error = null,
  placeholder = 'Enter your message...',
  maxHeight = 300,
  autoFocus = true,
  selectAllOnFocus = true,
  className,
}: EditMessageProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [createBranch, setCreateBranch] = useState(true);

  // Track if content has changed
  useEffect(() => {
    setHasChanges(editedContent !== originalContent);
  }, [editedContent, originalContent]);

  // Auto-focus and select on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      if (selectAllOnFocus) {
        textareaRef.current.select();
      }
    }
  }, [autoFocus, selectAllOnFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [editedContent, maxHeight]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (hasChanges && !isSaving) {
        onSave(createBranch);
      }
    }

    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [hasChanges, isSaving, createBranch, onSave, onCancel]);

  // Reset to original
  const handleReset = useCallback(() => {
    onContentChange(originalContent);
  }, [originalContent, onContentChange]);

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Editor header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          <FileEdit className="w-4 h-4" />
          <span>Editing message</span>
          {hasChanges && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              Modified
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Diff toggle */}
          {onToggleDiff && hasChanges && (
            <button
              onClick={onToggleDiff}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg transition-colors',
                showDiff
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              )}
            >
              {showDiff ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide diff
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Show diff
                </>
              )}
            </button>
          )}

          {/* Reset button */}
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Textarea editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={clsx(
            'w-full px-4 py-3 text-sm bg-white dark:bg-stone-900 border rounded-xl resize-none transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
            error
              ? 'border-red-300 dark:border-red-700'
              : 'border-stone-200 dark:border-stone-700',
            isSaving && 'opacity-50 cursor-not-allowed'
          )}
          style={{ maxHeight: `${maxHeight}px` }}
        />

        {/* Character count */}
        <div className="absolute bottom-2 right-3 text-xs text-stone-400 dark:text-stone-500">
          {editedContent.length} characters
        </div>
      </div>

      {/* Diff view */}
      {showDiff && hasChanges && (
        <DiffView original={originalContent} edited={editedContent} />
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Branch option */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={createBranch}
            onChange={(e) => setCreateBranch(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-teal-500 focus:ring-teal-500"
          />
          <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
            <GitFork className="w-4 h-4" />
            Create new branch (preserve original)
          </span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
            'hover:bg-stone-200 dark:hover:bg-stone-700',
            isSaving && 'opacity-50 cursor-not-allowed'
          )}
        >
          <X className="w-4 h-4" />
          Cancel
        </button>

        <button
          onClick={() => onSave(createBranch)}
          disabled={!hasChanges || isSaving}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-teal-500 text-white',
            hasChanges && !isSaving
              ? 'hover:bg-teal-600'
              : 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save & {createBranch ? 'Branch' : 'Update'}
            </>
          )}
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-stone-400 dark:text-stone-500 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-stone-600 dark:text-stone-400">Cmd+Enter</kbd> to save
        or <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-stone-600 dark:text-stone-400">Esc</kbd> to cancel
      </div>
    </div>
  );
}

// ============================================================================
// Inline Edit Wrapper
// ============================================================================

interface InlineEditMessageProps {
  /** Message ID being edited */
  messageId: string;
  /** Original content */
  content: string;
  /** Editing state from useBranching hook */
  editingState: EditingState;
  /** Update content handler */
  onUpdateContent: (content: string) => void;
  /** Save handler */
  onSave: (createNewBranch: boolean) => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Toggle diff handler */
  onToggleDiff: () => void;
  /** Error message */
  error?: string | null;
}

export function InlineEditMessage({
  messageId,
  content,
  editingState,
  onUpdateContent,
  onSave,
  onCancel,
  onToggleDiff,
  error,
}: InlineEditMessageProps) {
  // Only render if this message is being edited
  if (editingState.messageId !== messageId) {
    return null;
  }

  return (
    <EditMessage
      originalContent={editingState.originalContent}
      editedContent={editingState.editedContent}
      isSaving={editingState.isSaving}
      showDiff={editingState.showDiff}
      onContentChange={onUpdateContent}
      onSave={onSave}
      onCancel={onCancel}
      onToggleDiff={onToggleDiff}
      error={error}
    />
  );
}

export default EditMessage;
