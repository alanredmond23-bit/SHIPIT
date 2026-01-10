'use client';

import React, { useState, useCallback } from 'react';
import {
  Wand2,
  Save,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  MessageSquare,
  Settings,
  Zap,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Code,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
  Monitor,
  Lock,
  Globe,
  EyeOff,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import clsx from 'clsx';
import type { 
  CreatePersonaInput, 
  PersonaCategory, 
  PersonaPersonality, 
  PersonaCapabilities,
  PersonaSampleResponse 
} from '@/hooks/usePersonas';

/**
 * PersonaCreator - Multi-step wizard for creating custom AI personas
 * 
 * Steps:
 * 1. Name, avatar, category selection
 * 2. System prompt editor with suggestions
 * 3. Example conversations (optional)
 * 4. Preview and test
 */

interface PersonaCreatorProps {
  onComplete: (persona: CreatePersonaInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreatePersonaInput>;
  isEditing?: boolean;
}

// Step definitions
const STEPS = [
  { id: 'basics', title: 'Basic Info', icon: User, description: 'Name, avatar & category' },
  { id: 'prompt', title: 'System Prompt', icon: MessageSquare, description: 'Define behavior' },
  { id: 'examples', title: 'Examples', icon: Sparkles, description: 'Sample conversations' },
  { id: 'preview', title: 'Preview', icon: Eye, description: 'Review & test' },
];

// Category options
const CATEGORIES: { value: PersonaCategory; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'coding', label: 'Coding', description: 'Programming & development', icon: Code },
  { value: 'writing', label: 'Writing', description: 'Content & documentation', icon: FileText },
  { value: 'research', label: 'Research', description: 'Analysis & investigation', icon: Search },
  { value: 'education', label: 'Education', description: 'Teaching & learning', icon: Lightbulb },
  { value: 'creative', label: 'Creative', description: 'Art & storytelling', icon: ImageIcon },
  { value: 'general', label: 'General', description: 'All-purpose assistant', icon: Sparkles },
  { value: 'custom', label: 'Custom', description: 'Something unique', icon: Wand2 },
];

// Tone options
const TONES: { value: PersonaPersonality['tone']; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Business-like and efficient' },
  { value: 'casual', label: 'Casual', description: 'Friendly and relaxed' },
  { value: 'formal', label: 'Formal', description: 'Respectful and precise' },
  { value: 'playful', label: 'Playful', description: 'Fun and lighthearted' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and caring' },
];

// Verbosity options
const VERBOSITY: { value: PersonaPersonality['verbosity']; label: string; description: string }[] = [
  { value: 'concise', label: 'Concise', description: 'Brief, to-the-point responses' },
  { value: 'balanced', label: 'Balanced', description: 'Moderate detail level' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
];

// System prompt templates
const PROMPT_TEMPLATES: { name: string; prompt: string; category: PersonaCategory }[] = [
  {
    name: 'Code Reviewer',
    category: 'coding',
    prompt: `You are an expert code reviewer with years of experience in software development. Your role is to:

- Review code for bugs, performance issues, and security vulnerabilities
- Suggest improvements following best practices and design patterns
- Explain your reasoning clearly and constructively
- Provide examples of better implementations when helpful

Be thorough but respectful. Focus on helping the developer improve their skills.`,
  },
  {
    name: 'Writing Assistant',
    category: 'writing',
    prompt: `You are a skilled writing assistant who helps improve written content. You can:

- Edit and proofread for grammar, spelling, and clarity
- Suggest better word choices and sentence structures
- Adapt tone and style for different audiences
- Help organize ideas and improve flow

Preserve the author's voice while enhancing their message.`,
  },
  {
    name: 'Research Helper',
    category: 'research',
    prompt: `You are a research assistant with expertise in finding and analyzing information. You:

- Search for relevant sources and cite them properly
- Summarize complex topics clearly
- Present multiple perspectives on controversial issues
- Distinguish between facts, opinions, and speculation

Always acknowledge limitations and uncertainty in your knowledge.`,
  },
  {
    name: 'Learning Coach',
    category: 'education',
    prompt: `You are a patient teacher who helps people learn new concepts. Your approach:

- Break complex topics into simple, understandable parts
- Use analogies and real-world examples
- Ask questions to check understanding
- Encourage curiosity and celebrate progress

Adapt your explanations to the learner's level and learning style.`,
  },
];

// Avatar gradient options
const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-red-500 to-rose-600',
  'from-green-500 to-emerald-600',
];

export function PersonaCreator({
  onComplete,
  onCancel,
  initialData,
  isEditing = false,
}: PersonaCreatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<PersonaCategory>(initialData?.category || 'general');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [selectedGradient, setSelectedGradient] = useState(AVATAR_GRADIENTS[0]);
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt || '');
  const [starterPrompts, setStarterPrompts] = useState<string[]>(
    initialData?.starterPrompts || ['']
  );
  const [sampleResponses, setSampleResponses] = useState<PersonaSampleResponse[]>(
    initialData?.sampleResponses || []
  );
  const [personality, setPersonality] = useState<PersonaPersonality>(
    initialData?.personality || {
      tone: 'professional',
      verbosity: 'balanced',
      creativity: 0.5,
    }
  );
  const [capabilities, setCapabilities] = useState<PersonaCapabilities>(
    initialData?.capabilities || {
      webSearch: false,
      codeExecution: false,
      imageGeneration: false,
      fileAnalysis: false,
      voiceChat: false,
      computerUse: false,
    }
  );
  const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>(
    initialData?.visibility || 'private'
  );

  // Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basics
        return name.trim().length >= 2 && description.trim().length >= 10;
      case 1: // Prompt
        return systemPrompt.trim().length >= 20;
      case 2: // Examples
        return true; // Optional
      case 3: // Preview
        return true;
      default:
        return false;
    }
  };

  const canGoNext = validateStep(currentStep);

  // Navigation
  const handleNext = () => {
    if (canGoNext && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Starter prompts management
  const handleAddStarterPrompt = () => {
    if (starterPrompts.length < 5) {
      setStarterPrompts([...starterPrompts, '']);
    }
  };

  const handleUpdateStarterPrompt = (index: number, value: string) => {
    const updated = [...starterPrompts];
    updated[index] = value;
    setStarterPrompts(updated);
  };

  const handleRemoveStarterPrompt = (index: number) => {
    setStarterPrompts(starterPrompts.filter((_, i) => i !== index));
  };

  // Sample responses management
  const handleAddSampleResponse = () => {
    setSampleResponses([...sampleResponses, { prompt: '', response: '' }]);
  };

  const handleUpdateSampleResponse = (index: number, field: 'prompt' | 'response', value: string) => {
    const updated = [...sampleResponses];
    updated[index] = { ...updated[index], [field]: value };
    setSampleResponses(updated);
  };

  const handleRemoveSampleResponse = (index: number) => {
    setSampleResponses(sampleResponses.filter((_, i) => i !== index));
  };

  // Apply template
  const applyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setSystemPrompt(template.prompt);
    setCategory(template.category);
  };

  // Test persona
  const handleTest = async () => {
    if (!testMessage.trim()) return;
    
    setTestResponse('Simulating response based on your system prompt...\n\n');
    
    // Simulate streaming response
    const mockResponse = `Based on the persona you've created, here's how I would respond:

"${testMessage}"

As ${name}, I would approach this ${personality.verbosity === 'concise' ? 'briefly' : personality.verbosity === 'detailed' ? 'with thorough detail' : 'with balanced explanation'}.

With a ${personality.tone} tone, I would ${
      personality.tone === 'professional' ? 'provide clear, actionable guidance' :
      personality.tone === 'casual' ? 'keep things friendly and approachable' :
      personality.tone === 'formal' ? 'maintain precision and respect' :
      personality.tone === 'playful' ? 'make the interaction engaging and fun' :
      'show understanding and support'
    }.

[This is a simulated preview. The actual responses will be generated by the AI model using your system prompt.]`;

    // Simulate typing
    for (let i = 0; i < mockResponse.length; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 10));
      setTestResponse(mockResponse.substring(0, i + 5));
    }
  };

  // Save persona
  const handleSave = async () => {
    if (!validateStep(0) || !validateStep(1)) {
      setError('Please complete all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const personaData: CreatePersonaInput = {
        name,
        description,
        category,
        avatarUrl: avatarUrl || null,
        systemPrompt,
        starterPrompts: starterPrompts.filter(p => p.trim()),
        sampleResponses: sampleResponses.filter(s => s.prompt.trim() && s.response.trim()),
        personality,
        capabilities,
        visibility,
      };

      await onComplete(personaData);
    } catch (err: any) {
      setError(err.message || 'Failed to save persona');
    } finally {
      setSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-6">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">Avatar</label>
              <div className="flex items-start gap-6">
                {/* Preview */}
                <div className={clsx(
                  'w-24 h-24 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br',
                  avatarUrl ? '' : selectedGradient
                )}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  {/* URL Input */}
                  <div>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Paste image URL (optional)"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  </div>

                  {/* Gradient Selection */}
                  <div>
                    <p className="text-xs text-stone-500 mb-2">Or choose a gradient:</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_GRADIENTS.map((gradient) => (
                        <button
                          key={gradient}
                          type="button"
                          onClick={() => {
                            setAvatarUrl('');
                            setSelectedGradient(gradient);
                          }}
                          className={clsx(
                            'w-8 h-8 rounded-full bg-gradient-to-br transition-transform',
                            gradient,
                            selectedGradient === gradient && !avatarUrl ? 'ring-2 ring-teal-500 ring-offset-2 scale-110' : 'hover:scale-105'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Persona Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Expert, Writing Coach, Study Buddy"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <p className="text-xs text-stone-500 mt-1">Minimum 2 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this persona does and how it helps users..."
                rows={3}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 resize-none"
              />
              <p className="text-xs text-stone-500 mt-1">Minimum 10 characters</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={clsx(
                        'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                        category === cat.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      )}
                    >
                      <Icon className={clsx(
                        'w-5 h-5 mt-0.5',
                        category === cat.value ? 'text-teal-600' : 'text-stone-400'
                      )} />
                      <div>
                        <p className={clsx(
                          'font-medium',
                          category === cat.value ? 'text-teal-700' : 'text-stone-700'
                        )}>{cat.label}</p>
                        <p className="text-xs text-stone-500">{cat.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 1: // System Prompt
        return (
          <div className="space-y-6">
            {/* Templates */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Start from a template (optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PROMPT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-left transition-colors"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-stone-700">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                System Prompt <span className="text-red-400">*</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant who..."
                rows={10}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 resize-none font-mono text-sm"
              />
              <p className="text-xs text-stone-500 mt-1">
                This defines how the AI behaves and responds. Minimum 20 characters.
              </p>
            </div>

            {/* Personality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">Tone</label>
                <div className="space-y-2">
                  {TONES.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setPersonality({ ...personality, tone: tone.value })}
                      className={clsx(
                        'w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all',
                        personality.tone === tone.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      )}
                    >
                      <div>
                        <p className="font-medium text-stone-700">{tone.label}</p>
                        <p className="text-xs text-stone-500">{tone.description}</p>
                      </div>
                      {personality.tone === tone.value && (
                        <Check className="w-5 h-5 text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verbosity */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">Response Length</label>
                <div className="space-y-2">
                  {VERBOSITY.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setPersonality({ ...personality, verbosity: v.value })}
                      className={clsx(
                        'w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all',
                        personality.verbosity === v.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      )}
                    >
                      <div>
                        <p className="font-medium text-stone-700">{v.label}</p>
                        <p className="text-xs text-stone-500">{v.description}</p>
                      </div>
                      {personality.verbosity === v.value && (
                        <Check className="w-5 h-5 text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Creativity Slider */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Creativity Level: {Math.round(personality.creativity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={personality.creativity * 100}
                onChange={(e) =>
                  setPersonality({
                    ...personality,
                    creativity: parseInt(e.target.value) / 100,
                  })
                }
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-xs text-stone-500 mt-1">
                <span>Factual & Precise</span>
                <span>Creative & Varied</span>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">Capabilities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'webSearch', icon: Search, label: 'Web Search' },
                  { key: 'codeExecution', icon: Code, label: 'Code Execution' },
                  { key: 'imageGeneration', icon: ImageIcon, label: 'Image Gen' },
                  { key: 'fileAnalysis', icon: FileText, label: 'File Analysis' },
                  { key: 'voiceChat', icon: Mic, label: 'Voice Chat' },
                  { key: 'computerUse', icon: Monitor, label: 'Computer Use' },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setCapabilities({
                        ...capabilities,
                        [key]: !capabilities[key as keyof PersonaCapabilities],
                      })
                    }
                    className={clsx(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      capabilities[key as keyof PersonaCapabilities]
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    )}
                  >
                    <Icon className={clsx(
                      'w-4 h-4',
                      capabilities[key as keyof PersonaCapabilities] ? 'text-teal-600' : 'text-stone-400'
                    )} />
                    <span className={clsx(
                      'text-sm font-medium',
                      capabilities[key as keyof PersonaCapabilities] ? 'text-teal-700' : 'text-stone-600'
                    )}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Examples
        return (
          <div className="space-y-6">
            {/* Starter Prompts */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Starter Prompts
                <span className="text-stone-400 font-normal ml-2">(Optional)</span>
              </label>
              <p className="text-sm text-stone-500 mb-4">
                Suggestions shown to users when they start a conversation
              </p>
              
              <div className="space-y-3">
                {starterPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => handleUpdateStarterPrompt(index, e.target.value)}
                      placeholder={`e.g., "Help me with..." or "Review my..."`}
                      className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                    {starterPrompts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStarterPrompt(index)}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                {starterPrompts.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddStarterPrompt}
                    className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add another prompt
                  </button>
                )}
              </div>
            </div>

            {/* Sample Responses */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Sample Conversations
                <span className="text-stone-400 font-normal ml-2">(Optional)</span>
              </label>
              <p className="text-sm text-stone-500 mb-4">
                Example exchanges to show users how the persona responds
              </p>

              <div className="space-y-4">
                {sampleResponses.map((sample, index) => (
                  <div key={index} className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-stone-700">Example {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSampleResponse(index)}
                        className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">User message:</label>
                      <input
                        type="text"
                        value={sample.prompt}
                        onChange={(e) => handleUpdateSampleResponse(index, 'prompt', e.target.value)}
                        placeholder="What the user might ask..."
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Persona response:</label>
                      <textarea
                        value={sample.response}
                        onChange={(e) => handleUpdateSampleResponse(index, 'response', e.target.value)}
                        placeholder="How the persona would respond..."
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-teal-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSampleResponse}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add sample conversation
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">Visibility</label>
              <div className="space-y-2">
                {[
                  { value: 'private' as const, icon: Lock, label: 'Private', description: 'Only you can see and use this persona' },
                  { value: 'unlisted' as const, icon: EyeOff, label: 'Unlisted', description: 'Anyone with the link can use it' },
                  { value: 'public' as const, icon: Globe, label: 'Public', description: 'Listed in the public marketplace' },
                ].map(({ value, icon: Icon, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={clsx(
                      'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                      visibility === value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    )}
                  >
                    <Icon className={clsx(
                      'w-5 h-5 mt-0.5',
                      visibility === value ? 'text-teal-600' : 'text-stone-400'
                    )} />
                    <div className="flex-1">
                      <p className="font-medium text-stone-700">{label}</p>
                      <p className="text-xs text-stone-500">{description}</p>
                    </div>
                    {visibility === value && (
                      <Check className="w-5 h-5 text-teal-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Preview
        return (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-stone-50 to-white border border-stone-200 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={clsx(
                  'w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br',
                  avatarUrl ? '' : selectedGradient
                )}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-stone-900">{name || 'Unnamed Persona'}</h3>
                  <p className="text-sm text-stone-500 capitalize">{category}</p>
                </div>
              </div>

              <p className="text-stone-700 mb-6">{description || 'No description provided'}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-stone-100/50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Tone</p>
                  <p className="font-medium text-stone-700 capitalize">{personality.tone}</p>
                </div>
                <div className="bg-stone-100/50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Response Length</p>
                  <p className="font-medium text-stone-700 capitalize">{personality.verbosity}</p>
                </div>
                <div className="bg-stone-100/50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Creativity</p>
                  <p className="font-medium text-stone-700">{Math.round(personality.creativity * 100)}%</p>
                </div>
                <div className="bg-stone-100/50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Capabilities</p>
                  <p className="font-medium text-stone-700">
                    {Object.values(capabilities).filter(Boolean).length} enabled
                  </p>
                </div>
              </div>
            </div>

            {/* System Prompt Preview */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">System Prompt</label>
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono">
                  {systemPrompt || 'No system prompt defined'}
                </pre>
              </div>
            </div>

            {/* Test Chat */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-stone-700">Test Your Persona</label>
                <button
                  type="button"
                  onClick={() => {
                    setTestMessage('');
                    setTestResponse('');
                  }}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
              
              <div className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                {/* Response Area */}
                <div className="min-h-[120px] max-h-[200px] overflow-y-auto p-4">
                  {testResponse ? (
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{testResponse}</p>
                  ) : (
                    <p className="text-sm text-stone-400 italic">
                      Send a test message to see how your persona responds...
                    </p>
                  )}
                </div>
                
                {/* Input */}
                <div className="border-t border-stone-200 p-3 flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    placeholder="Type a test message..."
                    className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-teal-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={!testMessage.trim()}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-stone-200 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <Wand2 className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                {isEditing ? 'Edit Persona' : 'Create Custom Persona'}
              </h2>
              <p className="text-sm text-stone-500">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isAccessible = index <= currentStep || validateStep(index - 1);

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => isAccessible && setCurrentStep(index)}
                    disabled={!isAccessible}
                    className={clsx(
                      'flex flex-col items-center gap-2 transition-all',
                      isActive && 'text-teal-600',
                      isCompleted && 'text-teal-500',
                      !isActive && !isCompleted && 'text-stone-400',
                      !isAccessible && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isActive && 'bg-teal-100 ring-2 ring-teal-500',
                        isCompleted && 'bg-teal-500',
                        !isActive && !isCompleted && 'bg-stone-100'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className={clsx('w-5 h-5', isActive ? 'text-teal-600' : 'text-stone-400')} />
                      )}
                    </div>
                    <div className="text-center hidden sm:block">
                      <span className="text-xs font-medium">{step.title}</span>
                    </div>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div
                      className={clsx(
                        'h-0.5 flex-1 mx-2 transition-colors',
                        isCompleted ? 'bg-teal-500' : 'bg-stone-200'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-between bg-stone-50">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              currentStep === 0
                ? 'text-stone-300 cursor-not-allowed'
                : 'text-stone-600 hover:bg-stone-100'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors',
                  canGoNext
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                )}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !validateStep(0) || !validateStep(1)}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors',
                  !saving && validateStep(0) && validateStep(1)
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEditing ? 'Save Changes' : 'Create Persona'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonaCreator;
