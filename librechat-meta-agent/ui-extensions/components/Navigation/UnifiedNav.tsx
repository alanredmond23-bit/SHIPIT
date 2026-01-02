'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons as SVG components for zero dependencies
const Icons = {
  Home: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Chat: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Brain: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Research: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Image: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Video: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Mic: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  Computer: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Google: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  Tools: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Memory: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

interface NavItem {
  name: string;
  href: string;
  icon: keyof typeof Icons;
  description: string;
  badge?: string;
  color: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: 'Home', description: 'Overview & stats', color: 'text-blue-400' },
  { name: 'Chat', href: '/chat', icon: 'Chat', description: 'AI conversation', color: 'text-green-400' },
  { name: 'Thinking', href: '/thinking', icon: 'Brain', description: 'Extended reasoning', badge: 'NEW', color: 'text-purple-400' },
  { name: 'Research', href: '/research', icon: 'Research', description: 'Deep research', badge: 'NEW', color: 'text-cyan-400' },
];

const createNavItems: NavItem[] = [
  { name: 'Images', href: '/images', icon: 'Image', description: 'Generate images', color: 'text-pink-400' },
  { name: 'Videos', href: '/videos', icon: 'Video', description: 'Generate videos', badge: 'NEW', color: 'text-red-400' },
  { name: 'Voice', href: '/voice', icon: 'Mic', description: 'Voice chat', badge: 'NEW', color: 'text-orange-400' },
];

const toolsNavItems: NavItem[] = [
  { name: 'Computer', href: '/computer', icon: 'Computer', description: 'Browser control', badge: 'NEW', color: 'text-indigo-400' },
  { name: 'Personas', href: '/personas', icon: 'Users', description: 'Custom GPTs', badge: 'NEW', color: 'text-yellow-400' },
  { name: 'Tasks', href: '/tasks', icon: 'Calendar', description: 'Automation', badge: 'NEW', color: 'text-teal-400' },
  { name: 'Workspace', href: '/workspace', icon: 'Google', description: 'Google apps', badge: 'NEW', color: 'text-emerald-400' },
  { name: 'Memory', href: '/memory', icon: 'Memory', description: 'Saved context', color: 'text-violet-400' },
  { name: 'Tools', href: '/tools', icon: 'Tools', description: 'MCP & more', color: 'text-slate-400' },
];

export function UnifiedNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const renderNavItem = (item: NavItem) => {
    const Icon = Icons[item.icon];
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
          ${isActive
            ? 'bg-white/10 shadow-lg'
            : 'hover:bg-white/5'
          }
        `}
      >
        <div className={`${item.color} ${isActive ? 'scale-110' : ''} transition-transform`}>
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
              {item.name}
            </span>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{item.description}</p>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Icons.Brain />
            </div>
            <span className="font-bold text-lg">Meta Agent</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isOpen ? <Icons.Close /> : <Icons.Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-slate-900/95 backdrop-blur-lg border-r border-slate-800 z-50
        transform transition-transform duration-300 ease-out
        lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="hidden lg:flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Icons.Brain />
          </div>
          <div>
            <h1 className="font-bold text-lg">Meta Agent</h1>
            <p className="text-xs text-slate-500">AI-Powered Assistant</p>
          </div>
        </div>

        {/* Nav Content */}
        <nav className="h-[calc(100%-4rem)] lg:h-[calc(100%-4rem)] overflow-y-auto py-4 px-3 mt-14 lg:mt-0">
          {/* Main Section */}
          <div className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Main
            </h3>
            <div className="space-y-1">
              {mainNavItems.map(renderNavItem)}
            </div>
          </div>

          {/* Create Section */}
          <div className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Create
            </h3>
            <div className="space-y-1">
              {createNavItems.map(renderNavItem)}
            </div>
          </div>

          {/* Tools Section */}
          <div className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tools
            </h3>
            <div className="space-y-1">
              {toolsNavItems.map(renderNavItem)}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mx-3 mt-6 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700">
            <h4 className="font-medium text-sm mb-3">Today's Usage</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-purple-400">247</p>
                <p className="text-xs text-slate-500">Messages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400">12</p>
                <p className="text-xs text-slate-500">Research</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-400">34</p>
                <p className="text-xs text-slate-500">Images</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">8</p>
                <p className="text-xs text-slate-500">Tasks</p>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
        <div className="flex justify-around py-2">
          {[mainNavItems[0], mainNavItems[1], mainNavItems[2], createNavItems[0], toolsNavItems[1]].map((item) => {
            const Icon = Icons[item.icon];
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors
                  ${isActive ? item.color : 'text-slate-500'}
                `}
              >
                <Icon />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="lg:ml-72 min-h-screen pt-14 lg:pt-0 pb-20 lg:pb-0">
      {children}
    </main>
  );
}
