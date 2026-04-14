const client = require("./qdrant");

const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

async function initQdrant() {
  await client.createCollection("user_memory", {
    vectors: {
      size: 384, // dummy size
      distance: "Cosine"
    }
  }).catch(() => {
    console.log("Qdrant collection already exists");
  });
}

initQdrant();