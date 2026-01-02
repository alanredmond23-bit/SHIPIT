'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { ComputerUse } from '@/components/Computer';

export default function ComputerPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
          <ComputerUse
            userId="demo-user"
            onSessionStart={(id) => console.log('Session started:', id)}
            onSessionEnd={() => console.log('Session ended')}
          />
        </div>
      </MainContent>
    </>
  );
}
