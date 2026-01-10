'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import type { ConversationListItem } from '@/types/conversations';

interface ConversationSidebarProps {
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  isLoading: boolean;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<void>;
  onArchiveConversation: (id: string, archive: boolean) => Promise<void>;
  onPinConversation: (id: string, pin: boolean) => Promise<void>;
  onRenameConversation?: (id: string, title: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onPinConversation,
  onRenameConversation,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        (c.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-0 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-stone-500 dark:text-stone-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
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
  onPin: () => void;
  onRename: () => void;
  formatDate: (date: string) => string;
}

function ConversationItem({
  conversation,
  isSelected,
  isDeleting,
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
        disabled={isDeleting}
        className={clsx(
          'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150',
          isSelected
            ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
            : 'hover:bg-stone-100 dark:hover:bg-stone-800',
          isDeleting && 'opacity-50 pointer-events-none'
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
