// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE: Frontend strictly follows API Contract
// POST /ask -> { user_id, query, location } -> { response, actions, emotion }
// POST /memory -> { user_id, key, value } -> { message: "stored" }
// GET /memory?user_id -> { language, preference, ... }
// All communication via API. No direct dependency between components.
// ─────────────────────────────────────────────────────────────────────────────

// API Configuration
const API_CONFIG = {
  baseUrl: 'http://localhost:3000', // Backend API endpoint
  userId: 'user_' + Math.random().toString(36).substr(2, 6),
  location: 'Bangalore'
};

// Update UI with current user and location
document.getElementById('current-user-id').textContent = API_CONFIG.userId;
document.getElementById('current-location').textContent = API_CONFIG.location;

// ── CURSOR ──
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
function animRing(){rx+=(mx-rx)*0.12;ry+=(my-ry)*0.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(animRing);}
animRing();

// ── LIVE TIME ──
function updateTime(){
  const now=new Date();
  const t=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const el=document.getElementById('live-time'); if(el) el.textContent=t;
  const f=document.getElementById('footer-time'); if(f) f.textContent=t;
}
setInterval(updateTime,1000); updateTime();

// ── EMOTION STATE ──
let currentEmotion = 'calm';

function setEmotion(emotion) {
  currentEmotion = emotion;
  document.body.className = 'emotion-' + emotion;

  // Update badge
  const label = document.getElementById('emotion-label');
  const statusEmo = document.getElementById('status-emotion');
  const labels = { calm: 'CALM', concern: 'CONCERN DETECTED', panic: 'PANIC — EMERGENCY' };
  label.textContent = labels[emotion];
  statusEmo.textContent = emotion.toUpperCase();

  // Pill active states
  document.querySelectorAll('.emo-pill').forEach(p => p.classList.remove('active'));
  const activePill = document.querySelector('.emo-pill.' + emotion);
  if (activePill) activePill.classList.add('active');

  // Alert bars
  document.getElementById('panic-bar').classList.toggle('active', emotion === 'panic');
  document.getElementById('concern-bar').classList.toggle('active', emotion === 'concern');

  // Nav logo color hint
  document.querySelector('.nav-logo').style.color =
    emotion === 'panic' ? 'var(--emotion-panic-color)' :
    emotion === 'concern' ? 'var(--emotion-concern-color)' :
    'var(--accent)';
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS - Following exact contract
// ─────────────────────────────────────────────────────────────────────────────

// POST /ask
async function apiAsk(query) {
  const requestBody = {
    user_id: API_CONFIG.userId,
    query: query,
    location: API_CONFIG.location
  };
  
  console.log('📤 POST /ask', requestBody);
  
  // Mock API response (replace with actual fetch when backend is ready)
  // This follows the exact API contract
  return new Promise((resolve) => {
    setTimeout(() => {
      const lq = query.toLowerCase();
      let matched = mockResponses.find(r => r.query_match.some(k => lq.includes(k)));
      const result = matched || defaultResponse;
      
      const response = {
        response: result.response,
        actions: result.actions,
        emotion: result.emotion
      };
      
      console.log('📥 API Response:', response);
      resolve(response);
    }, 1400);
  });
  
  /* Uncomment when backend is ready:
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return defaultResponse;
  }
  */
}

// POST /memory
async function apiStoreMemory(key, value) {
  const requestBody = {
    user_id: API_CONFIG.userId,
    key: key,
    value: value
  };
  
  console.log('📤 POST /memory', requestBody);
  
  // Mock response
  return { message: "stored" };
  
  /* Uncomment when backend is ready:
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    return await response.json();
  } catch (error) {
    console.error('Memory API Error:', error);
    return { message: "error" };
  }
  */
}

// GET /memory
async function apiGetMemory() {
  console.log('📤 GET /memory?user_id=' + API_CONFIG.userId);
  
  // Mock response
  return {
    language: "english",
    preference: "normal speech",
    allergies: "none recorded"
  };
  
  /* Uncomment when backend is ready:
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/memory?user_id=${API_CONFIG.userId}`);
    return await response.json();
  } catch (error) {
    console.error('Memory API Error:', error);
    return {};
  }
  */
}

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY AMBULANCE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

function callAmbulance() {
  console.log('🚑 EMERGENCY AMBULANCE CALLED');
  
  // Set panic emotion
  setEmotion('panic');
  
  // Update response panel with emergency message
  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent = '🚨 EMERGENCY SERVICES ACTIVATED 🚨\n\nCalling ambulance (108)...\nStay calm. Help is on the way.\n\nNearest ambulance dispatched from Manipal Hospital.\nEstimated arrival: 4-6 minutes.\n\n📍 Your location: ' + API_CONFIG.location + '\n📞 Emergency contact: 108';
  responseEl.style.whiteSpace = 'pre-line';
  
  // Add emergency actions
  currentActions = ['call_ambulance', 'emergency_info', 'find_hospital'];
  updateActionButtons(currentActions, 'panic');
  
  // Store in memory via API
  apiStoreMemory('last_emergency', new Date().toISOString());
  addMemory('🚨 Emergency ambulance called', 'EMERGENCY');
  
  // Scroll to response
  document.getElementById('response-section').scrollIntoView({ behavior: 'smooth' });
}

// Expose to global scope for onclick
window.callAmbulance = callAmbulance;

// ─────────────────────────────────────────────────────────────────────────────
// VOICE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

let isListening = false;
let recognition = null;

function toggleListening() {
  if (!isListening) {
    startListening();
  } else {
    stopListening();
  }
}

function startListening() {
  isListening = true;
  document.body.classList.add('listening');
  document.getElementById('mic-btn').textContent = '⏹';
  document.getElementById('mic-label').textContent = 'LISTENING...';

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      document.getElementById('query-input').value = transcript;
      stopListening();
      submitQuery();
    };
    recognition.onerror = () => stopListening();
    recognition.onend = () => stopListening();
    recognition.start();
  } else {
    // Simulate if no browser support (demo mode)
    setTimeout(() => {
      document.getElementById('query-input').value = 'I have chest pain and difficulty breathing';
      stopListening();
      submitQuery();
    }, 2500);
  }
}

function stopListening() {
  isListening = false;
  document.body.classList.remove('listening');
  document.getElementById('mic-btn').textContent = '🎙';
  document.getElementById('mic-label').textContent = 'TAP TO SPEAK';
  if (recognition) { try { recognition.stop(); } catch(e){} }
}

window.toggleListening = toggleListening;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK RESPONSES (Following API contract structure)
// ─────────────────────────────────────────────────────────────────────────────

const mockResponses = [
  {
    query_match: ['chest', 'pain', 'breathing', 'breathe', 'heart'],
    response: "⚠ This sounds serious. Chest pain with difficulty breathing can indicate a cardiac or respiratory emergency. Stop all activity immediately. Sit down and stay calm. Do not eat or drink anything. If pain is severe or worsens — call emergency services NOW.",
    actions: ['call_ambulance', 'find_hospital', 'emergency_info'],
    emotion: 'panic'
  },
  {
    query_match: ['fever', 'temperature', 'hot', 'chills'],
    response: "You may have a fever. Rest and stay hydrated — drink water or ORS. Take paracetamol (500mg) if fever is above 38°C. Monitor your temperature every 2–3 hours. If fever exceeds 39.5°C or persists for more than 3 days, consult a doctor.",
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: 'concern'
  },
  {
    query_match: ['headache', 'head', 'migraine'],
    response: "For a headache, rest in a quiet, dark room. Stay hydrated and avoid bright screens. You can take a mild painkiller like paracetamol. If the headache is sudden and very severe, or is accompanied by vision changes or stiff neck — seek emergency care immediately.",
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: 'concern'
  },
  {
    query_match: ['cold', 'cough', 'runny', 'nose', 'sneeze'],
    response: "This sounds like a common cold. Rest well and drink warm fluids — honey-ginger tea can help. You may take an OTC cold medicine. Avoid cold drinks and spicy food. If symptoms persist beyond 7 days or you develop high fever, consult a doctor.",
    actions: ['find_doctor', 'find_pharmacy'],
    emotion: 'calm'
  },
  {
    query_match: ['emergency', 'help', 'accident', 'unconscious', 'faint', 'ambulance'],
    response: "🚨 EMERGENCY DETECTED. Call 108 (ambulance) immediately. If the person is unconscious: check for breathing, place in recovery position. Do NOT move them if a spinal injury is suspected. Stay on the line with emergency services until help arrives.",
    actions: ['call_ambulance', 'call_police', 'emergency_info', 'find_hospital'],
    emotion: 'panic'
  }
];

const defaultResponse = {
  response: "I understand you have a health concern. Please describe your specific symptoms for more accurate guidance. I can help with: fever, headache, chest pain, breathing issues, colds, and more. For any emergency, use the EMERGENCY button.",
  actions: ['find_doctor', 'find_hospital'],
  emotion: 'calm'
};

const actionDefs = {
  call_ambulance: { icon: '🚑', label: 'Call Ambulance', cls: 'emergency' },
  call_police:    { icon: '🚔', label: 'Call Emergency', cls: 'emergency' },
  find_hospital:  { icon: '🏥', label: 'Find Hospital',  cls: '' },
  find_doctor:    { icon: '👨‍⚕️', label: 'Find Doctor',   cls: '' },
  find_pharmacy:  { icon: '💊', label: 'Find Pharmacy',  cls: '' },
  emergency_info: { icon: '📋', label: 'First Aid Info', cls: '' },
};

let currentActions = [];

function updateActionButtons(actions, emotion) {
  const container = document.getElementById('actions-container');
  if (!actions || actions.length === 0) {
    container.innerHTML = '<div class="actions-empty">No actions suggested yet</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'actions-grid fadeIn';

  actions.forEach(key => {
    const def = actionDefs[key];
    if (!def) return;
    const btn = document.createElement('button');
    btn.className = 'action-btn ' + (def.cls || '');
    btn.innerHTML = `<span class="btn-icon">${def.icon}</span> ${def.label}`;
    btn.onclick = () => handleAction(key);
    grid.appendChild(btn);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

function handleAction(action) {
  const messages = {
    call_ambulance: 'Connecting to ambulance service (108)...',
    call_police:    'Connecting to emergency services (112)...',
    find_hospital:  'Nearest hospital: Manipal Hospital — 2.4km (MG Road, Bangalore)',
    find_doctor:    'Finding available doctors near you... 3 available within 5km',
    find_pharmacy:  'Nearest pharmacy: Apollo Pharmacy — 0.8km (open 24hrs)',
    emergency_info: 'Loading first aid instructions for your situation...',
  };
  
  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent += '\n\n◈ ' + (messages[action] || 'Processing...');
  responseEl.style.whiteSpace = 'pre-line';

  addMemory(messages[action], 'ACTION');
  
  // If ambulance action, trigger emergency
  if (action === 'call_ambulance') {
    callAmbulance();
  }
}

function addMemory(text, type) {
  const list = document.getElementById('memory-list');
  const item = document.createElement('div');
  item.className = 'memory-item active fadeIn';
  const now = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
  item.innerHTML = `${text}<span class="mem-time">${type} · ${now}</span>`;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 5) list.removeChild(list.lastChild);
  
  // Also update history
  updateHistory(text, type);
}

function updateHistory(text, type) {
  const historyList = document.getElementById('history-list');
  const item = document.createElement('div');
  item.className = 'history-item fadeIn';
  const now = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
  item.innerHTML = `<strong>${type}</strong>: ${text} <span style="float:right;font-size:9px;">${now}</span>`;
  historyList.insertBefore(item, historyList.firstChild);
  if (historyList.children.length > 8) historyList.removeChild(historyList.lastChild);
}

async function submitQuery() {
  const input = document.getElementById('query-input');
  const query = input.value.trim();
  if (!query) return;

  // Show typing indicator
  const typingDots = document.getElementById('typing-dots');
  const responseEl = document.getElementById('response-text');
  typingDots.classList.add('visible');
  responseEl.textContent = '';
  responseEl.classList.remove('empty');
  input.value = '';

  // Add to memory
  addMemory('"' + query + '"', 'QUERY');

  // Call API (POST /ask)
  const result = await apiAsk(query);

  typingDots.classList.remove('visible');

  // Set response text
  responseEl.textContent = result.response;
  responseEl.style.whiteSpace = 'pre-line';
  responseEl.classList.remove('empty');
  responseEl.classList.add('fadeIn');

  // Set emotion
  setEmotion(result.emotion);

  // Set actions
  currentActions = result.actions;
  updateActionButtons(result.actions, result.emotion);

  // Store in memory via API
  addMemory('Response delivered · Emotion: ' + result.emotion.toUpperCase(), 'RESPONSE');
  
  // Scroll to response
  document.getElementById('response-section').scrollIntoView({ behavior: 'smooth' });
}

// Expose to global scope
window.submitQuery = submitQuery;
window.setEmotion = setEmotion;

// Allow Enter key
document.getElementById('query-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitQuery();
});

// Initialize memory on load
(async function init() {
  const memory = await apiGetMemory();
  console.log('Memory loaded:', memory);
})();

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// Language Settings
function updateLanguage() {
  const language = document.getElementById('language-select').value;
  console.log('Language changed to:', language);
  addMemory('Language preference set to: ' + language, 'SETTING');
  
  // Store in memory via API
  apiStoreMemory('language', language);
}

// Speech Speed Slider
const speedSlider = document.getElementById('speech-speed');
const speedValue = document.getElementById('speed-value');
if (speedSlider && speedValue) {
  speedSlider.addEventListener('input', function() {
    const speed = parseFloat(this.value).toFixed(1);
    const speedText = speed == 1.0 ? 'Normal' : (speed < 1.0 ? 'Slow' : 'Fast');
    speedValue.textContent = `${speedText} (${speed}x)`;
  });
}

// Alert Volume Slider
const volumeSlider = document.getElementById('alert-volume');
const volumeValue = document.getElementById('volume-value');
if (volumeSlider && volumeValue) {
  volumeSlider.addEventListener('input', function() {
    volumeValue.textContent = this.value + '%';
  });
}

// High Contrast Mode
function toggleHighContrast() {
  const checkbox = document.getElementById('high-contrast');
  document.body.classList.toggle('high-contrast', checkbox.checked);
  addMemory('High contrast mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

// Large Text Mode
function toggleLargeText() {
  const checkbox = document.getElementById('large-text');
  document.body.classList.toggle('large-text', checkbox.checked);
  addMemory('Large text mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

// Reduced Motion
function toggleReducedMotion() {
  const checkbox = document.getElementById('reduce-motion');
  document.body.classList.toggle('reduced-motion', checkbox.checked);
  addMemory('Reduced motion: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

// Screen Reader Optimization
function toggleScreenReader() {
  const checkbox = document.getElementById('screen-reader');
  if (checkbox.checked) {
    document.querySelectorAll('[aria-hidden]').forEach(el => el.setAttribute('aria-hidden', 'false'));
  }
  addMemory('Screen reader mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

// Theme Change
function changeTheme() {
  const theme = document.getElementById('theme-select').value;
  document.body.classList.remove('theme-darker', 'theme-blue', 'theme-purple');
  if (theme !== 'dark') {
    document.body.classList.add('theme-' + theme);
  }
  addMemory('Theme changed to: ' + theme, 'SETTING');
  apiStoreMemory('theme', theme);
}

// Save All Settings
async function saveAllSettings() {
  const settings = {
    language: document.getElementById('language-select')?.value,
    responseLanguage: document.getElementById('response-language')?.value,
    speechSpeed: document.getElementById('speech-speed')?.value,
    voiceGender: document.getElementById('voice-gender')?.value,
    voicePitch: document.getElementById('voice-pitch')?.value,
    highContrast: document.getElementById('high-contrast')?.checked,
    largeText: document.getElementById('large-text')?.checked,
    reduceMotion: document.getElementById('reduce-motion')?.checked,
    screenReader: document.getElementById('screen-reader')?.checked,
    soundAlerts: document.getElementById('sound-alerts')?.checked,
    vibration: document.getElementById('vibration')?.checked,
    emergencyAlerts: document.getElementById('emergency-alerts')?.checked,
    alertVolume: document.getElementById('alert-volume')?.value,
    ageGroup: document.getElementById('age-group')?.value,
    userGender: document.getElementById('user-gender')?.value,
    medicalHistory: document.getElementById('medical-history')?.value,
    emergencyContact1: document.getElementById('emergency-contact-1')?.value,
    emergencyContact2: document.getElementById('emergency-contact-2')?.value,
    contactRelation: document.getElementById('contact-relation')?.value,
    storeHistory: document.getElementById('store-history')?.checked,
    shareAnalytics: document.getElementById('share-analytics')?.checked,
    locationTracking: document.getElementById('location-tracking')?.checked,
    theme: document.getElementById('theme-select')?.value,
    fontSize: document.getElementById('font-size')?.value
  };
  
  console.log('Settings saved:', settings);
  
  // Store in memory via API
  await apiStoreMemory('user_settings', JSON.stringify(settings));
  
  addMemory('All settings saved successfully', 'SETTINGS');
  
  // Show confirmation
  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent = '✅ Settings saved successfully!\n\nYour preferences have been updated and stored.';
  responseEl.style.whiteSpace = 'pre-line';
}

// Reset Settings
function resetSettings() {
  if (confirm('Reset all settings to default values?')) {
    // Reset all form elements
    document.getElementById('language-select').value = 'english';
    document.getElementById('response-language').value = 'english';
    document.getElementById('speech-speed').value = '1.0';
    document.getElementById('speed-value').textContent = 'Normal (1.0x)';
    document.getElementById('voice-gender').value = 'female';
    document.getElementById('voice-pitch').value = 'medium';
    document.getElementById('high-contrast').checked = false;
    document.getElementById('large-text').checked = false;
    document.getElementById('reduce-motion').checked = false;
    document.getElementById('screen-reader').checked = false;
    document.getElementById('sound-alerts').checked = true;
    document.getElementById('vibration').checked = true;
    document.getElementById('emergency-alerts').checked = true;
    document.getElementById('alert-volume').value = '70';
    document.getElementById('volume-value').textContent = '70%';
    document.getElementById('age-group').value = 'adult';
    document.getElementById('user-gender').value = 'female';
    document.getElementById('medical-history').value = 'none';
    document.getElementById('emergency-contact-1').value = '';
    document.getElementById('emergency-contact-2').value = '';
    document.getElementById('contact-relation').value = 'spouse';
    document.getElementById('store-history').checked = true;
    document.getElementById('share-analytics').checked = true;
    document.getElementById('location-tracking').checked = true;
    document.getElementById('theme-select').value = 'dark';
    document.getElementById('font-size').value = 'medium';
    
    // Remove all theme classes
    document.body.classList.remove('high-contrast', 'large-text', 'reduced-motion', 'theme-darker', 'theme-blue', 'theme-purple');
    
    addMemory('Settings reset to default', 'SETTINGS');
    
    const responseEl = document.getElementById('response-text');
    responseEl.classList.remove('empty');
    responseEl.textContent = '↻ Settings reset to default values.';
  }
}

// Clear All Data
function clearAllData() {
  if (confirm('Clear all stored data? This cannot be undone!')) {
    // Clear memory list
    const memoryList = document.getElementById('memory-list');
    memoryList.innerHTML = `
      <div class="memory-item active">
        Language: English · Speech: Normal speed
        <span class="mem-time">PREFERENCE · DEFAULT</span>
      </div>
      <div class="memory-item">
        No known allergies recorded
        <span class="mem-time">MEDICAL · DEFAULT</span>
      </div>
      <div class="memory-item">
        All data cleared · ${new Date().toLocaleTimeString()}
        <span class="mem-time">SYSTEM · RESET</span>
      </div>
    `;
    
    // Clear history
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="history-item">Data cleared - Starting fresh</div>';
    
    addMemory('All user data cleared', 'SYSTEM');
    
    const responseEl = document.getElementById('response-text');
    responseEl.classList.remove('empty');
    responseEl.textContent = '🗑️ All stored data has been cleared.\n\nYour session has been reset.';
    responseEl.style.whiteSpace = 'pre-line';
  }
}

// Expose functions to global scope
window.updateLanguage = updateLanguage;
window.toggleHighContrast = toggleHighContrast;
window.toggleLargeText = toggleLargeText;
window.toggleReducedMotion = toggleReducedMotion;
window.toggleScreenReader = toggleScreenReader;
window.changeTheme = changeTheme;
window.saveAllSettings = saveAllSettings;
window.resetSettings = resetSettings;
window.clearAllData = clearAllData;

// Initialize settings event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize slider displays
  const speedSlider = document.getElementById('speech-speed');
  if (speedSlider) {
    speedSlider.dispatchEvent(new Event('input'));
  }
  
  const volumeSlider = document.getElementById('alert-volume');
  if (volumeSlider) {
    volumeSlider.dispatchEvent(new Event('input'));
  }
});
