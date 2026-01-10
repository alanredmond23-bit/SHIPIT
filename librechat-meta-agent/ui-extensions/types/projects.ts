/**
 * Project Workspace Types
 * Types for organizing conversations and context in project workspaces
 */

/**
 * Color themes available for projects
 */
export type ProjectColor =
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'green'
  | 'red'
  | 'yellow'
  | 'indigo'
  | 'stone';

/**
 * Project template types
 */
export type ProjectTemplate = 'coding' | 'research' | 'writing' | 'design' | 'business' | 'blank';

/**
 * Project status
 */
export type ProjectStatus = 'active' | 'archived' | 'completed';

/**
 * Main Project interface matching database schema
 */
export interface Project {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  icon: string | null; // Emoji or icon identifier
  color: ProjectColor;
  template: ProjectTemplate | null;
  status: ProjectStatus;
  conversation_count: number;
  memory_count: number;
  file_count: number;
  default_model: string | null;
  default_agent_type: string | null;
  system_instructions: string | null; // Project-scoped context/instructions
  pinned: boolean;
  metadata: Record<string, any>;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Project list item (simplified for listings)
 */
export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: ProjectColor;
  status: ProjectStatus;
  conversation_count: number;
  pinned: boolean;
  last_activity_at: string;
  created_at: string;
}

/**
 * Project with related data for detail view
 */
export interface ProjectWithDetails extends Project {
  conversations: ProjectConversation[];
  memories: ProjectMemory[];
  files: ProjectFile[];
}

/**
 * Conversation associated with a project
 */
export interface ProjectConversation {
  id: string;
  project_id: string;
  title: string | null;
  model_used: string | null;
  message_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Memory/note associated with a project
 */
export interface ProjectMemory {
  id: string;
  project_id: string;
  title: string | null;
  content: string;
  type: 'note' | 'context' | 'reference' | 'instruction';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * File associated with a project
 */
export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  type: string;
  size: number;
  storage_path: string;
  thumbnail_path: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Request types for API operations
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: ProjectColor;
  template?: ProjectTemplate;
  system_instructions?: string;
  default_model?: string;
  default_agent_type?: string;
  metadata?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: ProjectColor;
  status?: ProjectStatus;
  system_instructions?: string;
  default_model?: string;
  default_agent_type?: string;
  pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateProjectMemoryRequest {
  project_id: string;
  title?: string;
  content: string;
  type?: 'note' | 'context' | 'reference' | 'instruction';
  is_active?: boolean;
}

/**
 * Project settings/configuration
 */
export interface ProjectSettings {
  default_model: string | null;
  default_agent_type: string | null;
  system_instructions: string | null;
  auto_archive_after_days: number | null;
  notification_preferences: {
    on_conversation_complete: boolean;
    on_memory_added: boolean;
  };
  integrations: {
    github_repo: string | null;
    notion_page: string | null;
    linear_project: string | null;
  };
}

/**
 * Project template definitions with default settings
 */
export interface ProjectTemplateDefinition {
  id: ProjectTemplate;
  name: string;
  description: string;
  icon: string;
  color: ProjectColor;
  default_instructions: string;
  suggested_tools: string[];
}

/**
 * Available project templates
 */
export const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    id: 'coding',
    name: 'Coding Project',
    description: 'For software development, debugging, and code reviews',
    icon: '💻',
    color: 'teal',
    default_instructions: 'This is a coding project. Focus on clean, maintainable code with proper error handling. Prefer TypeScript/JavaScript best practices.',
    suggested_tools: ['code_interpreter', 'artifacts', 'file_search'],
  },
  {
    id: 'research',
    name: 'Research Project',
    description: 'For in-depth research, analysis, and fact-finding',
    icon: '🔬',
    color: 'purple',
    default_instructions: 'This is a research project. Prioritize accuracy and cite sources when possible. Provide comprehensive analysis.',
    suggested_tools: ['web_search', 'deep_research', 'file_search'],
  },
  {
    id: 'writing',
    name: 'Writing Project',
    description: 'For content creation, documentation, and creative writing',
    icon: '✍️',
    color: 'blue',
    default_instructions: 'This is a writing project. Focus on clear, engaging content. Maintain consistent tone and style.',
    suggested_tools: ['artifacts', 'web_search'],
  },
  {
    id: 'design',
    name: 'Design Project',
    description: 'For UI/UX design, visual concepts, and creative work',
    icon: '🎨',
    color: 'pink',
    default_instructions: 'This is a design project. Consider visual hierarchy, user experience, and accessibility in all suggestions.',
    suggested_tools: ['image_gen', 'artifacts', 'web_search'],
  },
  {
    id: 'business',
    name: 'Business Project',
    description: 'For strategy, planning, and business analysis',
    icon: '📊',
    color: 'orange',
    default_instructions: 'This is a business project. Focus on actionable insights, data-driven decisions, and clear communication.',
    suggested_tools: ['calculator', 'web_search', 'deep_research'],
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no preset configuration',
    icon: '📁',
    color: 'stone',
    default_instructions: '',
    suggested_tools: [],
  },
];

/**
 * Color configuration for project themes
 */
export const PROJECT_COLORS: Record<ProjectColor, {
  bg: string;
  bgHover: string;
  border: string;
  text: string;
  accent: string;
  light: string;
}> = {
  teal: {
    bg: 'bg-teal-500/20',
    bgHover: 'hover:bg-teal-500/30',
    border: 'border-teal-500/30',
    text: 'text-teal-600 dark:text-teal-400',
    accent: 'bg-teal-500',
    light: 'bg-teal-50 dark:bg-teal-900/30',
  },
  blue: {
    bg: 'bg-blue-500/20',
    bgHover: 'hover:bg-blue-500/30',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-900/30',
  },
  purple: {
    bg: 'bg-purple-500/20',
    bgHover: 'hover:bg-purple-500/30',
    border: 'border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    accent: 'bg-purple-500',
    light: 'bg-purple-50 dark:bg-purple-900/30',
  },
  pink: {
    bg: 'bg-pink-500/20',
    bgHover: 'hover:bg-pink-500/30',
    border: 'border-pink-500/30',
    text: 'text-pink-600 dark:text-pink-400',
    accent: 'bg-pink-500',
    light: 'bg-pink-50 dark:bg-pink-900/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    bgHover: 'hover:bg-orange-500/30',
    border: 'border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400',
    accent: 'bg-orange-500',
    light: 'bg-orange-50 dark:bg-orange-900/30',
  },
  green: {
    bg: 'bg-green-500/20',
    bgHover: 'hover:bg-green-500/30',
    border: 'border-green-500/30',
    text: 'text-green-600 dark:text-green-400',
    accent: 'bg-green-500',
    light: 'bg-green-50 dark:bg-green-900/30',
  },
  red: {
    bg: 'bg-red-500/20',
    bgHover: 'hover:bg-red-500/30',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    accent: 'bg-red-500',
    light: 'bg-red-50 dark:bg-red-900/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    bgHover: 'hover:bg-yellow-500/30',
    border: 'border-yellow-500/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    accent: 'bg-yellow-500',
    light: 'bg-yellow-50 dark:bg-yellow-900/30',
  },
  indigo: {
    bg: 'bg-indigo-500/20',
    bgHover: 'hover:bg-indigo-500/30',
    border: 'border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    accent: 'bg-indigo-500',
    light: 'bg-indigo-50 dark:bg-indigo-900/30',
  },
  stone: {
    bg: 'bg-stone-500/20',
    bgHover: 'hover:bg-stone-500/30',
    border: 'border-stone-500/30',
    text: 'text-stone-600 dark:text-stone-400',
    accent: 'bg-stone-500',
    light: 'bg-stone-50 dark:bg-stone-900/30',
  },
};
