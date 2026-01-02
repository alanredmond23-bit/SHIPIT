'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import Link from 'next/link';

// Quick action cards for dashboard
const quickActions = [
  {
    title: 'Start Chat',
    description: 'Have a conversation with AI',
    href: '/chat',
    icon: '💬',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    title: 'Extended Thinking',
    description: 'Deep reasoning with visible thought process',
    href: '/thinking',
    icon: '🧠',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    title: 'Deep Research',
    description: 'Multi-source research with citations',
    href: '/research',
    icon: '🔍',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'Generate Images',
    description: 'Create images with DALL-E, Stability, or Replicate',
    href: '/images',
    icon: '🎨',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    title: 'Generate Videos',
    description: 'Create videos with Runway, Pika, or Replicate',
    href: '/videos',
    icon: '🎬',
    gradient: 'from-red-500 to-orange-600',
  },
  {
    title: 'Voice Chat',
    description: 'Real-time voice conversation',
    href: '/voice',
    icon: '🎙️',
    gradient: 'from-orange-500 to-amber-600',
  },
  {
    title: 'Computer Use',
    description: 'Control browser with AI',
    href: '/computer',
    icon: '🖥️',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    title: 'Custom Personas',
    description: 'Create and use AI personas',
    href: '/personas',
    icon: '👥',
    gradient: 'from-yellow-500 to-orange-600',
  },
];

const recentActivity = [
  { type: 'chat', title: 'Discussed React optimization', time: '2 min ago', icon: '💬' },
  { type: 'thinking', title: 'Analyzed system architecture', time: '15 min ago', icon: '🧠' },
  { type: 'research', title: 'Researched AI trends 2025', time: '1 hour ago', icon: '🔍' },
  { type: 'image', title: 'Generated logo concepts', time: '2 hours ago', icon: '🎨' },
  { type: 'task', title: 'Scheduled weekly report', time: '3 hours ago', icon: '📅' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    research: 0,
    images: 0,
    videos: 0,
    tasks: 0,
    personas: 0,
  });

  useEffect(() => {
    // Animate stats on load
    const targets = { conversations: 247, research: 12, images: 34, videos: 8, tasks: 15, personas: 5 };
    const duration = 1000;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      setStats({
        conversations: Math.floor(targets.conversations * eased),
        research: Math.floor(targets.research * eased),
        images: Math.floor(targets.images * eased),
        videos: Math.floor(targets.videos * eased),
        tasks: Math.floor(targets.tasks * eased),
        personas: Math.floor(targets.personas * eased),
      });

      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-slate-400">
              Your AI-powered workspace with Extended Thinking, Deep Research, and more.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Conversations', value: stats.conversations, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Research', value: stats.research, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { label: 'Images', value: stats.images, color: 'text-pink-400', bg: 'bg-pink-500/10' },
              { label: 'Videos', value: stats.videos, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Tasks', value: stats.tasks, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Personas', value: stats.personas, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-white/5`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative overflow-hidden rounded-xl p-5 bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative">
                    <div className="text-3xl mb-3">{action.icon}</div>
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-slate-400">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                {recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 border-b border-slate-700 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.title}</p>
                      <p className="text-sm text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Highlights */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Feature Highlights</h2>
              <div className="space-y-4">
                {/* Extended Thinking */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-purple-500/20">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🧠</div>
                    <div>
                      <h3 className="font-semibold mb-1">Extended Thinking</h3>
                      <p className="text-sm text-slate-400 mb-3">
                        See the AI's complete reasoning process. Explore thought branches,
                        self-critique, and confidence scores. Better than Claude's hidden thinking!
                      </p>
                      <Link href="/thinking" className="text-sm text-purple-400 hover:text-purple-300">
                        Try it now →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Deep Research */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-5 border border-cyan-500/20">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🔍</div>
                    <div>
                      <h3 className="font-semibold mb-1">Deep Research</h3>
                      <p className="text-sm text-slate-400 mb-3">
                        Search 10+ sources simultaneously, verify facts across sources,
                        build knowledge graphs. Superior to Gemini's Deep Research!
                      </p>
                      <Link href="/research" className="text-sm text-cyan-400 hover:text-cyan-300">
                        Start researching →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Computer Use */}
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/20">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🖥️</div>
                    <div>
                      <h3 className="font-semibold mb-1">Computer Use</h3>
                      <p className="text-sm text-slate-400 mb-3">
                        Let AI control a browser for you. Navigate, click, fill forms,
                        extract data. Like Claude's computer use but with better UI!
                      </p>
                      <Link href="/computer" className="text-sm text-indigo-400 hover:text-indigo-300">
                        Try computer use →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="mt-8 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h2 className="text-xl font-semibold">Feature Comparison vs Competitors</h2>
              <p className="text-sm text-slate-400 mt-1">We match or exceed all major AI platforms</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Meta Agent</th>
                    <th className="text-center p-4 font-medium text-slate-500">Claude</th>
                    <th className="text-center p-4 font-medium text-slate-500">ChatGPT</th>
                    <th className="text-center p-4 font-medium text-slate-500">Gemini</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Extended Thinking (Visible)', us: true, claude: false, chatgpt: false, gemini: false },
                    { feature: 'Deep Research', us: true, claude: false, chatgpt: false, gemini: true },
                    { feature: 'Image Generation', us: true, claude: false, chatgpt: true, gemini: true },
                    { feature: 'Video Generation', us: true, claude: false, chatgpt: true, gemini: false },
                    { feature: 'Voice Chat', us: true, claude: false, chatgpt: true, gemini: true },
                    { feature: 'Computer Use', us: true, claude: true, chatgpt: false, gemini: false },
                    { feature: 'Custom Personas', us: true, claude: false, chatgpt: true, gemini: true },
                    { feature: 'Scheduled Tasks', us: true, claude: false, chatgpt: true, gemini: false },
                    { feature: 'Google Workspace', us: true, claude: false, chatgpt: false, gemini: true },
                    { feature: 'Multi-Provider', us: true, claude: false, chatgpt: false, gemini: false },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-slate-700/50 last:border-0">
                      <td className="p-4">{row.feature}</td>
                      <td className="text-center p-4">{row.us ? '✅' : '❌'}</td>
                      <td className="text-center p-4 text-slate-500">{row.claude ? '✅' : '❌'}</td>
                      <td className="text-center p-4 text-slate-500">{row.chatgpt ? '✅' : '❌'}</td>
                      <td className="text-center p-4 text-slate-500">{row.gemini ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </MainContent>
    </>
  );
}
