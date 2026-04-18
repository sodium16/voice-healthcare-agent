// ─────────────────────────────────────────────────────────────────────────────
// VAPI SERVICE (FIXED)
// Real TTS and STT calls using Vapi REST API
// ─────────────────────────────────────────────────────────────────────────────

const env = require('../config/environment');
const log = require('../config/logger')('VapiService');

const VAPI_BASE = 'https://api.vapi.ai';

class VapiService {
  constructor() {
    this.apiKey = env.VAPI_API_KEY;
    this.isAvailable = !!this.apiKey;

    if (!this.isAvailable) {
      log.warn('Vapi API key not configured - voice features disabled');
    } else {
      log.info('✅ Vapi service ready');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEXT TO SPEECH
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convert text to speech audio URL via Vapi
   * @param {string} text
   * @param {object} options - { voice: 'male|female', language: 'en', speed: 1.0 }
   * @returns {Promise<{audioUrl: string|null, success: boolean}>}
   */
  async textToSpeech(text, options = {}) {
    if (!this.isAvailable) {
      log.warn('TTS skipped - Vapi not configured');
      return { success: false, audioUrl: null, message: 'Vapi not configured' };
    }

    const startTime = Date.now();

    try {
      // Map our internal voice option to a Vapi voice ID
      const voiceId = this._resolveVoice(options.voice || 'female', options.language || 'en');

      const response = await fetch(`${VAPI_BASE}/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: {
            provider: '11labs',
            voiceId,
          },
          speed: options.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Vapi TTS ${response.status}: ${errBody}`);
      }

      // Vapi returns audio as binary; convert to base64 data URL
      // so the frontend can play it with a plain <audio> element
      const audioBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(audioBuffer).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64}`;

      log.info('TTS completed', {
        chars: text.length,
        duration: `${Date.now() - startTime}ms`,
      });

      return { success: true, audioUrl };
    } catch (error) {
      log.error('TTS failed', error.message);
      return { success: false, audioUrl: null, message: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPEECH TO TEXT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convert audio buffer/blob to text via Vapi
   * @param {Buffer} audioBuffer - Raw audio bytes (wav / webm / mp3)
   * @param {object} options - { language: 'en', mimeType: 'audio/webm' }
   * @returns {Promise<string>} Transcribed text
   */
  async speechToText(audioBuffer, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Vapi service not available - API key missing');
    }

    const startTime = Date.now();

    try {
      const { FormData, Blob } = await import('node-fetch');

      const form = new FormData();
      form.append(
        'file',
        new Blob([audioBuffer], { type: options.mimeType || 'audio/webm' }),
        'recording.webm'
      );
      form.append('language', options.language || 'en');

      const response = await fetch(`${VAPI_BASE}/stt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Vapi STT ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const transcript = data.text || data.transcript || '';

      log.info('STT completed', {
        chars: transcript.length,
        duration: `${Date.now() - startTime}ms`,
      });

      return transcript;
    } catch (error) {
      log.error('STT failed', error.message);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Map gender + language to an ElevenLabs voice ID that Vapi supports
   * Add more IDs here as needed for your Vapi account
   */
  _resolveVoice(gender, language) {
    const voices = {
      female: {
        en: 'rachel',          // ElevenLabs Rachel - clear English female
        hi: 'freya',           // Closest multilingual female available
        default: 'rachel',
      },
      male: {
        en: 'adam',            // ElevenLabs Adam - clear English male
        hi: 'arnold',
        default: 'adam',
      },
    };

    const langKey = (language || 'en').split('-')[0].toLowerCase();
    const genderMap = voices[gender] || voices.female;
    return genderMap[langKey] || genderMap.default;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────────────────

  isHealthy() {
    return this.isAvailable;
  }

  getStatus() {
    return {
      service: 'vapi',
      available: this.isAvailable,
      apiKeyConfigured: !!this.apiKey,
      capabilities: ['text-to-speech', 'speech-to-text'],
    };
  }
}

module.exports = new VapiService();