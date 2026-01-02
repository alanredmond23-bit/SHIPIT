'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import DeepResearch from '@/components/Research/DeepResearch';

export default function ResearchPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
          <DeepResearch />
        </div>
      </MainContent>
    </>
  );
}
