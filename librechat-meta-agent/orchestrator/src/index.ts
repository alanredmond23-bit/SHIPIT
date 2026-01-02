import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import { setupRoutes } from './api/routes';
import { createDbClient } from './db/client';
import { TaskGraphService } from './services/task-graph';
import { SupervisorDispatch } from './services/supervisor-dispatch';
import { ArtifactManager } from './services/artifact-manager';
import { FileProcessorService } from './services/file-processor';
import { MemoryService } from './services/memory-service';
import { EventEmitter } from './events/emitter';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const config = {
  port: parseInt(process.env.PORT || '3100'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'librechat_meta',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
};

async function bootstrap() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '10mb' }));

  const db = await createDbClient(config.database);
  const events = new EventEmitter();

  const services = {
    taskGraph: new TaskGraphService(db, events, logger),
    supervisor: new SupervisorDispatch(db, events, logger),
    artifacts: new ArtifactManager(db, logger),
    fileProcessor: new FileProcessorService(logger, process.env.UPLOAD_DIR || './uploads'),
    memory: new MemoryService(db, logger, config.anthropicApiKey),
  };

  // WebSocket for real-time updates
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    const unsubscribe = events.subscribe('*', (event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });
    ws.on('close', () => {
      unsubscribe();
      logger.info('WebSocket client disconnected');
    });
  });

  setupRoutes(app, services, logger, db);

  // Health check
  app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  server.listen(config.port, () => {
    logger.info(`Meta Agent Orchestrator running on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start orchestrator:', err);
  process.exit(1);
});
