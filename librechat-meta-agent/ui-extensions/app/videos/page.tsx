'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import VideoGenerator from '@/components/VideoGen/VideoGenerator';

export default function VideosPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-auto">
          <VideoGenerator />
        </div>
      </MainContent>
    </>
  );
}
