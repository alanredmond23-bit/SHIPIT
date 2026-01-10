'use client';

/**
 * MessageActions Component
 * Provides action buttons for messages (edit, regenerate, copy, branch)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Edit2,
  RefreshCw,
  GitFork,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Share2,
  Bookmark,
  Volume2,
  Download,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import type { MessageAction } from '@/types/branching';

// ============================================================================
// Types
// ============================================================================

interface MessageActionsProps {
  /** Message ID */
  messageId: string;
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Message content for copy functionality */
  content: string;
  /** Whether this message is currently streaming */
  isStreaming?: boolean;
  /** Whether editing is available */
  canEdit?: boolean;
  /** Whether regeneration is available */
  canRegenerate?: boolean;
  /** Whether branching is available */
  canBranch?: boolean;
  /** Whether this message has branches */
  hasBranches?: boolean;
  /** Handler for edit action */
  onEdit?: () => void;
  /** Handler for regenerate action */
  onRegenerate?: () => void;
  /** Handler for branch action */
  onBranch?: () => void;
  /** Handler for rating */
  onRate?: (rating: 'up' | 'down') => void;
  /** Handler for delete */
  onDelete?: () => void;
  /** Current rating */
  currentRating?: 'up' | 'down' | null;
  /** Whether actions are in compact mode */
  compact?: boolean;
  /** Whether to show all actions or just primary */
  showAll?: boolean;
  /** Additional class names */
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'danger' | 'success';
  compact?: boolean;
  showLabel?: boolean;
}

// ============================================================================
// ActionButton Component
// ============================================================================

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  variant = 'default',
  compact = false,
  showLabel = false,
}: ActionButtonProps) {
  const variantStyles = {
    default: {
      base: 'text-stone-500 dark:text-stone-400',
      hover: 'hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800',
      active: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30',
    },
    danger: {
      base: 'text-stone-500 dark:text-stone-400',
      hover: 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
      active: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    },
    success: {
      base: 'text-stone-500 dark:text-stone-400',
      hover: 'hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30',
      active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg transition-all duration-150',
        compact ? 'p-1.5' : 'px-2 py-1.5',
        disabled && 'opacity-50 cursor-not-allowed',
        active ? styles.active : styles.base,
        !disabled && !active && styles.hover
      )}
    >
      {icon}
      {showLabel && (
        <span className={clsx('font-medium', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// CopyButton Component
// ============================================================================

interface CopyButtonProps {
  content: string;
  compact?: boolean;
}

function CopyButton({ content, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  return (
    <ActionButton
      icon={
        copied ? (
          <Check className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        ) : (
          <Copy className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )
      }
      label={copied ? 'Copied!' : 'Copy'}
      onClick={handleCopy}
      active={copied}
      variant="success"
      compact={compact}
    />
  );
}

// ============================================================================
// MoreActionsDropdown Component
// ============================================================================

interface MoreActionsDropdownProps {
  actions: MessageAction[];
  compact?: boolean;
}

function MoreActionsDropdown({ actions, compact = false }: MoreActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (actions.length === 0) return null;

  const iconMap: Record<string, React.ReactNode> = {
    delete: <Trash2 className="w-4 h-4" />,
    share: <Share2 className="w-4 h-4" />,
    bookmark: <Bookmark className="w-4 h-4" />,
    speak: <Volume2 className="w-4 h-4" />,
    download: <Download className="w-4 h-4" />,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <ActionButton
        icon={<MoreHorizontal className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
        label="More actions"
        onClick={() => setIsOpen(!isOpen)}
        active={isOpen}
        compact={compact}
      />

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.handler();
                  setIsOpen(false);
                }}
                disabled={!action.enabled}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                  !action.enabled && 'opacity-50 cursor-not-allowed',
                  action.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                )}
              >
                {iconMap[action.icon] || <ChevronDown className="w-4 h-4" />}
                <span>{action.label}</span>
                {action.shortcut && (
                  <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
                    {action.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageActions({
  messageId,
  role,
  content,
  isStreaming = false,
  canEdit = true,
  canRegenerate = true,
  canBranch = true,
  hasBranches = false,
  onEdit,
  onRegenerate,
  onBranch,
  onRate,
  onDelete,
  currentRating,
  compact = false,
  showAll = false,
  className,
}: MessageActionsProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Build additional actions for dropdown
  const additionalActions: MessageAction[] = [];

  if (onDelete) {
    additionalActions.push({
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      enabled: !isStreaming,
      handler: onDelete,
      variant: 'danger',
    });
  }

  // Determine which actions to show based on role
  const showEdit = isUser && canEdit && onEdit;
  const showRegenerate = isAssistant && canRegenerate && onRegenerate;
  const showRating = isAssistant && onRate;
  const showBranch = canBranch && onBranch;

  // If streaming, disable most actions
  if (isStreaming) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1 opacity-50',
          className
        )}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-stone-400 dark:text-stone-500">
          <RefreshCw className={clsx('animate-spin', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <span className={compact ? 'text-xs' : 'text-sm'}>Generating...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5',
        className
      )}
    >
      {/* Copy button - always available */}
      <CopyButton content={content} compact={compact} />

      {/* Edit button - for user messages */}
      {showEdit && (
        <ActionButton
          icon={<Edit2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label="Edit"
          onClick={onEdit}
          compact={compact}
        />
      )}

      {/* Regenerate button - for assistant messages */}
      {showRegenerate && (
        <ActionButton
          icon={<RefreshCw className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label="Regenerate"
          onClick={onRegenerate}
          compact={compact}
        />
      )}

      {/* Branch button */}
      {showBranch && (
        <ActionButton
          icon={<GitFork className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label="Branch from here"
          onClick={onBranch}
          active={hasBranches}
          compact={compact}
        />
      )}

      {/* Rating buttons - for assistant messages */}
      {showRating && (
        <>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
          <ActionButton
            icon={<ThumbsUp className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
            label="Good response"
            onClick={() => onRate('up')}
            active={currentRating === 'up'}
            variant="success"
            compact={compact}
          />
          <ActionButton
            icon={<ThumbsDown className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
            label="Poor response"
            onClick={() => onRate('down')}
            active={currentRating === 'down'}
            variant="danger"
            compact={compact}
          />
        </>
      )}

      {/* More actions dropdown */}
      {additionalActions.length > 0 && (
        <>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
          <MoreActionsDropdown actions={additionalActions} compact={compact} />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Floating Actions Overlay
// ============================================================================

interface FloatingActionsProps extends MessageActionsProps {
  /** Position of the overlay */
  position?: 'top-right' | 'bottom-right' | 'bottom-center';
  /** Whether to show on hover only */
  showOnHover?: boolean;
  /** Whether actions are visible */
  visible?: boolean;
}

export function FloatingMessageActions({
  position = 'top-right',
  showOnHover = true,
  visible = true,
  ...props
}: FloatingActionsProps) {
  const positionStyles = {
    'top-right': 'absolute -top-2 right-0 -translate-y-full',
    'bottom-right': 'absolute -bottom-2 right-0 translate-y-full',
    'bottom-center': 'absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full',
  };

  if (!visible) return null;

  return (
    <div
      className={clsx(
        positionStyles[position],
        'bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 px-1 py-0.5',
        showOnHover && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
      )}
    >
      <MessageActions {...props} compact />
    </div>
  );
}

export default MessageActions;
