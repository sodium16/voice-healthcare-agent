const { QdrantClient } = require("@qdrant/js-client-rest");

const client = new QdrantClient({
  url: "http://localhost:6333" // or cloud URL
});

module.exports = client;