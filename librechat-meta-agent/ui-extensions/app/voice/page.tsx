'use client';

import { VoiceChat } from '@/components/Voice';

/**
 * Voice Chat Demo Page
 */
export default function VoicePage() {
  return (
    <div className="h-screen">
      <VoiceChat
        apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/voice'}
        userId="demo-user"
        initialConfig={{
          ttsProvider: 'openai',
          voice: 'alloy',
          language: 'en',
          responseStyle: 'conversational',
          interruptSensitivity: 'medium',
        }}
        onSessionStart={(sessionId) => {
          console.log('Voice session started:', sessionId);
        }}
        onSessionEnd={(sessionId, metrics) => {
          console.log('Voice session ended:', sessionId, metrics);
        }}
      />
    </div>
  );
}
