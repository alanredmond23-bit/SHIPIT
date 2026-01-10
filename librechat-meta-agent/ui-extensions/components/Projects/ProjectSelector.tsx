'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  ChevronDown,
  Plus,
  Search,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import type { Project, ProjectListItem, ProjectColor } from '@/types/projects';
import { PROJECT_COLORS } from '@/types/projects';

interface ProjectSelectorProps {
  activeProject: Project | ProjectListItem | null;
  recentProjects: ProjectListItem[];
  onSelectProject: (projectId: string | null) => void;
  onNewProject: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function ProjectSelector({
  activeProject,
  recentProjects,
  onSelectProject,
  onNewProject,
  isLoading = false,
  compact = false,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter projects by search
  const filteredProjects = searchQuery
    ? recentProjects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentProjects;

  const colorConfig = activeProject
    ? PROJECT_COLORS[activeProject.color as ProjectColor] || PROJECT_COLORS.teal
    : null;

  const handleSelect = (projectId: string | null) => {
    onSelectProject(projectId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 rounded-xl transition-all duration-200 border',
          compact ? 'px-3 py-2' : 'px-4 py-2.5',
          activeProject
            ? `${colorConfig?.light} ${colorConfig?.border} ${colorConfig?.bgHover}`
            : 'bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-600'
        )}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
        ) : activeProject ? (
          <>
            <span className="text-base">{activeProject.icon || '📁'}</span>
            {!compact && (
              <span className={clsx('text-sm font-medium', colorConfig?.text)}>
                {activeProject.name}
              </span>
            )}
          </>
        ) : (
          <>
            <FolderOpen className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            {!compact && (
              <span className="text-sm text-stone-600 dark:text-stone-400">
                No Project
              </span>
            )}
          </>
        )}
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform duration-200',
          activeProject ? colorConfig?.text : 'text-stone-400',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-stone-200 dark:border-stone-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(
                  'w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg',
                  'pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors'
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-stone-400" />
                </button>
              )}
            </div>
          </div>

          {/* Active Project */}
          {activeProject && (
            <div className="p-2 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">
                Current Project
              </div>
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm', colorConfig?.light)}>
                  {activeProject.icon || '📁'}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-900 dark:text-white">
                      {activeProject.name}
                    </span>
                    <Check className="w-4 h-4 text-teal-500" />
                  </div>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {activeProject.conversation_count} conversations
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                  title="Remove from project"
                >
                  <X className="w-4 h-4 text-stone-400" />
                </button>
              </button>
            </div>
          )}

          {/* Projects List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredProjects.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <FolderOpen className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {searchQuery ? 'No projects found' : 'No recent projects'}
                </p>
              </div>
            ) : (
              <>
                {!activeProject && (
                  <div className="px-3 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Recent Projects
                  </div>
                )}
                {filteredProjects
                  .filter((p) => p.id !== activeProject?.id)
                  .map((project) => {
                    const pColorConfig = PROJECT_COLORS[project.color as ProjectColor] || PROJECT_COLORS.teal;
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleSelect(project.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                      >
                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm', pColorConfig.light)}>
                          {project.icon || '📁'}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-medium text-stone-900 dark:text-white truncate block">
                            {project.name}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {project.conversation_count} conversations
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 flex gap-2">
            <button
              onClick={() => {
                onNewProject();
                setIsOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Browse All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSelector;
