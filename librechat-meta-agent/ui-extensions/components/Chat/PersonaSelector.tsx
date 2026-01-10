'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Sparkles,
  User,
  Search,
  Clock,
  Plus,
  ExternalLink,
  Code,
  FileText,
  Mic,
  Monitor,
  Image as ImageIcon,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import type { Persona, PersonaCategory } from '@/hooks/usePersonas';

/**
 * PersonaSelector - Dropdown in chat header for quick persona switching
 * 
 * Features:
 * - Show current active persona
 * - Recent personas list
 * - Search personas
 * - Quick access to all personas page
 * - Compact and minimal design
 */

interface PersonaSelectorProps {
  personas: Persona[];
  activePersona: Persona | null;
  recentPersonas?: Persona[];
  onSelectPersona: (persona: Persona) => void;
  onClearPersona?: () => void;
  compact?: boolean;
  className?: string;
}

// Category colors
const CATEGORY_COLORS: Record<PersonaCategory, string> = {
  coding: 'from-blue-500 to-cyan-500',
  writing: 'from-emerald-500 to-teal-500',
  research: 'from-violet-500 to-purple-500',
  general: 'from-slate-500 to-zinc-500',
  custom: 'from-teal-500 to-cyan-500',
  education: 'from-amber-500 to-orange-500',
  business: 'from-indigo-500 to-blue-600',
  creative: 'from-pink-500 to-rose-500',
  science: 'from-cyan-500 to-blue-500',
  health: 'from-red-500 to-rose-500',
};

// Get capability icon
const getCapabilityIcon = (capabilities: Persona['capabilities']) => {
  if (capabilities.codeExecution) return Code;
  if (capabilities.imageGeneration) return ImageIcon;
  if (capabilities.voiceChat) return Mic;
  if (capabilities.fileAnalysis) return FileText;
  if (capabilities.computerUse) return Monitor;
  if (capabilities.webSearch) return Search;
  return Sparkles;
};

export function PersonaSelector({
  personas,
  activePersona,
  recentPersonas = [],
  onSelectPersona,
  onClearPersona,
  compact = false,
  className,
}: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter personas by search query
  const filteredPersonas = searchQuery
    ? personas.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : personas;

  // Get gradient for persona
  const getGradient = (persona: Persona) => {
    if (persona.avatarGradient) return persona.avatarGradient;
    return CATEGORY_COLORS[persona.category] || CATEGORY_COLORS.general;
  };

  // Handle persona selection
  const handleSelect = (persona: Persona) => {
    onSelectPersona(persona);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Get capability badge count
  const getCapabilityCount = (persona: Persona) => {
    return Object.values(persona.capabilities).filter(Boolean).length;
  };

  if (compact) {
    return (
      <div ref={dropdownRef} className={clsx('relative', className)}>
        {/* Compact Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
            activePersona
              ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          )}
        >
          {activePersona ? (
            <>
              <div className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br',
                getGradient(activePersona)
              )}>
                {activePersona.avatarUrl ? (
                  <img src={activePersona.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-sm font-medium truncate max-w-[100px]">
                {activePersona.name}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Default</span>
            </>
          )}
          <ChevronDown className={clsx(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50">
            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search personas..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Clear / Default option */}
            {activePersona && onClearPersona && (
              <>
                <button
                  onClick={() => {
                    onClearPersona();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-stone-50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700">Default Assistant</p>
                    <p className="text-xs text-stone-500">Use without a specific persona</p>
                  </div>
                </button>
                <div className="h-px bg-stone-100 mx-3 my-1" />
              </>
            )}

            {/* Recent Personas */}
            {recentPersonas.length > 0 && !searchQuery && (
              <>
                <div className="px-4 py-1.5">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recent</p>
                </div>
                {recentPersonas.slice(0, 3).map((persona) => (
                  <PersonaOption
                    key={persona.id}
                    persona={persona}
                    isActive={activePersona?.id === persona.id}
                    onSelect={() => handleSelect(persona)}
                    getGradient={getGradient}
                  />
                ))}
                <div className="h-px bg-stone-100 mx-3 my-1" />
              </>
            )}

            {/* All / Filtered Personas */}
            <div className="max-h-60 overflow-y-auto">
              {!searchQuery && (
                <div className="px-4 py-1.5">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">All Personas</p>
                </div>
              )}
              {filteredPersonas.length > 0 ? (
                filteredPersonas.slice(0, 10).map((persona) => (
                  <PersonaOption
                    key={persona.id}
                    persona={persona}
                    isActive={activePersona?.id === persona.id}
                    onSelect={() => handleSelect(persona)}
                    getGradient={getGradient}
                  />
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-stone-500">No personas found</p>
                </div>
              )}
            </div>

            {/* Browse All Link */}
            <div className="h-px bg-stone-100 mx-3 my-1" />
            <Link
              href="/personas"
              className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="w-4 h-4" />
              Browse All Personas
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full-size variant
  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border-2',
          activePersona
            ? 'bg-teal-50 border-teal-200 hover:border-teal-300'
            : 'bg-stone-50 border-stone-200 hover:border-stone-300'
        )}
      >
        {activePersona ? (
          <>
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br',
              getGradient(activePersona)
            )}>
              {activePersona.avatarUrl ? (
                <img src={activePersona.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-stone-900">{activePersona.name}</p>
              <p className="text-xs text-stone-500 capitalize">{activePersona.category}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-stone-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-stone-700">Select Persona</p>
              <p className="text-xs text-stone-500">Choose an AI personality</p>
            </div>
          </>
        )}
        <ChevronDown className={clsx(
          'w-5 h-5 text-stone-400 ml-auto transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 min-w-[320px]">
          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search personas..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Active Persona (if set) */}
          {activePersona && onClearPersona && !searchQuery && (
            <>
              <div className="px-4 py-1.5">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Current</p>
              </div>
              <div className="mx-3 mb-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br',
                    getGradient(activePersona)
                  )}>
                    {activePersona.avatarUrl ? (
                      <img src={activePersona.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900">{activePersona.name}</p>
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <p className="text-xs text-stone-500 truncate">{activePersona.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClearPersona();
                    setIsOpen(false);
                  }}
                  className="mt-2 w-full py-1.5 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-100 rounded-md transition-colors"
                >
                  Clear and use default
                </button>
              </div>
              <div className="h-px bg-stone-100 mx-3 my-1" />
            </>
          )}

          {/* Recent Personas */}
          {recentPersonas.length > 0 && !searchQuery && (
            <>
              <div className="px-4 py-1.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recent</p>
              </div>
              {recentPersonas
                .filter(p => p.id !== activePersona?.id)
                .slice(0, 3)
                .map((persona) => (
                  <PersonaOption
                    key={persona.id}
                    persona={persona}
                    isActive={false}
                    onSelect={() => handleSelect(persona)}
                    getGradient={getGradient}
                    showCapabilities
                  />
                ))}
              <div className="h-px bg-stone-100 mx-3 my-1" />
            </>
          )}

          {/* All / Filtered Personas */}
          <div className="max-h-64 overflow-y-auto">
            {!searchQuery && (
              <div className="px-4 py-1.5">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">All Personas</p>
              </div>
            )}
            {filteredPersonas.length > 0 ? (
              filteredPersonas
                .filter(p => p.id !== activePersona?.id)
                .slice(0, 15)
                .map((persona) => (
                  <PersonaOption
                    key={persona.id}
                    persona={persona}
                    isActive={false}
                    onSelect={() => handleSelect(persona)}
                    getGradient={getGradient}
                    showCapabilities
                  />
                ))
            ) : (
              <div className="px-4 py-8 text-center">
                <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-500">No personas found</p>
                <p className="text-xs text-stone-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="h-px bg-stone-100 mx-3 my-1" />
          <div className="px-3 pt-1 pb-1 flex items-center gap-2">
            <Link
              href="/personas"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="w-4 h-4" />
              Browse All
            </Link>
            <Link
              href="/personas?create=true"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Plus className="w-4 h-4" />
              Create New
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// PersonaOption component
interface PersonaOptionProps {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
  getGradient: (persona: Persona) => string;
  showCapabilities?: boolean;
}

function PersonaOption({ 
  persona, 
  isActive, 
  onSelect, 
  getGradient,
  showCapabilities = false,
}: PersonaOptionProps) {
  const CapIcon = getCapabilityIcon(persona.capabilities);

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isActive
          ? 'bg-teal-50'
          : 'hover:bg-stone-50'
      )}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
        getGradient(persona)
      )}>
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <User className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={clsx(
            'text-sm font-medium truncate',
            isActive ? 'text-teal-700' : 'text-stone-800'
          )}>
            {persona.name}
          </p>
          {persona.isBuiltIn && (
            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              Built-in
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 truncate">{persona.description}</p>
        
        {/* Capability indicators */}
        {showCapabilities && (
          <div className="flex items-center gap-1 mt-1">
            <CapIcon className="w-3 h-3 text-stone-400" />
            <span className="text-[10px] text-stone-400">
              {Object.values(persona.capabilities).filter(Boolean).length} capabilities
            </span>
          </div>
        )}
      </div>

      {/* Active check */}
      {isActive && (
        <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
      )}
    </button>
  );
}

export default PersonaSelector;
