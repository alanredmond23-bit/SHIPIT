'use client';

import React, { useState } from 'react';
import {
  Package,
  Megaphone,
  Users,
  Bot,
  Workflow,
  Plug,
  ArrowRight,
  Check,
  Clock,
  Layers,
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  icon: string;
  color: string;
  phases: any[];
  default_platform?: string;
  suggested_stack?: string[];
  estimated_duration?: string;
  is_featured: boolean;
  use_count: number;
}

interface TemplateSelectorProps {
  templates: ProjectTemplate[];
  onSelectTemplate: (templateId: string) => void;
  onBack: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  package: Package,
  megaphone: Megaphone,
  users: Users,
  bot: Bot,
  workflow: Workflow,
  plug: Plug,
};

export function TemplateSelector({
  templates,
  onSelectTemplate,
  onBack,
}: TemplateSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredTemplates = templates.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'featured') return t.is_featured;
    return t.project_type === filter;
  });

  const projectTypes = [...new Set(templates.map((t) => t.project_type))];

  const handleContinue = () => {
    if (selectedId) {
      onSelectTemplate(selectedId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose a Template
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Select a project template to get started with a structured workflow
        </p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          All Templates
        </button>
        <button
          onClick={() => setFilter('featured')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'featured'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          Featured
        </button>
        {projectTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === type
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = ICON_MAP[template.icon] || Package;
          const isSelected = selectedId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="p-3 rounded-lg shrink-0"
                  style={{ backgroundColor: template.color + '20' }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: template.color }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    {template.is_featured && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {template.phases.length} phases
                    </span>
                    {template.estimated_duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {template.estimated_duration}
                      </span>
                    )}
                    {template.use_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {template.use_count} uses
                      </span>
                    )}
                  </div>

                  {/* Tech Stack */}
                  {template.suggested_stack && template.suggested_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.suggested_stack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                      {template.suggested_stack.length > 4 && (
                        <span className="px-2 py-0.5 text-xs text-gray-400">
                          +{template.suggested_stack.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                <div
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedId}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedId
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TemplateSelector;
