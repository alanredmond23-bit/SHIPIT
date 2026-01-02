/**
 * Lightweight Chat Server - No Database Required
 * Just serves LLM chat endpoints with API keys from environment
 */

import express from 'express';
import cors from 'cors';
import { handleChatStream, handleListModels } from './api/chat';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const PORT = parseInt(process.env.PORT || '3100');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001']
}));
app.use(express.json({ limit: '10mb' }));

// Log available API keys (masked)
console.log('\n🔑 API Keys Status:');
console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✓ Set' : '✗ Missing'}`);

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    mode: 'chat-only',
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
    }
  });
});

// Chat API - Stream chat completions
app.post('/api/chat', async (req, res) => {
  await handleChatStream(req, res, logger);
});

// List available models
app.get('/api/models', async (req, res) => {
  await handleListModels(req, res, logger);
});

// Simple memory endpoint (in-memory for now)
const memoryStore: Record<string, any[]> = {};

app.get('/api/memory', (req, res) => {
  const userId = req.query.userId as string || 'default';
  res.json({ data: memoryStore[userId] || [] });
});

app.post('/api/memory', (req, res) => {
  const userId = req.body.userId || 'default';
  if (!memoryStore[userId]) memoryStore[userId] = [];
  memoryStore[userId].push({ ...req.body, timestamp: new Date().toISOString() });
  res.status(201).json({ data: req.body });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Meta Agent Chat Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/chat - Stream chat completions`);
  console.log(`   GET  /api/models - List available models`);
  console.log(`   GET  /health - Health check\n`);
});
