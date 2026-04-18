// ─────────────────────────────────────────────────────────────────────────────
// /MEMORY ROUTE (FIXED - DUPLICATE REMOVED)
// User memory/context endpoint
// Store and retrieve user preferences, history, etc.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const qdrantService = require('../services/qdrant.service');
const log = require('../config/logger')('MemoryRoute');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /memory
 * Store user memory/preference
 * 
 * Request body: { user_id, key, value }
 * Response: { message: "stored" }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { user_id, key, value } = req.body;

    // Validate
    if (!user_id || !key || value === undefined) {
      log.warn('Invalid memory request', { user_id, key, value: !!value });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing required fields: user_id, key, value',
      });
    }

    log.info('Storing memory', { user_id, key });

    // Store in Qdrant
    await qdrantService.storeMemory({
      id: Date.now(),
      vector: new Array(384).fill(0.1), // Mock vector
      payload: {
        user_id,
        key,
        value,
        timestamp: new Date().toISOString(),
      },
    });

    const duration = Date.now() - startTime;
    log.apiCall('POST', '/memory', HTTP_STATUS.OK, duration);

    res.json({ message: 'stored' });

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Memory storage failed', error);
    log.apiCall('POST', '/memory', HTTP_STATUS.INTERNAL_ERROR, duration);

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Failed to store memory',
      message: error.message,
    });
  }
});

/**
 * GET /memory/:user_id
 * Retrieve user memories by path parameter
 * 
 * Example: GET /memory/user_123
 * Response: { user_id: "user_123", language: "english", preference: "normal speech", ... }
 */
router.get('/:user_id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'user_id is required',
      });
    }

    log.info('Retrieving memories by path param', { user_id });

    // Retrieve from Qdrant
    const memories = await qdrantService.getMemories(user_id);

    // Transform to key-value object
    const result = { user_id };
    memories.forEach(mem => {
      result[mem.key] = mem.value;
    });

    const duration = Date.now() - startTime;
    log.apiCall('GET', `/memory/${user_id}`, HTTP_STATUS.OK, duration);

    res.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Memory retrieval failed', error);
    log.apiCall('GET', `/memory/:user_id`, HTTP_STATUS.INTERNAL_ERROR, duration);

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Failed to retrieve memory',
      message: error.message,
    });
  }
});

/**
 * GET /memory?user_id=123
 * Retrieve user memories by query parameter
 * 
 * Example: GET /memory?user_id=user_123
 * Response: { user_id: "user_123", language: "english", preference: "normal speech", ... }
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'user_id is required as query parameter',
      });
    }

    log.info('Retrieving memories by query parameter', { user_id });
    const memories = await qdrantService.getMemories(user_id);

    const result = { user_id };
    memories.forEach(mem => {
      result[mem.key] = mem.value;
    });

    const duration = Date.now() - startTime;
    log.apiCall('GET', `/memory?user_id=${user_id}`, HTTP_STATUS.OK, duration);

    res.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Memory retrieval failed', error);
    log.apiCall('GET', `/memory (query string)`, HTTP_STATUS.INTERNAL_ERROR, duration);

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Failed to retrieve memory',
      message: error.message,
    });
  }
});

module.exports = router;