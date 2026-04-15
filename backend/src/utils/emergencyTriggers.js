const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "can't breathe",
  "difficulty breathing",
  "shortness of breath",
  "severe bleeding",
  "passed out",
  "unconscious",
  "suicidal",
  "kill myself",
  "want to die",
  "overdose",
  "seizure",
  "stroke"
];

function detectEmergency(text) {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword =>
    lowerText.includes(keyword)
  );
}

module.exports = { detectEmergency };