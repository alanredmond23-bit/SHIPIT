'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Wand2,
  Image as ImageIcon,
  Download,
  Heart,
  Share2,
  Trash2,
  RefreshCw,
  Sparkles,
  Upload,
  ZoomIn,
  Copy,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Check,
  History,
  Palette,
  Maximize2,
} from 'lucide-react';
import clsx from 'clsx';

// Types
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  size: string;
  seed?: number;
  createdAt: Date;
  isFavorite?: boolean;
}

interface ProviderInfo {
  name: string;
  capabilities: string[];
}

interface StylePreset {
  id: string;
  name: string;
  description: string;
  preview: string;
  value: string;
}

// Style presets with visual representations
const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'natural',
    name: 'Natural',
    description: 'Realistic and natural looking',
    preview: '🌿',
    value: 'natural',
  },
  {
    id: 'vivid',
    name: 'Vivid',
    description: 'Bold colors and high contrast',
    preview: '🎨',
    value: 'vivid',
  },
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic photography',
    preview: '📸',
    value: 'photorealistic',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Anime/manga style',
    preview: '🎭',
    value: 'anime',
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    description: 'Modern digital illustration',
    preview: '🖼️',
    value: 'digital-art',
  },
  {
    id: '3d-render',
    name: '3D Render',
    description: '3D rendered appearance',
    preview: '🎬',
    value: '3d-render',
  },
];

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1 Square', desc: '1024×1024' },
  { value: '1024x1792', label: '9:16 Portrait', desc: '1024×1792' },
  { value: '1792x1024', label: '16:9 Landscape', desc: '1792×1024' },
  { value: '512x512', label: '1:1 Small', desc: '512×512' },
];

/**
 * Comprehensive Image Generation Interface
 */
export default function ImageGenerator() {
  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [provider, setProvider] = useState<'dalle3' | 'stability' | 'replicate'>('dalle3');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [style, setStyle] = useState('natural');
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState<number | undefined>();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7);

  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
    loadHistory();
  }, []);

  // API calls
  const loadProviders = async () => {
    try {
      const response = await fetch('/api/images/providers');
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const userId = 'demo-user'; // Replace with actual user ID
      const response = await fetch(`/api/images/history?userId=${userId}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.images);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt: negativePrompt || undefined,
          provider,
          size,
          quality,
          style,
          count,
          seed,
          steps: showAdvanced ? steps : undefined,
          cfgScale: showAdvanced ? cfgScale : undefined,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImages(data.images);
        loadHistory(); // Refresh history
      } else {
        alert(`Error: ${data.error.message}`);
      }
    } catch (error: any) {
      alert(`Failed to generate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;

    setEnhancing(true);

    try {
      const response = await fetch('/api/images/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.success) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setEnhancing(false);
    }
  };

  const handleVariations = async (imageUrl: string) => {
    setLoading(true);

    try {
      const response = await fetch('/api/images/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          count: 4,
          provider,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImages(data.variations);
      }
    } catch (error: any) {
      alert(`Failed to create variations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpscale = async (imageUrl: string) => {
    setLoading(true);

    try {
      const response = await fetch('/api/images/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          scale: 2,
          provider: provider === 'dalle3' ? 'stability' : provider,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImages([data.image, ...images]);
      }
    } catch (error: any) {
      alert(`Failed to upscale: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download image');
    }
  };

  const handleShare = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    } catch (error) {
      alert('Failed to copy URL');
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setEditMode(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-purple-400" />
              AI Image Generator
            </h1>
            <p className="text-slate-400 mt-1">
              Multi-provider image generation with DALL-E, Stability AI, and Replicate
            </p>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Prompt Input */}
            <div className="card">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />

              <button
                onClick={handleEnhancePrompt}
                disabled={enhancing || !prompt.trim()}
                className="mt-2 w-full btn-secondary flex items-center justify-center gap-2"
              >
                {enhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Enhance with AI
              </button>
            </div>

            {/* Provider Selection */}
            <div className="card">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provider
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['dalle3', 'stability', 'replicate'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={clsx(
                      'py-2 px-3 rounded-lg font-medium text-sm transition-colors',
                      provider === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {p === 'dalle3' ? 'DALL-E 3' : p === 'stability' ? 'Stability' : 'Replicate'}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="card">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Size & Aspect Ratio
              </label>
              <div className="space-y-2">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSize(option.value)}
                    className={clsx(
                      'w-full py-2 px-4 rounded-lg text-left transition-colors',
                      size === option.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs opacity-75">{option.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div className="card">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setStyle(preset.value)}
                    className={clsx(
                      'p-3 rounded-lg text-left transition-all',
                      style === preset.value
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    <div className="text-2xl mb-1">{preset.preview}</div>
                    <div className="text-xs font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            {provider === 'dalle3' && (
              <div className="card">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Quality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuality('standard')}
                    className={clsx(
                      'py-2 px-4 rounded-lg font-medium',
                      quality === 'standard'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setQuality('hd')}
                    className={clsx(
                      'py-2 px-4 rounded-lg font-medium',
                      quality === 'hd'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    HD
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div className="card">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Advanced Options</span>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Negative Prompt
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none"
                    />
                  </div>

                  {provider !== 'dalle3' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">
                          Steps: {steps}
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="150"
                          value={steps}
                          onChange={(e) => setSteps(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">
                          CFG Scale: {cfgScale}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={cfgScale}
                          onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Seed (optional)
                    </label>
                    <input
                      type="number"
                      value={seed || ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Random"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Number of Images: {count}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={provider === 'dalle3' ? '1' : '4'}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Images
                </>
              )}
            </button>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                dragActive
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              )}
            >
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-slate-500 mt-1">
                For image-to-image editing
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="card text-center py-12">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-300 text-lg">Creating your images...</p>
                <p className="text-slate-500 text-sm mt-2">
                  This may take 10-30 seconds
                </p>
              </div>
            )}

            {!loading && images.length === 0 && !showHistory && (
              <div className="card text-center py-16">
                <ImageIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No images yet</p>
                <p className="text-slate-500 text-sm mt-2">
                  Enter a prompt and generate your first image
                </p>
              </div>
            )}

            {!loading && images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Generated Images ({images.length})
                  </h2>
                  <button
                    onClick={() => setImages([])}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {images.map((image, index) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      onView={() => {
                        setSelectedImage(image);
                        setShowLightbox(true);
                      }}
                      onDownload={() =>
                        handleDownload(image.url, `generated-${image.id}.png`)
                      }
                      onShare={() => handleShare(image.url)}
                      onVariations={() => handleVariations(image.url)}
                      onUpscale={() => handleUpscale(image.url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {showHistory && history.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Recent History</h2>
                <div className="grid grid-cols-3 gap-3">
                  {history.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => {
                        setSelectedImage(image);
                        setShowLightbox(true);
                      }}
                      className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square"
                    >
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs truncate">{image.prompt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && selectedImage && (
        <Lightbox
          image={selectedImage}
          onClose={() => {
            setShowLightbox(false);
            setSelectedImage(null);
          }}
          onDownload={() =>
            handleDownload(selectedImage.url, `generated-${selectedImage.id}.png`)
          }
          onShare={() => handleShare(selectedImage.url)}
        />
      )}
    </div>
  );
}

/**
 * Image Card Component
 */
function ImageCard({
  image,
  onView,
  onDownload,
  onShare,
  onVariations,
  onUpscale,
}: {
  image: GeneratedImage;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onVariations: () => void;
  onUpscale: () => void;
}) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="card group relative overflow-hidden">
      <div
        onClick={onView}
        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer mb-3"
      >
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-medium line-clamp-2">{image.prompt}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <span className="px-2 py-1 bg-slate-800 rounded">{image.provider}</span>
        <span className="px-2 py-1 bg-slate-800 rounded">{image.size}</span>
        {image.seed && <span className="px-2 py-1 bg-slate-800 rounded">Seed: {image.seed}</span>}
      </div>

      <div className="grid grid-cols-5 gap-1">
        <button
          onClick={onView}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          title="View"
        >
          <Maximize2 className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={onDownload}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={onShare}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={onVariations}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          title="Create Variations"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={onUpscale}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          title="Upscale"
        >
          <ZoomIn className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

/**
 * Lightbox Component
 */
function Lightbox({
  image,
  onClose,
  onDownload,
  onShare,
}: {
  image: GeneratedImage;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="max-w-6xl w-full max-h-full flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-center justify-center">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
          />
        </div>

        <div className="w-full lg:w-80 bg-slate-900 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">Image Details</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Prompt</label>
              <p className="text-sm text-slate-300 mt-1">{image.prompt}</p>
            </div>

            {image.revisedPrompt && (
              <div>
                <label className="text-xs text-slate-500">Revised Prompt</label>
                <p className="text-sm text-slate-300 mt-1">{image.revisedPrompt}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Provider</label>
                <p className="text-sm text-white mt-1 capitalize">{image.provider}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Model</label>
                <p className="text-sm text-white mt-1">{image.model}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Size</label>
                <p className="text-sm text-white mt-1">{image.size}</p>
              </div>
              {image.seed && (
                <div>
                  <label className="text-xs text-slate-500">Seed</label>
                  <p className="text-sm text-white mt-1">{image.seed}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button onClick={onDownload} className="w-full btn-primary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onShare} className="w-full btn-secondary flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
