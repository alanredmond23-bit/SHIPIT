'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Moon,
  Sun,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SettingsTabs, SettingsTab, SETTINGS_TABS } from '@/components/Settings/SettingsTabs';

// Lazy load components (they may not exist yet)
const CompetitorDashboard = React.lazy(() =>
  import('@/components/Settings/CompetitorDashboard').catch(() => ({ default: PlaceholderPanel }))
);
const ModelParameters = React.lazy(() =>
  import('@/components/Settings/ModelParameters').catch(() => ({ default: PlaceholderPanel }))
);
const ReasoningControls = React.lazy(() =>
  import('@/components/Settings/ReasoningControls').catch(() => ({ default: PlaceholderPanel }))
);
const SearchDepthSlider = React.lazy(() =>
  import('@/components/Settings/SearchDepthSlider').catch(() => ({ default: PlaceholderPanel }))
);
const RAGConfiguration = React.lazy(() =>
  import('@/components/Settings/RAGConfiguration').catch(() => ({ default: PlaceholderPanel }))
);
const AgentYAMLEditor = React.lazy(() =>
  import('@/components/Settings/AgentYAMLEditor').catch(() => ({ default: PlaceholderPanel }))
);
const MCPManager = React.lazy(() =>
  import('@/components/Settings/MCPManager').catch(() => ({ default: PlaceholderPanel }))
);

// Placeholder for components still being built
function PlaceholderPanel({ title = 'Coming Soon' }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-warm-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-warm-400" />
      </div>
      <h3 className="text-lg font-medium text-warm-700 mb-2">{title}</h3>
      <p className="text-sm text-warm-500 max-w-md">
        This feature is being built by our agent swarm. Check back shortly!
      </p>
    </div>
  );
}

// Loading spinner for lazy components
function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
    </div>
  );
}

// Theme hook
function useThemeSafe() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('meta-agent-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('meta-agent-theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return { theme, isDark: theme === 'dark', toggleTheme, mounted };
}

export default function SettingsPageNew() {
  const { isDark, toggleTheme, mounted } = useThemeSafe();
  const [activeTab, setActiveTab] = useState<SettingsTab>('comparison');

  const currentTab = SETTINGS_TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-warm-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-lg bg-warm-100 flex items-center justify-center hover:bg-warm-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-warm-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-warm-900">Settings</h1>
            <p className="text-sm text-warm-500">
              A++ Power User Controls — What competitors hide, we expose
            </p>
          </div>
          {mounted && (
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-warm-100 flex items-center justify-center hover:bg-warm-200 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-warm-600" />
              ) : (
                <Moon className="w-4 h-4 text-warm-600" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 bg-white border border-warm-200 rounded-2xl p-4">
              <SettingsTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                variant="sidebar"
              />
            </div>
          </aside>

          {/* Mobile Tab Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 p-2 z-20">
            <SettingsTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="horizontal"
            />
          </div>

          {/* Content Area */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {/* Tab Header */}
            {currentTab && (
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                    <currentTab.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
                      {currentTab.label}
                      {currentTab.badge && (
                        <span className="text-xs font-semibold bg-teal-500 text-white px-2 py-1 rounded">
                          {currentTab.badge}
                        </span>
                      )}
                    </h2>
                    <p className="text-warm-500">{currentTab.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="bg-white border border-warm-200 rounded-2xl p-6">
              <Suspense fallback={<LoadingPanel />}>
                {activeTab === 'comparison' && <ComparisonContent />}
                {activeTab === 'model' && <ModelControlsContent />}
                {activeTab === 'agents' && <AgentsContent />}
                {activeTab === 'mcp' && <MCPContent />}
                {activeTab === 'skills' && <PlaceholderPanel title="Skills & Plugins" />}
                {activeTab === 'rules' && <RulesContent />}
                {activeTab === 'personalization' && <PlaceholderPanel title="Personalization" />}
                {activeTab === 'memory' && <PlaceholderPanel title="Memory" />}
                {activeTab === 'output' && <OutputContent />}
                {activeTab === 'appearance' && <AppearanceContent isDark={isDark} toggleTheme={toggleTheme} />}
                {activeTab === 'profile' && <PlaceholderPanel title="Profile" />}
                {activeTab === 'advanced' && <AdvancedContent />}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Content Components for each tab
function ComparisonContent() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <CompetitorDashboard />
    </Suspense>
  );
}

function ModelControlsContent() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<LoadingPanel />}>
        <ModelParameters />
      </Suspense>
      <Suspense fallback={<LoadingPanel />}>
        <ReasoningControls />
      </Suspense>
      <Suspense fallback={<LoadingPanel />}>
        <SearchDepthSlider />
      </Suspense>
      <Suspense fallback={<LoadingPanel />}>
        <RAGConfiguration />
      </Suspense>
    </div>
  );
}

function AgentsContent() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <AgentYAMLEditor />
    </Suspense>
  );
}

function MCPContent() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <MCPManager />
    </Suspense>
  );
}

function RulesContent() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
        <h3 className="font-medium text-teal-800 mb-2">Custom Instructions</h3>
        <p className="text-sm text-teal-600 mb-4">
          Like CLAUDE.md — define persistent rules that apply to all conversations.
        </p>
        <textarea
          className="w-full h-64 p-4 border border-warm-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono text-sm"
          placeholder="# Your Custom Rules

## Response Style
- Be concise and direct
- Use bullet points for lists
- Include code examples when relevant

## Expertise Areas
- You are an expert in React, TypeScript, and Next.js
- Prefer functional components over class components

## Formatting
- Use markdown formatting
- Include code blocks with syntax highlighting"
        />
      </div>
    </div>
  );
}

function OutputContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-warm-200 rounded-xl">
          <h4 className="font-medium text-warm-800 mb-2">Default Destination</h4>
          <select className="w-full p-2 border border-warm-200 rounded-lg">
            <option value="chat">Chat Response</option>
            <option value="canvas">Canvas</option>
            <option value="artifact">Artifact</option>
            <option value="file">File Export</option>
          </select>
        </div>
        <div className="p-4 border border-warm-200 rounded-xl">
          <h4 className="font-medium text-warm-800 mb-2">Export Formats</h4>
          <div className="flex flex-wrap gap-2">
            {['Markdown', 'JSON', 'YAML', 'HTML', 'PDF'].map(format => (
              <label key={format} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={['Markdown', 'JSON'].includes(format)} />
                <span className="text-sm">{format}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 border border-warm-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-warm-800">Canvas Settings</h4>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Enable Canvas</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-warm-500 block mb-1">Position</label>
            <select className="w-full p-2 border border-warm-200 rounded-lg">
              <option value="right">Right Panel</option>
              <option value="bottom">Bottom Panel</option>
              <option value="floating">Floating</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-warm-500 block mb-1">Auto-Open</label>
            <select className="w-full p-2 border border-warm-200 rounded-lg">
              <option value="false">Manual</option>
              <option value="true">Automatic</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceContent({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => isDark && toggleTheme()}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            !isDark
              ? 'border-teal-500 bg-teal-50'
              : 'border-warm-200 hover:border-warm-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Sun className={`w-5 h-5 ${!isDark ? 'text-teal-600' : 'text-warm-400'}`} />
            <span className="font-medium text-warm-800">Light Mode</span>
          </div>
          <div className="h-16 rounded-lg bg-white border border-warm-200 flex items-end p-2 gap-1">
            <div className="w-8 h-4 rounded bg-teal-500" />
            <div className="w-12 h-6 rounded bg-warm-100" />
            <div className="w-6 h-8 rounded bg-warm-200" />
          </div>
        </button>

        <button
          onClick={() => !isDark && toggleTheme()}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            isDark
              ? 'border-teal-500 bg-teal-50'
              : 'border-warm-200 hover:border-warm-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Moon className={`w-5 h-5 ${isDark ? 'text-teal-600' : 'text-warm-400'}`} />
            <span className="font-medium text-warm-800">Dark Mode</span>
          </div>
          <div className="h-16 rounded-lg bg-slate-900 flex items-end p-2 gap-1">
            <div className="w-8 h-4 rounded bg-teal-500" />
            <div className="w-12 h-6 rounded bg-slate-700" />
            <div className="w-6 h-8 rounded bg-slate-800" />
          </div>
        </button>
      </div>

      {/* Color Palette */}
      <div>
        <h4 className="font-medium text-warm-800 mb-4">Night-Light Teal Palette</h4>
        <div className="grid grid-cols-6 gap-3">
          {[
            { name: 'Teal 500', color: '#1FB7B4' },
            { name: 'Teal 600', color: '#179F9C' },
            { name: 'Teal 700', color: '#118684' },
            { name: 'Success', color: '#22C55E' },
            { name: 'Warning', color: '#F59E0B' },
            { name: 'Error', color: '#EF4444' },
          ].map((swatch) => (
            <div key={swatch.name} className="text-center">
              <div
                className="w-full aspect-square rounded-xl mb-2"
                style={{ backgroundColor: swatch.color }}
              />
              <span className="text-xs text-warm-500">{swatch.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancedContent() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <h4 className="font-medium text-amber-800 mb-2">API Keys</h4>
        <p className="text-sm text-amber-600 mb-4">
          Configure API keys in your environment variables for security.
        </p>
        <pre className="bg-amber-100 p-3 rounded-lg text-xs overflow-x-auto">
{`# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...`}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-warm-200 rounded-xl">
          <h4 className="font-medium text-warm-800 mb-2">Privacy</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span className="text-sm">Store conversation history locally</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span className="text-sm">Send analytics data</span>
            </label>
          </div>
        </div>
        <div className="p-4 border border-warm-200 rounded-xl">
          <h4 className="font-medium text-warm-800 mb-2">Data Export</h4>
          <button className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
            Export All Settings
          </button>
        </div>
      </div>
    </div>
  );
}
