import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES
// ============================================================================

interface ModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_output_tokens: number;
  seed: number | null;
  stop_sequences: string[];
}

interface ReasoningConfig {
  reasoning_effort: 'low' | 'medium' | 'high' | 'max' | 'custom';
  thinking_budget: number;
  show_thinking: boolean;
  max_inflections: number;
  max_reflections: number;
  confidence_threshold: number;
}

interface RAGConfig {
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  max_chunks: number;
  embedding_model: string;
}

interface SearchConfig {
  search_depth: number;
  max_sources: number;
  source_quality: 'any' | 'verified' | 'academic';
  include_domains: string[];
  exclude_domains: string[];
}

interface UserSettings {
  modelParameters: ModelParameters;
  reasoningConfig: ReasoningConfig;
  ragConfig: RAGConfig;
  searchConfig: SearchConfig;
  selectedModel: string;
  selectedPreset: string | null;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<UserSettings>;
}

interface SettingsStore {
  settings: UserSettings;
  customPresets: SettingsPreset[];
  updatedAt: string;
}

// ============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

// In a real implementation, this would be stored in a database
// For now, we use in-memory storage keyed by session ID
const settingsStore = new Map<string, SettingsStore>();

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  modelParameters: {
    temperature: 0.7,
    top_p: 1.0,
    top_k: 40,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    max_output_tokens: 8192,
    seed: null,
    stop_sequences: [],
  },
  reasoningConfig: {
    reasoning_effort: 'medium',
    thinking_budget: 16384,
    show_thinking: true,
    max_inflections: 5,
    max_reflections: 3,
    confidence_threshold: 0.7,
  },
  ragConfig: {
    chunk_size: 512,
    chunk_overlap: 50,
    similarity_threshold: 0.7,
    max_chunks: 10,
    embedding_model: 'text-embedding-3-small',
  },
  searchConfig: {
    search_depth: 5,
    max_sources: 100,
    source_quality: 'any',
    include_domains: [],
    exclude_domains: [],
  },
  selectedModel: 'claude-opus-4-5-20251101',
  selectedPreset: null,
  theme: 'system',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSessionId(request: NextRequest): string {
  // Try to get session from cookie
  const cookieStore = cookies();
  let sessionId = cookieStore.get('meta-agent-session')?.value;

  // If no session, create one
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return sessionId;
}

function validateSettings(settings: Partial<UserSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate model parameters
  if (settings.modelParameters) {
    const { temperature, top_p, top_k, frequency_penalty, presence_penalty, max_output_tokens } =
      settings.modelParameters;

    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }
    if (top_p !== undefined && (top_p < 0 || top_p > 1)) {
      errors.push('Top P must be between 0 and 1');
    }
    if (top_k !== undefined && (top_k < 1 || top_k > 100)) {
      errors.push('Top K must be between 1 and 100');
    }
    if (frequency_penalty !== undefined && (frequency_penalty < -2 || frequency_penalty > 2)) {
      errors.push('Frequency penalty must be between -2 and 2');
    }
    if (presence_penalty !== undefined && (presence_penalty < -2 || presence_penalty > 2)) {
      errors.push('Presence penalty must be between -2 and 2');
    }
    if (max_output_tokens !== undefined && (max_output_tokens < 1 || max_output_tokens > 128000)) {
      errors.push('Max output tokens must be between 1 and 128000');
    }
  }

  // Validate reasoning config
  if (settings.reasoningConfig) {
    const { thinking_budget, max_inflections, max_reflections, confidence_threshold } =
      settings.reasoningConfig;

    if (thinking_budget !== undefined && (thinking_budget < 1000 || thinking_budget > 128000)) {
      errors.push('Thinking budget must be between 1000 and 128000');
    }
    if (max_inflections !== undefined && (max_inflections < 1 || max_inflections > 20)) {
      errors.push('Max inflections must be between 1 and 20');
    }
    if (max_reflections !== undefined && (max_reflections < 1 || max_reflections > 10)) {
      errors.push('Max reflections must be between 1 and 10');
    }
    if (confidence_threshold !== undefined && (confidence_threshold < 0 || confidence_threshold > 1)) {
      errors.push('Confidence threshold must be between 0 and 1');
    }
  }

  // Validate search config
  if (settings.searchConfig) {
    const { search_depth, max_sources } = settings.searchConfig;

    if (search_depth !== undefined && (search_depth < 1 || search_depth > 10)) {
      errors.push('Search depth must be between 1 and 10');
    }
    if (max_sources !== undefined && (max_sources < 1 || max_sources > 500)) {
      errors.push('Max sources must be between 1 and 500');
    }
  }

  return { valid: errors.length === 0, errors };
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof T];
      const targetValue = target[key as keyof T];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        sourceValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        targetValue !== null
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as object
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

// ============================================================================
// GET - Load user settings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const stored = settingsStore.get(sessionId);

    if (!stored) {
      // Return default settings if none saved
      return NextResponse.json(
        {
          settings: DEFAULT_SETTINGS,
          customPresets: [],
          updatedAt: null,
        },
        {
          status: 200,
          headers: {
            'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
          },
        }
      );
    }

    return NextResponse.json(stored, {
      headers: {
        'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      },
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Save all settings
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const body = await request.json();

    const { settings, customPresets } = body;

    // Validate settings
    if (settings) {
      const validation = validateSettings(settings);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid settings', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Get existing settings
    const existing = settingsStore.get(sessionId);
    const currentSettings = existing?.settings || DEFAULT_SETTINGS;
    const currentPresets = existing?.customPresets || [];

    // Merge settings
    const mergedSettings = settings
      ? deepMerge(currentSettings, settings)
      : currentSettings;

    // Store
    const store: SettingsStore = {
      settings: mergedSettings,
      customPresets: customPresets || currentPresets,
      updatedAt: new Date().toISOString(),
    };

    settingsStore.set(sessionId, store);

    return NextResponse.json(
      { success: true, ...store },
      {
        headers: {
          'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
        },
      }
    );
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update specific settings sections
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const body = await request.json();

    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Section and data are required' },
        { status: 400 }
      );
    }

    const validSections = ['modelParameters', 'reasoningConfig', 'ragConfig', 'searchConfig'];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate the partial update
    const partialSettings = { [section]: data } as Partial<UserSettings>;
    const validation = validateSettings(partialSettings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid settings', details: validation.errors },
        { status: 400 }
      );
    }

    // Get existing settings
    const existing = settingsStore.get(sessionId);
    const currentSettings = existing?.settings || DEFAULT_SETTINGS;

    // Merge the specific section
    const updatedSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section as keyof UserSettings],
        ...data,
      },
    };

    // Store
    const store: SettingsStore = {
      settings: updatedSettings as UserSettings,
      customPresets: existing?.customPresets || [],
      updatedAt: new Date().toISOString(),
    };

    settingsStore.set(sessionId, store);

    return NextResponse.json(
      { success: true, ...store },
      {
        headers: {
          'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
        },
      }
    );
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Reset settings to defaults
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    // Reset to defaults
    const store: SettingsStore = {
      settings: { ...DEFAULT_SETTINGS },
      customPresets: [],
      updatedAt: new Date().toISOString(),
    };

    settingsStore.set(sessionId, store);

    return NextResponse.json({ success: true, ...store });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
}
