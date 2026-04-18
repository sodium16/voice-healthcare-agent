// ─────────────────────────────────────────────────────────────────────────────
// QDRANT SERVICE (FIXED)
// Uses real embeddings from gemini.service for meaningful vector search
// Vector size updated to 768 to match text-embedding-004
// ─────────────────────────────────────────────────────────────────────────────

const { QdrantClient } = require('@qdrant/js-client-rest');
const env = require('../config/environment');
const log = require('../config/logger')('QdrantService');
const { COLLECTION_NAMES } = require('../config/constants');

// text-embedding-004 outputs 768-dim vectors (not 384)
const VECTOR_CONFIG = {
  SIZE: 768,
  DISTANCE: 'Cosine',
};

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    });

    this.isReady = false;
    // geminiService is required lazily to avoid circular dependency at boot
    this.geminiService = null;

    this.initialize();
  }

  _getGemini() {
    if (!this.geminiService) {
      this.geminiService = require('./gemini.service');
    }
    return this.geminiService;
  }

  /**
   * Initialize Qdrant collections
   */
  async initialize() {
    try {
      await this.ensureCollection(COLLECTION_NAMES.HEALTH_QUERIES, VECTOR_CONFIG);
      await this.ensureCollection(COLLECTION_NAMES.USER_MEMORY, VECTOR_CONFIG);
      this.isReady = true;
      log.info('Qdrant service initialized (vector size: 768)');
    } catch (error) {
      log.error('Failed to initialize Qdrant', error.response?.data || error.message);
    }
  }

  /**
   * Ensure collection exists; create if missing.
   * If existing collection has wrong vector size, recreate it.
   */
  async ensureCollection(collectionName, vectorConfig) {
    try {
      const info = await this.client.getCollection(collectionName);
      const existingSize = info.config?.params?.vectors?.size;

      if (existingSize && existingSize !== vectorConfig.SIZE) {
        log.warn(
          `Collection "${collectionName}" has wrong vector size (${existingSize} vs ${vectorConfig.SIZE}). Recreating.`
        );
        await this.client.deleteCollection(collectionName);
        throw { status: 404 }; // Fall through to create
      }

      log.debug(`Collection "${collectionName}" OK (size: ${existingSize || vectorConfig.SIZE})`);
    } catch (error) {
      log.error(`Qdrant error on ${collectionName}:`, {
        status: error.status,
        statusCode: error.statusCode,
        data: error.response?.data || error.message,
        stack: error.stack,
      });
      if (error.status === 404 || error.statusCode === 404) {
        log.info(`Creating collection "${collectionName}" (size: ${vectorConfig.SIZE})`);
        await this.client.createCollection(collectionName, {
          vectors: {
            size: vectorConfig.SIZE,
            distance: vectorConfig.DISTANCE,
          },
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate a real embedding vector for text
   * Falls back to a deterministic mock if Gemini is unavailable
   */
  async _embed(text) {
    try {
      return await this._getGemini().generateEmbedding(text);
    } catch (err) {
      log.warn('Embedding failed, using mock vector', err.message);
      return new Array(VECTOR_CONFIG.SIZE).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1);
    }
  }

  
  async storeQuery(point) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - skipping query storage');
      return;
    }

    try {
      const text = point.payload.query || JSON.stringify(point.payload);
      const vector = await this._embed(text);

      await this.client.upsert(COLLECTION_NAMES.HEALTH_QUERIES, {
        points: [{ id: point.id, vector, payload: point.payload }],
      });
      log.debug('Query stored', { id: point.id });
    } catch (error) {
      log.error('Failed to store query', error.message);
    }
  }

  /**
   * Store user memory
   * @param {object} point - { id, payload: { user_id, key, value, ... } }
   */
  async storeMemory(point) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - skipping memory storage');
      return;
    }

    try {
      const text = `${point.payload.key}: ${point.payload.value}`;
      const vector = await this._embed(text);

      await this.client.upsert(COLLECTION_NAMES.USER_MEMORY, {
        points: [{ id: point.id, vector, payload: point.payload }],
      });
      log.debug('Memory stored', { userId: point.payload.user_id, key: point.payload.key });
    } catch (error) {
      log.error('Failed to store memory', error.message);
    }
  }

  
  async getMemories(userId) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - returning empty memories');
      return [];
    }

    try {
      // Use scroll (filter-only) so we get ALL memories for the user,
      // not just the ones closest to an arbitrary query vector.
      const scrollResult = await this.client.scroll(COLLECTION_NAMES.USER_MEMORY, {
        filter: {
          must: [
            {
              key: 'user_id',
              match: { value: userId },
            },
          ],
        },
        limit: 50,
        with_payload: true,
        with_vector: false,
      });

      const memories = (scrollResult.points || []).map(point => ({
        key: point.payload.key,
        value: point.payload.value,
        timestamp: point.payload.timestamp,
      }));

      log.debug('Memories retrieved', { userId, count: memories.length });
      return memories;
    } catch (error) {
      log.error('Failed to retrieve memories', error.message);
      return [];
    }
  }

  /**
   * Retrieve memories as a flat key→value object (convenient for injecting into prompts)
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getMemoriesAsObject(userId) {
    const memories = await this.getMemories(userId);
    const obj = {};
    memories.forEach(m => {
      obj[m.key] = m.value;
    });
    return obj;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.client.getCollection(COLLECTION_NAMES.HEALTH_QUERIES);
      return {
        service: 'qdrant',
        available: true,
        url: env.QDRANT_URL,
        vectorSize: VECTOR_CONFIG.SIZE,
        collections: [COLLECTION_NAMES.HEALTH_QUERIES, COLLECTION_NAMES.USER_MEMORY],
      };
    } catch (error) {
      log.error('Qdrant health check failed', error.message);
      return {
        service: 'qdrant',
        available: false,
        error: error.message,
      };
    }
  }
}

module.exports = new QdrantService();