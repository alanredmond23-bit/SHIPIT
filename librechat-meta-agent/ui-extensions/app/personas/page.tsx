'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Grid3X3,
  List,
  Star,
  TrendingUp,
  Sparkles,
  Code,
  FileText,
  GraduationCap,
  Briefcase,
  Palette,
  FlaskConical,
  Heart,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { PersonaCard } from '@/components/Personas/PersonaCard';
import { PersonaCreator } from '@/components/Personas/PersonaCreator';
import { PersonaPreview } from '@/components/Personas/PersonaPreview';
import { usePersonas } from '@/hooks/usePersonas';
import type { Persona, PersonaCategory, CreatePersonaInput } from '@/hooks/usePersonas';

/**
 * Personas Page - Browse, create, and manage AI personas
 * 
 * Features:
 * - Grid/list view toggle
 * - Category filters
 * - Search personas by name/description
 * - "Create Custom Persona" button
 * - Built-in persona showcase
 * - Featured personas section
 */

// Category configuration
const CATEGORIES: {
  id: PersonaCategory | 'all';
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { id: 'all', label: 'All Personas', icon: Sparkles, description: 'Browse all available personas' },
  { id: 'coding', label: 'Coding', icon: Code, description: 'Programming & development' },
  { id: 'writing', label: 'Writing', icon: FileText, description: 'Content & documentation' },
  { id: 'research', label: 'Research', icon: TrendingUp, description: 'Analysis & investigation' },
  { id: 'education', label: 'Education', icon: GraduationCap, description: 'Teaching & learning' },
  { id: 'creative', label: 'Creative', icon: Palette, description: 'Art & storytelling' },
  { id: 'science', label: 'Science', icon: FlaskConical, description: 'Scientific analysis' },
  { id: 'business', label: 'Business', icon: Briefcase, description: 'Professional tasks' },
  { id: 'general', label: 'General', icon: Sparkles, description: 'All-purpose assistants' },
  { id: 'custom', label: 'Custom', icon: Star, description: 'User-created personas' },
];

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'popular' | 'recent' | 'likes';

function PersonasContent() {
  const searchParams = useSearchParams();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<PersonaCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [likedPersonaIds, setLikedPersonaIds] = useState<Set<string>>(new Set());

  // Personas hook
  const {
    personas,
    builtInPersonas,
    customPersonas,
    activePersona,
    recentPersonas,
    loading,
    error,
    setActivePersona,
    createPersona,
    updatePersona,
    deletePersona,
    duplicatePersona,
    likePersona,
    forkPersona,
  } = usePersonas({ userId: 'demo-user' });

  // Check for create query param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreator(true);
    }
  }, [searchParams]);

  // Get featured personas (built-in + featured flag)
  const featuredPersonas = useMemo(() => {
    return personas.filter(p => p.isFeatured || p.isBuiltIn).slice(0, 5);
  }, [personas]);

  // Filter and sort personas
  const filteredPersonas = useMemo(() => {
    let result = [...personas];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popular':
        result.sort((a, b) => b.stats.conversationsCount - a.stats.conversationsCount);
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'likes':
        result.sort((a, b) => b.stats.likesCount - a.stats.likesCount);
        break;
    }

    return result;
  }, [personas, selectedCategory, searchQuery, sortBy]);

  // Handle persona creation
  const handleCreatePersona = async (input: CreatePersonaInput) => {
    try {
      const newPersona = await createPersona(input);
      setShowCreator(false);
      setSelectedPersona(newPersona);
    } catch (err) {
      console.error('Failed to create persona:', err);
      throw err;
    }
  };

  // Handle persona update
  const handleUpdatePersona = async (input: CreatePersonaInput) => {
    if (!editingPersona) return;
    try {
      await updatePersona({ id: editingPersona.id, ...input });
      setEditingPersona(null);
    } catch (err) {
      console.error('Failed to update persona:', err);
      throw err;
    }
  };

  // Handle like
  const handleLike = async (persona: Persona) => {
    const isLiked = await likePersona(persona.id);
    setLikedPersonaIds(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.add(persona.id);
      } else {
        next.delete(persona.id);
      }
      return next;
    });
  };

  // Handle fork
  const handleFork = async (persona: Persona) => {
    try {
      const forked = await forkPersona(persona.id);
      setSelectedPersona(forked);
    } catch (err) {
      console.error('Failed to fork persona:', err);
    }
  };

  // Handle delete
  const handleDelete = async (persona: Persona) => {
    try {
      await deletePersona(persona.id);
      if (selectedPersona?.id === persona.id) {
        setSelectedPersona(null);
      }
    } catch (err) {
      console.error('Failed to delete persona:', err);
    }
  };

  // Handle use persona
  const handleUsePersona = (persona: Persona) => {
    setActivePersona(persona);
    // Could also navigate to chat page
  };

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="min-h-screen bg-stone-50">
          {/* Header */}
          <div className="bg-white border-b border-stone-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                {/* Title & Create Button */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-stone-900">AI Personas</h1>
                    <p className="text-stone-500 mt-1">
                      Discover and create specialized AI personalities for any task
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Create Persona
                  </button>
                </div>

                {/* Search & Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search personas by name, description, or category..."
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-stone-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={clsx(
                          'p-2 rounded-md transition-colors',
                          viewMode === 'grid'
                            ? 'bg-white text-teal-600 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        )}
                        title="Grid view"
                      >
                        <Grid3X3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={clsx(
                          'p-2 rounded-md transition-colors',
                          viewMode === 'list'
                            ? 'bg-white text-teal-600 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        )}
                        title="List view"
                      >
                        <List className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="appearance-none pl-4 pr-10 py-2.5 bg-stone-100 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 focus:border-teal-500 focus:outline-none cursor-pointer"
                      >
                        <option value="popular">Most Popular</option>
                        <option value="likes">Most Liked</option>
                        <option value="recent">Recently Added</option>
                        <option value="name">Name A-Z</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                    </div>

                    {/* Filter Toggle (Mobile) */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={clsx(
                        'lg:hidden p-2.5 rounded-lg border transition-colors',
                        showFilters
                          ? 'bg-teal-50 border-teal-200 text-teal-600'
                          : 'bg-stone-100 border-stone-200 text-stone-600'
                      )}
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex gap-8">
              {/* Sidebar - Categories */}
              <aside className={clsx(
                'w-64 flex-shrink-0',
                showFilters ? 'block' : 'hidden lg:block'
              )}>
                <div className="sticky top-32 space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                      Categories
                    </h3>
                    <nav className="space-y-1">
                      {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const count = category.id === 'all'
                          ? personas.length
                          : personas.filter(p => p.category === category.id).length;

                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                              selectedCategory === category.id
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-stone-600 hover:bg-stone-100'
                            )}
                          >
                            <Icon className={clsx(
                              'w-5 h-5',
                              selectedCategory === category.id ? 'text-teal-600' : 'text-stone-400'
                            )} />
                            <span className="flex-1 font-medium">{category.label}</span>
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full',
                              selectedCategory === category.id
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-stone-100 text-stone-500'
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-stone-100/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-stone-700 mb-3">Your Stats</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Custom Personas</span>
                        <span className="font-medium text-stone-700">{customPersonas.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Liked</span>
                        <span className="font-medium text-stone-700">{likedPersonaIds.size}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Active Persona</span>
                        <span className="font-medium text-teal-600 truncate max-w-[100px]">
                          {activePersona?.name || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trending */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-800">Trending</h3>
                    </div>
                    <div className="space-y-2">
                      {featuredPersonas.slice(0, 3).map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => setSelectedPersona(persona)}
                          className="w-full text-left p-2 hover:bg-amber-100/50 rounded-lg transition-colors"
                        >
                          <p className="text-sm font-medium text-stone-700 truncate">
                            {persona.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                            <Heart className="w-3 h-3" />
                            <span>{persona.stats.likesCount}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 min-w-0">
                {/* Featured Section (only show when no filters applied) */}
                {!searchQuery && selectedCategory === 'all' && (
                  <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-semibold text-stone-900">Featured Personas</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredPersonas.map((persona) => (
                        <PersonaCard
                          key={persona.id}
                          persona={persona}
                          variant="featured"
                          isActive={activePersona?.id === persona.id}
                          isLiked={likedPersonaIds.has(persona.id)}
                          onUse={handleUsePersona}
                          onClick={() => setSelectedPersona(persona)}
                          onLike={() => handleLike(persona)}
                          onFork={() => handleFork(persona)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Results Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {searchQuery
                      ? `Search results for "${searchQuery}"`
                      : selectedCategory === 'all'
                        ? 'All Personas'
                        : CATEGORIES.find(c => c.id === selectedCategory)?.label
                    }
                    <span className="text-stone-400 font-normal ml-2">
                      ({filteredPersonas.length})
                    </span>
                  </h2>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {/* Empty State */}
                {!loading && filteredPersonas.length === 0 && (
                  <div className="bg-stone-100/50 rounded-xl p-12 text-center">
                    <Sparkles className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-700 mb-2">
                      No personas found
                    </h3>
                    <p className="text-stone-500 mb-6">
                      {searchQuery
                        ? 'Try a different search term or clear filters'
                        : 'Create your first custom persona to get started'
                      }
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setShowCreator(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Create Persona
                    </button>
                  </div>
                )}

                {/* Personas Grid/List */}
                {!loading && filteredPersonas.length > 0 && (
                  <div className={clsx(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                      : 'space-y-3'
                  )}>
                    {filteredPersonas.map((persona) => (
                      <PersonaCard
                        key={persona.id}
                        persona={persona}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                        isActive={activePersona?.id === persona.id}
                        isLiked={likedPersonaIds.has(persona.id)}
                        showEditButton={!persona.isBuiltIn}
                        onUse={handleUsePersona}
                        onClick={() => setSelectedPersona(persona)}
                        onEdit={() => setEditingPersona(persona)}
                        onLike={() => handleLike(persona)}
                        onFork={() => handleFork(persona)}
                        onDelete={!persona.isBuiltIn ? () => handleDelete(persona) : undefined}
                      />
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </MainContent>

      {/* Creator Modal */}
      {showCreator && (
        <PersonaCreator
          onComplete={handleCreatePersona}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {/* Edit Modal */}
      {editingPersona && (
        <PersonaCreator
          onComplete={handleUpdatePersona}
          onCancel={() => setEditingPersona(null)}
          initialData={{
            name: editingPersona.name,
            description: editingPersona.description,
            category: editingPersona.category,
            avatarUrl: editingPersona.avatarUrl,
            systemPrompt: editingPersona.systemPrompt,
            starterPrompts: editingPersona.starterPrompts,
            sampleResponses: editingPersona.sampleResponses,
            personality: editingPersona.personality,
            capabilities: editingPersona.capabilities,
            visibility: editingPersona.visibility,
          }}
          isEditing
        />
      )}

      {/* Preview Modal */}
      {selectedPersona && (
        <PersonaPreview
          persona={selectedPersona}
          isActive={activePersona?.id === selectedPersona.id}
          isLiked={likedPersonaIds.has(selectedPersona.id)}
          canEdit={!selectedPersona.isBuiltIn}
          onClose={() => setSelectedPersona(null)}
          onUse={handleUsePersona}
          onEdit={!selectedPersona.isBuiltIn ? () => {
            setEditingPersona(selectedPersona);
            setSelectedPersona(null);
          } : undefined}
          onDelete={!selectedPersona.isBuiltIn ? () => handleDelete(selectedPersona) : undefined}
          onDuplicate={() => handleFork(selectedPersona)}
          onLike={() => handleLike(selectedPersona)}
          onFork={() => handleFork(selectedPersona)}
        />
      )}
    </>
  );
}

// Loading fallback component
function PersonasLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-1)]">
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading personas...</span>
      </div>
    </div>
  );
}

// Default export with Suspense boundary for useSearchParams
export default function PersonasPage() {
  return (
    <Suspense fallback={<PersonasLoading />}>
      <PersonasContent />
    </Suspense>
  );
}
