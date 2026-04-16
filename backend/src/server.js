// ─────────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// Initialize Qdrant, start Express server
// ─────────────────────────────────────────────────────────────────────────────

const app = require('./app');
const env = require('./config/environment');
const log = require('./config/logger')('Server');
const qdrantService = require('./services/qdrant.service');

const PORT = env.PORT;

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  try {
    log.info(`Environment: ${env.NODE_ENV}`);
    log.info(`Port: ${PORT}`);
    log.info(`Qdrant URL: ${env.QDRANT_URL}`);
    log.info(`Frontend URL: ${env.FRONTEND_URL}`);

    // Wait for Qdrant to be ready
    log.info('Initializing Qdrant...');
    await qdrantService.initialize();
    log.info('✅ Qdrant initialized');

    // Start Express server
    const server = app.listen(PORT, () => {
      log.info(`✅ Server running on port ${PORT}`);
      log.info('Ready to accept requests');
      log.info('');
      log.info('Available endpoints:');
      log.info('  POST   /ask                    - Health query');
      log.info('  POST   /memory                 - Store memory');
      log.info('  GET    /memory/:user_id       - Retrieve memories');
      log.info('  GET    /health                - Quick health check');
      log.info('  GET    /health/full           - Detailed system status');
      log.info('');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      log.info('Shutting down...');
      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

start();