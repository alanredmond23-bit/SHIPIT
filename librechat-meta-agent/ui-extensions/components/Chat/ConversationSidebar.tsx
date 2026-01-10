'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Archive,
  Pin,
  PinOff,
  MessageSquare,
  Settings,
  Sparkles,
  X,
  Check,
  Edit2,
  Download,
  FileJson,
  FileText,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import type { ConversationListItem } from '@/types/conversations';
import { useConversationExport } from '@/hooks/useConversations';

interface ConversationSidebarProps {
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  isLoading: boolean;
  error?: { code: string; message: string } | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<void>;
  onArchiveConversation: (id: string, archive: boolean) => Promise<void>;
  onPinConversation: (id: string, pin: boolean) => Promise<void>;
  onRenameConversation?: (id: string, title: string) => Promise<void>;
  onExportJson?: (id: string) => Promise<void>;
  onExportMarkdown?: (id: string) => Promise<void>;
  onRefresh?: () => void;
  isOpen: boolean;
  onClose: () => void;
  searchDebounceMs?: number;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  error,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onPinConversation,
  onRenameConversation,
  onExportJson,
  onExportMarkdown,
  onRefresh,
  isOpen,
  onClose,
  searchDebounceMs = 300,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Use the export hook for standalone export functionality
  const { exportJson, exportMarkdown, isExporting } = useConversationExport();

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // Debounce the actual filtering
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, searchDebounceMs);
    return () => clearTimeout(timer);
  }, [searchDebounceMs]);

  // Filter conversations by search - using memoization for performance
  const filteredConversations = useMemo(() => {
    if (!debouncedSearch) return conversations;
    const searchLower = debouncedSearch.toLowerCase();
    return conversations.filter((c) => {
      const title = (c.title || 'New Conversation').toLowerCase();
      const summary = (c.summary || '').toLowerCase();
      return title.includes(searchLower) || summary.includes(searchLower);
    });
  }, [conversations, debouncedSearch]);

  // Group by pinned/regular
  const pinnedConversations = filteredConversations.filter((c) => c.is_pinned);
  const regularConversations = filteredConversations.filter((c) => !c.is_pinned);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Handle delete with confirmation
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteConversation(id);
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  }, [onDeleteConversation]);

  // Handle export as JSON
  const handleExportJson = useCallback(async (id: string) => {
    setExportingId(id);
    try {
      if (onExportJson) {
        await onExportJson(id);
      } else {
        await exportJson(id);
      }
    } finally {
      setExportingId(null);
      setMenuOpenId(null);
    }
  }, [onExportJson, exportJson]);

  // Handle export as Markdown
  const handleExportMarkdown = useCallback(async (id: string) => {
    setExportingId(id);
    try {
      if (onExportMarkdown) {
        await onExportMarkdown(id);
      } else {
        await exportMarkdown(id);
      }
    } finally {
      setExportingId(null);
      setMenuOpenId(null);
    }
  }, [onExportMarkdown, exportMarkdown]);

  // Handle rename
  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle || 'New Conversation');
    setMenuOpenId(null);
  };

  const handleRename = async () => {
    if (editingId && onRenameConversation && editTitle.trim()) {
      await onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-700 transform transition-transform duration-300 lg:relative lg:translate-x-0 shadow-xl lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-lg text-stone-900 dark:text-white">Meta Agent</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">AI Orchestrator</p>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={() => {
                onNewConversation();
                onClose();
              }}
              className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-0 rounded-lg pl-10 pr-10 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded"
                >
                  <X className="w-3.5 h-3.5 text-stone-400" />
                </button>
              )}
            </div>
            {debouncedSearch && (
              <p className="text-xs text-stone-400 mt-1 px-1">
                {filteredConversations.length} result{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {/* Error State */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      Failed to load conversations
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
                      {error.message}
                    </p>
                  </div>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded"
                      title="Retry"
                    >
                      <RefreshCw className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                <p className="text-xs text-stone-400 mt-2">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-stone-500 dark:text-stone-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {debouncedSearch ? 'No conversations found' : 'No conversations yet'}
                </p>
                <p className="text-xs mt-1">
                  {debouncedSearch ? 'Try a different search term' : 'Start a new chat to begin'}
                </p>
              </div>
            ) : (
              <>
                {/* Pinned Section */}
                {pinnedConversations.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-stone-400 dark:text-stone-500 px-2 py-2 uppercase tracking-wider flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </div>
                    <div className="space-y-1">
                      {pinnedConversations.map((conversation) => (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isSelected={conversation.id === currentConversationId}
                          isDeleting={conversation.id === deletingId}
                          isExporting={conversation.id === exportingId}
                          isEditing={conversation.id === editingId}
                          editTitle={editTitle}
                          onEditTitleChange={setEditTitle}
                          onSaveEdit={handleRename}
                          onCancelEdit={cancelEditing}
                          menuOpen={menuOpenId === conversation.id}
                          onMenuToggle={() =>
                            setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id)
                          }
                          onSelect={() => {
                            onSelectConversation(conversation.id);
                            onClose();
                          }}
                          onDelete={() => handleDelete(conversation.id)}
                          onArchive={() => onArchiveConversation(conversation.id, true)}
                          onPin={() => onPinConversation(conversation.id, false)}
                          onRename={() => startEditing(conversation.id, conversation.title || '')}
                          onExportJson={() => handleExportJson(conversation.id)}
                          onExportMarkdown={() => handleExportMarkdown(conversation.id)}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Conversations */}
                {regularConversations.length > 0 && (
                  <div>
                    {pinnedConversations.length > 0 && (
                      <div className="text-xs font-medium text-stone-400 dark:text-stone-500 px-2 py-2 uppercase tracking-wider">
                        Recent
                      </div>
                    )}
                    <div className="space-y-1">
                      {regularConversations.map((conversation) => (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isSelected={conversation.id === currentConversationId}
                          isDeleting={conversation.id === deletingId}
                          isExporting={conversation.id === exportingId}
                          isEditing={conversation.id === editingId}
                          editTitle={editTitle}
                          onEditTitleChange={setEditTitle}
                          onSaveEdit={handleRename}
                          onCancelEdit={cancelEditing}
                          menuOpen={menuOpenId === conversation.id}
                          onMenuToggle={() =>
                            setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id)
                          }
                          onSelect={() => {
                            onSelectConversation(conversation.id);
                            onClose();
                          }}
                          onDelete={() => handleDelete(conversation.id)}
                          onArchive={() => onArchiveConversation(conversation.id, true)}
                          onPin={() => onPinConversation(conversation.id, true)}
                          onRename={() => startEditing(conversation.id, conversation.title || '')}
                          onExportJson={() => handleExportJson(conversation.id)}
                          onExportMarkdown={() => handleExportMarkdown(conversation.id)}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Settings */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-700">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <Settings className="w-5 h-5 text-stone-500" />
              <span className="text-stone-700 dark:text-stone-300">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}

// ============================================================================
// Conversation Item Component
// ============================================================================

interface ConversationItemProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  isDeleting: boolean;
  isExporting: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onPin: () => void;
  onRename: () => void;
  formatDate: (date: string) => string;
}

function ConversationItem({
  conversation,
  isSelected,
  isDeleting,
  isExporting,
  isEditing,
  editTitle,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
  menuOpen,
  onMenuToggle,
  onSelect,
  onDelete,
  onArchive,
  onExportJson,
  onExportMarkdown,
  onPin,
  onRename,
  formatDate,
}: ConversationItemProps) {
  const title = conversation.title || 'New Conversation';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="flex-1 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          autoFocus
        />
        <button
          onClick={onSaveEdit}
          className="p-1 hover:bg-stone-200 dark:hover:bg-stone-600 rounded"
        >
          <Check className="w-4 h-4 text-green-500" />
        </button>
        <button
          onClick={onCancelEdit}
          className="p-1 hover:bg-stone-200 dark:hover:bg-stone-600 rounded"
        >
          <X className="w-4 h-4 text-stone-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        disabled={isDeleting || isExporting}
        className={clsx(
          'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150',
          isSelected
            ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
            : 'hover:bg-stone-100 dark:hover:bg-stone-800',
          (isDeleting || isExporting) && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="flex items-start gap-3">
          <MessageSquare
            className={clsx(
              'w-4 h-4 mt-0.5 flex-shrink-0',
              isSelected ? 'text-teal-500' : 'text-stone-400'
            )}
          />
          <div className="flex-1 min-w-0">
            <p
              className={clsx(
                'text-sm font-medium truncate',
                isSelected
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-stone-700 dark:text-stone-300'
              )}
            >
              {title}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {formatDate(conversation.updated_at)} · {conversation.message_count} messages
            </p>
          </div>
        </div>
      </button>

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuToggle();
        }}
        className={clsx(
          'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-opacity',
          menuOpen
            ? 'opacity-100 bg-stone-200 dark:bg-stone-700'
            : 'opacity-0 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-700'
        )}
      >
        <MoreHorizontal className="w-4 h-4 text-stone-500" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onMenuToggle} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-50 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              <Edit2 className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
                onMenuToggle();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              {conversation.is_pinned ? (
                <>
                  <PinOff className="w-4 h-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4" />
                  Pin
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
                onMenuToggle();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <hr className="my-1 border-stone-200 dark:border-stone-700" />
            {/* Export Section */}
            <div className="px-4 py-1">
              <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Export
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportJson();
              }}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              Export as JSON
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportMarkdown();
              }}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Export as Markdown
            </button>
            <hr className="my-1 border-stone-200 dark:border-stone-700" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ConversationSidebar;
