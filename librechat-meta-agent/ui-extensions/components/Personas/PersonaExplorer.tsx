'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  TrendingUp,
  Star,
  Heart,
  Users,
  MessageSquare,
  GitFork,
  Eye,
  Sparkles,
  Code,
  GraduationCap,
  Briefcase,
  Palette,
  FlaskConical,
  Activity,
  Loader2,
  X,
  Check,
  Play,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Persona Explorer - Marketplace for discovering and using custom personas
 *
 * Features:
 * - Category filters
 * - Search functionality
 * - Featured carousel
 * - Grid of persona cards
 * - Like/fork counts
 * - Quick preview modal
 * - Trending personas
 */

interface Persona {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  avatar_url: string | null;
  creator_id: string;
  visibility: string;
  is_featured: boolean;
  stats: {
    conversations_count: number;
    messages_count: number;
    likes_count: number;
    forks_count: number;
  };
  personality: {
    tone: string;
    verbosity: string;
    creativity: number;
  };
  capabilities: {
    web_search: boolean;
    code_execution: boolean;
    image_generation: boolean;
    file_analysis: boolean;
    voice_chat: boolean;
    computer_use: boolean;
  };
  starter_prompts: string[];
  created_at: string;
}

interface PersonaExplorerProps {
  apiUrl?: string;
  userId: string;
  onSelectPersona?: (personaId: string) => void;
  onForkPersona?: (personaId: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'development', label: 'Development', icon: Code },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'creative', label: 'Creative', icon: Palette },
  { id: 'science', label: 'Science', icon: FlaskConical },
  { id: 'health', label: 'Health', icon: Activity },
];

export default function PersonaExplorer({
  apiUrl = '/api/personas',
  userId,
  onSelectPersona,
  onForkPersona,
}: PersonaExplorerProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [featuredPersonas, setFeaturedPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [likedPersonas, setLikedPersonas] = useState<Set<string>>(new Set());

  // Load personas
  useEffect(() => {
    loadPersonas();
    loadFeatured();
  }, [selectedCategory, searchQuery]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await fetch(`${apiUrl}/explore?${params}`);
      const data = await response.json();
      setPersonas(data.data || []);
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatured = async () => {
    try {
      const response = await fetch(`${apiUrl}/featured?limit=5`);
      const data = await response.json();
      setFeaturedPersonas(data.data || []);
    } catch (error) {
      console.error('Failed to load featured personas:', error);
    }
  };

  const handleLike = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`${apiUrl}/${personaId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const { data } = await response.json();

      if (data.liked) {
        setLikedPersonas(new Set([...likedPersonas, personaId]));
      } else {
        const updated = new Set(likedPersonas);
        updated.delete(personaId);
        setLikedPersonas(updated);
      }

      // Refresh personas to get updated stats
      loadPersonas();
    } catch (error) {
      console.error('Failed to like persona:', error);
    }
  };

  const handleFork = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`${apiUrl}/${personaId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const { data } = await response.json();
      onForkPersona?.(data.id);
    } catch (error) {
      console.error('Failed to fork persona:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.id === category.toLowerCase());
    return cat?.icon || Sparkles;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Explore Personas</h1>
              <p className="text-slate-400">
                Discover and use custom AI personas created by the community
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
            >
              <Filter className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personas..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div
            className={clsx(
              'w-64 flex-shrink-0',
              showFilters ? 'block' : 'hidden lg:block'
            )}
          >
            <div className="sticky top-32 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-slate-400">CATEGORIES</h3>
                <div className="space-y-1">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                          selectedCategory === category.id
                            ? 'bg-indigo-600/30 text-indigo-400'
                            : 'hover:bg-slate-800 text-slate-300'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trending */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold">Trending This Week</h3>
                </div>
                <div className="space-y-2">
                  {featuredPersonas.slice(0, 3).map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full text-left p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                      <p className="text-sm font-medium line-clamp-1">{persona.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Heart className="w-3 h-3" />
                        {persona.stats.likes_count}
                        <MessageSquare className="w-3 h-3 ml-2" />
                        {persona.stats.conversations_count}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Featured Section */}
            {featuredPersonas.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-semibold">Featured Personas</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredPersonas.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      isLiked={likedPersonas.has(persona.id)}
                      onLike={(e) => handleLike(persona.id, e)}
                      onFork={(e) => handleFork(persona.id, e)}
                      onClick={() => setSelectedPersona(persona)}
                      featured
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Personas Grid */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-4">
                {selectedCategory === 'all' ? 'All Personas' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : personas.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No personas found</p>
                <p className="text-slate-500 text-sm mt-2">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    isLiked={likedPersonas.has(persona.id)}
                    onLike={(e) => handleLike(persona.id, e)}
                    onFork={(e) => handleFork(persona.id, e)}
                    onClick={() => setSelectedPersona(persona)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persona Preview Modal */}
      {selectedPersona && (
        <PersonaPreviewModal
          persona={selectedPersona}
          isLiked={likedPersonas.has(selectedPersona.id)}
          onClose={() => setSelectedPersona(null)}
          onUse={() => onSelectPersona?.(selectedPersona.id)}
          onLike={(e) => handleLike(selectedPersona.id, e)}
          onFork={(e) => handleFork(selectedPersona.id, e)}
        />
      )}
    </div>
  );
}

/**
 * Persona Card Component
 */
interface PersonaCardProps {
  persona: Persona;
  isLiked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onFork: (e: React.MouseEvent) => void;
  onClick: () => void;
  featured?: boolean;
}

function PersonaCard({ persona, isLiked, onLike, onFork, onClick, featured }: PersonaCardProps) {
  const CategoryIcon = CATEGORIES.find(
    (c) => c.id === persona.category.toLowerCase()
  )?.icon || Sparkles;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative group bg-slate-800/50 rounded-xl p-5 border-2 transition-all text-left hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/20',
        featured
          ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-900/10 to-slate-800/50'
          : 'border-slate-700'
      )}
    >
      {featured && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          Featured
        </div>
      )}

      {/* Avatar & Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
          {persona.avatar_url ? (
            <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover" />
          ) : (
            <CategoryIcon className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold line-clamp-1 group-hover:text-indigo-400 transition-colors">
            {persona.name}
          </h3>
          <p className="text-xs text-slate-400 capitalize">{persona.category}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 line-clamp-2 mb-4">{persona.description}</p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-4">
        {persona.capabilities.web_search && (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
            Web
          </span>
        )}
        {persona.capabilities.code_execution && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Code
          </span>
        )}
        {persona.capabilities.image_generation && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
            Images
          </span>
        )}
        {persona.capabilities.voice_chat && (
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
            Voice
          </span>
        )}
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {persona.stats.conversations_count}
          </div>
          <div className="flex items-center gap-1">
            <Heart className={clsx('w-3.5 h-3.5', isLiked && 'fill-red-400 text-red-400')} />
            {persona.stats.likes_count}
          </div>
          <div className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {persona.stats.forks_count}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onLike}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isLiked
                ? 'text-red-400 hover:bg-red-500/20'
                : 'hover:bg-slate-700'
            )}
          >
            <Heart className={clsx('w-4 h-4', isLiked && 'fill-current')} />
          </button>
          <button
            onClick={onFork}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <GitFork className="w-4 h-4" />
          </button>
        </div>
      </div>
    </button>
  );
}

/**
 * Persona Preview Modal
 */
interface PersonaPreviewModalProps {
  persona: Persona;
  isLiked: boolean;
  onClose: () => void;
  onUse: () => void;
  onLike: (e: React.MouseEvent) => void;
  onFork: (e: React.MouseEvent) => void;
}

function PersonaPreviewModal({
  persona,
  isLiked,
  onClose,
  onUse,
  onLike,
  onFork,
}: PersonaPreviewModalProps) {
  const CategoryIcon = CATEGORIES.find(
    (c) => c.id === persona.category.toLowerCase()
  )?.icon || Sparkles;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {persona.avatar_url ? (
                <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover" />
              ) : (
                <CategoryIcon className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{persona.name}</h2>
                  <p className="text-slate-400 capitalize">{persona.category}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-container space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-slate-400">DESCRIPTION</h3>
            <p className="text-slate-300">{persona.description}</p>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-400">CAPABILITIES</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(persona.capabilities).map(([key, enabled]) => {
                if (!enabled) return null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-400">PERSONALITY</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Tone</p>
                <p className="font-medium capitalize">{persona.personality.tone}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Verbosity</p>
                <p className="font-medium capitalize">{persona.personality.verbosity}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Creativity</p>
                <p className="font-medium">{Math.round(persona.personality.creativity * 100)}%</p>
              </div>
            </div>
          </div>

          {/* Starter Prompts */}
          {persona.starter_prompts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-slate-400">STARTER PROMPTS</h3>
              <div className="space-y-2">
                {persona.starter_prompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-300"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-400">STATISTICS</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <MessageSquare className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{persona.stats.conversations_count}</p>
                <p className="text-xs text-slate-400">Conversations</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{persona.stats.likes_count}</p>
                <p className="text-xs text-slate-400">Likes</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <GitFork className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{persona.stats.forks_count}</p>
                <p className="text-xs text-slate-400">Forks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onLike}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                isLiked
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-slate-800 hover:bg-slate-700'
              )}
            >
              <Heart className={clsx('w-5 h-5', isLiked && 'fill-current')} />
              {isLiked ? 'Liked' : 'Like'}
            </button>
            <button
              onClick={onFork}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <GitFork className="w-5 h-5" />
              Fork
            </button>
          </div>

          <button
            onClick={onUse}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-semibold"
          >
            <Play className="w-5 h-5" />
            Use This Persona
          </button>
        </div>
      </div>
    </div>
  );
}
