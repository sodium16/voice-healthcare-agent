// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE (FIXED)
// Passes language, location, memories, and emotion through to Gemini
// ─────────────────────────────────────────────────────────────────────────────

const geminiService = require('./gemini.service');
const log = require('../config/logger')('AIService');
const { EMOTION_STATES } = require('../config/constants');

// Fallback mock responses if Gemini API is unavailable
const MOCK_RESPONSES = [
  {
    keywords: ['fever', 'temperature', 'hot', 'chills'],
    response:
      'You may have a fever. Rest and stay hydrated by drinking water or ORS. ' +
      'Stay in a cool environment. Take an over-the-counter fever reduction medicine if needed. ' +
      'Monitor your temperature every 2-3 hours. If fever exceeds 40°C or persists beyond 3 days, consult a doctor immediately.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['headache', 'head', 'migraine'],
    response:
      'For a headache, rest in a quiet, dark room. Stay hydrated and avoid bright screens. ' +
      'Apply a cold compress to your forehead. You can take an over-the-counter pain reliever if needed. ' +
      'If the headache is sudden and very severe, or accompanied by vision changes or stiff neck — seek emergency care immediately.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['cold', 'cough', 'runny', 'nose', 'sneeze'],
    response:
      'Sounds like a common cold. Rest well and drink warm fluids — honey-ginger tea or warm water with lemon can help. ' +
      'Use saline nasal drops or gargle with salt water. Avoid cold drinks and spicy food. ' +
      'If symptoms persist beyond 7-10 days or you develop high fever, consult a doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['nausea', 'vomiting', 'stomach', 'diarrhea', 'loose', 'motion'],
    response:
      'For digestive issues, stay hydrated with ORS or electrolyte drinks. Eat bland foods like rice, banana, toast. ' +
      'Rest your digestive system — avoid dairy, spicy food, and fatty items temporarily. ' +
      'If symptoms persist beyond 2 days or if you see blood, seek medical attention immediately.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['sore', 'throat', 'pain'],
    response:
      'For sore throat, gargle with warm salt water 3-4 times daily. Stay hydrated and rest your voice. ' +
      'Warm honey or lozenges can soothe the throat. Avoid cold foods and drinks. ' +
      'If pain persists, worsens, or you have difficulty swallowing — consult a doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
];

/**
 * Generate AI response
 *
 * @param {string} query
 * @param {object} options - { language, location, memories, emotion }
 * @returns {Promise<{response, actions, emotion}>}
 */
async function generateResponse(query, options = {}) {
  log.info('Generating response', {
    query: query.substring(0, 50),
    language: options.language,
    location: options.location,
    emotion: options.emotion,
    memoryKeys: Object.keys(options.memories || {}),
  });

  try {
    // Strategy 1: Real Gemini API
    if (geminiService.isHealthy()) {
      try {
        const aiResponse = await geminiService.generateHealthResponse(query, options);
        const emotion = await geminiService.analyzeEmotion(query, aiResponse);
        const actions = await geminiService.generateActions(query, emotion);

        log.info('✅ Gemini response successful', { emotion, actionCount: actions.length });

        return { response: aiResponse, actions, emotion };
      } catch (geminiError) {
        log.warn('Gemini API failed, falling back to mock', { error: geminiError.message });
      }
    } else {
      log.warn('Gemini service not available, using fallback');
    }

    // Strategy 2: Keyword-matched mock
    const matched = findMatchingResponse(query);
    if (matched) {
      log.info('✅ Matched mock response');
      return {
        response: matched.response,
        actions: matched.actions,
        emotion: matched.emotion,
      };
    }

    // Strategy 3: Default
    log.info('⚠  Using default fallback response');
    return getDefaultResponse();
  } catch (error) {
    log.error('Unexpected error in response generation', { error: error.message });
    return getDefaultResponse();
  }
}

function findMatchingResponse(query) {
  if (!query || typeof query !== 'string') return null;
  const lower = query.toLowerCase();
  for (const mock of MOCK_RESPONSES) {
    if (mock.keywords.some(k => lower.includes(k))) return mock;
  }
  return null;
}

function getDefaultResponse() {
  return {
    response:
      'I understand you have a health concern. Please describe your specific symptoms clearly ' +
      'so I can provide better guidance. I can help with fever, headache, cold, throat pain, digestive issues, and more.\n\n' +
      'For any emergency situations (chest pain, difficulty breathing, unconsciousness), ' +
      'please use the EMERGENCY button immediately and call 108.',
    actions: ['find_doctor', 'find_hospital'],
    emotion: EMOTION_STATES.CALM,
  };
}

function getGeminiStatus() {
  return geminiService.getStatus();
}

function isReady() {
  return geminiService.isHealthy();
}

module.exports = { generateResponse, getDefaultResponse, getGeminiStatus, isReady };