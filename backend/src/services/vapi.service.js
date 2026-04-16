// ─────────────────────────────────────────────────────────────────────────────
// VAPI SERVICE
// Wrapper around Vapi SDK for voice operations
// ─────────────────────────────────────────────────────────────────────────────

const env = require('../config/environment');
const log = require('../config/logger')('VapiService');

class VapiService {
  constructor() {
    this.apiKey = env.VAPI_API_KEY;
    this.isAvailable = !!this.apiKey;
    
    if (!this.isAvailable) {
      log.warn('Vapi API key not configured - voice features disabled');
    }
  }

  /**
   * Convert text to speech audio
   * @param {string} text - Text to synthesize
   * @param {object} options - { voice: 'male|female', language: 'en', speed: 1.0 }
   * @returns {Promise<Buffer|string>} Audio URL or buffer
   */
  async textToSpeech(text, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Vapi service not available - API key missing');
    }

    const startTime = Date.now();
    
    try {
      const payload = {
        text,
        voice: options.voice || 'female',
        language: options.language || 'en',
        speed: options.speed || 1.0,
      };

      // TODO: Call actual Vapi TTS API
      // const response = await fetch('https://api.vapi.ai/v1/tts', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(payload)
      // });

      log.info('TTS requested', { text: text.substring(0, 50) + '...' });
      
      // Placeholder: return mock response for now
      return {
        success: true,
        message: 'TTS not yet implemented',
        audioUrl: null,
      };

    } catch (error) {
      log.error('TTS failed', error.message);
      throw error;
    }
  }

  /**
   * Convert speech to text
   * @param {Buffer|Stream} audioStream - Audio data
   * @param {object} options - { language: 'en', model: 'default' }
   * @returns {Promise<string>} Transcribed text
   */
  async speechToText(audioStream, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Vapi service not available - API key missing');
    }

    try {
      log.info('STT requested');
      
      // TODO: Call actual Vapi STT API
      // FormData would be used here for audio upload

      return 'Speech transcription placeholder';

    } catch (error) {
      log.error('STT failed', error.message);
      throw error;
    }
  }

  /**
   * Check if Vapi service is configured and accessible
   * @returns {boolean}
   */
  isHealthy() {
    return this.isAvailable;
  }

  /**
   * Get Vapi service status
   * @returns {object}
   */
  getStatus() {
    return {
      service: 'vapi',
      available: this.isAvailable,
      apiKeyConfigured: !!this.apiKey,
      capabilities: [
        'text-to-speech',
        'speech-to-text',
        'call-handling',
      ],
    };
  }
}

module.exports = new VapiService();