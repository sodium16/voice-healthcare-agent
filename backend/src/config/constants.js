// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & API CONTRACT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const API_ROUTES = {
  ASK: '/ask',
  MEMORY: '/memory',
  HEALTH: '/health',
};

const COLLECTION_NAMES = {
  HEALTH_QUERIES: 'health_queries',
  USER_MEMORY: 'user_memory',
};

const EMOTION_STATES = {
  CALM: 'calm',
  CONCERN: 'concern',
  PANIC: 'panic',
};

const TIMEOUTS = {
  API_CALL: 30000,
  QDRANT_QUERY: 5000,
  VAPI_CALL: 60000,
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// IMPORTANT: Must match the embedding model output dimension.
// text-embedding-004 (Google) outputs 768-dim vectors.
const VECTOR_CONFIG = {
  SIZE: 768,
  DISTANCE: 'Cosine',
};

const API_CONTRACT = {
  ASK_REQUEST: {
    required: ['user_id', 'query'],
    optional: ['location', 'language', 'context'],
  },
  ASK_RESPONSE: {
    required: ['response', 'actions', 'emotion'],
    structure: {
      response: 'string',
      actions: ['string'],
      emotion: 'calm | concern | panic',
    },
  },
  MEMORY_POST_REQUEST: {
    required: ['user_id', 'key', 'value'],
  },
  MEMORY_POST_RESPONSE: {
    message: 'stored',
  },
  MEMORY_GET_RESPONSE: {
    example: {
      language: 'english',
      preference: 'normal speech',
      allergies: 'none recorded',
    },
  },
};

const DEFAULT_RESPONSES = {
  EMERGENCY: {
    response:
      'EMERGENCY DETECTED. Please contact local emergency services immediately. Call 108 for ambulance.',
    actions: ['call_ambulance', 'find_hospital', 'emergency_info'],
    emotion: EMOTION_STATES.PANIC,
  },
  SERVICE_ERROR: {
    response:
      'I am currently unable to process your request. Please try again in a few moments or contact support.',
    actions: ['find_doctor'],
    emotion: EMOTION_STATES.CALM,
  },
  INVALID_INPUT: {
    response: 'Please describe your health concern clearly so I can help you better.',
    actions: [],
    emotion: EMOTION_STATES.CALM,
  },
};

module.exports = {
  API_ROUTES,
  COLLECTION_NAMES,
  EMOTION_STATES,
  TIMEOUTS,
  HTTP_STATUS,
  VECTOR_CONFIG,
  API_CONTRACT,
  DEFAULT_RESPONSES,
};