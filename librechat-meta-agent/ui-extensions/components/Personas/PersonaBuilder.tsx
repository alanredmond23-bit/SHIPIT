'use client';

import React, { useState, useCallback } from 'react';
import {
  Wand2,
  Save,
  Eye,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  MessageSquare,
  Settings,
  Database,
  Mic,
  Lock,
  Globe,
  EyeOff,
  Loader2,
  FileText,
  Code,
  Image,
  Search,
  Zap,
  Monitor,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Persona Builder - Step-by-step wizard for creating custom AI personas
 *
 * Features:
 * - Beautiful step-by-step interface
 * - Avatar upload/selection
 * - Personality configuration
 * - Capability toggles
 * - Knowledge base upload
 * - Voice selection
 * - Live preview
 */

interface PersonalityConfig {
  tone: 'formal' | 'casual' | 'playful' | 'professional' | 'empathetic';
  verbosity: 'concise' | 'balanced' | 'detailed';
  creativity: number;
}

interface CapabilitiesConfig {
  webSearch: boolean;
  codeExecution: boolean;
  imageGeneration: boolean;
  fileAnalysis: boolean;
  voiceChat: boolean;
  computerUse: boolean;
}

interface PersonaBuilderProps {
  apiUrl?: string;
  userId: string;
  onComplete?: (personaId: string) => void;
  onCancel?: () => void;
  initialData?: any;
}

const STEPS = [
  { id: 'basics', title: 'Basics', icon: User },
  { id: 'personality', title: 'Personality', icon: Sparkles },
  { id: 'capabilities', title: 'Capabilities', icon: Zap },
  { id: 'knowledge', title: 'Knowledge', icon: Database },
  { id: 'voice', title: 'Voice', icon: Mic },
  { id: 'settings', title: 'Settings', icon: Settings },
];

const CATEGORIES = [
  'General',
  'Development',
  'Education',
  'Writing',
  'Business',
  'Creative',
  'Science',
  'Health',
  'Other',
];

const STARTER_PROMPT_SUGGESTIONS = [
  'Help me understand...',
  'Can you explain...',
  'What are best practices for...',
  'Review my code',
  'Write a story about...',
];

export default function PersonaBuilder({
  apiUrl = '/api/personas',
  userId,
  onComplete,
  onCancel,
  initialData,
}: PersonaBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '');
  const [systemPrompt, setSystemPrompt] = useState(
    initialData?.system_prompt || ''
  );
  const [starterPrompts, setStarterPrompts] = useState<string[]>(
    initialData?.starter_prompts || ['']
  );

  const [personality, setPersonality] = useState<PersonalityConfig>(
    initialData?.personality || {
      tone: 'professional',
      verbosity: 'balanced',
      creativity: 0.7,
    }
  );

  const [capabilities, setCapabilities] = useState<CapabilitiesConfig>(
    initialData?.capabilities || {
      webSearch: false,
      codeExecution: false,
      imageGeneration: false,
      fileAnalysis: false,
      voiceChat: false,
      computerUse: false,
    }
  );

  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [voiceProvider, setVoiceProvider] = useState('openai');
  const [voiceId, setVoiceId] = useState('alloy');
  const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>(
    'private'
  );

  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Basics
        return name.trim() && description.trim() && systemPrompt.trim();
      case 1: // Personality
        return true;
      case 2: // Capabilities
        return true;
      case 3: // Knowledge
        return true;
      case 4: // Voice
        return true;
      case 5: // Settings
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddStarterPrompt = () => {
    setStarterPrompts([...starterPrompts, '']);
  };

  const handleUpdateStarterPrompt = (index: number, value: string) => {
    const updated = [...starterPrompts];
    updated[index] = value;
    setStarterPrompts(updated);
  };

  const handleRemoveStarterPrompt = (index: number) => {
    setStarterPrompts(starterPrompts.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setKnowledgeFiles([...knowledgeFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setKnowledgeFiles(knowledgeFiles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canGoNext()) return;

    setSaving(true);
    setError(null);

    try {
      // Create persona
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: userId,
          name,
          description,
          category,
          avatar_url: avatarUrl,
          system_prompt: systemPrompt,
          starter_prompts: starterPrompts.filter((p) => p.trim()),
          personality,
          capabilities: {
            web_search: capabilities.webSearch,
            code_execution: capabilities.codeExecution,
            image_generation: capabilities.imageGeneration,
            file_analysis: capabilities.fileAnalysis,
            voice_chat: capabilities.voiceChat,
            computer_use: capabilities.computerUse,
          },
          voice_config:
            capabilities.voiceChat && voiceId
              ? { provider: voiceProvider, voice_id: voiceId }
              : null,
          visibility,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create persona');
      }

      const { data: persona } = await response.json();

      // Upload knowledge files if any
      if (knowledgeFiles.length > 0) {
        const formData = new FormData();
        formData.append('creator_id', userId);
        knowledgeFiles.forEach((file) => {
          formData.append('files', file);
        });

        await fetch(`${apiUrl}/${persona.id}/knowledge`, {
          method: 'POST',
          body: formData,
        });
      }

      onComplete?.(persona.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

              {/* Avatar */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-stone-900" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Enter image URL or upload..."
                      className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Paste an image URL or upload a file
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Persona Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Code Reviewer, Study Buddy, Creative Writer"
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this persona does and how it helps users..."
                  rows={3}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* System Prompt */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  System Prompt <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant who..."
                  rows={6}
                  className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-stone-500 mt-1">
                  This defines how the AI behaves and responds
                </p>
              </div>

              {/* Starter Prompts */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Starter Prompts (Optional)
                </label>
                {starterPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => handleUpdateStarterPrompt(index, e.target.value)}
                      placeholder="e.g., Help me review this code..."
                      className="flex-1 px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                    />
                    {starterPrompts.length > 1 && (
                      <button
                        onClick={() => handleRemoveStarterPrompt(index)}
                        className="p-2 hover:bg-stone-200 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {starterPrompts.length < 5 && (
                  <button
                    onClick={handleAddStarterPrompt}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    + Add another prompt
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 1: // Personality
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Configure Personality</h3>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium mb-3">Tone</label>
              <div className="grid grid-cols-2 gap-3">
                {(['formal', 'casual', 'playful', 'professional', 'empathetic'] as const).map(
                  (tone) => (
                    <button
                      key={tone}
                      onClick={() => setPersonality({ ...personality, tone })}
                      className={clsx(
                        'px-4 py-3 rounded-lg border-2 transition-all text-left',
                        personality.tone === tone
                          ? 'border-indigo-500 bg-indigo-500/20'
                          : 'border-stone-200 hover:border-stone-300'
                      )}
                    >
                      <div className="font-medium capitalize">{tone}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        {tone === 'formal' && 'Professional and respectful'}
                        {tone === 'casual' && 'Friendly and relaxed'}
                        {tone === 'playful' && 'Fun and lighthearted'}
                        {tone === 'professional' && 'Business-like and efficient'}
                        {tone === 'empathetic' && 'Understanding and caring'}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Verbosity */}
            <div>
              <label className="block text-sm font-medium mb-3">Response Length</label>
              <div className="grid grid-cols-3 gap-3">
                {(['concise', 'balanced', 'detailed'] as const).map((verbosity) => (
                  <button
                    key={verbosity}
                    onClick={() => setPersonality({ ...personality, verbosity })}
                    className={clsx(
                      'px-4 py-3 rounded-lg border-2 transition-all',
                      personality.verbosity === verbosity
                        ? 'border-indigo-500 bg-indigo-500/20'
                        : 'border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <div className="font-medium capitalize">{verbosity}</div>
                    <div className="text-xs text-stone-500 mt-1">
                      {verbosity === 'concise' && 'Brief responses'}
                      {verbosity === 'balanced' && 'Moderate detail'}
                      {verbosity === 'detailed' && 'Thorough explanations'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity */}
            <div>
              <label className="block text-sm font-medium mb-3">
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
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-stone-500 mt-1">
                <span>Factual & Precise</span>
                <span>Creative & Varied</span>
              </div>
            </div>
          </div>
        );

      case 2: // Capabilities
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Enable Capabilities</h3>
            <p className="text-sm text-stone-500 mb-6">
              Choose which features this persona can use
            </p>

            <div className="grid gap-3">
              {[
                {
                  key: 'webSearch',
                  icon: Search,
                  label: 'Web Search',
                  description: 'Search the internet for current information',
                },
                {
                  key: 'codeExecution',
                  icon: Code,
                  label: 'Code Execution',
                  description: 'Run and test code snippets',
                },
                {
                  key: 'imageGeneration',
                  icon: Image,
                  label: 'Image Generation',
                  description: 'Create images from descriptions',
                },
                {
                  key: 'fileAnalysis',
                  icon: FileText,
                  label: 'File Analysis',
                  description: 'Analyze uploaded documents and files',
                },
                {
                  key: 'voiceChat',
                  icon: Mic,
                  label: 'Voice Chat',
                  description: 'Enable voice conversations',
                },
                {
                  key: 'computerUse',
                  icon: Monitor,
                  label: 'Computer Use',
                  description: 'Interact with computer interfaces (advanced)',
                },
              ].map(({ key, icon: Icon, label, description }) => (
                <button
                  key={key}
                  onClick={() =>
                    setCapabilities({
                      ...capabilities,
                      [key]: !capabilities[key as keyof CapabilitiesConfig],
                    })
                  }
                  className={clsx(
                    'flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                    capabilities[key as keyof CapabilitiesConfig]
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-stone-200 hover:border-stone-300'
                  )}
                >
                  <div
                    className={clsx(
                      'p-2 rounded-lg',
                      capabilities[key as keyof CapabilitiesConfig]
                        ? 'bg-indigo-500/30'
                        : 'bg-stone-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{label}</span>
                      {capabilities[key as keyof CapabilitiesConfig] && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-1">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Knowledge
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Upload Knowledge Base</h3>
            <p className="text-sm text-stone-500 mb-6">
              Upload documents to give your persona specialized knowledge
            </p>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-stone-200 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                id="knowledge-upload"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.txt,.md,.json,.csv,.docx,.xlsx"
              />
              <label
                htmlFor="knowledge-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-stone-400 mb-3" />
                <p className="font-medium mb-1">Click to upload files</p>
                <p className="text-sm text-stone-500">
                  PDF, TXT, MD, JSON, CSV, DOCX, XLSX (max 50MB each)
                </p>
              </label>
            </div>

            {/* Uploaded Files */}
            {knowledgeFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Uploaded Files ({knowledgeFiles.length})</h4>
                {knowledgeFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-stone-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-stone-500" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-stone-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 hover:bg-stone-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4: // Voice
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Voice Configuration</h3>

            {!capabilities.voiceChat ? (
              <div className="bg-stone-100 rounded-lg p-6 text-center">
                <Mic className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-500 mb-4">
                  Voice chat is not enabled for this persona
                </p>
                <button
                  onClick={() => setCapabilities({ ...capabilities, voiceChat: true })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Enable Voice Chat
                </button>
              </div>
            ) : (
              <>
                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium mb-2">Voice Provider</label>
                  <select
                    value={voiceProvider}
                    onChange={(e) => setVoiceProvider(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="playht">PlayHT</option>
                  </select>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Voice</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-100 rounded-lg border border-stone-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="alloy">Alloy (Neutral)</option>
                    <option value="echo">Echo (Male)</option>
                    <option value="fable">Fable (British)</option>
                    <option value="onyx">Onyx (Deep)</option>
                    <option value="nova">Nova (Female)</option>
                    <option value="shimmer">Shimmer (Soft)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        );

      case 5: // Settings
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Privacy & Settings</h3>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-3">Visibility</label>
              <div className="space-y-3">
                {[
                  {
                    value: 'private',
                    icon: Lock,
                    label: 'Private',
                    description: 'Only you can see and use this persona',
                  },
                  {
                    value: 'unlisted',
                    icon: EyeOff,
                    label: 'Unlisted',
                    description: 'Anyone with the link can use it',
                  },
                  {
                    value: 'public',
                    icon: Globe,
                    label: 'Public',
                    description: 'Listed in the public marketplace',
                  },
                ].map(({ value, icon: Icon, label, description }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value as any)}
                    className={clsx(
                      'w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                      visibility === value
                        ? 'border-indigo-500 bg-indigo-500/20'
                        : 'border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'p-2 rounded-lg',
                        visibility === value ? 'bg-indigo-500/30' : 'bg-stone-100'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {visibility === value && <Check className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-sm text-stone-500 mt-1">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-stone-100/50 rounded-lg p-6 space-y-3">
              <h4 className="font-medium">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Name:</span>
                  <span className="font-medium">{name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Category:</span>
                  <span className="font-medium capitalize">{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Capabilities:</span>
                  <span className="font-medium">
                    {Object.values(capabilities).filter(Boolean).length} enabled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Knowledge Files:</span>
                  <span className="font-medium">{knowledgeFiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Visibility:</span>
                  <span className="font-medium capitalize">{visibility}</span>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-xl">
              <Wand2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create Custom Persona</h2>
              <p className="text-sm text-stone-500">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-stone-200">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={clsx(
                      'flex flex-col items-center gap-2 transition-all',
                      isActive && 'text-indigo-400',
                      isCompleted && 'text-green-400',
                      index > currentStep && 'text-stone-400 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isActive && 'bg-indigo-600/30 ring-2 ring-indigo-500',
                        isCompleted && 'bg-green-600/30',
                        !isActive && !isCompleted && 'bg-stone-100'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div
                      className={clsx(
                        'h-0.5 flex-1 mx-2 transition-colors',
                        isCompleted ? 'bg-green-500' : 'bg-stone-200'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-container">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              currentStep === 0
                ? 'text-stone-400 cursor-not-allowed'
                : 'text-stone-700 hover:bg-stone-100'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <Eye className="w-5 h-5" />
              Preview
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2 rounded-lg transition-colors',
                  canGoNext()
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                )}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canGoNext() || saving}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2 rounded-lg transition-colors',
                  canGoNext() && !saving
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create Persona
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
