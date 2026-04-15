const { detectEmergency } = require("../utils/emergencyTriggers");
const express = require("express");
const router = express.Router();
const qdrant = require("../qdrant"); // 👈 your existing file

const COLLECTION_NAME = "health_queries";

// Create collection once
(async () => {
  try {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3,
        distance: "Cosine",
      },
    });
  } catch (err) {
    // collection probably already exists — ignore
  }
})();

router.post("/", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

if (detectEmergency(query)) {
  return res.status(200).json({
    emergency: true,
    message:
      "This sounds like a medical emergency. Please contact local emergency services immediately or go to the nearest hospital.",
    actions: [
      "Call emergency number",
      "Alert nearby hospital",
      "Notify emergency contact"
    ]
  });
}

  // 🔹 Mock vector (real embeddings later)
  const vector = [0.1, 0.2, 0.3];

  // Save to Qdrant
  try {
  await qdrant.upsert(COLLECTION_NAME, {
    points: [
      {
        id: Date.now(),
        vector,
        payload: {
          query,
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });
} catch (err) {
  console.error("Qdrant upsert failed", err.message);
}

  // 🔹 Mock response
  res.json({
    reply:
      "I understand your concern. Please take rest and consult a doctor if symptoms persist.",
    emergency: false,
  });
});

module.exports = router;