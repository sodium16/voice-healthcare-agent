// ─────────────────────────────────────────────────────────────────────────────
// /ASK ROUTE - Main health query endpoint
// Handles user queries and returns AI-generated responses
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const aiService = require('../services/ai.service');
const emergencyService = require('../services/emergency.service');
const qdrantService = require('../services/qdrant.service');
const log = require('../config/logger')('AskRoute');
const { API_CONTRACT, DEFAULT_RESPONSES, HTTP_STATUS } = require('../config/constants');

/**
 * POST /ask
 * Main endpoint for health queries
 * 
 * Request body: { user_id, query, location? }
 * Response: { response, actions, emotion }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { user_id, query, location } = req.body;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VALIDATE REQUEST
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!user_id || !query) {
      log.warn('Invalid request - missing fields', { user_id, query: !!query });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing required fields: user_id, query',
        suggestion: 'Check API contract in docs/api-contract.md',
      });
    }

    const queryTrimmed = query.trim();
    if (queryTrimmed.length === 0) {
      log.warn('Empty query received', { user_id });
      return res.status(HTTP_STATUS.BAD_REQUEST).json(DEFAULT_RESPONSES.INVALID_INPUT);
    }

    log.info('Processing query', { user_id, query: queryTrimmed.substring(0, 50) });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHECK FOR EMERGENCY
    // ─────────────────────────────────────────────────────────────────────────
    
    const emergency = emergencyService.analyzeQuery(queryTrimmed);
    
    if (emergency.isEmergency) {
      log.warn('EMERGENCY DETECTED', { user_id, keywords: emergency.keywords });
      
      // Store emergency query in memory for audit
      await qdrantService.storeQuery({
        id: Date.now(),
        vector: new Array(384).fill(0.1), // Mock vector
        payload: {
          user_id,
          query: queryTrimmed,
          type: 'emergency',
          timestamp: new Date().toISOString(),
        },
      });

      return res.status(HTTP_STATUS.OK).json(emergencyService.getEmergencyResponse());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. GENERATE AI RESPONSE
    // ─────────────────────────────────────────────────────────────────────────
    
    const aiResponse = await aiService.generateResponse(queryTrimmed);

    // Check if concern was detected
    if (emergency.isConcern) {
      log.info('Concern detected', { user_id, keywords: emergency.keywords });
      aiResponse.emotion = 'concern';
    }

    log.info('Response generated', { 
      user_id, 
      emotion: aiResponse.emotion,
      actionCount: aiResponse.actions.length 
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. STORE INTERACTION IN MEMORY (ASYNC - don't wait)
    // ─────────────────────────────────────────────────────────────────────────
    
    qdrantService.storeQuery({
      id: Date.now(),
      vector: new Array(384).fill(0.1), // Mock vector
      payload: {
        user_id,
        query: queryTrimmed,
        location: location || 'unknown',
        emotion: aiResponse.emotion,
        timestamp: new Date().toISOString(),
      },
    }).catch(err => log.error('Failed to store query', err));

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SEND RESPONSE
    // ─────────────────────────────────────────────────────────────────────────
    
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