'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import WorkspaceHub from '@/components/GoogleWorkspace/WorkspaceHub';

export default function WorkspacePage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-auto">
          <WorkspaceHub userId="demo-user" />
        </div>
      </MainContent>
    </>
  );
}
