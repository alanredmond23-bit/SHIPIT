'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Folder,
  Code2,
  Search,
  FileText,
  Palette,
  Briefcase,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  ProjectColor,
  ProjectTemplate,
  CreateProjectRequest,
} from '@/types/projects';
import { PROJECT_TEMPLATES, PROJECT_COLORS } from '@/types/projects';

interface ProjectCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateProjectRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const TEMPLATE_ICONS: Record<ProjectTemplate, React.ReactNode> = {
  coding: <Code2 className="w-6 h-6" />,
  research: <Search className="w-6 h-6" />,
  writing: <FileText className="w-6 h-6" />,
  design: <Palette className="w-6 h-6" />,
  business: <Briefcase className="w-6 h-6" />,
  blank: <Folder className="w-6 h-6" />,
};

const EMOJI_OPTIONS = [
  '📁', '💻', '🔬', '✍️', '🎨', '📊', '📚', '💡',
  '🚀', '⚡', '🌟', '🎯', '🔧', '📱', '🌐', '🤖',
  '📝', '🎮', '🎵', '📷', '🎬', '🔐', '💼', '📈',
];

const COLOR_OPTIONS: ProjectColor[] = [
  'teal', 'blue', 'purple', 'pink', 'orange',
  'green', 'red', 'yellow', 'indigo', 'stone',
];

type Step = 'template' | 'details';

export function ProjectCreator({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ProjectCreatorProps) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<ProjectColor>('teal');
  const [instructions, setInstructions] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reset form when closing
  const handleClose = useCallback(() => {
    setStep('template');
    setSelectedTemplate(null);
    setName('');
    setDescription('');
    setIcon(null);
    setColor('teal');
    setInstructions('');
    setShowEmojiPicker(false);
    onClose();
  }, [onClose]);

  // Handle template selection
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    const templateDef = PROJECT_TEMPLATES.find((t) => t.id === template);
    if (templateDef) {
      setIcon(templateDef.icon);
      setColor(templateDef.color);
      setInstructions(templateDef.default_instructions);
    }
    setStep('details');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon || undefined,
      color,
      template: selectedTemplate || undefined,
      system_instructions: instructions.trim() || undefined,
    });

    handleClose();
  };

  if (!isOpen) return null;

  const colorConfig = PROJECT_COLORS[color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-3">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colorConfig.accent)}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
                {step === 'template' ? 'Create New Project' : 'Project Details'}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {step === 'template'
                  ? 'Choose a template to get started'
                  : 'Customize your project settings'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'template' ? (
            /* Template Selection */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PROJECT_TEMPLATES.map((template) => {
                const templateColor = PROJECT_COLORS[template.color];
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={clsx(
                      'flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200',
                      'hover:shadow-lg hover:scale-[1.02]',
                      'border-stone-200 dark:border-stone-700',
                      'hover:border-stone-300 dark:hover:border-stone-600'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-14 h-14 rounded-xl flex items-center justify-center mb-3',
                        templateColor.light,
                        templateColor.text
                      )}
                    >
                      {template.icon}
                    </div>
                    <h3 className="font-medium text-stone-900 dark:text-white text-center">
                      {template.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 text-center mt-1">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Details Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name and Icon */}
              <div className="flex gap-4">
                {/* Icon Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={clsx(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
                      'border-2 border-dashed transition-colors',
                      'border-stone-300 dark:border-stone-600',
                      'hover:border-stone-400 dark:hover:border-stone-500',
                      colorConfig.light
                    )}
                  >
                    {icon || '📁'}
                  </button>

                  {/* Emoji picker dropdown */}
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-lg z-10">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setIcon(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Name Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name..."
                    className={clsx(
                      'w-full px-4 py-2.5 rounded-xl border transition-colors',
                      'bg-white dark:bg-stone-900',
                      'border-stone-300 dark:border-stone-600',
                      'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                      'text-stone-900 dark:text-white placeholder:text-stone-400'
                    )}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your project..."
                  className={clsx(
                    'w-full px-4 py-2.5 rounded-xl border transition-colors',
                    'bg-white dark:bg-stone-900',
                    'border-stone-300 dark:border-stone-600',
                    'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                    'text-stone-900 dark:text-white placeholder:text-stone-400'
                  )}
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const cConfig = PROJECT_COLORS[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={clsx(
                          'w-8 h-8 rounded-lg transition-all duration-200',
                          cConfig.accent,
                          color === c
                            ? 'ring-2 ring-offset-2 ring-stone-400 dark:ring-stone-500 dark:ring-offset-stone-800 scale-110'
                            : 'hover:scale-105'
                        )}
                        title={c.charAt(0).toUpperCase() + c.slice(1)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* System Instructions */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Project Instructions (System Context)
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                  These instructions will be included in every conversation within this project.
                </p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Add any context or instructions that should apply to all conversations..."
                  rows={4}
                  className={clsx(
                    'w-full px-4 py-2.5 rounded-xl border transition-colors resize-none',
                    'bg-white dark:bg-stone-900',
                    'border-stone-300 dark:border-stone-600',
                    'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                    'text-stone-900 dark:text-white placeholder:text-stone-400'
                  )}
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50">
          {step === 'details' && (
            <button
              type="button"
              onClick={() => setStep('template')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>
          )}
          {step === 'template' && <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            {step === 'details' && (
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  colorConfig.accent,
                  'hover:opacity-90'
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Project
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

export default ProjectCreator;
