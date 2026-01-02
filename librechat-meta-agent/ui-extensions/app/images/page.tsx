'use client';

import React from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import ImageGenerator from '@/components/ImageGen/ImageGenerator';

export default function ImagesPage() {
  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-auto">
          <ImageGenerator />
        </div>
      </MainContent>
    </>
  );
}
