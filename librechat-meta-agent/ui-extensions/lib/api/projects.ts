/**
 * Projects API Client
 * Provides functions to interact with the projects API
 */

import { createClient } from '@/lib/auth/supabase-client';
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  ProjectConversation,
  ProjectMemory,
  ProjectFile,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectMemoryRequest,
  ProjectStatus,
} from '@/types/projects';

// Helper to bypass Supabase type checking for tables without generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

// ============================================================================
// Project CRUD Operations
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(
  request: CreateProjectRequest
): Promise<Project> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await db()
    .from('meta_projects')
    .insert({
      user_id: user?.id || null,
      name: request.name,
      description: request.description || null,
      icon: request.icon || null,
      color: request.color || 'teal',
      template: request.template || null,
      status: 'active',
      system_instructions: request.system_instructions || null,
      default_model: request.default_model || null,
      default_agent_type: request.default_agent_type || null,
      metadata: request.metadata || {},
      conversation_count: 0,
      memory_count: 0,
      file_count: 0,
      pinned: false,
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data as Project;
}

/**
 * Get a project by ID
 */
export async function getProject(
  projectId: string
): Promise<Project | null> {
  const { data, error } = await db()
    .from('meta_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get project: ${error.message}`);
  }

  return data as Project;
}

/**
 * Get project with all related data (conversations, memories, files)
 */
export async function getProjectWithDetails(
  projectId: string
): Promise<ProjectWithDetails | null> {
  // Get project
  const { data: project, error: projectError } = await db()
    .from('meta_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get project: ${projectError.message}`);
  }

  // Get conversations
  const { data: conversations, error: convError } = await db()
    .from('meta_conversations')
    .select(`
      id,
      project_id,
      title,
      model_used,
      message_count,
      is_pinned,
      created_at,
      updated_at
    `)
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (convError) {
    throw new Error(`Failed to get conversations: ${convError.message}`);
  }

  // Get memories
  const { data: memories, error: memError } = await db()
    .from('meta_project_memories')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (memError && memError.code !== 'PGRST116') {
    console.warn('Failed to get memories:', memError.message);
  }

  // Get files
  const { data: files, error: fileError } = await db()
    .from('meta_project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (fileError && fileError.code !== 'PGRST116') {
    console.warn('Failed to get files:', fileError.message);
  }

  return {
    ...(project as Project),
    conversations: (conversations || []) as ProjectConversation[],
    memories: (memories || []) as ProjectMemory[],
    files: (files || []) as ProjectFile[],
  };
}

/**
 * List projects for the current user
 */
export async function listProjects(options?: {
  limit?: number;
  offset?: number;
  status?: ProjectStatus;
  search?: string;
  sortBy?: 'recent' | 'name' | 'conversations';
}): Promise<ProjectListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = db()
    .from('meta_projects')
    .select(`
      id,
      name,
      description,
      icon,
      color,
      status,
      conversation_count,
      pinned,
      last_activity_at,
      created_at
    `);

  // Filter by user or allow null user_id (anonymous)
  if (user?.id) {
    query = query.or(`user_id.eq.${user.id},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }

  // Filter by status
  if (options?.status) {
    query = query.eq('status', options.status);
  } else {
    // Default to active projects
    query = query.eq('status', 'active');
  }

  // Sorting
  const sortBy = options?.sortBy || 'recent';
  query = query.order('pinned', { ascending: false }); // Pinned first

  switch (sortBy) {
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    case 'conversations':
      query = query.order('conversation_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('last_activity_at', { ascending: false });
      break;
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }

  let results = (data || []) as ProjectListItem[];

  // Apply search filter client-side
  if (options?.search) {
    const searchTerm = options.search.toLowerCase().trim();
    results = results.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      return name.includes(searchTerm) || description.includes(searchTerm);
    });
  }

  return results;
}

/**
 * Get recent projects for quick access
 */
export async function getRecentProjects(limit: number = 5): Promise<ProjectListItem[]> {
  return listProjects({
    limit,
    status: 'active',
    sortBy: 'recent',
  });
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: UpdateProjectRequest
): Promise<Project> {
  const { data, error } = await db()
    .from('meta_projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data as Project;
}

/**
 * Delete a project (and optionally its conversations)
 */
export async function deleteProject(
  projectId: string,
  deleteConversations: boolean = false
): Promise<void> {
  if (deleteConversations) {
    // Delete associated conversations first
    await db()
      .from('meta_conversations')
      .delete()
      .eq('project_id', projectId);
  } else {
    // Just unlink conversations from the project
    await db()
      .from('meta_conversations')
      .update({ project_id: null })
      .eq('project_id', projectId);
  }

  // Delete project memories
  await db()
    .from('meta_project_memories')
    .delete()
    .eq('project_id', projectId);

  // Delete project files
  await db()
    .from('meta_project_files')
    .delete()
    .eq('project_id', projectId);

  // Delete the project
  const { error } = await db()
    .from('meta_projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

/**
 * Archive a project
 */
export async function archiveProject(
  projectId: string,
  archive: boolean = true
): Promise<Project> {
  return updateProject(projectId, {
    status: archive ? 'archived' : 'active'
  });
}

/**
 * Pin/unpin a project
 */
export async function pinProject(
  projectId: string,
  pin: boolean = true
): Promise<Project> {
  return updateProject(projectId, { pinned: pin });
}

/**
 * Update project activity timestamp
 */
export async function touchProject(projectId: string): Promise<void> {
  await db()
    .from('meta_projects')
    .update({
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
}

// ============================================================================
// Conversation-Project Association
// ============================================================================

/**
 * Associate a conversation with a project
 */
export async function addConversationToProject(
  conversationId: string,
  projectId: string
): Promise<void> {
  const { error } = await db()
    .from('meta_conversations')
    .update({ project_id: projectId })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to add conversation to project: ${error.message}`);
  }

  // Update project conversation count
  await updateProjectCounts(projectId);
  await touchProject(projectId);
}

/**
 * Remove a conversation from a project
 */
export async function removeConversationFromProject(
  conversationId: string
): Promise<void> {
  // Get current project_id first
  const { data: conversation } = await db()
    .from('meta_conversations')
    .select('project_id')
    .eq('id', conversationId)
    .single();

  const projectId = conversation?.project_id;

  const { error } = await db()
    .from('meta_conversations')
    .update({ project_id: null })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to remove conversation from project: ${error.message}`);
  }

  // Update project conversation count
  if (projectId) {
    await updateProjectCounts(projectId);
  }
}

/**
 * Get conversations for a project
 */
export async function getProjectConversations(
  projectId: string,
  options?: {
    limit?: number;
    includeArchived?: boolean;
  }
): Promise<ProjectConversation[]> {
  let query = db()
    .from('meta_conversations')
    .select(`
      id,
      project_id,
      title,
      model_used,
      message_count,
      is_pinned,
      created_at,
      updated_at
    `)
    .eq('project_id', projectId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get project conversations: ${error.message}`);
  }

  return (data || []) as ProjectConversation[];
}

// ============================================================================
// Project Memories
// ============================================================================

/**
 * Create a project memory/note
 */
export async function createProjectMemory(
  request: CreateProjectMemoryRequest
): Promise<ProjectMemory> {
  const { data, error } = await db()
    .from('meta_project_memories')
    .insert({
      project_id: request.project_id,
      title: request.title || null,
      content: request.content,
      type: request.type || 'note',
      is_active: request.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project memory: ${error.message}`);
  }

  // Update project memory count
  await updateProjectCounts(request.project_id);
  await touchProject(request.project_id);

  return data as ProjectMemory;
}

/**
 * Get project memories
 */
export async function getProjectMemories(
  projectId: string,
  options?: {
    type?: 'note' | 'context' | 'reference' | 'instruction';
    activeOnly?: boolean;
  }
): Promise<ProjectMemory[]> {
  let query = db()
    .from('meta_project_memories')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get project memories: ${error.message}`);
  }

  return (data || []) as ProjectMemory[];
}

/**
 * Update a project memory
 */
export async function updateProjectMemory(
  memoryId: string,
  updates: {
    title?: string;
    content?: string;
    type?: 'note' | 'context' | 'reference' | 'instruction';
    is_active?: boolean;
  }
): Promise<ProjectMemory> {
  const { data, error } = await db()
    .from('meta_project_memories')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project memory: ${error.message}`);
  }

  return data as ProjectMemory;
}

/**
 * Delete a project memory
 */
export async function deleteProjectMemory(
  memoryId: string,
  projectId: string
): Promise<void> {
  const { error } = await db()
    .from('meta_project_memories')
    .delete()
    .eq('id', memoryId);

  if (error) {
    throw new Error(`Failed to delete project memory: ${error.message}`);
  }

  // Update project memory count
  await updateProjectCounts(projectId);
}

/**
 * Get active context/instructions for a project (for system prompt injection)
 */
export async function getProjectContext(
  projectId: string
): Promise<string> {
  // Get project with system instructions
  const { data: project } = await db()
    .from('meta_projects')
    .select('name, system_instructions')
    .eq('id', projectId)
    .single();

  if (!project) {
    return '';
  }

  // Get active context memories
  const memories = await getProjectMemories(projectId, {
    type: 'context',
    activeOnly: true,
  });

  // Get active instruction memories
  const instructions = await getProjectMemories(projectId, {
    type: 'instruction',
    activeOnly: true,
  });

  // Build context string
  const parts: string[] = [];

  if (project.name) {
    parts.push(`Project: ${project.name}`);
  }

  if (project.system_instructions) {
    parts.push(`Project Instructions:\n${project.system_instructions}`);
  }

  if (memories.length > 0) {
    const contextContent = memories.map(m => m.content).join('\n\n');
    parts.push(`Project Context:\n${contextContent}`);
  }

  if (instructions.length > 0) {
    const instructionContent = instructions.map(m => m.content).join('\n\n');
    parts.push(`Additional Instructions:\n${instructionContent}`);
  }

  return parts.join('\n\n---\n\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update project counts (conversations, memories, files)
 */
async function updateProjectCounts(projectId: string): Promise<void> {
  // Get conversation count
  const { count: convCount } = await db()
    .from('meta_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_archived', false);

  // Get memory count
  const { count: memCount } = await db()
    .from('meta_project_memories')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Get file count
  const { count: fileCount } = await db()
    .from('meta_project_files')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Update project
  await db()
    .from('meta_projects')
    .update({
      conversation_count: convCount || 0,
      memory_count: memCount || 0,
      file_count: fileCount || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
}
