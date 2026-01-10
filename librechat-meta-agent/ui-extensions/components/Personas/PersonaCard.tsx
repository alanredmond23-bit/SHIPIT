'use client';

import React, { useState } from 'react';
import {
  User,
  Heart,
  MessageSquare,
  GitFork,
  Edit,
  Play,
  Sparkles,
  Code,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
  Monitor,
  Star,
  Check,
  MoreVertical,
  Trash2,
  Copy,
  Lock,
  Globe,
  EyeOff,
} from 'lucide-react';
import clsx from 'clsx';
import type { Persona, PersonaCategory } from '@/hooks/usePersonas';

/**
 * PersonaCard - Display card for AI personas
 * 
 * Features:
 * - Avatar/icon with gradient backgrounds
 * - Name and brief description
 * - Category badge with color coding
 * - "Use" button to activate
 * - "Edit" button for custom personas
 * - Preview sample response on hover
 * - Stats display (conversations, likes, forks)
 */

interface PersonaCardProps {
  persona: Persona;
  isActive?: boolean;
  isLiked?: boolean;
  showActions?: boolean;
  showEditButton?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  onUse?: (persona: Persona) => void;
  onEdit?: (persona: Persona) => void;
  onLike?: (persona: Persona) => void;
  onFork?: (persona: Persona) => void;
  onDelete?: (persona: Persona) => void;
  onClick?: (persona: Persona) => void;
}

// Category configuration
const CATEGORY_CONFIG: Record<PersonaCategory, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  coding: { 
    label: 'Coding', 
    icon: Code, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  writing: { 
    label: 'Writing', 
    icon: FileText, 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  research: { 
    label: 'Research', 
    icon: Search, 
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
  },
  general: { 
    label: 'General', 
    icon: Sparkles, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
  custom: { 
    label: 'Custom', 
    icon: User, 
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
  },
  education: { 
    label: 'Education', 
    icon: Sparkles, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  business: { 
    label: 'Business', 
    icon: Sparkles, 
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
  },
  creative: { 
    label: 'Creative', 
    icon: Sparkles, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
  science: { 
    label: 'Science', 
    icon: Sparkles, 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  health: { 
    label: 'Health', 
    icon: Heart, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
};

// Default gradient colors for personas without avatars
const DEFAULT_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-slate-500 to-zinc-600',
];

export function PersonaCard({
  persona,
  isActive = false,
  isLiked = false,
  showActions = true,
  showEditButton = false,
  variant = 'default',
  onUse,
  onEdit,
  onLike,
  onFork,
  onDelete,
  onClick,
}: PersonaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[persona.category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;

  // Get gradient for avatar
  const getGradient = () => {
    if (persona.avatarGradient) return persona.avatarGradient;
    const hash = persona.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return DEFAULT_GRADIENTS[Math.abs(hash) % DEFAULT_GRADIENTS.length];
  };

  // Get capability icons
  const getCapabilityIcons = () => {
    const icons: { key: string; icon: React.ElementType; label: string }[] = [];
    if (persona.capabilities.webSearch) icons.push({ key: 'web', icon: Search, label: 'Web Search' });
    if (persona.capabilities.codeExecution) icons.push({ key: 'code', icon: Code, label: 'Code Execution' });
    if (persona.capabilities.imageGeneration) icons.push({ key: 'image', icon: ImageIcon, label: 'Image Generation' });
    if (persona.capabilities.fileAnalysis) icons.push({ key: 'file', icon: FileText, label: 'File Analysis' });
    if (persona.capabilities.voiceChat) icons.push({ key: 'voice', icon: Mic, label: 'Voice Chat' });
    if (persona.capabilities.computerUse) icons.push({ key: 'computer', icon: Monitor, label: 'Computer Use' });
    return icons;
  };

  const capabilityIcons = getCapabilityIcons();

  // Visibility icon
  const getVisibilityIcon = () => {
    switch (persona.visibility) {
      case 'private': return Lock;
      case 'unlisted': return EyeOff;
      case 'public': return Globe;
      default: return Globe;
    }
  };

  const VisibilityIcon = getVisibilityIcon();

  // Handle card click
  const handleClick = () => {
    if (onClick) {
      onClick(persona);
    }
  };

  // Handle use button
  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUse) {
      onUse(persona);
    }
  };

  // Handle edit button
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(persona);
    }
  };

  // Handle like button
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) {
      onLike(persona);
    }
  };

  // Handle fork button
  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFork) {
      onFork(persona);
    }
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDelete) {
      onDelete(persona);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={clsx(
          'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
          isActive
            ? 'bg-teal-500/20 border-2 border-teal-500'
            : 'bg-stone-100/50 border-2 border-transparent hover:border-stone-200 hover:bg-stone-100'
        )}
      >
        {/* Avatar */}
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br',
          getGradient()
        )}>
          {persona.avatarUrl ? (
            <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
          ) : (
            <CategoryIcon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-stone-900 truncate">{persona.name}</h4>
            {isActive && <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-stone-500 truncate">{persona.description}</p>
        </div>
      </button>
    );
  }

  if (variant === 'featured') {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          'relative group cursor-pointer rounded-xl p-5 border-2 transition-all',
          'bg-gradient-to-br from-amber-900/10 to-stone-100 border-amber-500/30',
          'hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/20',
          isActive && 'ring-2 ring-teal-500 ring-offset-2'
        )}
      >
        {/* Featured Badge */}
        <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          Featured
        </div>

        {/* Content */}
        <div className="flex items-start gap-3 mb-3">
          <div className={clsx(
            'w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br',
            getGradient()
          )}>
            {persona.avatarUrl ? (
              <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
            ) : (
              <CategoryIcon className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
              {persona.name}
            </h3>
            <span className={clsx('text-xs capitalize', categoryConfig.color)}>
              {categoryConfig.label}
            </span>
          </div>
        </div>

        <p className="text-sm text-stone-700 line-clamp-2 mb-4">{persona.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {persona.stats.conversationsCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Heart className={clsx('w-3.5 h-3.5', isLiked && 'fill-red-400 text-red-400')} />
            {persona.stats.likesCount.toLocaleString()}
          </div>
        </div>

        {/* Hover Preview */}
        {isHovered && persona.sampleResponses && persona.sampleResponses.length > 0 && (
          <div className="absolute left-0 right-0 bottom-full mb-2 z-10 p-4 bg-white rounded-lg shadow-xl border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-stone-500 mb-1">Sample response:</p>
            <p className="text-sm text-stone-700 italic line-clamp-3">
              "{persona.sampleResponses[0].response}"
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'relative group cursor-pointer rounded-xl p-5 border-2 transition-all',
        'bg-stone-50/50 border-stone-200',
        'hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/10',
        isActive && 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20'
      )}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Built-in Badge */}
      {persona.isBuiltIn && (
        <div className="absolute top-3 right-3">
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            Built-in
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br',
          getGradient()
        )}>
          {persona.avatarUrl ? (
            <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
          ) : (
            <CategoryIcon className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Name & Category */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 line-clamp-1 group-hover:text-teal-600 transition-colors">
            {persona.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full',
              categoryConfig.bgColor,
              categoryConfig.color
            )}>
              {categoryConfig.label}
            </span>
            {!persona.isBuiltIn && (
              <VisibilityIcon className="w-3.5 h-3.5 text-stone-400" />
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-stone-600 line-clamp-2 mb-4">{persona.description}</p>

      {/* Capabilities */}
      {capabilityIcons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {capabilityIcons.slice(0, 4).map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              title={label}
              className="p-1.5 bg-stone-100 rounded-md text-stone-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          ))}
          {capabilityIcons.length > 4 && (
            <div className="px-2 py-1 bg-stone-100 rounded-md text-xs text-stone-500">
              +{capabilityIcons.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-1" title="Conversations">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{persona.stats.conversationsCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1" title="Likes">
            <Heart className={clsx('w-3.5 h-3.5', isLiked && 'fill-red-400 text-red-400')} />
            <span>{persona.stats.likesCount.toLocaleString()}</span>
          </div>
          {!persona.isBuiltIn && (
            <div className="flex items-center gap-1" title="Forks">
              <GitFork className="w-3.5 h-3.5" />
              <span>{persona.stats.forksCount}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1">
            {onLike && (
              <button
                onClick={handleLike}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  isLiked
                    ? 'text-red-400 hover:bg-red-50'
                    : 'text-stone-400 hover:text-red-400 hover:bg-stone-100'
                )}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={clsx('w-4 h-4', isLiked && 'fill-current')} />
              </button>
            )}

            {onFork && (
              <button
                onClick={handleFork}
                className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-stone-100 rounded-lg transition-colors"
                title="Fork"
              >
                <GitFork className="w-4 h-4" />
              </button>
            )}

            {showEditButton && !persona.isBuiltIn && onEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-stone-100 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {/* More Menu */}
            {!persona.isBuiltIn && onDelete && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white rounded-lg shadow-xl border border-stone-200 py-1">
                      <button
                        onClick={handleFork}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Use Button (appears on hover) */}
      {onUse && (
        <div className={clsx(
          'absolute inset-x-5 bottom-5 transition-all duration-200',
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}>
          <button
            onClick={handleUse}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            {isActive ? 'Active' : 'Use Persona'}
          </button>
        </div>
      )}

      {/* Hover Preview */}
      {isHovered && persona.sampleResponses && persona.sampleResponses.length > 0 && !onUse && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-10 p-4 bg-white rounded-lg shadow-xl border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <p className="text-xs text-stone-500 mb-1">Sample response:</p>
          <p className="text-sm text-stone-700 italic line-clamp-3">
            "{persona.sampleResponses[0].response}"
          </p>
        </div>
      )}
    </div>
  );
}

export default PersonaCard;
