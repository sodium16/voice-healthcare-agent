const express = require("express");
const app = express();

// ✅ THIS MUST BE ABOVE ROUTES
app.use(express.json());

// Routes
const askRoute = require("./routes/ask");
const memoryRoute = require("./routes/memory");

app.use("/ask", askRoute);
app.use("/memory", memoryRoute);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;