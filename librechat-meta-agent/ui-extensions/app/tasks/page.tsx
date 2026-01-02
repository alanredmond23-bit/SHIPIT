'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import { TaskScheduler } from '@/components/Tasks';

export default function TasksPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-auto">
          <TaskScheduler />
        </div>
      </MainContent>
    </>
  );
}
