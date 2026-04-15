const express = require("express");
const router = express.Router();
const qdrant = require("../qdrant");

const COLLECTION_NAME = "user_memory";

// Create collection if not exists
(async () => {
  try {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3,
        distance: "Cosine",
      },
    });
  } catch (err) {
    // already exists — ignore
  }
})();

/**
 * POST /memory
 * Save user memory
 */
router.post("/", async (req, res) => {
  const { userId, memory } = req.body;

  if (!userId || !memory) {
    return res.status(400).json({
      error: "userId and memory are required",
    });
  }

  const vector = [0.2, 0.1, 0.3]; // mock vector

  await qdrant.upsert(COLLECTION_NAME, {
    points: [
      {
        id: Date.now(),
        vector,
        payload: {
          userId,
          memory,
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });

  res.json({
    status: "saved",
  });
});

/**
 * GET /memory/:userId
 * Retrieve user memory
 */
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  const searchResult = await qdrant.search(COLLECTION_NAME, {
    vector: [0.2, 0.1, 0.3],
    limit: 5,
    filter: {
      must: [
        {
          key: "userId",
          match: {
            value: userId,
          },
        },
      ],
    },
  });

  const memories = searchResult.map((point) => point.payload);

  res.json({
    userId,
    memories,
  });
});

module.exports = router;