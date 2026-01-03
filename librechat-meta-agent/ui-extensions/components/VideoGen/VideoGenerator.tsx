'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  Heart,
  Share2,
  Trash2,
  RefreshCw,
  Sparkles,
  Upload,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  History,
  Maximize2,
  ZoomIn,
  Image as ImageIcon,
  Video,
  Wand2,
  Clock,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';

// Types
interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  provider: string;
  model?: string;
  duration: number;
  aspectRatio: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  fps?: number;
  motion?: string;
  style?: string;
  seed?: number;
  sourceImageUrl?: string;
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

// Style presets for video generation
const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-like quality with professional lighting',
    preview: '🎬',
    value: 'cinematic, professional lighting, film grain',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese animation style',
    preview: '🎭',
    value: 'anime style, vibrant colors',
  },
  {
    id: 'realistic',
    name: 'Realistic',
    description: 'Photorealistic and lifelike',
    preview: '📸',
    value: 'photorealistic, ultra detailed, 8k',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: '3D animated style',
    preview: '🎨',
    value: '3D cartoon style, Pixar-like',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic neon aesthetic',
    preview: '🌃',
    value: 'cyberpunk, neon lights, futuristic',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Painted watercolor effect',
    preview: '🎨',
    value: 'watercolor painting, artistic',
  },
];

const DURATION_OPTIONS = [
  { value: 4, label: '4 seconds', desc: 'Quick preview' },
  { value: 8, label: '8 seconds', desc: 'Standard' },
  { value: 16, label: '16 seconds', desc: 'Extended' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: 'Landscape', icon: '⬛', desc: 'Widescreen' },
  { value: '9:16', label: 'Portrait', icon: '⬜', desc: 'Mobile' },
  { value: '1:1', label: 'Square', icon: '◼️', desc: 'Social' },
];

const MOTION_PRESETS = [
  { value: 'slow', label: 'Slow', desc: 'Subtle movement' },
  { value: 'medium', label: 'Medium', desc: 'Balanced motion' },
  { value: 'fast', label: 'Fast', desc: 'Dynamic action' },
];

/**
 * Comprehensive Video Generation Interface
 * Like Sora, Runway, Pika combined
 */
export default function VideoGenerator() {
  // State
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<'runway' | 'pika' | 'stability' | 'replicate'>(
    'runway'
  );
  const [duration, setDuration] = useState<4 | 8 | 16>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [style, setStyle] = useState('cinematic');
  const [motion, setMotion] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [seed, setSeed] = useState<number | undefined>();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [fps, setFps] = useState(24);

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Image-to-video mode
  const [mode, setMode] = useState<'text' | 'image' | 'extend'>('text');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queue management
  const [queue, setQueue] = useState<GeneratedVideo[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);

  // Load providers and history on mount
  useEffect(() => {
    loadProviders();
    loadHistory();
  }, []);

  // Poll for video updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateQueueStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [queue]);

  // API calls
  const loadProviders = async () => {
    try {
      const response = await fetch('/api/videos/providers/list');
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
      const userId = 'demo-user';
      const response = await fetch(`/api/videos?userId=${userId}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.videos);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const updateQueueStatus = async () => {
    const processingVideos = queue.filter(
      (v) => v.status === 'processing' || v.status === 'queued'
    );

    for (const video of processingVideos) {
      try {
        const response = await fetch(`/api/videos/${video.id}`);
        const data = await response.json();

        if (data.success) {
          setQueue((prev) =>
            prev.map((v) => (v.id === video.id ? { ...v, ...data.video } : v))
          );

          if (data.video.status === 'completed') {
            setVideos((prev) => [data.video, ...prev]);
          }
        }
      } catch (error) {
        console.error('Failed to update video status:', error);
      }
    }
  };

  const handleGenerateFromText = async () => {
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          duration,
          aspectRatio,
          style,
          motion,
          seed,
          fps: showAdvanced ? fps : undefined,
          negativePrompt: showAdvanced && negativePrompt ? negativePrompt : undefined,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueue((prev) => [...prev, data.video]);
        setActiveGeneration(data.video.id);
        loadHistory();
      } else {
        alert(`Error: ${data.error.message}`);
      }
    } catch (error: any) {
      alert(`Failed to generate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimateImage = async () => {
    if (!uploadedImage || !prompt.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/videos/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedImage,
          prompt,
          provider,
          duration,
          motion,
          seed,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueue((prev) => [...prev, data.video]);
        setActiveGeneration(data.video.id);
        loadHistory();
      } else {
        alert(`Error: ${data.error.message}`);
      }
    } catch (error: any) {
      alert(`Failed to animate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (mode === 'text') {
      handleGenerateFromText();
    } else if (mode === 'image') {
      handleAnimateImage();
    }
  };

  const handleDownload = async (videoUrl: string, filename: string) => {
    try {
      const response = await fetch(videoUrl);
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
      alert('Failed to download video');
    }
  };

  const handleShare = async (videoUrl: string) => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      alert('Video URL copied to clipboard!');
    } catch (error) {
      alert('Failed to copy URL');
    }
  };

  const handleToggleFavorite = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      });

      const data = await response.json();

      if (data.success) {
        setVideos((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, isFavorite: data.isFavorite } : v))
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
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
      setMode('image');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
              <Film className="w-8 h-8 text-teal-500" />
              AI Video Generator
            </h1>
            <p className="text-stone-500 mt-1">
              Create stunning videos with Runway Gen-3, Pika, and Replicate
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
            {/* Mode Selection */}
            <div className="card">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMode('text')}
                  className={clsx(
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors flex flex-col items-center gap-2',
                    mode === 'text'
                      ? 'bg-teal-500 text-stone-900'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  )}
                >
                  <Wand2 className="w-5 h-5" />
                  <span>Text</span>
                </button>
                <button
                  onClick={() => setMode('image')}
                  className={clsx(
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors flex flex-col items-center gap-2',
                    mode === 'image'
                      ? 'bg-teal-500 text-stone-900'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  )}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Image</span>
                </button>
                <button
                  onClick={() => setMode('extend')}
                  className={clsx(
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors flex flex-col items-center gap-2',
                    mode === 'extend'
                      ? 'bg-teal-500 text-stone-900'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  )}
                >
                  <Layers className="w-5 h-5" />
                  <span>Extend</span>
                </button>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {mode === 'image' ? 'Motion Description' : 'Video Description'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'image'
                    ? 'Describe how the image should move...'
                    : 'Describe the video you want to create...'
                }
                rows={4}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Image Upload (for image-to-video mode) */}
            {mode === 'image' && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'card border-2 border-dashed cursor-pointer transition-colors',
                  dragActive
                    ? 'border-teal-500 bg-teal-500/10'
                    : uploadedImage
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                {uploadedImage ? (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg"
                    >
                      <X className="w-4 h-4 text-stone-900" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm text-stone-500">
                      Drag & drop or click to upload
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      Upload an image to animate
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* Provider Selection */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['runway', 'pika', 'replicate'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={clsx(
                      'py-2 px-3 rounded-lg font-medium text-sm transition-colors',
                      provider === p
                        ? 'bg-teal-500 text-stone-900'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    )}
                  >
                    {p === 'runway'
                      ? 'Runway'
                      : p === 'pika'
                      ? 'Pika'
                      : 'Replicate'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Duration
              </label>
              <div className="space-y-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDuration(option.value as any)}
                    className={clsx(
                      'w-full py-2 px-4 rounded-lg text-left transition-colors',
                      duration === option.value
                        ? 'bg-teal-500 text-stone-900'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
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

            {/* Aspect Ratio */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value as any)}
                    className={clsx(
                      'py-3 px-3 rounded-lg transition-all flex flex-col items-center gap-2',
                      aspectRatio === ratio.value
                        ? 'bg-teal-500 text-stone-900 ring-2 ring-teal-400'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    )}
                  >
                    <div className="text-2xl">{ratio.icon}</div>
                    <div className="text-xs font-medium text-center">
                      <div>{ratio.label}</div>
                      <div className="text-[10px] opacity-75">{ratio.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-3">
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
                        ? 'bg-teal-500 text-stone-900 ring-2 ring-teal-400'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    )}
                  >
                    <div className="text-2xl mb-1">{preset.preview}</div>
                    <div className="text-xs font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Motion */}
            <div className="card">
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Motion Intensity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MOTION_PRESETS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMotion(m.value as any)}
                    className={clsx(
                      'py-2 px-3 rounded-lg transition-colors',
                      motion === m.value
                        ? 'bg-teal-500 text-stone-900'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    )}
                  >
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-[10px] opacity-75">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="card">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-stone-700 hover:text-stone-900"
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
                    <label className="block text-sm text-stone-500 mb-2">
                      Negative Prompt
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid in the video..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-stone-500 mb-2">
                      FPS: {fps}
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="60"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-stone-500 mb-2">
                      Seed (optional)
                    </label>
                    <input
                      type="number"
                      value={seed || ''}
                      onChange={(e) =>
                        setSeed(e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      placeholder="Random"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim() || (mode === 'image' && !uploadedImage)}
              className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film className="w-5 h-5" />
                  Generate Video
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Results & Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generation Queue */}
            {queue.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-400" />
                  Generation Queue ({queue.length})
                </h2>

                <div className="space-y-3">
                  {queue.map((video) => (
                    <QueueItem key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Videos */}
            {videos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-stone-900">
                    Generated Videos ({videos.length})
                  </h2>
                  <button
                    onClick={() => setVideos([])}
                    className="text-sm text-stone-500 hover:text-stone-900"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onView={() => {
                        setSelectedVideo(video);
                        setShowPlayer(true);
                      }}
                      onDownload={() =>
                        handleDownload(video.url, `video-${video.id}.mp4`)
                      }
                      onShare={() => handleShare(video.url)}
                      onToggleFavorite={() => handleToggleFavorite(video.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {queue.length === 0 && videos.length === 0 && !showHistory && (
              <div className="card text-center py-16">
                <Video className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500 text-lg">No videos yet</p>
                <p className="text-stone-400 text-sm mt-2">
                  Enter a prompt and generate your first video
                </p>
              </div>
            )}

            {/* History */}
            {showHistory && history.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-900">Recent History</h2>
                <div className="grid grid-cols-3 gap-3">
                  {history.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        setSelectedVideo(video);
                        setShowPlayer(true);
                      }}
                      className="relative group cursor-pointer rounded-lg overflow-hidden aspect-video"
                    >
                      <img
                        src={video.thumbnailUrl || '/placeholder-video.png'}
                        alt={video.prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-stone-900 text-xs truncate">{video.prompt}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-stone-900">
                        {video.duration}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {showPlayer && selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => {
            setShowPlayer(false);
            setSelectedVideo(null);
          }}
          onDownload={() => handleDownload(selectedVideo.url, `video-${selectedVideo.id}.mp4`)}
          onShare={() => handleShare(selectedVideo.url)}
        />
      )}
    </div>
  );
}

/**
 * Queue Item Component
 */
function QueueItem({ video }: { video: GeneratedVideo }) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {video.status === 'processing' ? (
            <div className="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          ) : video.status === 'completed' ? (
            <img
              src={video.thumbnailUrl}
              alt="Thumbnail"
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center">
              <Clock className="w-8 h-8 text-stone-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">{video.prompt}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
            <span className="px-2 py-0.5 bg-stone-100 rounded capitalize">
              {video.provider}
            </span>
            <span>{video.duration}s</span>
            <span>{video.aspectRatio}</span>
          </div>

          {/* Progress Bar */}
          {video.status === 'processing' && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">{video.progress}% complete</p>
            </div>
          )}

          {video.status === 'queued' && (
            <p className="text-xs text-stone-400 mt-2">Waiting in queue...</p>
          )}

          {video.status === 'failed' && (
            <p className="text-xs text-red-500 mt-2">Generation failed</p>
          )}
        </div>

        <div className="flex-shrink-0">
          {video.status === 'completed' && (
            <div className="flex items-center gap-1">
              <Play className="w-5 h-5 text-green-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Video Card Component
 */
function VideoCard({
  video,
  onView,
  onDownload,
  onShare,
  onToggleFavorite,
}: {
  video: GeneratedVideo;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="card group relative overflow-hidden">
      <div
        onClick={onView}
        className="relative aspect-video rounded-lg overflow-hidden cursor-pointer mb-3"
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.prompt}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <Video className="w-12 h-12 text-stone-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-12 h-12 text-stone-900" />
        </div>
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-stone-900">
          {video.duration}s
        </div>
      </div>

      <p className="text-sm text-stone-700 line-clamp-2 mb-3">{video.prompt}</p>

      <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">
        <span className="px-2 py-1 bg-stone-100 rounded">{video.provider}</span>
        <span className="px-2 py-1 bg-stone-100 rounded">{video.aspectRatio}</span>
        {video.fps && <span className="px-2 py-1 bg-stone-100 rounded">{video.fps}fps</span>}
      </div>

      <div className="grid grid-cols-4 gap-1">
        <button
          onClick={onView}
          className="p-2 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          title="View"
        >
          <Maximize2 className="w-4 h-4 text-stone-500" />
        </button>
        <button
          onClick={onDownload}
          className="p-2 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-stone-500" />
        </button>
        <button
          onClick={onShare}
          className="p-2 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4 text-stone-500" />
        </button>
        <button
          onClick={onToggleFavorite}
          className="p-2 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
          title="Favorite"
        >
          <Heart
            className={clsx(
              'w-4 h-4',
              video.isFavorite ? 'text-red-500 fill-red-500' : 'text-stone-500'
            )}
          />
        </button>
      </div>
    </div>
  );
}

/**
 * Video Player Modal
 */
function VideoPlayer({
  video,
  onClose,
  onDownload,
  onShare,
}: {
  video: GeneratedVideo;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-stone-900" />
      </button>

      <div className="max-w-6xl w-full max-h-full flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <video
              ref={videoRef}
              src={video.url}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
              controls
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        </div>

        <div className="w-full lg:w-80 bg-white rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-stone-900">Video Details</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-400">Prompt</label>
              <p className="text-sm text-stone-700 mt-1">{video.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400">Provider</label>
                <p className="text-sm text-stone-900 mt-1 capitalize">{video.provider}</p>
              </div>
              <div>
                <label className="text-xs text-stone-400">Duration</label>
                <p className="text-sm text-stone-900 mt-1">{video.duration}s</p>
              </div>
              <div>
                <label className="text-xs text-stone-400">Aspect Ratio</label>
                <p className="text-sm text-stone-900 mt-1">{video.aspectRatio}</p>
              </div>
              {video.fps && (
                <div>
                  <label className="text-xs text-stone-400">FPS</label>
                  <p className="text-sm text-stone-900 mt-1">{video.fps}</p>
                </div>
              )}
              {video.motion && (
                <div>
                  <label className="text-xs text-stone-400">Motion</label>
                  <p className="text-sm text-stone-900 mt-1 capitalize">{video.motion}</p>
                </div>
              )}
              {video.seed && (
                <div>
                  <label className="text-xs text-stone-400">Seed</label>
                  <p className="text-sm text-stone-900 mt-1">{video.seed}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={onDownload}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Video
            </button>
            <button
              onClick={onShare}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
