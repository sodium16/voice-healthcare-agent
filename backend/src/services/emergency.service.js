// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY SERVICE
// Detect emergency keywords and trigger appropriate responses
// ─────────────────────────────────────────────────────────────────────────────

const log = require('../config/logger')('EmergencyService');

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  "can't breathe",
  'difficulty breathing',
  'shortness of breath',
  'severe bleeding',
  'passed out',
  'unconscious',
  'suicidal',
  'kill myself',
  'want to die',
  'overdose',
  'seizure',
  'stroke',
  'severe chest',
  'choking',
  'drowning',
];

const CONCERN_KEYWORDS = [
  'fever',
  'high temperature',
  'severe pain',
  'severe headache',
  'persistent cough',
  'difficulty swallowing',
  'severe bleeding',
  'fracture',
  'broken bone',
];

/**
 * Analyze query text for emergency indicators
 * @param {string} text - User query
 * @returns {object} { isEmergency, isConcern, keywords }
 */
function analyzeQuery(text) {
  if (!text || typeof text !== 'string') {
    return { isEmergency: false, isConcern: false, keywords: [] };
  }

  const lowerText = text.toLowerCase();
  const foundEmergencyKeywords = EMERGENCY_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword)
  );
  const foundConcernKeywords = CONCERN_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword)
  );

  const isEmergency = foundEmergencyKeywords.length > 0;
  const isConcern = foundConcernKeywords.length > 0 && !isEmergency;

  if (isEmergency) {
    log.warn('EMERGENCY DETECTED', { keywords: foundEmergencyKeywords, text });
  } else if (isConcern) {
    log.info('CONCERN DETECTED', { keywords: foundConcernKeywords });
  }

  return {
    isEmergency,
    isConcern,
    keywords: [...foundEmergencyKeywords, ...foundConcernKeywords],
  };
}

/**
 * Get emergency response for immediate action
 * @returns {object} Emergency response object
 */
function getEmergencyResponse() {
  return {
    response: 'EMERGENCY DETECTED — Please contact emergency services immediately!\n\n' +
              'Call 108 (Ambulance) now.\n' +
              'Or contact your nearest hospital.\n\n' +
              'Stay calm and provide location information to emergency responders.',
    actions: ['call_ambulance', 'find_hospital', 'emergency_info'],
    emotion: 'panic',
  };
}

/**
 * Get concern response for elevated monitoring
 * @param {string} concern - Type of concern
 * @returns {object} Concern response object
 */
function getConcernResponse(concern) {
  return {
    response: 'I detect a potentially serious health concern. While not an emergency, ' +
              'I recommend consulting a doctor soon.\n\n' +
              'Please monitor your symptoms and seek medical attention if they worsen.',
    actions: ['find_doctor', 'find_hospital'],
    emotion: 'concern',
  };
}

module.exports = {
  analyzeQuery,
  getEmergencyResponse,
  getConcernResponse,
  EMERGENCY_KEYWORDS,
  CONCERN_KEYWORDS,
};