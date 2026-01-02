'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import ExtendedThinking from '@/components/ThinkingPanel/ExtendedThinking';

export default function ThinkingPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
          <ExtendedThinking
            apiBaseUrl="/api"
            onComplete={(conclusion) => {
              console.log('Thinking complete:', conclusion);
            }}
          />
        </div>
      </MainContent>
    </>
  );
}
