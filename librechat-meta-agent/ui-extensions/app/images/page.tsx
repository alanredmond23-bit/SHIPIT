'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import ImageGenerator from '@/components/ImageGen/ImageGenerator';
import { ImageGallery } from '@/components/Images';
import { useImageGeneration, type GeneratedImage } from '@/hooks';
import {
  History,
  Grid3X3,
  LayoutGrid,
  Image as ImageIcon,
  Trash2,
  Download,
  Star,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Settings,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';

type ViewMode = 'generator' | 'gallery' | 'split';
type SortOption = 'newest' | 'oldest' | 'favorites';
type FilterOption = 'all' | 'favorites' | 'dalle3' | 'stability' | 'replicate';

export default function ImagesPage() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Image generation hook
  const {
    status,
    images,
    history,
    error,
    estimatedCost,
    generate,
    clearImages,
    clearHistory,
    toggleFavorite,
    deleteImage,
    downloadImage,
    shareImage,
    createVariations,
    upscale,
  } = useImageGeneration({
    maxHistorySize: 100,
    onGenerate: (newImages) => {
      console.log('Generated images:', newImages.length);
    },
    onError: (err) => {
      console.error('Generation error:', err);
    },
  });

  // Stats
  const totalImages = history.length;
  const favoriteCount = history.filter(img => img.isFavorite).length;
  const totalCost = history.reduce((acc, img) => {
    // Rough estimate based on provider
    const costMap: Record<string, number> = {
      dalle3: 0.04,
      stability: 0.02,
      replicate: 0.02,
    };
    return acc + (costMap[img.provider] || 0.03);
  }, 0);

  // Filter and sort images
  const filteredHistory = history
    .filter((img) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          img.prompt.toLowerCase().includes(query) ||
          img.provider.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter((img) => {
      // Category filter
      switch (filterBy) {
        case 'favorites':
          return img.isFavorite;
        case 'dalle3':
          return img.provider === 'dalle3';
        case 'stability':
          return img.provider === 'stability';
        case 'replicate':
          return img.provider === 'replicate';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Sort
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'favorites':
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 1/2/3 for view modes
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          setViewMode('generator');
        } else if (e.key === '2') {
          e.preventDefault();
          setViewMode('gallery');
        } else if (e.key === '3') {
          e.preventDefault();
          setViewMode('split');
        } else if (e.key === 'k') {
          e.preventDefault();
          setShowFilters((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
          {/* Header Bar */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Title and Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-500" />
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Image Generation
                  </h1>
                </div>
                <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Grid3X3 className="w-4 h-4" />
                    {totalImages} images
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {favoriteCount} favorites
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    ${totalCost.toFixed(2)} spent
                  </span>
                </div>
              </div>

              {/* Center: View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('generator')}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'generator'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="Generator view (Cmd+1)"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'gallery'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="Gallery view (Cmd+2)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'split'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="Split view (Cmd+3)"
                >
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-3 bg-current rounded-sm" />
                    <div className="w-2.5 h-3 bg-current rounded-sm" />
                  </div>
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 py-1.5 w-48 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    showFilters
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  title="Toggle filters (Cmd+K)"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* Clear History */}
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all image history?')) {
                        clearHistory();
                      }
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Clear history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="favorites">Favorites First</option>
                  </select>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Images</option>
                    <option value="favorites">Favorites Only</option>
                    <option value="dalle3">DALL-E 3</option>
                    <option value="stability">Stability AI</option>
                    <option value="replicate">Replicate</option>
                  </select>
                </div>

                {/* Results count */}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredHistory.length} of {history.length} images
                </span>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Generator Panel */}
            {(viewMode === 'generator' || viewMode === 'split') && (
              <div
                className={clsx(
                  'overflow-auto',
                  viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'
                )}
              >
                <ImageGenerator />
              </div>
            )}

            {/* Gallery Panel */}
            {(viewMode === 'gallery' || viewMode === 'split') && (
              <div
                className={clsx(
                  'overflow-auto bg-gray-100 dark:bg-gray-850 p-4',
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                )}
              >
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                      <History className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No images yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                      {searchQuery
                        ? 'No images match your search. Try different keywords.'
                        : 'Start generating images to build your gallery. Use the generator on the left to create your first image.'}
                    </p>
                  </div>
                ) : (
                  <ImageGallery
                    images={filteredHistory}
                    columns={viewMode === 'split' ? 2 : 4}
                    gap={12}
                    onDownload={downloadImage}
                    onShare={shareImage}
                    onDelete={deleteImage}
                    onToggleFavorite={toggleFavorite}
                    onCreateVariations={(imageUrl) => createVariations(imageUrl, 4)}
                    onUpscale={(imageUrl) => upscale(imageUrl, 2)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {status === 'generating' ? 'Generating...' : status === 'enhancing' ? 'Enhancing prompt...' : 'Ready'}
                </span>
                {estimatedCost && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Est. ${estimatedCost.estimatedCost.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>Cmd+1: Generator</span>
                <span>Cmd+2: Gallery</span>
                <span>Cmd+3: Split</span>
                <span>Cmd+K: Filters</span>
              </div>
            </div>
          </div>
        </div>
      </MainContent>
    </>
  );
}
