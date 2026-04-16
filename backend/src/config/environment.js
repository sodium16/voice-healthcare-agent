// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// Load and validate all environment variables
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const env = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Qdrant (Vector DB for memory)
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || null,
  
  // Vapi (Voice API)
  VAPI_API_KEY: process.env.VAPI_API_KEY || null,
  VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID || null,
  
  // AI/LLM (for fallback responses)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || null,
  
  // Frontend (CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5000',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database (future)
  DB_URL: process.env.DB_URL || null,
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateEnvironment() {
  const errors = [];
  
  // Required in production
  if (env.NODE_ENV === 'production') {
    if (!env.VAPI_API_KEY) errors.push('VAPI_API_KEY is required in production');
    if (!env.OPENAI_API_KEY && !env.CLAUDE_API_KEY) {
      errors.push('Either OPENAI_API_KEY or CLAUDE_API_KEY is required');
    }
  }
  
  // Warnings in development
  if (env.NODE_ENV === 'development') {
    if (!env.VAPI_API_KEY) {
      console.warn('⚠  VAPI_API_KEY not set - voice features disabled');
    }
  }
  
  // Critical validation
  if (!env.QDRANT_URL) {
    errors.push('QDRANT_URL is required');
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error('  - ' + err));
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateEnvironment();

module.exports = env;