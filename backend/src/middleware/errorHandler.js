// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLER MIDDLEWARE
// Centralized error handling and response formatting
// ─────────────────────────────────────────────────────────────────────────────

const log = require('../config/logger')('ErrorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Global error handler middleware
 * Must be attached last in app.js
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  const message = err.message || 'An unexpected error occurred';

  log.error(`[${req.method} ${req.originalUrl}] ${message}`, {
    status,
    stack: err.stack,
  });

  // Format error response
  const response = {
    error: {
      status,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * 404 handler - must come after all routes
 */
function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: {
      status: HTTP_STATUS.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};