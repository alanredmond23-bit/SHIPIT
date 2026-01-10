/**
 * useProjects Hook
 * React Query hooks for managing projects and project-scoped operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, createContext, useContext, ReactNode } from 'react';
import {
  listProjects,
  getProject,
  getProjectWithDetails,
  getRecentProjects,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  pinProject,
  addConversationToProject,
  removeConversationFromProject,
  getProjectConversations,
  createProjectMemory,
  getProjectMemories,
  updateProjectMemory,
  deleteProjectMemory,
  getProjectContext,
} from '@/lib/api/projects';
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectMemoryRequest,
  ProjectMemory,
  ProjectStatus,
} from '@/types/projects';

// Query keys
const QUERY_KEYS = {
  projects: ['projects'] as const,
  projectsList: (options?: object) => ['projects', 'list', options] as const,
  projectsRecent: ['projects', 'recent'] as const,
  project: (id: string) => ['project', id] as const,
  projectDetails: (id: string) => ['project', id, 'details'] as const,
  projectConversations: (id: string) => ['project', id, 'conversations'] as const,
  projectMemories: (id: string) => ['project', id, 'memories'] as const,
  projectContext: (id: string) => ['project', id, 'context'] as const,
};

// Error types
export interface ProjectError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Project List Hook
// ============================================================================

interface UseProjectsListOptions {
  limit?: number;
  status?: ProjectStatus;
  search?: string;
  sortBy?: 'recent' | 'name' | 'conversations';
  enabled?: boolean;
}

export function useProjectsList(options: UseProjectsListOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.projectsList(options),
    queryFn: () => listProjects(options),
    enabled: options.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
  }, [queryClient]);

  const formattedError: ProjectError | null = query.error
    ? {
        code: 'FETCH_ERROR',
        message: query.error instanceof Error ? query.error.message : 'Failed to load projects',
        details: query.error,
      }
    : null;

  return {
    ...query,
    projects: query.data || [],
    error: formattedError,
    invalidate,
  };
}

// ============================================================================
// Recent Projects Hook
// ============================================================================

export function useRecentProjects(limit: number = 5) {
  const query = useQuery({
    queryKey: QUERY_KEYS.projectsRecent,
    queryFn: () => getRecentProjects(limit),
    staleTime: 60000, // 1 minute
  });

  return {
    ...query,
    recentProjects: query.data || [],
  };
}

// ============================================================================
// Single Project Hook
// ============================================================================

interface UseProjectOptions {
  enabled?: boolean;
  withDetails?: boolean;
}

export function useProject(
  projectId: string | null,
  options: UseProjectOptions = {}
) {
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: projectId
      ? options.withDetails
        ? QUERY_KEYS.projectDetails(projectId)
        : QUERY_KEYS.project(projectId)
      : ['project-null'],
    queryFn: () => {
      if (!projectId) return null;
      return options.withDetails
        ? getProjectWithDetails(projectId)
        : getProject(projectId);
    },
    enabled: !!projectId && options.enabled !== false,
    staleTime: 10000, // 10 seconds
  });

  const invalidate = useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectDetails(projectId) });
    }
  }, [queryClient, projectId]);

  return {
    ...projectQuery,
    project: projectQuery.data as (typeof options.withDetails extends true ? ProjectWithDetails : Project) | null,
    invalidate,
  };
}

// ============================================================================
// Project Mutations
// ============================================================================

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProjectRequest) => createProject(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateProjectRequest }) =>
      updateProject(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectDetails(data.id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deleteConversations }: { id: string; deleteConversations?: boolean }) =>
      deleteProject(id, deleteConversations),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.project(variables.id) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.projectDetails(variables.id) });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archiveProject(id, archive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(data.id) });
    },
  });
}

export function usePinProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      pinProject(id, pin),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(data.id) });
    },
  });
}

// ============================================================================
// Conversation Association Hooks
// ============================================================================

export function useAddConversationToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, projectId }: { conversationId: string; projectId: string }) =>
      addConversationToProject(conversationId, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectConversations(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useRemoveConversationFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      removeConversationFromProject(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useProjectConversations(
  projectId: string | null,
  options?: { limit?: number; includeArchived?: boolean }
) {
  const query = useQuery({
    queryKey: projectId ? QUERY_KEYS.projectConversations(projectId) : ['project-conversations-null'],
    queryFn: () => projectId ? getProjectConversations(projectId, options) : [],
    enabled: !!projectId,
    staleTime: 30000,
  });

  return {
    ...query,
    conversations: query.data || [],
  };
}

// ============================================================================
// Project Memory Hooks
// ============================================================================

export function useProjectMemories(
  projectId: string | null,
  options?: {
    type?: 'note' | 'context' | 'reference' | 'instruction';
    activeOnly?: boolean;
  }
) {
  const query = useQuery({
    queryKey: projectId ? QUERY_KEYS.projectMemories(projectId) : ['project-memories-null'],
    queryFn: () => projectId ? getProjectMemories(projectId, options) : [],
    enabled: !!projectId,
    staleTime: 30000,
  });

  return {
    ...query,
    memories: query.data || [],
  };
}

export function useCreateProjectMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProjectMemoryRequest) => createProjectMemory(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectMemories(data.project_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(data.project_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectContext(data.project_id) });
    },
  });
}

export function useUpdateProjectMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memoryId,
      updates,
      projectId,
    }: {
      memoryId: string;
      updates: Parameters<typeof updateProjectMemory>[1];
      projectId: string;
    }) => updateProjectMemory(memoryId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectMemories(data.project_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectContext(data.project_id) });
    },
  });
}

export function useDeleteProjectMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memoryId, projectId }: { memoryId: string; projectId: string }) =>
      deleteProjectMemory(memoryId, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectMemories(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectContext(variables.projectId) });
    },
  });
}

// ============================================================================
// Project Context Hook
// ============================================================================

export function useProjectContext(projectId: string | null) {
  const query = useQuery({
    queryKey: projectId ? QUERY_KEYS.projectContext(projectId) : ['project-context-null'],
    queryFn: () => projectId ? getProjectContext(projectId) : '',
    enabled: !!projectId,
    staleTime: 30000,
  });

  return {
    ...query,
    context: query.data || '',
  };
}

// ============================================================================
// Active Project Context
// ============================================================================

interface ActiveProjectContextType {
  activeProject: Project | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  isLoading: boolean;
  context: string;
}

const ActiveProjectContext = createContext<ActiveProjectContextType | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { project, isLoading } = useProject(activeProjectId);
  const { context } = useProjectContext(activeProjectId);

  return (
    <ActiveProjectContext.Provider
      value={{
        activeProject: project,
        activeProjectId,
        setActiveProjectId,
        isLoading,
        context,
      }}
    >
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (!context) {
    // Return a default value instead of throwing when used outside provider
    return {
      activeProject: null,
      activeProjectId: null,
      setActiveProjectId: () => {},
      isLoading: false,
      context: '',
    };
  }
  return context;
}

// ============================================================================
// Combined Projects Management Hook
// ============================================================================

interface UseProjectsManagementOptions {
  defaultSortBy?: 'recent' | 'name' | 'conversations';
  defaultStatus?: ProjectStatus;
}

export function useProjectsManagement(options: UseProjectsManagementOptions = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'conversations'>(
    options.defaultSortBy || 'recent'
  );
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>(
    options.defaultStatus
  );

  const queryClient = useQueryClient();

  // Project list with filters
  const {
    projects,
    isLoading,
    error,
    invalidate: invalidateProjects,
  } = useProjectsList({
    search: searchQuery,
    sortBy,
    status: statusFilter,
  });

  // Recent projects
  const { recentProjects } = useRecentProjects();

  // Mutations
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const archiveMutation = useArchiveProject();
  const pinMutation = usePinProject();

  // Active project
  const { activeProject, activeProjectId, setActiveProjectId, context } = useActiveProject();

  // Actions
  const createNewProject = useCallback(
    async (request: CreateProjectRequest) => {
      const project = await createProjectMutation.mutateAsync(request);
      return project;
    },
    [createProjectMutation]
  );

  const updateExistingProject = useCallback(
    async (id: string, updates: UpdateProjectRequest) => {
      return updateProjectMutation.mutateAsync({ id, updates });
    },
    [updateProjectMutation]
  );

  const removeProject = useCallback(
    async (id: string, deleteConversations?: boolean) => {
      await deleteProjectMutation.mutateAsync({ id, deleteConversations });
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    },
    [deleteProjectMutation, activeProjectId, setActiveProjectId]
  );

  const archive = useCallback(
    async (id: string, shouldArchive: boolean = true) => {
      await archiveMutation.mutateAsync({ id, archive: shouldArchive });
      if (activeProjectId === id && shouldArchive) {
        setActiveProjectId(null);
      }
    },
    [archiveMutation, activeProjectId, setActiveProjectId]
  );

  const pin = useCallback(
    async (id: string, shouldPin: boolean = true) => {
      await pinMutation.mutateAsync({ id, pin: shouldPin });
    },
    [pinMutation]
  );

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
  }, [queryClient]);

  return {
    // State
    projects,
    recentProjects,
    activeProject,
    activeProjectId,
    activeProjectContext: context,
    searchQuery,
    sortBy,
    statusFilter,

    // Loading states
    isLoading,
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,

    // Errors
    error,

    // Setters
    setSearchQuery,
    setSortBy,
    setStatusFilter,
    setActiveProjectId,

    // Actions
    createProject: createNewProject,
    updateProject: updateExistingProject,
    deleteProject: removeProject,
    archiveProject: archive,
    pinProject: pin,
    refreshProjects: refreshAll,
    invalidateProjects,
  };
}

export default useProjectsManagement;
