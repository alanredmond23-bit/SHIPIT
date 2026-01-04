'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Brain,
  Search,
  Palette,
  Video,
  Mic,
  Monitor,
  Users,
  Rocket,
  BarChart3,
  GitBranch,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccentButton } from '@/components/ui/AccentButton';
import { MinimalButton } from '@/components/ui/MinimalButton';
import { GeometricDecor } from '@/components/ui/GeometricDecor';

// Quick actions with minimal design
const quickActions = [
  { title: 'Chat', description: 'Start a conversation', href: '/chat', icon: MessageSquare },
  { title: 'Think', description: 'Extended reasoning', href: '/thinking', icon: Brain },
  { title: 'Research', description: 'Deep analysis', href: '/research', icon: Search },
  { title: 'Create', description: 'Generate images', href: '/images', icon: Palette },
  { title: 'Settings', description: 'API & theme config', href: '/settings', icon: Settings },
];

const features = [
  {
    title: 'Idea to Launch',
    description: 'Transform ideas into shipped products with structured workflows',
    href: '/launch',
    icon: Rocket,
    label: 'NEW',
  },
  {
    title: 'Benchmark Dashboard',
    description: 'Compare AI models with real-time performance data',
    href: '/benchmarks',
    icon: BarChart3,
    label: 'LIVE',
  },
  {
    title: 'Decision Frameworks',
    description: 'Make better decisions with proven frameworks',
    href: '/decisions',
    icon: GitBranch,
    label: 'BETA',
  },
];

const recentActivity = [
  { title: 'Analyzed system architecture', type: 'thinking', time: '15 min ago' },
  { title: 'Researched AI trends 2025', type: 'research', time: '1 hour ago' },
  { title: 'Generated logo concepts', type: 'image', time: '2 hours ago' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    decisions: 0,
    projects: 0,
  });

  useEffect(() => {
    const targets = { conversations: 247, decisions: 18, projects: 6 };
    const duration = 800;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setStats({
        conversations: Math.floor(targets.conversations * eased),
        decisions: Math.floor(targets.decisions * eased),
        projects: Math.floor(targets.projects * eased),
      });

      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Geometric decoration */}
      <GeometricDecor variant="radial" size="lg" position="bottom-left" opacity={0.15} />

      {/* Main content */}
      <div className="relative max-w-7xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
        {/* Hero Section */}
        <div className="mb-16">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-teal-600 text-sm font-medium uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Meta Agent
              </span>

              <h1 className="text-5xl lg:text-6xl font-light text-warm-900 tracking-tight leading-tight mb-6">
                Your AI-powered
                <br />
                <span className="text-warm-500">workspace</span>
              </h1>

              <p className="text-lg text-warm-500 mb-8">
                Extended Thinking, Deep Research, Decision Frameworks,
                and tools to ship products faster.
              </p>

              <div className="flex items-center gap-4">
                <AccentButton href="/chat" icon={<MessageSquare className="w-4 h-4" />}>
                  Start Chat
                </AccentButton>
                <MinimalButton href="/launch">
                  Launch a Project
                </MinimalButton>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="hidden lg:flex flex-col gap-4">
              {[
                { label: 'Conversations', value: stats.conversations, icon: MessageSquare },
                { label: 'Decisions Made', value: stats.decisions, icon: GitBranch },
                { label: 'Projects', value: stats.projects, icon: Rocket },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 bg-white border border-warm-200 rounded-xl px-6 py-4 min-w-[200px]"
                >
                  <stat.icon className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-2xl font-light text-warm-900">{stat.value}</p>
                    <p className="text-sm text-warm-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-warm-500 uppercase tracking-wider">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white border border-warm-200 rounded-xl p-6 hover:border-teal-300 hover:shadow-sm transition-all duration-200"
              >
                <action.icon className="w-6 h-6 text-warm-400 group-hover:text-teal-500 transition-colors mb-4" />
                <h3 className="font-medium text-warm-900 mb-1">{action.title}</h3>
                <p className="text-sm text-warm-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-5 gap-12 mb-16">
          {/* Featured Tools - 3 columns */}
          <div className="lg:col-span-3">
            <SectionHeader
              label="Featured"
              title="Powerful Tools"
              subtitle="Everything you need to make better decisions and ship faster"
            />

            <div className="space-y-4">
              {features.map((feature) => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group flex items-center gap-6 bg-white border border-warm-200 rounded-xl p-6 hover:border-teal-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                    <feature.icon className="w-6 h-6 text-warm-500 group-hover:text-teal-600 transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-warm-900">{feature.title}</h3>
                      {feature.label && (
                        <span className="text-[10px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                          {feature.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-warm-500">{feature.description}</p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-warm-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium text-warm-500 uppercase tracking-wider">Recent Activity</h2>
              <MinimalButton href="/activity" className="text-xs">
                View All
              </MinimalButton>
            </div>

            <div className="bg-white border border-warm-200 rounded-xl overflow-hidden">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 border-b border-warm-100 last:border-0 hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-800 truncate">{activity.title}</p>
                    <p className="text-xs text-warm-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Insight */}
            <div className="mt-6 bg-gradient-to-br from-teal-50 to-warm-50 border border-teal-100 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-warm-900 mb-1">Performance Up</h3>
                  <p className="text-sm text-warm-500 mb-3">
                    Your decision quality improved 23% this week using the frameworks.
                  </p>
                  <MinimalButton href="/analytics" className="text-xs">
                    View Analytics
                  </MinimalButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Overview */}
        <div className="bg-white border border-warm-200 rounded-2xl p-8 lg:p-12">
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="inline-flex items-center gap-2 text-teal-600 text-sm font-medium uppercase tracking-wider mb-2">
                <Zap className="w-3 h-3" />
                Capabilities
              </span>
              <h2 className="text-3xl font-light text-warm-900">
                Everything you need
              </h2>
            </div>
            <MinimalButton href="/features">
              See All Features
            </MinimalButton>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: Brain, label: 'Extended Thinking', desc: 'Visible reasoning' },
              { icon: Search, label: 'Deep Research', desc: 'Multi-source analysis' },
              { icon: Palette, label: 'Image Generation', desc: 'DALL-E, Stability' },
              { icon: Video, label: 'Video Generation', desc: 'Runway, Pika' },
              { icon: Mic, label: 'Voice Chat', desc: 'Real-time voice' },
              { icon: Monitor, label: 'Computer Use', desc: 'Browser control' },
              { icon: Users, label: 'Custom Personas', desc: 'AI personalities' },
              { icon: Clock, label: 'Task Scheduler', desc: 'Automation' },
              { icon: GitBranch, label: 'Frameworks', desc: 'Decision tools' },
              { icon: Rocket, label: 'Idea to Launch', desc: 'Ship products' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-warm-600" />
                </div>
                <p className="text-sm font-medium text-warm-800">{item.label}</p>
                <p className="text-xs text-warm-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
