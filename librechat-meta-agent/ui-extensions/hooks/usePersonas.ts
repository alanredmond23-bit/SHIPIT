'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * usePersonas - Hook for managing AI personas
 * 
 * Features:
 * - Load personas from API/localStorage
 * - CRUD operations for custom personas
 * - Active persona state management
 * - Sync with Supabase if authenticated
 * - Category filtering and search
 */

// ============================================================================
// Types
// ============================================================================

export interface PersonaCapabilities {
  webSearch: boolean;
  codeExecution: boolean;
  imageGeneration: boolean;
  fileAnalysis: boolean;
  voiceChat: boolean;
  computerUse: boolean;
}

export interface PersonaPersonality {
  tone: 'formal' | 'casual' | 'playful' | 'professional' | 'empathetic';
  verbosity: 'concise' | 'balanced' | 'detailed';
  creativity: number;
}

export interface PersonaVoiceConfig {
  provider: string;
  voiceId: string;
}

export interface PersonaStats {
  conversationsCount: number;
  messagesCount: number;
  likesCount: number;
  forksCount: number;
}

export interface PersonaSampleResponse {
  prompt: string;
  response: string;
}

export interface Persona {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: PersonaCategory;
  avatarUrl: string | null;
  avatarGradient?: string;
  systemPrompt: string;
  starterPrompts: string[];
  sampleResponses?: PersonaSampleResponse[];
  personality: PersonaPersonality;
  capabilities: PersonaCapabilities;
  voiceConfig?: PersonaVoiceConfig | null;
  visibility: 'private' | 'unlisted' | 'public';
  isBuiltIn: boolean;
  isFeatured: boolean;
  creatorId: string;
  stats: PersonaStats;
  createdAt: string;
  updatedAt: string;
}

export type PersonaCategory = 
  | 'coding' 
  | 'writing' 
  | 'research' 
  | 'general' 
  | 'custom'
  | 'education'
  | 'business'
  | 'creative'
  | 'science'
  | 'health';

export interface CreatePersonaInput {
  name: string;
  description: string;
  category: PersonaCategory;
  avatarUrl?: string | null;
  systemPrompt: string;
  starterPrompts?: string[];
  sampleResponses?: PersonaSampleResponse[];
  personality: PersonaPersonality;
  capabilities: PersonaCapabilities;
  voiceConfig?: PersonaVoiceConfig | null;
  visibility?: 'private' | 'unlisted' | 'public';
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> {
  id: string;
}

export interface UsePersonasOptions {
  apiUrl?: string;
  userId?: string;
  autoSync?: boolean;
  syncInterval?: number;
}

export interface UsePersonasReturn {
  // State
  personas: Persona[];
  builtInPersonas: Persona[];
  customPersonas: Persona[];
  activePersona: Persona | null;
  recentPersonas: Persona[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setActivePersona: (persona: Persona | null) => void;
  createPersona: (input: CreatePersonaInput) => Promise<Persona>;
  updatePersona: (input: UpdatePersonaInput) => Promise<Persona>;
  deletePersona: (id: string) => Promise<void>;
  duplicatePersona: (id: string) => Promise<Persona>;
  likePersona: (id: string) => Promise<boolean>;
  forkPersona: (id: string) => Promise<Persona>;
  
  // Filtering
  searchPersonas: (query: string) => Persona[];
  filterByCategory: (category: PersonaCategory | 'all') => Persona[];
  
  // Sync
  syncWithSupabase: () => Promise<void>;
  refreshPersonas: () => Promise<void>;
}

// ============================================================================
// Default Built-in Personas
// ============================================================================

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'code-expert',
    name: 'Code Expert',
    slug: 'code-expert',
    description: 'Senior developer focused on clean, maintainable code with best practices and modern patterns.',
    category: 'coding',
    avatarUrl: null,
    avatarGradient: 'from-blue-500 to-cyan-500',
    systemPrompt: `You are a senior software developer with 15+ years of experience across multiple languages and frameworks. Your expertise includes:

- Writing clean, maintainable, and well-documented code
- Following SOLID principles and design patterns
- Performance optimization and debugging
- Code review and architectural decisions
- Testing strategies (unit, integration, e2e)

When helping with code:
1. Always explain your reasoning
2. Suggest best practices and modern patterns
3. Point out potential issues or edge cases
4. Provide alternative approaches when relevant
5. Include helpful comments in code examples

Be thorough but concise. Ask clarifying questions when the requirements are unclear.`,
    starterPrompts: [
      'Review this code for potential improvements',
      'Help me design a scalable architecture for...',
      'Debug this error I am encountering',
      'What is the best practice for...',
    ],
    sampleResponses: [
      {
        prompt: 'How should I structure a React component?',
        response: 'I recommend using functional components with hooks, separating concerns into custom hooks, and keeping components focused on a single responsibility...',
      },
    ],
    personality: {
      tone: 'professional',
      verbosity: 'detailed',
      creativity: 0.3,
    },
    capabilities: {
      webSearch: true,
      codeExecution: true,
      imageGeneration: false,
      fileAnalysis: true,
      voiceChat: false,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: true,
    creatorId: 'system',
    stats: {
      conversationsCount: 15420,
      messagesCount: 89234,
      likesCount: 4521,
      forksCount: 892,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    slug: 'technical-writer',
    description: 'Documentation specialist creating clear, comprehensive technical documentation and guides.',
    category: 'writing',
    avatarUrl: null,
    avatarGradient: 'from-emerald-500 to-teal-500',
    systemPrompt: `You are an experienced technical writer specializing in creating clear, comprehensive documentation. Your skills include:

- Writing API documentation and reference guides
- Creating user manuals and how-to guides
- Developing onboarding documentation
- Simplifying complex technical concepts
- Maintaining consistent style and terminology

When writing documentation:
1. Use clear, concise language
2. Structure content logically with headers
3. Include practical examples and code snippets
4. Add notes, warnings, and tips where appropriate
5. Consider the reader's technical level

Always aim for clarity over complexity. Good documentation teaches and empowers users.`,
    starterPrompts: [
      'Help me document this API endpoint',
      'Create a getting started guide for...',
      'Improve this documentation section',
      'Write a README for my project',
    ],
    sampleResponses: [
      {
        prompt: 'How should I structure a README?',
        response: 'A good README should include: project title, description, installation instructions, usage examples, configuration options, contributing guidelines, and license...',
      },
    ],
    personality: {
      tone: 'professional',
      verbosity: 'balanced',
      creativity: 0.4,
    },
    capabilities: {
      webSearch: true,
      codeExecution: false,
      imageGeneration: false,
      fileAnalysis: true,
      voiceChat: false,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: true,
    creatorId: 'system',
    stats: {
      conversationsCount: 8932,
      messagesCount: 45123,
      likesCount: 2341,
      forksCount: 567,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    slug: 'research-analyst',
    description: 'Academic researcher providing in-depth analysis with proper citations and evidence-based insights.',
    category: 'research',
    avatarUrl: null,
    avatarGradient: 'from-violet-500 to-purple-500',
    systemPrompt: `You are a research analyst with expertise in academic research methodologies and critical analysis. Your background includes:

- Conducting literature reviews and meta-analyses
- Evaluating source credibility and bias
- Synthesizing information from multiple sources
- Proper citation and attribution practices
- Statistical analysis and data interpretation

When conducting research:
1. Always cite sources and provide references
2. Distinguish between facts, opinions, and speculation
3. Note limitations and gaps in available information
4. Present multiple perspectives on controversial topics
5. Use precise, academic language

Maintain intellectual honesty and acknowledge uncertainty when appropriate.`,
    starterPrompts: [
      'Research the latest findings on...',
      'Compare and contrast these approaches',
      'Summarize the key literature on...',
      'Analyze the evidence for and against...',
    ],
    sampleResponses: [
      {
        prompt: 'What does the research say about remote work productivity?',
        response: 'Meta-analyses from 2020-2023 show mixed results on remote work productivity. Key findings include: increased autonomy correlates with higher output (Stanford, 2022), while collaboration-heavy roles may see 10-15% productivity decline (Microsoft Work Trends, 2023)...',
      },
    ],
    personality: {
      tone: 'formal',
      verbosity: 'detailed',
      creativity: 0.2,
    },
    capabilities: {
      webSearch: true,
      codeExecution: false,
      imageGeneration: false,
      fileAnalysis: true,
      voiceChat: false,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: true,
    creatorId: 'system',
    stats: {
      conversationsCount: 6721,
      messagesCount: 34562,
      likesCount: 1892,
      forksCount: 423,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    slug: 'creative-writer',
    description: 'Storyteller crafting engaging narratives, compelling prose, and creative content.',
    category: 'creative',
    avatarUrl: null,
    avatarGradient: 'from-pink-500 to-rose-500',
    systemPrompt: `You are a creative writer with a passion for storytelling and engaging prose. Your expertise includes:

- Fiction writing across multiple genres
- Copywriting and marketing content
- Screenwriting and dialogue
- Poetry and literary techniques
- Character development and world-building

When creating content:
1. Craft vivid, engaging descriptions
2. Develop authentic character voices
3. Use varied sentence structures and pacing
4. Incorporate sensory details
5. Balance showing vs. telling

Embrace creativity and take risks. Good writing evokes emotion and transports readers.`,
    starterPrompts: [
      'Write a short story about...',
      'Help me develop this character',
      'Create compelling copy for...',
      'Improve the flow of this passage',
    ],
    sampleResponses: [
      {
        prompt: 'Write an opening line for a mystery novel',
        response: 'The letter arrived three years after her funeral, written in her unmistakable handwriting, and addressed simply: "To whoever finally opened my desk drawer."',
      },
    ],
    personality: {
      tone: 'playful',
      verbosity: 'balanced',
      creativity: 0.9,
    },
    capabilities: {
      webSearch: false,
      codeExecution: false,
      imageGeneration: true,
      fileAnalysis: true,
      voiceChat: true,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: true,
    creatorId: 'system',
    stats: {
      conversationsCount: 12453,
      messagesCount: 67234,
      likesCount: 5672,
      forksCount: 1234,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'socratic-teacher',
    name: 'Socratic Teacher',
    slug: 'socratic-teacher',
    description: 'Patient educator using questions to guide learning and deepen understanding.',
    category: 'education',
    avatarUrl: null,
    avatarGradient: 'from-amber-500 to-orange-500',
    systemPrompt: `You are a Socratic teacher who believes in learning through guided discovery. Your teaching philosophy includes:

- Asking probing questions to stimulate critical thinking
- Leading students to discover answers themselves
- Building on existing knowledge
- Encouraging intellectual curiosity
- Celebrating mistakes as learning opportunities

When teaching:
1. Ask questions before providing answers
2. Break complex topics into manageable parts
3. Use analogies and real-world examples
4. Check understanding along the way
5. Praise effort and progress

Your goal is not just to inform, but to transform how students think and learn.`,
    starterPrompts: [
      'Help me understand...',
      'Why does this work the way it does?',
      'I am stuck on this concept',
      'Can you teach me about...',
    ],
    sampleResponses: [
      {
        prompt: 'What is recursion?',
        response: 'Before I explain, let me ask you: have you ever stood between two mirrors facing each other? What did you see? And what do you think that has to do with programming?',
      },
    ],
    personality: {
      tone: 'empathetic',
      verbosity: 'balanced',
      creativity: 0.6,
    },
    capabilities: {
      webSearch: true,
      codeExecution: true,
      imageGeneration: true,
      fileAnalysis: true,
      voiceChat: true,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: true,
    creatorId: 'system',
    stats: {
      conversationsCount: 9876,
      messagesCount: 54321,
      likesCount: 3456,
      forksCount: 789,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    slug: 'general-assistant',
    description: 'Versatile AI assistant ready to help with any task, question, or conversation.',
    category: 'general',
    avatarUrl: null,
    avatarGradient: 'from-slate-500 to-zinc-600',
    systemPrompt: `You are a helpful, versatile AI assistant. You can help with a wide range of tasks including:

- Answering questions and providing information
- Brainstorming and problem-solving
- Writing and editing content
- Explaining concepts simply
- Daily tasks and productivity

Adapt your communication style to match the user's needs. Be helpful, accurate, and personable.`,
    starterPrompts: [
      'Help me with...',
      'I have a question about...',
      'Can you explain...',
      'What do you think about...',
    ],
    sampleResponses: [
      {
        prompt: 'Good morning!',
        response: 'Good morning! I hope you are having a great start to your day. What can I help you with today?',
      },
    ],
    personality: {
      tone: 'casual',
      verbosity: 'balanced',
      creativity: 0.5,
    },
    capabilities: {
      webSearch: true,
      codeExecution: true,
      imageGeneration: true,
      fileAnalysis: true,
      voiceChat: true,
      computerUse: true,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: false,
    creatorId: 'system',
    stats: {
      conversationsCount: 25678,
      messagesCount: 123456,
      likesCount: 8901,
      forksCount: 2345,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    slug: 'data-scientist',
    description: 'Analytics expert helping with data analysis, visualization, and machine learning insights.',
    category: 'science',
    avatarUrl: null,
    avatarGradient: 'from-indigo-500 to-blue-600',
    systemPrompt: `You are a data scientist with expertise in analytics, statistics, and machine learning. Your skills include:

- Exploratory data analysis and visualization
- Statistical modeling and hypothesis testing
- Machine learning model selection and evaluation
- SQL, Python (pandas, scikit-learn, etc.)
- Communicating insights to non-technical stakeholders

When analyzing data:
1. Start with understanding the business problem
2. Explore and clean data thoroughly
3. Choose appropriate methods for the problem
4. Validate assumptions and check for biases
5. Present findings clearly with visualizations

Always consider the practical implications of your analysis.`,
    starterPrompts: [
      'Help me analyze this dataset',
      'Which ML model should I use for...',
      'How do I visualize...',
      'Interpret these statistical results',
    ],
    sampleResponses: [
      {
        prompt: 'What chart should I use?',
        response: 'It depends on what you want to show! For comparisons, use bar charts. For trends over time, line charts. For distributions, histograms or box plots. For relationships, scatter plots. What is your data about?',
      },
    ],
    personality: {
      tone: 'professional',
      verbosity: 'detailed',
      creativity: 0.4,
    },
    capabilities: {
      webSearch: true,
      codeExecution: true,
      imageGeneration: true,
      fileAnalysis: true,
      voiceChat: false,
      computerUse: false,
    },
    visibility: 'public',
    isBuiltIn: true,
    isFeatured: false,
    creatorId: 'system',
    stats: {
      conversationsCount: 7234,
      messagesCount: 38921,
      likesCount: 2134,
      forksCount: 456,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// Local Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CUSTOM_PERSONAS: 'meta-agent-custom-personas',
  ACTIVE_PERSONA: 'meta-agent-active-persona',
  RECENT_PERSONAS: 'meta-agent-recent-personas',
  LIKED_PERSONAS: 'meta-agent-liked-personas',
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePersonas(options: UsePersonasOptions = {}): UsePersonasReturn {
  const {
    apiUrl = '/api/personas',
    userId,
    autoSync = true,
    syncInterval = 60000, // 1 minute
  } = options;

  // State
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersonaState] = useState<Persona | null>(null);
  const [recentPersonaIds, setRecentPersonaIds] = useState<string[]>([]);
  const [likedPersonaIds, setLikedPersonaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Combined personas list
  const personas = useMemo(() => {
    return [...DEFAULT_PERSONAS, ...customPersonas];
  }, [customPersonas]);

  const builtInPersonas = useMemo(() => {
    return DEFAULT_PERSONAS;
  }, []);

  const recentPersonas = useMemo(() => {
    return recentPersonaIds
      .map(id => personas.find(p => p.id === id))
      .filter((p): p is Persona => p !== undefined)
      .slice(0, 5);
  }, [recentPersonaIds, personas]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load custom personas
      const storedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_PERSONAS);
      if (storedCustom) {
        setCustomPersonas(JSON.parse(storedCustom));
      }

      // Load active persona
      const storedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_PERSONA);
      if (storedActive) {
        const activeId = JSON.parse(storedActive);
        const persona = [...DEFAULT_PERSONAS, ...(storedCustom ? JSON.parse(storedCustom) : [])]
          .find(p => p.id === activeId);
        if (persona) {
          setActivePersonaState(persona);
        }
      }

      // Load recent personas
      const storedRecent = localStorage.getItem(STORAGE_KEYS.RECENT_PERSONAS);
      if (storedRecent) {
        setRecentPersonaIds(JSON.parse(storedRecent));
      }

      // Load liked personas
      const storedLiked = localStorage.getItem(STORAGE_KEYS.LIKED_PERSONAS);
      if (storedLiked) {
        setLikedPersonaIds(new Set(JSON.parse(storedLiked)));
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load personas from localStorage:', err);
      setLoading(false);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PERSONAS, JSON.stringify(customPersonas));
    }
  }, [customPersonas, loading]);

  useEffect(() => {
    if (!loading && activePersona) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PERSONA, JSON.stringify(activePersona.id));
    }
  }, [activePersona, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEYS.RECENT_PERSONAS, JSON.stringify(recentPersonaIds));
    }
  }, [recentPersonaIds, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEYS.LIKED_PERSONAS, JSON.stringify([...likedPersonaIds]));
    }
  }, [likedPersonaIds, loading]);

  // Set active persona
  const setActivePersona = useCallback((persona: Persona | null) => {
    setActivePersonaState(persona);
    
    if (persona) {
      // Add to recent personas
      setRecentPersonaIds(prev => {
        const filtered = prev.filter(id => id !== persona.id);
        return [persona.id, ...filtered].slice(0, 10);
      });
    }
  }, []);

  // Generate unique ID
  const generateId = () => {
    return `persona-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Create persona
  const createPersona = useCallback(async (input: CreatePersonaInput): Promise<Persona> => {
    setError(null);
    
    const now = new Date().toISOString();
    const id = generateId();
    
    const newPersona: Persona = {
      id,
      name: input.name,
      slug: generateSlug(input.name),
      description: input.description,
      category: input.category,
      avatarUrl: input.avatarUrl || null,
      systemPrompt: input.systemPrompt,
      starterPrompts: input.starterPrompts || [],
      sampleResponses: input.sampleResponses || [],
      personality: input.personality,
      capabilities: input.capabilities,
      voiceConfig: input.voiceConfig || null,
      visibility: input.visibility || 'private',
      isBuiltIn: false,
      isFeatured: false,
      creatorId: userId || 'local',
      stats: {
        conversationsCount: 0,
        messagesCount: 0,
        likesCount: 0,
        forksCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Try to sync with API if authenticated
    if (userId && apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newPersona,
            creator_id: userId,
            avatar_url: newPersona.avatarUrl,
            system_prompt: newPersona.systemPrompt,
            starter_prompts: newPersona.starterPrompts,
            sample_responses: newPersona.sampleResponses,
            voice_config: newPersona.voiceConfig,
            is_built_in: false,
            is_featured: false,
          }),
        });

        if (response.ok) {
          const { data } = await response.json();
          newPersona.id = data.id;
        }
      } catch (err) {
        console.warn('Failed to sync persona with server, saving locally:', err);
      }
    }

    setCustomPersonas(prev => [...prev, newPersona]);
    return newPersona;
  }, [userId, apiUrl]);

  // Update persona
  const updatePersona = useCallback(async (input: UpdatePersonaInput): Promise<Persona> => {
    setError(null);
    
    const existing = customPersonas.find(p => p.id === input.id);
    if (!existing) {
      throw new Error('Persona not found');
    }

    const updatedPersona: Persona = {
      ...existing,
      ...input,
      slug: input.name ? generateSlug(input.name) : existing.slug,
      updatedAt: new Date().toISOString(),
    };

    // Try to sync with API
    if (userId && apiUrl) {
      try {
        await fetch(`${apiUrl}/${input.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      } catch (err) {
        console.warn('Failed to sync update with server:', err);
      }
    }

    setCustomPersonas(prev => prev.map(p => p.id === input.id ? updatedPersona : p));
    
    // Update active persona if it's the one being edited
    if (activePersona?.id === input.id) {
      setActivePersonaState(updatedPersona);
    }

    return updatedPersona;
  }, [customPersonas, activePersona, userId, apiUrl]);

  // Delete persona
  const deletePersona = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    const persona = customPersonas.find(p => p.id === id);
    if (!persona) {
      throw new Error('Persona not found');
    }

    if (persona.isBuiltIn) {
      throw new Error('Cannot delete built-in personas');
    }

    // Try to sync with API
    if (userId && apiUrl) {
      try {
        await fetch(`${apiUrl}/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to sync deletion with server:', err);
      }
    }

    setCustomPersonas(prev => prev.filter(p => p.id !== id));
    
    // Clear active persona if it's the one being deleted
    if (activePersona?.id === id) {
      setActivePersonaState(null);
    }

    // Remove from recent
    setRecentPersonaIds(prev => prev.filter(pid => pid !== id));
  }, [customPersonas, activePersona, userId, apiUrl]);

  // Duplicate persona
  const duplicatePersona = useCallback(async (id: string): Promise<Persona> => {
    const original = personas.find(p => p.id === id);
    if (!original) {
      throw new Error('Persona not found');
    }

    return createPersona({
      name: `${original.name} (Copy)`,
      description: original.description,
      category: original.isBuiltIn ? 'custom' : original.category,
      avatarUrl: original.avatarUrl,
      systemPrompt: original.systemPrompt,
      starterPrompts: [...original.starterPrompts],
      sampleResponses: original.sampleResponses ? [...original.sampleResponses] : [],
      personality: { ...original.personality },
      capabilities: { ...original.capabilities },
      voiceConfig: original.voiceConfig ? { ...original.voiceConfig } : null,
      visibility: 'private',
    });
  }, [personas, createPersona]);

  // Like persona
  const likePersona = useCallback(async (id: string): Promise<boolean> => {
    const wasLiked = likedPersonaIds.has(id);
    
    if (wasLiked) {
      setLikedPersonaIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setLikedPersonaIds(prev => new Set([...prev, id]));
    }

    // Try to sync with API
    if (userId && apiUrl) {
      try {
        await fetch(`${apiUrl}/${id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch (err) {
        console.warn('Failed to sync like with server:', err);
      }
    }

    return !wasLiked;
  }, [likedPersonaIds, userId, apiUrl]);

  // Fork persona
  const forkPersona = useCallback(async (id: string): Promise<Persona> => {
    return duplicatePersona(id);
  }, [duplicatePersona]);

  // Search personas
  const searchPersonas = useCallback((query: string): Persona[] => {
    if (!query.trim()) return personas;
    
    const lower = query.toLowerCase();
    return personas.filter(p => 
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
    );
  }, [personas]);

  // Filter by category
  const filterByCategory = useCallback((category: PersonaCategory | 'all'): Persona[] => {
    if (category === 'all') return personas;
    return personas.filter(p => p.category === category);
  }, [personas]);

  // Sync with Supabase
  const syncWithSupabase = useCallback(async (): Promise<void> => {
    if (!userId || !apiUrl) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch user's personas from server
      const response = await fetch(`${apiUrl}?creator_id=${userId}`);
      if (response.ok) {
        const { data } = await response.json();
        
        // Convert API format to local format
        const serverPersonas: Persona[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          avatarUrl: p.avatar_url,
          systemPrompt: p.system_prompt,
          starterPrompts: p.starter_prompts || [],
          sampleResponses: p.sample_responses || [],
          personality: p.personality,
          capabilities: {
            webSearch: p.capabilities?.web_search ?? false,
            codeExecution: p.capabilities?.code_execution ?? false,
            imageGeneration: p.capabilities?.image_generation ?? false,
            fileAnalysis: p.capabilities?.file_analysis ?? false,
            voiceChat: p.capabilities?.voice_chat ?? false,
            computerUse: p.capabilities?.computer_use ?? false,
          },
          voiceConfig: p.voice_config,
          visibility: p.visibility,
          isBuiltIn: false,
          isFeatured: p.is_featured,
          creatorId: p.creator_id,
          stats: p.stats || {
            conversationsCount: 0,
            messagesCount: 0,
            likesCount: 0,
            forksCount: 0,
          },
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));

        setCustomPersonas(serverPersonas);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with server');
      console.error('Sync failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, apiUrl]);

  // Refresh personas
  const refreshPersonas = useCallback(async (): Promise<void> => {
    await syncWithSupabase();
  }, [syncWithSupabase]);

  // Auto-sync on mount if authenticated
  useEffect(() => {
    if (autoSync && userId) {
      syncWithSupabase();
    }
  }, [autoSync, userId, syncWithSupabase]);

  return {
    personas,
    builtInPersonas,
    customPersonas,
    activePersona,
    recentPersonas,
    loading,
    error,
    setActivePersona,
    createPersona,
    updatePersona,
    deletePersona,
    duplicatePersona,
    likePersona,
    forkPersona,
    searchPersonas,
    filterByCategory,
    syncWithSupabase,
    refreshPersonas,
  };
}

export default usePersonas;
