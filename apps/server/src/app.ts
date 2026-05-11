import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logging.middleware.js';

// Route modules
import { authRoutes } from './modules/auth/auth.routes.js';
import { problemRoutes } from './modules/problems/problem.routes.js';
import { hintRoutes } from './modules/hints/hint.routes.js';
import { executionRoutes } from './modules/execution/execution.routes.js';

const app = express();

// --- Global Middleware ---

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// --- Health Check ---

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'codementor-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- API Routes ---

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/hints', hintRoutes);
app.use('/api/execute', executionRoutes);

// --- Error Handling ---

app.use(errorHandler);

// --- Start Server ---

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 CodeMentor API running on port ${PORT}`);
  logger.info(`   Environment: ${config.NODE_ENV}`);
  logger.info(`   CORS origin: ${config.CORS_ORIGIN}`);
  logger.info(`   AI Service:  ${config.AI_SERVICE_URL}`);
});

export default app;
