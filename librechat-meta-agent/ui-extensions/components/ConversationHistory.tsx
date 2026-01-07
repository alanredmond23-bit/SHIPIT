'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Pin,
  Archive,
  Trash2,
  MoreHorizontal,
  Clock,
  ChevronDown,
  Loader2,
  X,
  Download,
  FileJson,
  FileText,
} from 'lucide-react';
import { useConversations, ConversationListItem } from '@/lib/conversations-context';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
}

export function ConversationHistory({
  isOpen,
  onClose,
  onSelectConversation,
}: ConversationHistoryProps) {
  const {
    conversations,
    currentConversation,
    isLoadingList,
    createConversation,
    deleteConversation,
    loadConversation,
    exportConversation,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredConversations = conversations.filter((c) => {
    if (showArchived !== c.is_archived) return false;
    if (searchQuery) {
      return c.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleNewChat = async () => {
    try {
      const id = await createConversation();
      onSelectConversation(id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      await loadConversation(id);
      onSelectConversation(id);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      try {
        await deleteConversation(id);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
    setMenuOpenId(null);
  };

  const handleExport = (format: 'json' | 'markdown' | 'txt') => {
    setIsExporting(true);
    try {
      const content = exportConversation(format);
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
    setIsExporting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div
        className="absolute inset-0 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="absolute left-0 top-0 bottom-0 w-80 bg-[var(--bg-1)] border-r border-[var(--border-subtle)] flex flex-col lg:relative">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">History</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-500)] text-white font-medium hover:bg-[var(--accent-600)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-500)]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-500)]" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
              <p className="text-sm text-[var(--text-muted)]">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Start a new chat to get going
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={currentConversation?.id === conv.id}
                  menuOpen={menuOpenId === conv.id}
                  onSelect={() => handleSelectConversation(conv.id)}
                  onDelete={(e) => handleDelete(conv.id, e)}
                  onMenuToggle={() =>
                    setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                  }
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-subtle)]">
          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--bg-2)] transition-colors"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Show Active' : 'Show Archived'}
            <ChevronDown
              className={`w-4 h-4 ml-auto transition-transform ${showArchived ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Export Current */}
          {currentConversation && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-2 px-3">Export Current</p>
              <div className="flex gap-1 px-2">
                <button
                  onClick={() => handleExport('markdown')}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-[var(--bg-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-3)] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  MD
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-[var(--bg-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-3)] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  TXT
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-[var(--bg-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-3)] transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================================
// CONVERSATION ITEM COMPONENT
// ============================================================================

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onMenuToggle: () => void;
  formatDate: (date: string) => string;
}

function ConversationItem({
  conversation,
  isActive,
  menuOpen,
  onSelect,
  onDelete,
  onMenuToggle,
  formatDate,
}: ConversationItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 rounded-xl cursor-pointer transition-colors ${
        isActive
          ? 'bg-[var(--accent-subtle)] border border-[var(--accent-500)]/30'
          : 'hover:bg-[var(--bg-2)]'
      }`}
    >
      {/* Title and Time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {conversation.is_pinned && (
            <Pin className="w-3 h-3 text-[var(--accent-500)] flex-shrink-0" />
          )}
          <h3 className="font-medium text-sm text-[var(--text-primary)] truncate">
            {conversation.title}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {formatDate(conversation.updated_at)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-3)] transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Preview */}
      {conversation.preview && (
        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
          {conversation.preview}
        </p>
      )}

      {/* Message count */}
      <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
        <MessageSquare className="w-3 h-3" />
        {conversation.message_count} messages
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          className="absolute right-2 top-10 z-10 w-36 py-1 rounded-lg bg-[var(--bg-1)] border border-[var(--border-default)] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default ConversationHistory;
