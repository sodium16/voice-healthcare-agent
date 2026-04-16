// ─────────────────────────────────────────────────────────────────────────────
// LOGGER - Centralized Logging
// ─────────────────────────────────────────────────────────────────────────────

const env = require('./environment');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LEVEL_NAMES = {
  0: '🔍 DEBUG',
  1: 'ℹ  INFO',
  2: '⚠  WARN',
  3: '❌ ERROR',
};

const COLORS = {
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Green
  WARN: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',    // Red
  RESET: '\x1b[0m',
};

class Logger {
  constructor(name = 'App', level = 'info') {
    this.name = name;
    this.currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  _log(level, message, data = null) {
    if (level < this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LEVEL_NAMES[level];
    const color = COLORS[Object.keys(LOG_LEVELS)[level]];

    let output = `${color}[${timestamp}] [${this.name}] ${levelName} ${message}${COLORS.RESET}`;
    
    if (data) {
      output += '\n' + JSON.stringify(data, null, 2);
    }

    console.log(output);
  }

  debug(message, data) {
    this._log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data) {
    this._log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data) {
    this._log(LOG_LEVELS.WARN, message, data);
  }

  error(message, data) {
    this._log(LOG_LEVELS.ERROR, message, data);
  }

  // Special methods
  apiCall(method, url, status, duration) {
    const statusColor = status < 400 ? '✅' : '❌';
    this.info(`${statusColor} ${method} ${url} → ${status} (${duration}ms)`);
  }

  apiError(method, url, error) {
    this.error(`API FAILED: ${method} ${url}`, error);
  }
}

// Export factory
module.exports = function createLogger(name) {
  return new Logger(name, env.LOG_LEVEL);
};

module.exports.Logger = Logger;