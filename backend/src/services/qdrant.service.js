// ─────────────────────────────────────────────────────────────────────────────
// QDRANT SERVICE
// Wrapper for vector database memory operations
// ─────────────────────────────────────────────────────────────────────────────

const { QdrantClient } = require('@qdrant/js-client-rest');
const env = require('../config/environment');
const log = require('../config/logger')('QdrantService');
const { COLLECTION_NAMES, VECTOR_CONFIG } = require('../config/constants');

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    });
    
    this.isReady = false;
    this.initialize();
  }

  /**
   * Initialize Qdrant collections
   */
  async initialize() {
    try {
      // Create collections if they don't exist
      await this.ensureCollection(COLLECTION_NAMES.HEALTH_QUERIES, VECTOR_CONFIG);
      await this.ensureCollection(COLLECTION_NAMES.USER_MEMORY, VECTOR_CONFIG);
      
      this.isReady = true;
      log.info('Qdrant service initialized');
    } catch (error) {
      log.error('Failed to initialize Qdrant', error.message);
    }
  }

  /**
   * Ensure collection exists, create if not
   */
  async ensureCollection(collectionName, vectorConfig) {
    try {
      await this.client.getCollection(collectionName);
      log.debug(`Collection "${collectionName}" already exists`);
    } catch (error) {
      if (error.status === 404) {
        log.info(`Creating collection "${collectionName}"`);
        await this.client.createCollection(collectionName, {
          vectors: vectorConfig,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Store query in health_queries collection
   * @param {object} point - { id, vector, payload }
   */
  async storeQuery(point) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - skipping storage');
      return;
    }

    try {
      await this.client.upsert(COLLECTION_NAMES.HEALTH_QUERIES, {
        points: [point],
      });
      log.debug('Query stored', { id: point.id });
    } catch (error) {
      log.error('Failed to store query', error.message);
    }
  }

  /**
   * Store user memory
   * @param {object} point - { id, vector, payload: { userId, key, value } }
   */
  async storeMemory(point) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - skipping memory storage');
      return;
    }

    try {
      await this.client.upsert(COLLECTION_NAMES.USER_MEMORY, {
        points: [point],
      });
      log.debug('Memory stored', { userId: point.payload.userId });
    } catch (error) {
      log.error('Failed to store memory', error.message);
    }
  }

  /**
   * Retrieve user memories
   * @param {string} userId
   * @returns {Promise<array>} Array of memory items
   */
  async getMemories(userId) {
    if (!this.isReady) {
      log.warn('Qdrant not ready - returning empty memories');
      return [];
    }

    try {
      // Mock vector for search (in real impl, would use actual embeddings)
      const mockVector = new Array(VECTOR_CONFIG.SIZE).fill(0.1);
      
      const searchResult = await this.client.search(COLLECTION_NAMES.USER_MEMORY, {
        vector: mockVector,
        limit: 10,
        filter: {
          must: [
            {
              key: 'userId',
              match: {
                value: userId,
              },
            },
          ],
        },
      });

      const memories = searchResult.map(point => ({
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
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.client.getCollectionInfo(COLLECTION_NAMES.HEALTH_QUERIES);
      return {
        service: 'qdrant',
        available: true,
        url: env.QDRANT_URL,
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