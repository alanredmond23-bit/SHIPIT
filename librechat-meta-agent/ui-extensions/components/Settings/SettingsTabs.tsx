'use client';

import React from 'react';
import {
  User,
  ScrollText,
  Sparkles,
  Brain,
  Puzzle,
  Bot,
  Server,
  SlidersHorizontal,
  Layout,
  Palette,
  Settings2,
  BarChart3,
  ChevronRight,
} from 'lucide-react';

export type SettingsTab =
  | 'profile'
  | 'rules'
  | 'personalization'
  | 'memory'
  | 'skills'
  | 'agents'
  | 'mcp'
  | 'model'
  | 'output'
  | 'appearance'
  | 'advanced'
  | 'comparison';

interface Tab {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

export const SETTINGS_TABS: Tab[] = [
  {
    id: 'comparison',
    label: 'What We Expose',
    description: 'Compare Meta Agent vs competitors',
    icon: BarChart3,
    badge: 'NEW',
  },
  {
    id: 'model',
    label: 'Model Controls',
    description: 'Temperature, TopK, reasoning depth',
    icon: SlidersHorizontal,
    badge: 'A++',
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'YAML editor & agent marketplace',
    icon: Bot,
  },
  {
    id: 'mcp',
    label: 'MCP & Tools',
    description: '75+ servers, custom functions',
    icon: Server,
  },
  {
    id: 'skills',
    label: 'Skills & Plugins',
    description: 'Install & create skills',
    icon: Puzzle,
  },
  {
    id: 'rules',
    label: 'Rules',
    description: 'Custom instructions like CLAUDE.md',
    icon: ScrollText,
  },
  {
    id: 'personalization',
    label: 'Personalization',
    description: 'Communication style & preferences',
    icon: Sparkles,
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'Auto-extracted preferences',
    icon: Brain,
  },
  {
    id: 'output',
    label: 'Output',
    description: 'Canvas, artifacts, export formats',
    icon: Layout,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, colors, typography',
    icon: Palette,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Name, avatar, timezone',
    icon: User,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'API keys, privacy, data export',
    icon: Settings2,
  },
];

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  variant?: 'sidebar' | 'horizontal';
}

export function SettingsTabs({ activeTab, onTabChange, variant = 'sidebar' }: SettingsTabsProps) {
  if (variant === 'horizontal') {
    return (
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500/10 text-teal-600 border border-teal-200'
                  : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="text-[10px] font-semibold bg-teal-500 text-white px-1.5 py-0.5 rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Sidebar variant
  return (
    <nav className="space-y-1">
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
              isActive
                ? 'bg-teal-500/10 text-teal-600 border border-teal-200'
                : 'text-warm-600 hover:bg-warm-100 hover:text-warm-800'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                isActive ? 'bg-teal-500/20' : 'bg-warm-100 group-hover:bg-warm-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-warm-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] font-semibold bg-teal-500 text-white px-1.5 py-0.5 rounded">
                    {tab.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-warm-400 truncate">{tab.description}</p>
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${
                isActive ? 'text-teal-500' : 'text-warm-300 group-hover:translate-x-0.5'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}

export default SettingsTabs;
