'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Brain,
  Star,
  Filter,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react';

// Types
interface Memory {
  id: string;
  user_id: string | null;
  project_id: string;
  content: string;
  summary: string | null;
  category: 'preference' | 'fact' | 'instruction' | 'context';
  enabled: boolean;
  importance_score: number;
  created_at: string;
  last_accessed_at: string | null;
}

interface MemoryStats {
  total: number;
  enabled: number;
  disabled: number;
  by_category: Record<string, number>;
}

// API Base URL - configure based on environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API Functions
async function fetchMemories(filters: {
  category?: string;
  enabled?: boolean;
  search?: string;
}): Promise<Memory[]> {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.enabled !== undefined) params.append('enabled', String(filters.enabled));

  const url = `${API_BASE}/api/memory?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch memories');
  const data = await res.json();

  // Client-side search filter
  let memories = data.data || [];
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    memories = memories.filter((m: Memory) =>
      m.content.toLowerCase().includes(searchLower) ||
      m.summary?.toLowerCase().includes(searchLower)
    );
  }

  return memories;
}

async function fetchStats(): Promise<MemoryStats> {
  const res = await fetch(`${API_BASE}/api/memory/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  const data = await res.json();
  return data.data;
}

async function createMemory(memory: {
  content: string;
  category: string;
  importance_score: number;
  project_id: string;
}): Promise<Memory> {
  const res = await fetch(`${API_BASE}/api/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memory),
  });
  if (!res.ok) throw new Error('Failed to create memory');
  const data = await res.json();
  return data.data;
}

async function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, 'content' | 'category' | 'enabled' | 'importance_score'>>
): Promise<Memory> {
  const res = await fetch(`${API_BASE}/api/memory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update memory');
  const data = await res.json();
  return data.data;
}

async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/memory/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete memory');
}

// Components
function CategoryBadge({ category }: { category: string }) {
  const colors = {
    preference: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    fact: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    instruction: 'bg-green-500/20 text-green-300 border-green-500/30',
    context: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs border ${
        colors[category as keyof typeof colors] || colors.fact
      }`}
    >
      {category}
    </span>
  );
}

function ImportanceStars({ score }: { score: number }) {
  const stars = Math.round(score * 5);
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < stars ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}
        />
      ))}
    </div>
  );
}

export default function MemoryPage() {
  const queryClient = useQueryClient();

  // State
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    content: '',
    category: 'fact' as Memory['category'],
    importance_score: 0.5,
    project_id: 'default', // TODO: Make this dynamic based on current project
  });

  // Queries
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories', categoryFilter, enabledFilter, searchQuery],
    queryFn: () =>
      fetchMemories({
        category: categoryFilter || undefined,
        enabled: enabledFilter,
        search: searchQuery,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['memory-stats'],
    queryFn: fetchStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] });
      setIsAddingNew(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateMemory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] });
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      content: '',
      category: 'fact',
      importance_score: 0.5,
      project_id: 'default',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        updates: {
          content: formData.content,
          category: formData.category,
          importance_score: formData.importance_score,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (memory: Memory) => {
    setFormData({
      content: memory.content,
      category: memory.category,
      importance_score: memory.importance_score,
      project_id: memory.project_id,
    });
    setEditingId(memory.id);
    setIsAddingNew(true);
  };

  const handleToggle = (id: string, enabled: boolean) => {
    updateMutation.mutate({ id, updates: { enabled: !enabled } });
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} memories?`)) {
      Array.from(selectedIds).forEach((id) => deleteMutation.mutate(id));
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-indigo-400" size={32} />
            <h1 className="text-3xl font-bold text-white">Memory System</h1>
          </div>
          <p className="text-slate-400">
            Manage personalized memories and preferences for context-aware AI interactions
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Total Memories</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-green-500/10 backdrop-blur border border-green-500/30 rounded-lg p-4">
              <div className="text-green-400 text-sm">Enabled</div>
              <div className="text-2xl font-bold text-green-300">{stats.enabled}</div>
            </div>
            <div className="bg-red-500/10 backdrop-blur border border-red-500/30 rounded-lg p-4">
              <div className="text-red-400 text-sm">Disabled</div>
              <div className="text-2xl font-bold text-red-300">{stats.disabled}</div>
            </div>
            <div className="bg-purple-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-4">
              <div className="text-purple-400 text-sm">Categories</div>
              <div className="text-2xl font-bold text-purple-300">
                {Object.keys(stats.by_category || {}).length}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="preference">Preferences</option>
              <option value="fact">Facts</option>
              <option value="instruction">Instructions</option>
              <option value="context">Context</option>
            </select>

            {/* Enabled Filter */}
            <select
              value={enabledFilter === undefined ? '' : String(enabledFilter)}
              onChange={(e) =>
                setEnabledFilter(e.target.value === '' ? undefined : e.target.value === 'true')
              }
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>

            {/* Add Button */}
            <button
              onClick={() => {
                setIsAddingNew(!isAddingNew);
                setEditingId(null);
                resetForm();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Add Memory
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <span className="text-indigo-300">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1 text-sm transition-colors"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {isAddingNew && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Edit Memory' : 'Add New Memory'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter memory content..."
                    rows={3}
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as Memory['category'],
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="preference">Preference</option>
                      <option value="fact">Fact</option>
                      <option value="instruction">Instruction</option>
                      <option value="context">Context</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-2">
                      Importance ({Math.round(formData.importance_score * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.importance_score}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          importance_score: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Check size={20} />
                    {editingId ? 'Update' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <X size={20} />
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Memories List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="animate-spin mx-auto mb-2" size={32} />
              Loading memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 backdrop-blur border border-slate-700 rounded-lg">
              <Brain className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 mb-2">No memories found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Add your first memory to get started'}
              </p>
            </div>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className={`bg-slate-800/50 backdrop-blur border rounded-lg p-4 transition-all ${
                  memory.enabled
                    ? 'border-slate-700 hover:border-indigo-500/50'
                    : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(memory.id)}
                    onChange={() => toggleSelection(memory.id)}
                    className="mt-1"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-white mb-2">{memory.content}</p>
                        {memory.summary && memory.summary !== memory.content && (
                          <p className="text-slate-400 text-sm italic">{memory.summary}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <CategoryBadge category={memory.category} />
                      <ImportanceStars score={memory.importance_score} />
                      <span className="text-slate-500 text-xs">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                      {memory.last_accessed_at && (
                        <span className="text-slate-500 text-xs">
                          Last used: {new Date(memory.last_accessed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(memory.id, memory.enabled)}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                      title={memory.enabled ? 'Disable' : 'Enable'}
                    >
                      {memory.enabled ? (
                        <ToggleRight className="text-green-400" size={20} />
                      ) : (
                        <ToggleLeft className="text-slate-600" size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(memory)}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="text-indigo-400" size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this memory?')) {
                          deleteMutation.mutate(memory.id);
                        }
                      }}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="text-red-400" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
