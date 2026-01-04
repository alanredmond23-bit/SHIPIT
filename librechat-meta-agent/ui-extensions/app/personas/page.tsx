'use client';

import React, { useState } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { PersonaExplorer, PersonaBuilder, PersonaChat } from '@/components/Personas';

type View = 'explore' | 'create' | 'chat';

export default function PersonasPage() {
  const [view, setView] = useState<View>('explore');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const handleSelectPersona = (id: string) => {
    setSelectedPersonaId(id);
    setView('chat');
  };

  const handleCreateComplete = (id: string) => {
    setSelectedPersonaId(id);
    setView('chat');
  };

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
          {/* Tab Bar */}
          <div className="flex border-b border-stone-200 bg-white/50">
            <button
              onClick={() => setView('explore')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'explore'
                  ? 'text-stone-900 border-b-2 border-teal-500'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Explore Personas
            </button>
            <button
              onClick={() => setView('create')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'create'
                  ? 'text-stone-900 border-b-2 border-teal-500'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Create New
            </button>
            {selectedPersonaId && (
              <button
                onClick={() => setView('chat')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  view === 'chat'
                    ? 'text-stone-900 border-b-2 border-teal-500'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Chat
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'explore' && (
              <PersonaExplorer
                userId="demo-user"
                onSelectPersona={handleSelectPersona}
              />
            )}
            {view === 'create' && (
              <PersonaBuilder
                userId="demo-user"
                onComplete={handleCreateComplete}
              />
            )}
            {view === 'chat' && selectedPersonaId && (
              <PersonaChat
                personaId={selectedPersonaId}
                userId="demo-user"
              />
            )}
          </div>
        </div>
      </MainContent>
    </>
  );
}
