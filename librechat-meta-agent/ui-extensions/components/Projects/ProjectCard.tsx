'use client';

import { useState } from 'react';
import {
  FolderOpen,
  MoreHorizontal,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  MessageSquare,
  Clock,
  Edit2,
} from 'lucide-react';
import clsx from 'clsx';
import type { ProjectListItem, ProjectColor } from '@/types/projects';
import { PROJECT_COLORS } from '@/types/projects';

interface ProjectCardProps {
  project: ProjectListItem;
  isSelected?: boolean;
  onClick?: () => void;
  onPin?: (pinned: boolean) => void;
  onArchive?: (archived: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ProjectCard({
  project,
  isSelected = false,
  onClick,
  onPin,
  onArchive,
  onDelete,
  onEdit,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const colorConfig = PROJECT_COLORS[project.color as ProjectColor] || PROJECT_COLORS.teal;
  const isArchived = project.status === 'archived';

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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  return (
    <div
      className={clsx(
        'relative group rounded-2xl border transition-all duration-200 cursor-pointer',
        'bg-white dark:bg-stone-800',
        isSelected
          ? `border-2 ${colorConfig.border} shadow-lg`
          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600',
        isHovered && !isSelected && 'shadow-md',
        isArchived && 'opacity-60'
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      {/* Color accent bar */}
      <div className={clsx('h-1.5 rounded-t-2xl', colorConfig.accent)} />

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                colorConfig.light
              )}
            >
              {project.icon || <FolderOpen className={clsx('w-5 h-5', colorConfig.text)} />}
            </div>

            {/* Title and pinned indicator */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-stone-900 dark:text-white truncate">
                  {project.name}
                </h3>
                {project.pinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                )}
              </div>
              {project.description && (
                <p className="text-sm text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                'hover:bg-stone-100 dark:hover:bg-stone-700',
                'opacity-0 group-hover:opacity-100',
                showMenu && 'opacity-100 bg-stone-100 dark:bg-stone-700'
              )}
            >
              <MoreHorizontal className="w-4 h-4 text-stone-500" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-lg z-50 py-1 overflow-hidden">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(onEdit);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit project
                  </button>
                )}
                {onPin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onPin(!project.pinned));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    {project.pinned ? (
                      <>
                        <PinOff className="w-4 h-4" />
                        Unpin project
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4" />
                        Pin project
                      </>
                    )}
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onArchive(!isArchived));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4" />
                        Restore project
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive project
                      </>
                    )}
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="h-px bg-stone-200 dark:bg-stone-700 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(onDelete);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete project
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{project.conversation_count} conversations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(project.last_activity_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
