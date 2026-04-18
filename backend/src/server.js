// ─────────────────────────────────────────────────────────────────────────────
// SERVER STARTUP (FIXED)
// Initialize Qdrant, check Gemini status, start Express server
// ─────────────────────────────────────────────────────────────────────────────

const app = require('./app');
const env = require('./config/environment');
const log = require('./config/logger')('Server');
const qdrantService = require('./services/qdrant.service');
const geminiService = require('./services/gemini.service');

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

    // Check Gemini service status
    log.info('Checking Gemini AI service...');
    const geminiStatus = geminiService.getStatus();
    if (geminiStatus.available) {
      log.info(`✅ Gemini AI ready (Model: ${geminiStatus.model})`);
    } else {
      log.warn('⚠️  Gemini AI not available - falling back to mock responses');
      if (!env.GEMINI_API_KEY) {
        log.warn('   → GEMINI_API_KEY not set in environment variables');
        log.warn('   → Add GEMINI_API_KEY to .env to enable real AI responses');
      }
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      log.info(`✅ Server running on port ${PORT}`);
      log.info('Ready to accept requests');
      log.info('');
      log.info('Available endpoints:');
      log.info('  POST   /ask                    - Health query');
      log.info('  POST   /memory                 - Store memory');
      log.info('  GET    /memory/:user_id       - Retrieve memories (path param)');
      log.info('  GET    /memory?user_id=...    - Retrieve memories (query param)');
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