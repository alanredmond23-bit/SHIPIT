'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Megaphone,
  Users,
  Bot,
  Workflow,
  Plug,
  Plus,
  Clock,
  CheckCircle,
  PauseCircle,
  Archive,
  ChevronRight,
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  name: string;
  project_type: string;
  current_phase: string;
  overall_status: string;
  progress_percentage: number;
  phases_completed: number;
  total_phases: number;
  last_activity_at: string;
}

interface ProjectListProps {
  projects: ProjectSummary[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

const PROJECT_ICONS: Record<string, React.ElementType> = {
  product: Package,
  marketing: Megaphone,
  lead_gen: Users,
  bot: Bot,
  workflow: Workflow,
  integration: Plug,
  custom: Package,
};

const PROJECT_COLORS: Record<string, string> = {
  product: 'bg-indigo-500',
  marketing: 'bg-pink-500',
  lead_gen: 'bg-emerald-500',
  bot: 'bg-purple-500',
  workflow: 'bg-orange-500',
  integration: 'bg-cyan-500',
  custom: 'bg-gray-500',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  active: Clock,
  paused: PauseCircle,
  completed: CheckCircle,
  archived: Archive,
};

const PHASE_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  ideation: 'Ideation',
  specification: 'Specification',
  planning: 'Planning',
  implementation: 'Implementation',
  launch: 'Launch',
};

export function ProjectList({
  projects,
  onSelectProject,
  onNewProject,
}: ProjectListProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    return p.overall_status === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Projects
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {projects.length} total projects
          </p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['all', 'active', 'completed', 'archived'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'all' && ` (${projects.length})`}
            {status !== 'all' &&
              ` (${projects.filter((p) => p.overall_status === status).length})`}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No projects found. Create your first project!
          </p>
          <button
            onClick={onNewProject}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Get started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const Icon = PROJECT_ICONS[project.project_type] || Package;
            const StatusIcon = STATUS_ICONS[project.overall_status] || Clock;
            const bgColor = PROJECT_COLORS[project.project_type] || 'bg-gray-500';

            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-xs capitalize">
                      {project.overall_status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>

                {/* Current Phase */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {PHASE_LABELS[project.current_phase] || project.current_phase}
                </p>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {project.phases_completed}/{project.total_phases} phases
                    </span>
                    <span>{project.progress_percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bgColor} transition-all duration-500`}
                      style={{ width: `${project.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Updated {formatDate(project.last_activity_at)}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProjectList;
