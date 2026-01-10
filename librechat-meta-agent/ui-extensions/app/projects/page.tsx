'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FolderOpen,
  SlidersHorizontal,
  Archive,
  Clock,
  SortAsc,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { ProjectCard, ProjectCreator, ProjectDetail } from '@/components/Projects';
import {
  useProjectsList,
  useRecentProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  usePinProject,
  useCreateProjectMemory,
  useDeleteProjectMemory,
  useUpdateProjectMemory,
} from '@/hooks/useProjects';
import type { CreateProjectRequest, ProjectStatus, ProjectMemory } from '@/types/projects';

type SortBy = 'recent' | 'name' | 'conversations';
type ViewMode = 'grid' | 'list';

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreator, setShowCreator] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch projects
  const {
    projects,
    isLoading,
    error,
    invalidate: invalidateProjects,
  } = useProjectsList({
    search: searchQuery,
    sortBy,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // Fetch selected project details
  const { project: selectedProject, isLoading: isLoadingProject } = useProject(
    selectedProjectId,
    { withDetails: true }
  );

  // Mutations
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const archiveMutation = useArchiveProject();
  const pinMutation = usePinProject();
  const createMemoryMutation = useCreateProjectMemory();
  const updateMemoryMutation = useUpdateProjectMemory();
  const deleteMemoryMutation = useDeleteProjectMemory();

  // Handlers
  const handleCreateProject = useCallback(async (request: CreateProjectRequest) => {
    const project = await createProjectMutation.mutateAsync(request);
    setSelectedProjectId(project.id);
  }, [createProjectMutation]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }
    await deleteProjectMutation.mutateAsync({ id: projectId, deleteConversations: false });
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  }, [deleteProjectMutation, selectedProjectId]);

  const handleArchiveProject = useCallback(async (projectId: string, archive: boolean) => {
    await archiveMutation.mutateAsync({ id: projectId, archive });
    if (selectedProjectId === projectId && archive) {
      setSelectedProjectId(null);
    }
  }, [archiveMutation, selectedProjectId]);

  const handlePinProject = useCallback(async (projectId: string, pin: boolean) => {
    await pinMutation.mutateAsync({ id: projectId, pin });
  }, [pinMutation]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    router.push(`/chat?conversation=${conversationId}`);
  }, [router]);

  const handleNewConversation = useCallback(() => {
    if (selectedProjectId) {
      router.push(`/chat?project=${selectedProjectId}`);
    }
  }, [router, selectedProjectId]);

  const handleAddMemory = useCallback(async (type: ProjectMemory['type']) => {
    if (!selectedProjectId) return;
    // For now, create with placeholder content - in production, would show a modal
    await createMemoryMutation.mutateAsync({
      project_id: selectedProjectId,
      type,
      content: '',
      title: `New ${type}`,
    });
  }, [createMemoryMutation, selectedProjectId]);

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    if (!selectedProjectId) return;
    if (!confirm('Delete this memory?')) return;
    await deleteMemoryMutation.mutateAsync({ memoryId, projectId: selectedProjectId });
  }, [deleteMemoryMutation, selectedProjectId]);

  const handleToggleMemoryActive = useCallback(async (memoryId: string, active: boolean) => {
    if (!selectedProjectId) return;
    await updateMemoryMutation.mutateAsync({
      memoryId,
      projectId: selectedProjectId,
      updates: { is_active: active },
    });
  }, [updateMemoryMutation, selectedProjectId]);

  const handleUpdateSettings = useCallback(async (settings: { system_instructions?: string; default_model?: string }) => {
    if (!selectedProjectId) return;
    await updateProjectMutation.mutateAsync({
      id: selectedProjectId,
      updates: settings,
    });
  }, [updateProjectMutation, selectedProjectId]);

  // Show project detail if selected
  if (selectedProjectId && selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject as any}
        onBack={() => setSelectedProjectId(null)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onToggleMemoryActive={handleToggleMemoryActive}
        onUpdateSettings={handleUpdateSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      {/* Header */}
      <header className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                Projects
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Organize your conversations and context into workspaces
              </p>
            </div>
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className={clsx(
                  'w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl',
                  'pl-12 pr-4 py-3 text-stone-900 dark:text-white placeholder-stone-400',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors'
                )}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors',
                showFilters
                  ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 dark:text-stone-400">Sort:</span>
                <div className="flex rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                  {([
                    { value: 'recent', icon: Clock, label: 'Recent' },
                    { value: 'name', icon: SortAsc, label: 'Name' },
                    { value: 'conversations', icon: MessageSquare, label: 'Chats' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setSortBy(value)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                        sortBy === value
                          ? 'bg-teal-500 text-white'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 dark:text-stone-400">Status:</span>
                <div className="flex rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                  {([
                    { value: 'active', label: 'Active' },
                    { value: 'archived', label: 'Archived' },
                    { value: 'all', label: 'All' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={clsx(
                        'px-3 py-1.5 text-sm transition-colors',
                        statusFilter === value
                          ? 'bg-teal-500 text-white'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
            <p className="text-stone-500 dark:text-stone-400">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-stone-900 dark:text-white font-medium mb-2">Failed to load projects</p>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">{error.message}</p>
            <button
              onClick={() => invalidateProjects()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-teal-500" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-center max-w-md mb-6">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search term.`
                : 'Create your first project to organize conversations, add context, and keep related work together.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProjectId(project.id)}
                onPin={(pinned) => handlePinProject(project.id, pinned)}
                onArchive={(archived) => handleArchiveProject(project.id, archived)}
                onDelete={() => handleDeleteProject(project.id)}
                onEdit={() => setSelectedProjectId(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Project Creator Modal */}
      <ProjectCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onSubmit={handleCreateProject}
        isSubmitting={createProjectMutation.isPending}
      />
    </div>
  );
}
