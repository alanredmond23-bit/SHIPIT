'use client';

import React, { useState } from 'react';
import {
  X,
  Heart,
  GitFork,
  MessageSquare,
  Edit,
  Trash2,
  Copy,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Code,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
  Monitor,
  Lock,
  Globe,
  EyeOff,
  Share2,
  ExternalLink,
  Clock,
  Star,
} from 'lucide-react';
import clsx from 'clsx';
import type { Persona, PersonaCategory } from '@/hooks/usePersonas';

/**
 * PersonaPreview - Full persona details view
 * 
 * Features:
 * - Full persona details view
 * - System prompt display (collapsible)
 * - Sample responses showcase
 * - Edit/delete/duplicate actions
 * - Stats and capabilities display
 */

interface PersonaPreviewProps {
  persona: Persona;
  isActive?: boolean;
  isLiked?: boolean;
  canEdit?: boolean;
  onClose: () => void;
  onUse?: (persona: Persona) => void;
  onEdit?: (persona: Persona) => void;
  onDelete?: (persona: Persona) => void;
  onDuplicate?: (persona: Persona) => void;
  onLike?: (persona: Persona) => void;
  onFork?: (persona: Persona) => void;
  onShare?: (persona: Persona) => void;
}

// Category configuration
const CATEGORY_CONFIG: Record<PersonaCategory, { 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  coding: { label: 'Coding', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  writing: { label: 'Writing', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  research: { label: 'Research', color: 'text-violet-600', bgColor: 'bg-violet-100' },
  general: { label: 'General', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  custom: { label: 'Custom', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  education: { label: 'Education', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  business: { label: 'Business', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  creative: { label: 'Creative', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  science: { label: 'Science', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  health: { label: 'Health', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Capability configuration
const CAPABILITY_CONFIG = {
  webSearch: { icon: Search, label: 'Web Search', description: 'Search the internet for current information' },
  codeExecution: { icon: Code, label: 'Code Execution', description: 'Run and test code snippets' },
  imageGeneration: { icon: ImageIcon, label: 'Image Generation', description: 'Create images from descriptions' },
  fileAnalysis: { icon: FileText, label: 'File Analysis', description: 'Analyze uploaded documents and files' },
  voiceChat: { icon: Mic, label: 'Voice Chat', description: 'Enable voice conversations' },
  computerUse: { icon: Monitor, label: 'Computer Use', description: 'Interact with computer interfaces' },
};

// Default gradients
const DEFAULT_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-slate-500 to-zinc-600',
];

export function PersonaPreview({
  persona,
  isActive = false,
  isLiked = false,
  canEdit = false,
  onClose,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onLike,
  onFork,
  onShare,
}: PersonaPreviewProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[persona.category] || CATEGORY_CONFIG.general;

  // Get gradient for avatar
  const getGradient = () => {
    if (persona.avatarGradient) return persona.avatarGradient;
    const hash = persona.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return DEFAULT_GRADIENTS[Math.abs(hash) % DEFAULT_GRADIENTS.length];
  };

  // Get enabled capabilities
  const enabledCapabilities = Object.entries(persona.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key as keyof typeof CAPABILITY_CONFIG);

  // Get visibility icon
  const getVisibilityInfo = () => {
    switch (persona.visibility) {
      case 'private': return { icon: Lock, label: 'Private', description: 'Only you can see this' };
      case 'unlisted': return { icon: EyeOff, label: 'Unlisted', description: 'Anyone with link can access' };
      case 'public': return { icon: Globe, label: 'Public', description: 'Visible in marketplace' };
      default: return { icon: Globe, label: 'Public', description: 'Visible in marketplace' };
    }
  };

  const visibilityInfo = getVisibilityInfo();
  const VisibilityIcon = visibilityInfo.icon;

  // Copy system prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(persona.systemPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(persona);
      onClose();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative">
          {/* Background gradient */}
          <div className={clsx(
            'h-24 bg-gradient-to-r',
            getGradient()
          )} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-stone-600 rounded-lg shadow-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar and basic info */}
          <div className="px-6 pb-4 -mt-12">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className={clsx(
                'w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg bg-gradient-to-br',
                getGradient()
              )}>
                {persona.avatarUrl ? (
                  <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-stone-900">{persona.name}</h2>
                  {persona.isFeatured && (
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  )}
                  {isActive && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full',
                    categoryConfig.bgColor,
                    categoryConfig.color
                  )}>
                    {categoryConfig.label}
                  </span>
                  <div className="flex items-center gap-1 text-stone-500">
                    <VisibilityIcon className="w-4 h-4" />
                    <span>{visibilityInfo.label}</span>
                  </div>
                  {persona.isBuiltIn && (
                    <span className="text-stone-400">Built-in</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Description */}
          <div>
            <p className="text-stone-700 leading-relaxed">{persona.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <MessageSquare className="w-5 h-5 text-teal-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-stone-900">
                {persona.stats.conversationsCount.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Conversations</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <Heart className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-stone-900">
                {persona.stats.likesCount.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Likes</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <GitFork className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-stone-900">
                {persona.stats.forksCount.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Forks</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-700">
                {formatDate(persona.createdAt)}
              </p>
              <p className="text-xs text-stone-500">Created</p>
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Personality
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-500 mb-1">Tone</p>
                <p className="font-medium text-stone-700 capitalize">{persona.personality.tone}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-500 mb-1">Response Length</p>
                <p className="font-medium text-stone-700 capitalize">{persona.personality.verbosity}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-500 mb-1">Creativity</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${persona.personality.creativity * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-stone-700">
                    {Math.round(persona.personality.creativity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          {enabledCapabilities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Capabilities
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {enabledCapabilities.map((key) => {
                  const config = CAPABILITY_CONFIG[key];
                  const Icon = config.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-100 rounded-lg"
                    >
                      <Icon className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-stone-700">{config.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                System Prompt
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowFullPrompt(!showFullPrompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  {showFullPrompt ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Expand
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className={clsx(
              'bg-stone-50 border border-stone-200 rounded-lg p-4 overflow-hidden transition-all',
              showFullPrompt ? 'max-h-none' : 'max-h-32'
            )}>
              <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono">
                {persona.systemPrompt}
              </pre>
            </div>
            {!showFullPrompt && persona.systemPrompt.length > 200 && (
              <div className="relative h-8 -mt-8 bg-gradient-to-t from-stone-50 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Starter Prompts */}
          {persona.starterPrompts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Starter Prompts
              </h3>
              <div className="space-y-2">
                {persona.starterPrompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg"
                  >
                    <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <p className="text-sm text-stone-700">{prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Responses */}
          {persona.sampleResponses && persona.sampleResponses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Sample Responses
              </h3>
              <div className="space-y-4">
                {persona.sampleResponses.map((sample, index) => (
                  <div
                    key={index}
                    className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-stone-100 px-4 py-2 border-b border-stone-200">
                      <p className="text-sm text-stone-600">
                        <span className="font-medium text-stone-700">User:</span> {sample.prompt}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-stone-700 italic">"{sample.response}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center justify-between">
            {/* Left actions */}
            <div className="flex items-center gap-2">
              {onLike && (
                <button
                  onClick={() => onLike(persona)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    isLiked
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  )}
                >
                  <Heart className={clsx('w-5 h-5', isLiked && 'fill-current')} />
                  <span className="text-sm font-medium">{isLiked ? 'Liked' : 'Like'}</span>
                </button>
              )}

              {onFork && (
                <button
                  onClick={() => onFork(persona)}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <GitFork className="w-5 h-5" />
                  <span className="text-sm font-medium">Fork</span>
                </button>
              )}

              {onShare && (
                <button
                  onClick={() => onShare(persona)}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {canEdit && !persona.isBuiltIn && (
                <>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(persona)}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                  )}

                  {onDuplicate && (
                    <button
                      onClick={() => onDuplicate(persona)}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                      <span className="text-sm font-medium">Duplicate</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                        confirmDelete
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-600'
                      )}
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {confirmDelete ? 'Confirm Delete' : 'Delete'}
                      </span>
                    </button>
                  )}
                </>
              )}

              {onUse && (
                <button
                  onClick={() => onUse(persona)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {isActive ? 'Currently Active' : 'Use Persona'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonaPreview;
