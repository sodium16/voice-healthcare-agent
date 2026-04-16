// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE
// Generate health responses using mock data for now
// Ready to integrate with OpenAI/Claude later
// ─────────────────────────────────────────────────────────────────────────────

const log = require('../config/logger')('AIService');
const { EMOTION_STATES } = require('../config/constants');

// Mock response library - replace with real AI integration later
const MOCK_RESPONSES = [
  {
    keywords: ['fever', 'temperature', 'hot', 'chills'],
    response: 'You may have a fever. Rest and stay hydrated by drinking water or ORS. ' +
              'Take paracetamol (500mg) if fever is above 38°C. Monitor temperature every 2-3 hours. ' +
              'If fever exceeds 39.5°C or persists beyond 3 days, consult a doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['headache', 'head', 'migraine'],
    response: 'For a headache, rest in a quiet dark room. Stay hydrated and avoid bright screens. ' +
              'You can take mild painkiller like paracetamol. If suddenly very severe or with vision changes — seek emergency care.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['cold', 'cough', 'runny nose', 'sneeze'],
    response: 'Sounds like a common cold. Rest well and drink warm fluids. Honey-ginger tea can help. ' +
              'Avoid cold drinks and spicy food. If symptoms persist beyond 7 days or high fever develops, consult doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['nausea', 'vomiting', 'stomach', 'diarrhea', 'loose motion'],
    response: 'For digestive issues, stay hydrated with ORS or electrolyte drinks. Eat bland foods. ' +
              'Avoid dairy and spicy food temporarily. If symptoms persist 2+ days or with high fever, see a doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
  {
    keywords: ['sore throat', 'throat pain', 'tonsil'],
    response: 'For sore throat, gargle with warm salt water. Stay hydrated and rest voice. ' +
              'Lozenges or honey can help soothe. If pain persists or fever develops, consult doctor.',
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: EMOTION_STATES.CALM,
  },
];

/**
 * Generate AI response based on user query
 * @param {string} query - User health query
 * @returns {Promise<object>} { response, actions, emotion }
 */
async function generateResponse(query) {
  log.info('Generating response for query', { query: query.substring(0, 50) });

  try {
    // Try to match with mock responses
    const matched = findMatchingResponse(query);
    
    if (matched) {
      log.info('Matched mock response', { keywords: matched.keywords });
      return {
        response: matched.response,
        actions: matched.actions,
        emotion: matched.emotion,
      };
    }

    // Default fallback response
    log.info('Using default fallback response');
    return getDefaultResponse();

  } catch (error) {
    log.error('AI generation failed', error);
    return getDefaultResponse();
  }
}

/**
 * Find matching response from mock library
 * @param {string} query
 * @returns {object|null}
 */
function findMatchingResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  for (const mock of MOCK_RESPONSES) {
    const hasMatch = mock.keywords.some(keyword =>
      lowerQuery.includes(keyword)
    );
    
    if (hasMatch) {
      return mock;
    }
  }
  
  return null;
}

/**
 * Get default fallback response
 * @returns {object}
 */
function getDefaultResponse() {
  return {
    response: 'I understand you have a health concern. Please describe your specific symptoms clearly ' +
              'so I can provide better guidance. I can help with: fever, headache, cold, throat pain, and digestive issues.\n\n' +
              'For emergencies, use the EMERGENCY button immediately.',
    actions: ['find_doctor', 'find_hospital'],
    emotion: EMOTION_STATES.CALM,
  };
}

/**
 * TODO: Implement real AI integration
 * This function will call OpenAI/Claude API in the future
 */
async function generateWithRealAI(query) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a healthcare assistant providing basic health guidance...',
      }, {
        role: 'user',
        content: query
      }],
    })
  });
}

module.exports = {
  generateResponse,
  getDefaultResponse,
};