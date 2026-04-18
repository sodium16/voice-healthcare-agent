// ─────────────────────────────────────────────────────────────────────────────
// /ASK ROUTE (FIXED)
// Extracts language + location, loads user memories, injects all into AI
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const aiService = require('../services/ai.service');
const emergencyService = require('../services/emergency.service');
const qdrantService = require('../services/qdrant.service');
const log = require('../config/logger')('AskRoute');
const { DEFAULT_RESPONSES, HTTP_STATUS } = require('../config/constants');

/**
 * POST /ask
 *
 * Request body: { user_id, query, location?, language? }
 * Response:     { response, actions, emotion }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { user_id, query, location, language } = req.body;

    // ── 1. VALIDATE ──────────────────────────────────────────────────────────

    if (!user_id || !query) {
      log.warn('Invalid request - missing fields', { user_id, query: !!query });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing required fields: user_id, query',
      });
    }

    const queryTrimmed = query.trim();
    if (queryTrimmed.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(DEFAULT_RESPONSES.INVALID_INPUT);
    }

    log.info('Processing query', {
      user_id,
      query: queryTrimmed.substring(0, 50),
      language: language || 'english',
      location: location || 'India',
    });

    // ── 2. EMERGENCY CHECK ────────────────────────────────────────────────────

    const emergency = emergencyService.analyzeQuery(queryTrimmed);

    if (emergency.isEmergency) {
      log.warn('EMERGENCY DETECTED', { user_id, keywords: emergency.keywords });

      qdrantService
        .storeQuery({
          id: Date.now(),
          payload: {
            user_id,
            query: queryTrimmed,
            type: 'emergency',
            timestamp: new Date().toISOString(),
          },
        })
        .catch(err => log.error('Failed to store emergency query', err));

      return res.status(HTTP_STATUS.OK).json(emergencyService.getEmergencyResponse());
    }

    // ── 3. LOAD USER MEMORIES ─────────────────────────────────────────────────
    //
    // getMemoriesAsObject returns e.g. { language: 'hindi', preference: 'slow speech' }
    // We merge the request-level language/location as overrides so explicit
    // values from the frontend always win over stored preferences.

    let memories = {};
    try {
      memories = await qdrantService.getMemoriesAsObject(user_id);
      log.debug('Memories loaded', { user_id, keys: Object.keys(memories) });
    } catch (err) {
      log.warn('Could not load memories, continuing without', err.message);
    }

    // ── 4. RESOLVE LANGUAGE & LOCATION ───────────────────────────────────────
    //
    // Priority: request body > stored memory > default

    const resolvedLanguage =
      language ||
      memories.language ||
      'english';

    const resolvedLocation =
      location ||
      memories.location ||
      'India';

    // ── 5. GENERATE AI RESPONSE ───────────────────────────────────────────────

    const aiResponse = await aiService.generateResponse(queryTrimmed, {
      language: resolvedLanguage,
      location: resolvedLocation,
      memories,
      emotion: emergency.isConcern ? 'concern' : 'calm', // pre-hint emotion
    });

    // Override emotion to concern if keyword analysis says so
    if (emergency.isConcern) {
      aiResponse.emotion = 'concern';
    }

    log.info('Response generated', {
      user_id,
      emotion: aiResponse.emotion,
      actionCount: aiResponse.actions.length,
    });

    // ── 6. STORE INTERACTION (async, don't await) ─────────────────────────────

    qdrantService
      .storeQuery({
        id: Date.now(),
        payload: {
          user_id,
          query: queryTrimmed,
          location: resolvedLocation,
          language: resolvedLanguage,
          emotion: aiResponse.emotion,
          timestamp: new Date().toISOString(),
        },
      })
      .catch(err => log.error('Failed to store query', err));

    // ── 7. RESPOND ────────────────────────────────────────────────────────────

    const duration = Date.now() - startTime;
    log.apiCall('POST', '/ask', HTTP_STATUS.OK, duration);

    res.status(HTTP_STATUS.OK).json(aiResponse);
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Request failed', error);
    log.apiCall('POST', '/ask', HTTP_STATUS.INTERNAL_ERROR, duration);

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;