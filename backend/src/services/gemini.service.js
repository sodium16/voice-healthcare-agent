// ─────────────────────────────────────────────────────────────────────────────
// GEMINI SERVICE (FIXED)
// Real AI integration using Google's Generative AI API
// ─────────────────────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/environment');
const log = require('../config/logger')('GeminiService');

class GeminiService {
  constructor() {
    if (!env.GEMINI_API_KEY) {
      log.warn('⚠️  Gemini API key not configured - using mock responses only');
      this.isAvailable = false;
      this.client = null;
      this.model = null;
      this.modelName = null;
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      this.modelName = 'gemini-flash-latest';
      this.model = this.client.getGenerativeModel({ model: this.modelName });
      this.isAvailable = true;
      log.info(`✅ Gemini service initialized successfully with model: ${this.modelName}`);
    } catch (error) {
      log.error('Failed to initialize Gemini', error.message);
      this.isAvailable = false;
      this.client = null;
      this.model = null;
      this.modelName = null;
    }
  }

  /**
   * Generate health response using Gemini AI
   * @param {string} query - User health query
   * @returns {Promise<string>} AI-generated response
   */
  async generateHealthResponse(query) {
    if (!this.isAvailable || !this.model) {
      throw new Error('Gemini service not available - check API key configuration');
    }

    try {
      const systemPrompt = `You are VAIDYA, a healthcare assistant providing guidance for people in India.

## Your Role:
- Provide clear, simple health guidance for common symptoms
- Give practical home care advice
- Explain when to seek professional help
- Highlight emergency warning signs

## Response Guidelines:
1. Keep responses CONCISE (2-3 paragraphs max)
2. Use SIMPLE, non-technical language
3. Reference Indian medical standards (ICMR guidelines where applicable)
4. Mention local services: "Call 108 for ambulance", "Visit your nearest hospital"
5. Be EMPATHETIC and reassuring

## CRITICAL RULES (NEVER BREAK THESE):
- NEVER provide specific drug names with doses (e.g., "take 500mg paracetamol")
  Instead: "You can take an over-the-counter painkiller"
- NEVER diagnose definitively (e.g., "You have malaria")
  Instead: "This could indicate..."
- NEVER prescribe treatments
- ALWAYS recommend professional medical consultation for:
  - Persistent symptoms (>3-5 days)
  - Severe symptoms
  - Any chest pain
  - Difficulty breathing
  - Confusion or behavior changes
  - Any life-threatening signs

## User's Query:
"${query}"

## Your Response:
Provide practical, immediately actionable guidance. Start directly without any preamble or introduction.`;

      log.debug('Calling Gemini API', { 
        query: query.substring(0, 50),
        modelUsed: this.modelName
      });

      const startTime = Date.now();
      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      const duration = Date.now() - startTime;

      log.info('Gemini response generated successfully', { 
        length: text.length,
        duration: `${duration}ms`
      });

      return text;

    } catch (error) {
      log.error('Gemini API error', { 
        message: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Analyze emotion from query and response
   * @param {string} query - Original user query
   * @param {string} response - AI-generated response
   * @returns {Promise<string>} 'calm' | 'concern' | 'panic'
   */
  async analyzeEmotion(query, response) {
    if (!this.isAvailable || !this.model) {
      log.warn('Gemini not available, returning default emotion: calm');
      return 'calm';
    }

    try {
      const emotionPrompt = `You are analyzing a health conversation to determine the appropriate emotion state for the app UI.

User query: "${query}"
AI response: "${response}"

Determine emotion state based on symptom severity:
- CALM: Normal, manageable symptoms (mild cold, headache, minor stomach issue)
- CONCERN: Serious but not emergency (high fever 39+°C, severe pain, persistent symptoms)
- PANIC: Emergency situation (chest pain, difficulty breathing, unconscious, severe bleeding)

Respond with ONLY ONE WORD: calm, concern, or panic`;

      const result = await this.model.generateContent(emotionPrompt);
      const emotionText = await result.response.text();
      const emotion = emotionText.toLowerCase().trim().split('\n')[0]; // Get first line only

      // Validate emotion
      const validEmotions = ['calm', 'concern', 'panic'];
      if (validEmotions.includes(emotion)) {
        log.debug('Emotion analyzed', { emotion });
        return emotion;
      }

      log.warn('Invalid emotion returned, defaulting to calm', { emotion });
      return 'calm';

    } catch (error) {
      log.error('Emotion analysis failed', error.message);
      return 'calm'; // Safe default
    }
  }

  /**
   * Generate suggested actions based on query
   * @param {string} query - User health query
   * @param {string} emotion - Current emotion state
   * @returns {Promise<array>} Array of action strings
   */
  async generateActions(query, emotion) {
    if (!this.isAvailable || !this.model) {
      log.warn('Gemini not available, returning default actions');
      return emotion === 'panic'
        ? ['call_ambulance', 'emergency_info']
        : ['find_doctor', 'find_pharmacy'];
    }

    try {
      const actionPrompt = `Based on this health situation, suggest 2-3 most relevant actions for the user.

Health query: "${query}"
Emotion state: ${emotion}

Available actions (choose from these ONLY):
1. call_ambulance - Emergency medical transport
2. find_hospital - Locate nearest hospital
3. find_doctor - Find available doctors/clinics
4. find_pharmacy - Find nearby pharmacies
5. emergency_info - First aid information

Return ONLY a JSON array with 2-3 action names. Example: ["action1", "action2"]`;

      const result = await this.model.generateContent(actionPrompt);
      const actionsText = await result.response.text();
      
      // Parse JSON from response
      try {
        // Find JSON array in response
        const jsonMatch = actionsText.match(/\[.*?\]/s);
        if (jsonMatch) {
          const actions = JSON.parse(jsonMatch[0]);
          
          // Validate and filter actions
          const validActions = [
            'call_ambulance',
            'find_hospital',
            'find_doctor',
            'find_pharmacy',
            'emergency_info'
          ];
          
          const filteredActions = actions
            .filter(a => validActions.includes(a))
            .slice(0, 3); // Max 3 actions
          
          if (filteredActions.length > 0) {
            log.debug('Actions generated', { count: filteredActions.length });
            return filteredActions;
          }
        }
      } catch (parseError) {
        log.warn('Failed to parse action JSON', parseError.message);
      }

      // Fallback actions based on emotion
      if (emotion === 'panic') {
        return ['call_ambulance', 'emergency_info'];
      } else if (emotion === 'concern') {
        return ['find_doctor', 'find_hospital'];
      } else {
        return ['find_doctor', 'find_pharmacy'];
      }

    } catch (error) {
      log.error('Action generation failed', error.message);
      
      // Safe fallback
      return emotion === 'panic'
        ? ['call_ambulance', 'emergency_info']
        : ['find_doctor'];
    }
  }

  /**
   * Check if Gemini service is healthy and available
   * @returns {boolean}
   */
  isHealthy() {
    return this.isAvailable && !!this.model;
  }

  /**
   * Get service status
   * @returns {object}
   */
  getStatus() {
    return {
      service: 'gemini',
      available: this.isAvailable,
      model: this.isAvailable ? this.modelName : null,
      apiKeyConfigured: !!env.GEMINI_API_KEY,
      capabilities: [
        'health_guidance',
        'emotion_analysis',
        'action_suggestion'
      ],
    };
  }
}

module.exports = new GeminiService();