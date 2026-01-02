'use client';

import React, { useState } from 'react';
import { UnifiedNav, MainContent } from '@/components/Navigation/UnifiedNav';
import WorkflowBuilder from '@/components/WorkflowBuilder';

export default function WorkflowsPage() {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = (workflow: any) => {
    // In production, this would save to the backend
    console.log('Saving workflow:', workflow);
    setSavedMessage(`Workflow "${workflow.name}" saved successfully!`);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleRun = (workflowId: string) => {
    // In production, this would trigger workflow execution
    console.log('Running workflow:', workflowId);
    alert('Workflow execution started! (Demo mode)');
  };

  return (
    <>
      <UnifiedNav />
      <MainContent>
        <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
          {/* Success message */}
          {savedMessage && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {savedMessage}
            </div>
          )}

          {/* Workflow Builder */}
          <div className="flex-1">
            <WorkflowBuilder
              onSave={handleSave}
              onRun={handleRun}
            />
          </div>
        </div>
      </MainContent>
    </>
  );
}
