// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS APPLICATION SETUP (FIXED)
// Configure routes, middleware, and error handling
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const app = express();

const log = require('./config/logger')('App');
const env = require('./config/environment');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE - Parse & Log
// ─────────────────────────────────────────────────────────────────────────────

// Parse JSON bodies
app.use(express.json());

// CORS (allow frontend)
// FIX: Use FRONTEND_URL from environment, fallback to * for development
app.use((req, res, next) => {
  const allowedOrigin = env.FRONTEND_URL || '*';
  
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Log CORS allowed origin for debugging
  if (req.method === 'OPTIONS') {
    log.debug('CORS preflight request', { origin: req.headers.origin, allowed: allowedOrigin });
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Wrap res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    log.apiCall(req.method, req.originalUrl, res.statusCode, duration);
    return originalJson.call(this, data);
  };
  
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

const askRoute = require('./routes/ask');
const memoryRoute = require('./routes/memory');
const healthRoute = require('./routes/health');

app.use('/ask', askRoute);
app.use('/memory', memoryRoute);
app.use('/health', healthRoute);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

// 404 Handler (must come after all routes)
app.use(notFoundHandler);

// Global error handler (must come last)
app.use(errorHandler);

log.info('Express app configured successfully');
log.info(`CORS allowed origin: ${env.FRONTEND_URL || '*'}`);

module.exports = app;