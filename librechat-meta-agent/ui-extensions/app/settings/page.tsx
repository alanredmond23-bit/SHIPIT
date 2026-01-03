'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Zap,
  Cloud,
  Code2,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Shield,
  Cpu,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { CodeViewer, CODE_SECTIONS } from '@/components/CodeViewer';

// Lazy load theme-dependent components to avoid SSR issues
const ThemeToggle = React.lazy(() =>
  import('@/components/ThemeProvider').then((mod) => ({ default: mod.ThemeToggle }))
);

// Safe theme hook that returns defaults during SSR
function useThemeSafe() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

interface APIProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'checking';
  models: string[];
  envVar: string;
  description: string;
}

// Mock environment check (in real app, this would be an API call)
const checkAPIStatus = async (envVar: string): Promise<boolean> => {
  // Simulate API check delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  // In production, this would check if the env var is set server-side
  // For demo, we'll show Anthropic as connected, others as partially configured
  const alwaysConnected = ['ANTHROPIC_API_KEY'];
  const partiallyConnected = ['OPENAI_API_KEY', 'GOOGLE_API_KEY'];

  if (alwaysConnected.includes(envVar)) return true;
  if (partiallyConnected.includes(envVar)) return Math.random() > 0.5;
  return false;
};

export default function SettingsPage() {
  const { theme, toggleTheme, isDark, mounted } = useThemeSafe();
  const [activeTab, setActiveTab] = useState<'api' | 'code' | 'appearance'>('api');
  const [providers, setProviders] = useState<APIProvider[]>([
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: <Zap className="w-5 h-5" />,
      status: 'checking',
      models: ['Claude Opus 4.5', 'Claude Sonnet 4', 'Claude 3.5 Sonnet', 'Claude 3.5 Haiku'],
      envVar: 'ANTHROPIC_API_KEY',
      description: 'Primary AI provider for Claude models',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: <Cloud className="w-5 h-5" />,
      status: 'checking',
      models: ['GPT-4o', 'GPT-4o Mini', 'o1', 'o1 Mini'],
      envVar: 'OPENAI_API_KEY',
      description: 'Deep reasoning with o1 models',
    },
    {
      id: 'google',
      name: 'Google',
      icon: <Globe className="w-5 h-5" />,
      status: 'checking',
      models: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro'],
      envVar: 'GOOGLE_API_KEY',
      description: 'Million-token context with Gemini',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      icon: <Cpu className="w-5 h-5" />,
      status: 'checking',
      models: ['DeepSeek V3', 'DeepSeek R1'],
      envVar: 'DEEPSEEK_API_KEY',
      description: 'Advanced open-source reasoning',
    },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check API status on mount
  useEffect(() => {
    checkAllProviders();
  }, []);

  const checkAllProviders = async () => {
    setIsRefreshing(true);
    const updatedProviders = await Promise.all(
      providers.map(async (provider) => {
        const isConnected = await checkAPIStatus(provider.envVar);
        return {
          ...provider,
          status: isConnected ? 'connected' : 'disconnected',
        } as APIProvider;
      })
    );
    setProviders(updatedProviders);
    setIsRefreshing(false);
  };

  const connectedCount = providers.filter((p) => p.status === 'connected').length;

  const getStatusIcon = (status: APIProvider['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-[var(--text-muted)]" />;
      case 'checking':
        return <AlertCircle className="w-5 h-5 text-[var(--warning)] animate-pulse" />;
    }
  };

  const tabs = [
    { id: 'api' as const, label: 'API Status', icon: Server },
    { id: 'code' as const, label: 'Code Inspector', icon: Code2 },
    { id: 'appearance' as const, label: 'Appearance', icon: isDark ? Moon : Sun },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-0)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          backgroundColor: 'var(--bg-1)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="btn-icon btn-icon-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Configure your Meta Agent experience
            </p>
          </div>
          {mounted && (
            <Suspense fallback={<div className="btn-icon btn-icon-sm" />}>
              <ThemeToggle />
            </Suspense>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl transition-colors ${
                  activeTab === tab.id
                    ? 'text-[var(--accent-500)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--bg-2)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* API Status Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-subtle)' }}
                  >
                    <Shield className="w-6 h-6 text-[var(--accent-500)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      API Connections
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {connectedCount} of {providers.length} providers connected
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkAllProviders}
                  disabled={isRefreshing}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Progress bar */}
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-3)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(connectedCount / providers.length) * 100}%`,
                    backgroundColor: 'var(--accent-500)',
                  }}
                />
              </div>
            </div>

            {/* Provider List */}
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="glass-panel p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        provider.status === 'connected'
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent-500)]'
                          : 'bg-[var(--bg-3)] text-[var(--text-muted)]'
                      }`}
                    >
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {provider.name}
                        </h3>
                        {getStatusIcon(provider.status)}
                      </div>
                      <p
                        className="text-sm truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {provider.description}
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                      {provider.models.slice(0, 2).map((model) => (
                        <span key={model} className="badge text-xs">
                          {model}
                        </span>
                      ))}
                      {provider.models.length > 2 && (
                        <span className="badge text-xs">
                          +{provider.models.length - 2}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                  </div>

                  {/* Mobile models list */}
                  <div className="sm:hidden flex flex-wrap gap-1 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    {provider.models.map((model) => (
                      <span key={model} className="badge text-xs">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Environment Variables Info */}
            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-2)',
                borderColor: 'var(--border-default)',
              }}
            >
              <h3
                className="font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Configure API Keys
              </h3>
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Add environment variables to your <code className="badge">.env.local</code> file:
              </p>
              <div className="code-viewer">
                <pre className="text-sm">
{`ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Code Inspector Tab */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}
                >
                  <Code2 className="w-6 h-6 text-[#A855F7]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Code Inspector
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Explore how features are implemented
                  </p>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Click any section below to view the underlying code. This &quot;glass case&quot; view
                helps you understand how deep reasoning, streaming, and multi-provider routing work.
              </p>
            </div>

            <CodeViewer sections={CODE_SECTIONS} />
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                >
                  {isDark ? (
                    <Moon className="w-6 h-6 text-[var(--accent-500)]" />
                  ) : (
                    <Sun className="w-6 h-6 text-[var(--accent-500)]" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Theme
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Night-Light Teal design system
                  </p>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => isDark || toggleTheme()}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isDark
                      ? 'border-[var(--accent-500)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Moon className="w-5 h-5" style={{ color: isDark ? 'var(--accent-500)' : 'var(--text-muted)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Dark Mode
                    </span>
                  </div>
                  <div
                    className="h-16 rounded-lg flex items-end p-2 gap-1"
                    style={{ backgroundColor: '#0B0F10' }}
                  >
                    <div className="w-8 h-4 rounded" style={{ backgroundColor: '#1FB7B4' }} />
                    <div className="w-12 h-6 rounded" style={{ backgroundColor: '#151D1E' }} />
                    <div className="w-6 h-8 rounded" style={{ backgroundColor: '#1A2324' }} />
                  </div>
                </button>

                <button
                  onClick={() => !isDark || toggleTheme()}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    !isDark
                      ? 'border-[var(--accent-500)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Sun className="w-5 h-5" style={{ color: !isDark ? 'var(--accent-500)' : 'var(--text-muted)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Light Mode
                    </span>
                  </div>
                  <div
                    className="h-16 rounded-lg flex items-end p-2 gap-1"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDED' }}
                  >
                    <div className="w-8 h-4 rounded" style={{ backgroundColor: '#1FB7B4' }} />
                    <div className="w-12 h-6 rounded" style={{ backgroundColor: '#F0F4F4' }} />
                    <div className="w-6 h-8 rounded" style={{ backgroundColor: '#E8EDED' }} />
                  </div>
                </button>
              </div>
            </div>

            {/* Color Palette Preview */}
            <div className="card-elevated">
              <h3
                className="font-medium mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Night-Light Teal Palette
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { name: 'Accent 500', color: '#1FB7B4' },
                  { name: 'Accent 600', color: '#179F9C' },
                  { name: 'Accent 700', color: '#118684' },
                  { name: 'Success', color: '#22C55E' },
                  { name: 'Warning', color: '#F59E0B' },
                  { name: 'Error', color: '#EF4444' },
                ].map((swatch) => (
                  <div key={swatch.name} className="text-center">
                    <div
                      className="w-full aspect-square rounded-xl mb-2"
                      style={{ backgroundColor: swatch.color }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {swatch.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Preview */}
            <div className="card-elevated">
              <h3
                className="font-medium mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Typography
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Heading (600)
                  </span>
                  <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    The quick brown fox
                  </h2>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Body (400-500)
                  </span>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Inter font optimized for screen readability with clean, modern proportions.
                  </p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Numeric (700)
                  </span>
                  <p className="text-3xl font-numeric" style={{ color: 'var(--text-primary)' }}>
                    1,234,567.89
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
