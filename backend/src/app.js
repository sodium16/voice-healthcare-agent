const express = require("express");
const app = express();

// Middleware
app.use(express.json());

// Routes
const askRoute = require("./routes/ask");
app.use("/ask", askRoute);

// Health check (optional but useful)
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voice-healthcare-backend" });
});

module.exports = app;