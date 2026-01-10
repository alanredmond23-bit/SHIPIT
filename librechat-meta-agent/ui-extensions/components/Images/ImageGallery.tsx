'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Heart,
  Share2,
  Trash2,
  ZoomIn,
  X,
  Info,
  RefreshCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import type { GeneratedImage } from '@/hooks/useImageGeneration';

export interface ImageGalleryProps {
  images: GeneratedImage[];
  onImageClick?: (image: GeneratedImage) => void;
  onDownload?: (image: GeneratedImage) => void;
  onShare?: (image: GeneratedImage) => void;
  onDelete?: (imageId: string) => void;
  onToggleFavorite?: (imageId: string) => void;
  onCreateVariations?: (imageUrl: string) => void;
  onUpscale?: (imageUrl: string) => void;
  columns?: number;
  gap?: number;
  showActions?: boolean;
  showInfo?: boolean;
  className?: string;
}

/**
 * ImageGallery - Pinterest-style masonry grid for generated images
 */
export function ImageGallery({
  images,
  onImageClick,
  onDownload,
  onShare,
  onDelete,
  onToggleFavorite,
  onCreateVariations,
  onUpscale,
  columns = 3,
  gap = 16,
  showActions = true,
  showInfo = true,
  className,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle image click
  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImage(image);
    setShowLightbox(true);
    onImageClick?.(image);
  };

  // Navigate lightbox
  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    let newIndex: number;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedImage(images[newIndex]);
  }, [selectedImage, images]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showLightbox) return;

      switch (e.key) {
        case 'Escape':
          setShowLightbox(false);
          break;
        case 'ArrowLeft':
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          navigateLightbox('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, navigateLightbox]);

  // Copy to clipboard
  const handleCopy = async (image: GeneratedImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopiedId(image.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Distribute images into columns for masonry layout
  const getColumnsData = () => {
    const columnHeights = new Array(columns).fill(0);
    const columnData: GeneratedImage[][] = Array.from({ length: columns }, () => []);

    images.forEach((image) => {
      // Find the shortest column
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));

      // Add image to shortest column
      columnData[shortestColumn].push(image);

      // Estimate height based on aspect ratio (default 1:1)
      const aspectRatio = image.size.includes('x')
        ? parseInt(image.size.split('x')[1]) / parseInt(image.size.split('x')[0])
        : 1;
      columnHeights[shortestColumn] += 200 * aspectRatio + gap;
    });

    return columnData;
  };

  if (images.length === 0) {
    return (
      <div className={clsx(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}>
        <Sparkles className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-500 text-lg">No images yet</p>
        <p className="text-stone-400 text-sm mt-1">
          Generate some images to see them here
        </p>
      </div>
    );
  }

  const columnsData = getColumnsData();

  return (
    <>
      <div
        ref={containerRef}
        className={clsx('flex', className)}
        style={{ gap: `${gap}px` }}
      >
        {columnsData.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="flex-1 flex flex-col"
            style={{ gap: `${gap}px` }}
          >
            {column.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onView={() => handleImageClick(image)}
                onDownload={() => onDownload?.(image)}
                onShare={() => onShare?.(image)}
                onDelete={() => onDelete?.(image.id)}
                onToggleFavorite={() => onToggleFavorite?.(image.id)}
                onCopy={() => handleCopy(image)}
                onVariations={() => onCreateVariations?.(image.url)}
                onUpscale={() => onUpscale?.(image.url)}
                isCopied={copiedId === image.id}
                showActions={showActions}
                showInfo={showInfo}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {showLightbox && selectedImage && (
        <Lightbox
          image={selectedImage}
          images={images}
          onClose={() => setShowLightbox(false)}
          onPrev={() => navigateLightbox('prev')}
          onNext={() => navigateLightbox('next')}
          onDownload={() => onDownload?.(selectedImage)}
          onShare={() => onShare?.(selectedImage)}
          onDelete={() => {
            onDelete?.(selectedImage.id);
            setShowLightbox(false);
          }}
          onToggleFavorite={() => onToggleFavorite?.(selectedImage.id)}
          onVariations={() => onCreateVariations?.(selectedImage.url)}
          onUpscale={() => onUpscale?.(selectedImage.url)}
        />
      )}
    </>
  );
}

/**
 * Image Card Component
 */
interface ImageCardProps {
  image: GeneratedImage;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onVariations: () => void;
  onUpscale: () => void;
  isCopied: boolean;
  showActions: boolean;
  showInfo: boolean;
}

function ImageCard({
  image,
  onView,
  onDownload,
  onShare,
  onDelete,
  onToggleFavorite,
  onCopy,
  onVariations,
  onUpscale,
  isCopied,
  showActions,
  showInfo,
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className="relative group rounded-xl overflow-hidden bg-stone-100 shadow-sm hover:shadow-lg transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div
        onClick={onView}
        className="cursor-pointer relative"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-200 animate-pulse">
            <Sparkles className="w-8 h-8 text-stone-400" />
          </div>
        )}
        <img
          src={image.url}
          alt={image.prompt}
          className={clsx(
            'w-full h-auto object-cover transition-transform duration-300',
            isHovered && 'scale-105',
            !imageLoaded && 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Gradient overlay on hover */}
        <div
          className={clsx(
            'absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent',
            'transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Prompt on hover */}
        {showInfo && (
          <div
            className={clsx(
              'absolute bottom-0 left-0 right-0 p-3',
              'transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <p className="text-white text-sm line-clamp-2">{image.prompt}</p>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={clsx(
            'absolute top-2 right-2 p-2 rounded-full transition-all duration-300',
            image.isFavorite
              ? 'bg-red-500 text-white opacity-100'
              : isHovered
              ? 'bg-black/50 text-white opacity-100 hover:bg-black/70'
              : 'opacity-0'
          )}
        >
          <Heart
            className={clsx('w-4 h-4', image.isFavorite && 'fill-current')}
          />
        </button>
      </div>

      {/* Action bar */}
      {showActions && (
        <div
          className={clsx(
            'absolute bottom-0 left-0 right-0',
            'flex items-center justify-between p-2',
            'bg-white/95 backdrop-blur-sm',
            'transition-all duration-300',
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          )}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={onView}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
              title="View"
            >
              <Maximize2 className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={onDownload}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={onCopy}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
              title={isCopied ? 'Copied!' : 'Copy URL'}
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-stone-600" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onVariations}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
              title="Create variations"
            >
              <RefreshCw className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={onUpscale}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
              title="Upscale"
            >
              <ZoomIn className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Badge for provider/style */}
      {showInfo && (
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
            {image.provider}
          </span>
          {image.style && (
            <span className="px-2 py-0.5 bg-teal-500/80 text-white text-xs rounded-full backdrop-blur-sm">
              {image.style}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Lightbox Component
 */
interface LightboxProps {
  image: GeneratedImage;
  images: GeneratedImage[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onVariations: () => void;
  onUpscale: () => void;
}

function Lightbox({
  image,
  images,
  onClose,
  onPrev,
  onNext,
  onDownload,
  onShare,
  onDelete,
  onToggleFavorite,
  onVariations,
  onUpscale,
}: LightboxProps) {
  const currentIndex = images.findIndex(img => img.id === image.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 rounded-full">
          <span className="text-white text-sm">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex flex-col lg:flex-row gap-6 max-w-6xl w-full max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
          />
        </div>

        {/* Info panel */}
        <div className="w-full lg:w-80 bg-white rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">Image Details</h3>
            <button
              onClick={onToggleFavorite}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                image.isFavorite
                  ? 'bg-red-100 text-red-500'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              )}
            >
              <Heart className={clsx('w-5 h-5', image.isFavorite && 'fill-current')} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-400">Prompt</label>
              <p className="text-sm text-stone-700 mt-1">{image.prompt}</p>
            </div>

            {image.revisedPrompt && (
              <div>
                <label className="text-xs font-medium text-stone-400">Revised Prompt</label>
                <p className="text-sm text-stone-700 mt-1">{image.revisedPrompt}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">Provider</label>
                <p className="text-sm text-stone-900 mt-0.5 capitalize">{image.provider}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Size</label>
                <p className="text-sm text-stone-900 mt-0.5">{image.size}</p>
              </div>
              {image.style && (
                <div>
                  <label className="text-xs font-medium text-stone-400">Style</label>
                  <p className="text-sm text-stone-900 mt-0.5 capitalize">{image.style}</p>
                </div>
              )}
              {image.seed && (
                <div>
                  <label className="text-xs font-medium text-stone-400">Seed</label>
                  <p className="text-sm text-stone-900 mt-0.5">{image.seed}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-stone-400">Created</label>
                <p className="text-sm text-stone-900 mt-0.5">
                  {image.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <button
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onVariations}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Variations
              </button>
              <button
                onClick={onUpscale}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                Upscale
              </button>
            </div>
            <button
              onClick={onShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageGallery;
