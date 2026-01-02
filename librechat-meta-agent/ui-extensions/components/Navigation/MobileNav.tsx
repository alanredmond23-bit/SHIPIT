'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons
const Icons = {
  Home: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
  Sparkles: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

interface NavItem {
  name: string;
  href: string;
  icon: keyof typeof Icons;
  badge?: string;
  color: string;
}

const navItems: NavItem[] = [
  { name: 'Home', href: '/', icon: 'Home', color: 'text-blue-400' },
  { name: 'Thinking', href: '/thinking', icon: 'Brain', badge: 'NEW', color: 'text-purple-400' },
  { name: 'Research', href: '/research', icon: 'Research', badge: 'NEW', color: 'text-cyan-400' },
  { name: 'Create', href: '/images', icon: 'Sparkles', color: 'text-pink-400' },
  { name: 'More', href: '/tools', icon: 'Menu', color: 'text-slate-400' },
];

export interface MobileNavProps {
  className?: string;
  onItemClick?: (href: string) => void;
}

export function MobileNav({ className = '', onItemClick }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 safe-bottom ${className}`}>
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const Icon = Icons[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onItemClick?.(item.href)}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
                min-w-[60px] min-h-[60px] touch-manipulation active:scale-95
                ${isActive ? `${item.color} bg-white/10` : 'text-slate-500 hover:text-slate-300 active:bg-white/5'}
              `}
            >
              {/* Badge */}
              {item.badge && (
                <span className="absolute top-1 right-1 px-1 py-0.5 text-[8px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                <Icon />
              </div>

              {/* Label */}
              <span className="text-[10px] font-medium truncate max-w-[60px]">
                {item.name}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
