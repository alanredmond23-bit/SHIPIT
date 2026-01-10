'use client';

import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Brain,
  FileText,
  Settings,
  Plus,
  Search,
  Pin,
  Archive,
  MoreHorizontal,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  Book,
  Lightbulb,
  ScrollText,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  ProjectWithDetails,
  ProjectConversation,
  ProjectMemory,
  ProjectFile,
  ProjectColor,
} from '@/types/projects';
import { PROJECT_COLORS } from '@/types/projects';

type Tab = 'conversations' | 'memory' | 'files' | 'settings';

const MEMORY_TYPE_CONFIG: Record<ProjectMemory['type'], {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  note: { label: 'Note', icon: <Edit2 className="w-4 h-4" />, color: 'text-blue-500' },
  context: { label: 'Context', icon: <Brain className="w-4 h-4" />, color: 'text-purple-500' },
  reference: { label: 'Reference', icon: <Book className="w-4 h-4" />, color: 'text-green-500' },
  instruction: { label: 'Instruction', icon: <Lightbulb className="w-4 h-4" />, color: 'text-amber-500' },
};

interface ProjectDetailProps {
  project: ProjectWithDetails;
  onBack: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onAddMemory: (type: ProjectMemory['type']) => void;
  onDeleteMemory: (memoryId: string) => void;
  onToggleMemoryActive: (memoryId: string, active: boolean) => void;
  onUpdateSettings: (settings: {
    system_instructions?: string;
    default_model?: string;
  }) => void;
}

export function ProjectDetail({
  project,
  onBack,
  onSelectConversation,
  onNewConversation,
  onAddMemory,
  onDeleteMemory,
  onToggleMemoryActive,
  onUpdateSettings,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructions, setInstructions] = useState(project.system_instructions || '');

  const colorConfig = PROJECT_COLORS[project.color as ProjectColor] || PROJECT_COLORS.teal;

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter conversations
  const filteredConversations = project.conversations.filter((conv) => {
    if (!searchQuery) return true;
    return (conv.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter memories
  const filteredMemories = project.memories.filter((mem) => {
    if (!searchQuery) return true;
    return (
      (mem.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Save instructions
  const handleSaveInstructions = useCallback(() => {
    onUpdateSettings({ system_instructions: instructions });
    setEditingInstructions(false);
  }, [instructions, onUpdateSettings]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'conversations', label: 'Conversations', icon: <MessageSquare className="w-4 h-4" />, count: project.conversation_count },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" />, count: project.memory_count },
    { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4" />, count: project.file_count },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-900">
      {/* Header */}
      <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>

          <div className="flex items-center gap-3">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-2xl', colorConfig.light)}>
              {project.icon || '📁'}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900 dark:text-white">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? `${colorConfig.light} ${colorConfig.text}`
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={clsx(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  activeTab === tab.id
                    ? colorConfig.accent + ' text-white'
                    : 'bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Search bar (for conversations and memory tabs) */}
        {(activeTab === 'conversations' || activeTab === 'memory') && (
          <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className={clsx(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors',
                    'bg-stone-50 dark:bg-stone-900',
                    'border-stone-200 dark:border-stone-700',
                    'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                    'text-stone-900 dark:text-white placeholder:text-stone-400'
                  )}
                />
              </div>
              <button
                onClick={() => activeTab === 'conversations' ? onNewConversation() : onAddMemory('note')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-colors',
                  colorConfig.accent,
                  'hover:opacity-90'
                )}
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'conversations' ? 'New Chat' : 'Add Memory'}
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="h-full overflow-y-auto">
          {activeTab === 'conversations' && (
            <ConversationsTab
              conversations={filteredConversations}
              colorConfig={colorConfig}
              formatRelativeTime={formatRelativeTime}
              onSelect={onSelectConversation}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryTab
              memories={filteredMemories}
              colorConfig={colorConfig}
              formatRelativeTime={formatRelativeTime}
              onAddMemory={onAddMemory}
              onDelete={onDeleteMemory}
              onToggleActive={onToggleMemoryActive}
            />
          )}

          {activeTab === 'files' && (
            <FilesTab
              files={project.files}
              colorConfig={colorConfig}
              formatRelativeTime={formatRelativeTime}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              project={project}
              colorConfig={colorConfig}
              instructions={instructions}
              editingInstructions={editingInstructions}
              onInstructionsChange={setInstructions}
              onEditInstructions={() => setEditingInstructions(true)}
              onSaveInstructions={handleSaveInstructions}
              onCancelEdit={() => {
                setInstructions(project.system_instructions || '');
                setEditingInstructions(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Conversations Tab Component
function ConversationsTab({
  conversations,
  colorConfig,
  formatRelativeTime,
  onSelect,
}: {
  conversations: ProjectConversation[];
  colorConfig: (typeof PROJECT_COLORS)[ProjectColor];
  formatRelativeTime: (date: string) => string;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', colorConfig.light)}>
          <MessageSquare className={clsx('w-8 h-8', colorConfig.text)} />
        </div>
        <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
          No conversations yet
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Start a new conversation to begin working on this project
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={clsx(
            'w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
            'bg-white dark:bg-stone-800',
            'border-stone-200 dark:border-stone-700',
            'hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-md'
          )}
        >
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colorConfig.light)}>
            <MessageSquare className={clsx('w-5 h-5', colorConfig.text)} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-stone-900 dark:text-white truncate">
                {conv.title || 'Untitled conversation'}
              </h3>
              {conv.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1">
              <span>{conv.message_count} messages</span>
              <span>{formatRelativeTime(conv.updated_at)}</span>
              {conv.model_used && (
                <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">
                  {conv.model_used}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Memory Tab Component
function MemoryTab({
  memories,
  colorConfig,
  formatRelativeTime,
  onAddMemory,
  onDelete,
  onToggleActive,
}: {
  memories: ProjectMemory[];
  colorConfig: (typeof PROJECT_COLORS)[ProjectColor];
  formatRelativeTime: (date: string) => string;
  onAddMemory: (type: ProjectMemory['type']) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', colorConfig.light)}>
          <Brain className={clsx('w-8 h-8', colorConfig.text)} />
        </div>
        <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
          No memories yet
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          Add notes, context, or instructions for this project
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(Object.entries(MEMORY_TYPE_CONFIG) as [ProjectMemory['type'], typeof MEMORY_TYPE_CONFIG[ProjectMemory['type']]][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => onAddMemory(type)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                'bg-stone-100 dark:bg-stone-700',
                'hover:bg-stone-200 dark:hover:bg-stone-600',
                'text-stone-700 dark:text-stone-300'
              )}
            >
              <span className={config.color}>{config.icon}</span>
              Add {config.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {memories.map((memory) => {
        const typeConfig = MEMORY_TYPE_CONFIG[memory.type];
        return (
          <div
            key={memory.id}
            className={clsx(
              'p-4 rounded-xl border transition-all duration-200',
              'bg-white dark:bg-stone-800',
              'border-stone-200 dark:border-stone-700',
              !memory.is_active && 'opacity-50'
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className={typeConfig.color}>{typeConfig.icon}</span>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                  {typeConfig.label}
                </span>
                {!memory.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-stone-500">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleActive(memory.id, !memory.is_active)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  title={memory.is_active ? 'Deactivate' : 'Activate'}
                >
                  <Sparkles className={clsx('w-4 h-4', memory.is_active ? 'text-amber-500' : 'text-stone-400')} />
                </button>
                <button
                  onClick={() => onDelete(memory.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-stone-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {memory.title && (
              <h3 className="font-medium text-stone-900 dark:text-white mb-1">
                {memory.title}
              </h3>
            )}
            <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap line-clamp-3">
              {memory.content}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(memory.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Files Tab Component
function FilesTab({
  files,
  colorConfig,
  formatRelativeTime,
}: {
  files: ProjectFile[];
  colorConfig: (typeof PROJECT_COLORS)[ProjectColor];
  formatRelativeTime: (date: string) => string;
}) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', colorConfig.light)}>
          <FileText className={clsx('w-8 h-8', colorConfig.text)} />
        </div>
        <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
          No files yet
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Files will appear here when you attach them to conversations
        </p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className={clsx(
            'p-4 rounded-xl border transition-all duration-200',
            'bg-white dark:bg-stone-800',
            'border-stone-200 dark:border-stone-700',
            'hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-md cursor-pointer'
          )}
        >
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center mb-3', colorConfig.light)}>
            <FileText className={clsx('w-6 h-6', colorConfig.text)} />
          </div>
          <h3 className="font-medium text-stone-900 dark:text-white text-sm truncate mb-1">
            {file.name}
          </h3>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {formatFileSize(file.size)} - {formatRelativeTime(file.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({
  project,
  colorConfig,
  instructions,
  editingInstructions,
  onInstructionsChange,
  onEditInstructions,
  onSaveInstructions,
  onCancelEdit,
}: {
  project: ProjectWithDetails;
  colorConfig: (typeof PROJECT_COLORS)[ProjectColor];
  instructions: string;
  editingInstructions: boolean;
  onInstructionsChange: (value: string) => void;
  onEditInstructions: () => void;
  onSaveInstructions: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* System Instructions */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colorConfig.light)}>
              <ScrollText className={clsx('w-5 h-5', colorConfig.text)} />
            </div>
            <div>
              <h3 className="font-medium text-stone-900 dark:text-white">
                System Instructions
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Context included in all project conversations
              </p>
            </div>
          </div>
          {!editingInstructions && (
            <button
              onClick={onEditInstructions}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editingInstructions ? (
          <div className="space-y-4">
            <textarea
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              placeholder="Add system instructions for this project..."
              rows={6}
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors resize-none',
                'bg-stone-50 dark:bg-stone-900',
                'border-stone-200 dark:border-stone-700',
                'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                'text-stone-900 dark:text-white placeholder:text-stone-400'
              )}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveInstructions}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-medium text-white',
                  colorConfig.accent,
                  'hover:opacity-90 transition-opacity'
                )}
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
            {project.system_instructions || (
              <span className="italic text-stone-400">No system instructions set</span>
            )}
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <h3 className="font-medium text-stone-900 dark:text-white mb-4">
          Project Information
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-stone-500 dark:text-stone-400">Created</dt>
            <dd className="text-stone-900 dark:text-white mt-1">
              {new Date(project.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 dark:text-stone-400">Last Activity</dt>
            <dd className="text-stone-900 dark:text-white mt-1">
              {new Date(project.last_activity_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 dark:text-stone-400">Template</dt>
            <dd className="text-stone-900 dark:text-white mt-1 capitalize">
              {project.template || 'None'}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 dark:text-stone-400">Default Model</dt>
            <dd className="text-stone-900 dark:text-white mt-1">
              {project.default_model || 'Not set'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default ProjectDetail;
