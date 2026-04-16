// ─────────────────────────────────────────────────────────────────────────────
// /HEALTH ROUTE - System status endpoint
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const qdrantService = require('../services/qdrant.service');
const vapiService = require('../services/vapi.service');
const log = require('../config/logger')('HealthRoute');
const env = require('../config/environment');

/**
 * GET /health
 * Quick health check
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/full
 * Detailed system status
 */
router.get('/full', async (req, res) => {
  try {
    const qdrantStatus = await qdrantService.healthCheck();
    const vapiStatus = vapiService.getStatus();

    const systemStatus = {
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services: {
        backend: { status: 'operational' },
        qdrant: qdrantStatus,
        vapi: vapiStatus,
      },
      api: {
        endpoints: [
          'POST /ask',
          'POST /memory',
          'GET /memory/:user_id',
          'GET /health',
          'GET /health/full',
        ],
      },
    };

    res.json(systemStatus);

  } catch (error) {
    log.error('Health check failed', error);
    res.status(500).json({
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;