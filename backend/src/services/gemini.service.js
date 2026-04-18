// ─────────────────────────────────────────────────────────────────────────────
// GEMINI SERVICE (FIXED + COMPLETE)
// Real AI integration: health guidance, emotion analysis, action suggestion,
// real embeddings, language/location/memory injection, emotion-aware tone
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
      this.embeddingModel = null;
      this.modelName = null;
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      this.modelName = 'gemini-flash-latest';
      this.model = this.client.getGenerativeModel({ model: this.modelName });

      // gemini-embedding-001 is the correct v1beta embedContent model (not embedding-001 or text-embedding-004)
      this.embeddingModelName = 'gemini-embedding-001';
      this.embeddingModel = this.client.getGenerativeModel({ model: this.embeddingModelName });

      this.isAvailable = true;
      log.info(`✅ Gemini service initialized successfully with model: ${this.modelName}`);
    } catch (error) {
      log.error('Failed to initialize Gemini', error.message);
      this.isAvailable = false;
      this.client = null;
      this.model = null;
      this.embeddingModel = null;
      this.modelName = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REAL EMBEDDINGS
  // Replaces all the mock new Array(384).fill(0.1) vectors
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a real embedding vector for a piece of text
   * Uses gemini-embedding-001 (correct v1beta model name)
   * Pins output to 768 dims via outputDimensionality so it matches Qdrant collection
   * @param {string} text
   * @returns {Promise<number[]>} 768-dim vector
   */
  async generateEmbedding(text) {
    if (!this.isAvailable || !this.embeddingModel) {
      return new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1);
    }

    try {
      // outputDimensionality pins the output to 768 (default is 3072 for this model)
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      });
      return result.embedding.values;
    } catch (error) {
      log.error('Embedding generation failed', error.message);
      return new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH RESPONSE
  // Now accepts language, location, memories, and emotion for context
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate health response using Gemini AI
   * @param {string} query
   * @param {object} options - { language, location, memories, emotion }
   * @returns {Promise<string>}
   */
  async generateHealthResponse(query, options = {}) {
    if (!this.isAvailable || !this.model) {
      throw new Error('Gemini service not available - check API key configuration');
    }

    const language = options.language || 'english';
    const location = options.location || 'India';
    const memories = options.memories || {};
    const emotion = options.emotion || 'calm';

    // Build tone instruction based on detected emotion state
    const toneInstruction = {
      panic: 'URGENT TONE: The user is in distress. Lead immediately with the single most important action. Be brief, direct, and reassuring. Do not overwhelm with details.',
      concern: 'MEASURED TONE: Acknowledge the concern clearly first before giving advice. Be warm but thorough. Reassure that this is manageable.',
      calm: 'REASSURING TONE: Be warm, clear, and practical. No need to alarm the user.',
    }[emotion] || 'REASSURING TONE: Be warm, clear, and practical.';

    // Build memory context string if available
    let memoryContext = '';
    const memoryEntries = Object.entries(memories).filter(
      ([k]) => !['user_id'].includes(k)
    );
    if (memoryEntries.length > 0) {
      memoryContext = `\n## User Context (from memory):\n${memoryEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    }

    const systemPrompt = `You are VAIDYA, a healthcare assistant providing guidance for people in India.

## Response Language:
Respond ENTIRELY in ${language}. If ${language} is not English, write your full response in that language. Use simple, everyday vocabulary — avoid all medical jargon.

## User Location:
The user is in ${location}. Mention locally relevant services: "Call 108 for ambulance", reference nearby hospital types relevant to their city when appropriate.
${memoryContext}

## Tone Instruction:
${toneInstruction}

## Your Role:
- Provide clear, simple health guidance for common symptoms
- Give practical home care advice
- Explain when to seek professional help
- Highlight emergency warning signs

## Response Guidelines:
1. Keep responses CONCISE (2-3 paragraphs max)
2. Use SIMPLE language appropriate for low-literacy users
3. Reference Indian medical standards (ICMR guidelines where applicable)
4. Mention local services: "Call 108 for ambulance"
5. Be EMPATHETIC and reassuring

## CRITICAL RULES (NEVER BREAK THESE):
- NEVER provide specific drug names with doses (e.g., "take 500mg paracetamol")
  Instead: "You can take an over-the-counter painkiller"
- NEVER diagnose definitively (e.g., "You have malaria")
  Instead: "This could indicate..."
- NEVER prescribe treatments
- ALWAYS recommend professional medical consultation for persistent (>3-5 days), severe symptoms, chest pain, difficulty breathing, confusion, or any life-threatening signs

## User Query:
"${query}"

Provide practical, immediately actionable guidance. Start directly without any preamble.`;

    log.debug('Calling Gemini API', {
      query: query.substring(0, 50),
      language,
      location,
      emotion,
      modelUsed: this.modelName,
    });

    const startTime = Date.now();
    const result = await this.model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    const duration = Date.now() - startTime;

    log.info('Gemini response generated successfully', {
      length: text.length,
      duration: `${duration}ms`,
    });

    return text;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMOTION ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze emotion from query and response
   * @param {string} query
   * @param {string} response
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
      const emotion = emotionText.toLowerCase().trim().split('\n')[0];

      const validEmotions = ['calm', 'concern', 'panic'];
      if (validEmotions.includes(emotion)) {
        log.debug('Emotion analyzed', { emotion });
        return emotion;
      }

      log.warn('Invalid emotion returned, defaulting to calm', { emotion });
      return 'calm';
    } catch (error) {
      log.error('Emotion analysis failed', error.message);
      return 'calm';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION SUGGESTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate suggested actions
   * @param {string} query
   * @param {string} emotion
   * @returns {Promise<string[]>}
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

      const jsonMatch = actionsText.match(/\[.*?\]/s);
      if (jsonMatch) {
        const actions = JSON.parse(jsonMatch[0]);
        const validActions = [
          'call_ambulance', 'find_hospital', 'find_doctor',
          'find_pharmacy', 'emergency_info',
        ];
        const filtered = actions.filter(a => validActions.includes(a)).slice(0, 3);
        if (filtered.length > 0) {
          log.debug('Actions generated', { count: filtered.length });
          return filtered;
        }
      }
    } catch (error) {
      log.error('Action generation failed', error.message);
    }

    // Fallback
    if (emotion === 'panic') return ['call_ambulance', 'emergency_info'];
    if (emotion === 'concern') return ['find_doctor', 'find_hospital'];
    return ['find_doctor', 'find_pharmacy'];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────────────────

  isHealthy() {
    return this.isAvailable && !!this.model;
  }

  getStatus() {
    return {
      service: 'gemini',
      available: this.isAvailable,
      model: this.isAvailable ? this.modelName : null,
      embeddingModel: this.isAvailable ? this.embeddingModelName : null,
      apiKeyConfigured: !!env.GEMINI_API_KEY,
      capabilities: ['health_guidance', 'emotion_analysis', 'action_suggestion', 'embeddings'],
    };
  }
}

module.exports = new GeminiService();