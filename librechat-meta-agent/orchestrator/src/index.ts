import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import { setupRoutes } from './api/routes';
import { createDbClient, setPool } from './db';
import { TaskGraphService } from './services/task-graph';
import { SupervisorDispatch } from './services/supervisor-dispatch';
import { ArtifactManager } from './services/artifact-manager';
import { FileProcessorService } from './services/file-processor';
import { MemoryService } from './services/memory-service';
import { EventEmitter } from './events/emitter';
import {
  globalAuthMiddleware,
  PUBLIC_ROUTES,
  AuthenticatedRequest,
} from './middleware/auth';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ============================================================================
// Configuration
// ============================================================================

const config = {
  port: parseInt(process.env.PORT || '3100'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  database: {
    host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
    database: process.env.DATABASE_NAME || process.env.POSTGRES_DB || 'librechat_meta',
    user: process.env.DATABASE_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_HOST?.includes('supabase') || false,
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false', // Enable by default
    jwtSecret: process.env.JWT_SECRET || '',
  },
};

// ============================================================================
// Validation
// ============================================================================

function validateConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check Anthropic API key
  if (!config.anthropicApiKey) {
    warnings.push('ANTHROPIC_API_KEY not set - Claude models will not work');
  }

  // Check Supabase configuration for authentication
  if (config.auth.enabled) {
    if (!config.supabase.url) {
      warnings.push('SUPABASE_URL not set - Supabase authentication will not work');
    }
    if (!config.supabase.serviceRoleKey) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY not set - Supabase authentication will not work');
    }
  }

  // Log warnings
  warnings.forEach(warning => logger.warn(warning));

  // Log errors and exit if critical
  if (errors.length > 0) {
    errors.forEach(error => logger.error(error));
    process.exit(1);
  }
}

// ============================================================================
// Bootstrap Application
// ============================================================================

async function bootstrap() {
  // Validate configuration
  validateConfig();

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // ============================================================================
  // Security Middleware
  // ============================================================================

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...config.corsOrigins],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding from other origins for API
  }));

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
      }, 'Request completed');
    });
    next();
  });

  // ============================================================================
  // Database Connection
  // ============================================================================

  const db = await createDbClient(config.database);
  setPool(db); // Make pool available globally for services

  logger.info({
    host: config.database.host,
    database: config.database.database,
    ssl: config.database.ssl,
  }, 'Database connected');

  // ============================================================================
  // Services Initialization
  // ============================================================================

  const events = new EventEmitter();

  const services = {
    taskGraph: new TaskGraphService(db, events, logger),
    supervisor: new SupervisorDispatch(db, events, logger),
    artifacts: new ArtifactManager(db, logger),
    fileProcessor: new FileProcessorService(logger, process.env.UPLOAD_DIR || './uploads'),
    memory: new MemoryService(db, logger, config.anthropicApiKey),
  };

  logger.info('Services initialized');

  // ============================================================================
  // WebSocket for Real-time Updates
  // ============================================================================

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info({ clientIp }, 'WebSocket client connected');

    const unsubscribe = events.subscribe('*', (event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug({ message }, 'WebSocket message received');
        // Handle WebSocket messages if needed
      } catch (error) {
        logger.warn('Invalid WebSocket message format');
      }
    });

    ws.on('close', () => {
      unsubscribe();
      logger.info({ clientIp }, 'WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error: error.message }, 'WebSocket error');
    });
  });

  // ============================================================================
  // Health Check Endpoint (Public - No Auth Required)
  // ============================================================================

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        websocket: 'ready',
      },
    });
  });

  app.get('/api/health', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      auth: {
        enabled: config.auth.enabled,
        supabase: !!config.supabase.url,
      },
    });
  });

  // ============================================================================
  // API Routes with Authentication
  // ============================================================================

  setupRoutes(app, services, logger, db);

  // ============================================================================
  // 404 Handler
  // ============================================================================

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // ============================================================================
  // Error Handler
  // ============================================================================

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    }, 'Unhandled error');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      },
    });
  });

  // ============================================================================
  // Server Startup
  // ============================================================================

  server.listen(config.port, () => {
    logger.info({
      port: config.port,
      cors: config.corsOrigins,
      auth: config.auth.enabled ? 'enabled' : 'disabled',
      supabase: config.supabase.url ? 'configured' : 'not configured',
      publicRoutes: PUBLIC_ROUTES.length,
    }, `Meta Agent Orchestrator running on port ${config.port}`);

    // Log auth status
    if (config.auth.enabled) {
      if (config.supabase.url && config.supabase.serviceRoleKey) {
        logger.info('Authentication: Supabase JWT validation enabled');
      } else {
        logger.warn('Authentication: Supabase not fully configured - auth may not work');
      }
    } else {
      logger.warn('Authentication: DISABLED - all routes are public');
    }
  });

  // ============================================================================
  // Graceful Shutdown
  // ============================================================================

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    // Close WebSocket connections
    wss.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database pool
    await db.end();
    logger.info('Database pool closed');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================================================
// Start Application
// ============================================================================

bootstrap().catch((err) => {
  logger.error({ error: err.message, stack: err.stack }, 'Failed to start orchestrator');
  process.exit(1);
});
