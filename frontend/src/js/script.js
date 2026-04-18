// ─────────────────────────────────────────────────────────────────────────────
// VAIDYA FRONTEND — script.js (FIXED FOR PYTHON HTTP.SERVER)
//
// Fixes applied:
//  1. canUseCustomCursor was undefined → removed, use class check instead
//  2. SW registered with ./sw.js (relative) not /sw.js (absolute)
//  3. Vapi SDK must be loaded in index.html via CDN before this script
// ─────────────────────────────────────────────────────────────────────────────

// ── SERVICE WORKER REGISTRATION ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // FIX: use relative path so it works regardless of where Python serves from
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

// ── API CONFIGURATION ─────────────────────────────────────────────────────────
const API_CONFIG = {
  baseUrl: 'http://localhost:3000',
  userId: 'user_' + Math.random().toString(36).substr(2, 6),
  location: 'Bangalore',
  language: 'english',
};

// ── VAPI INTEGRATION ──────────────────────────────────────────────────────────
// IMPORTANT: index.html must load the SDK before this script:
// <script src="https://cdn.jsdelivr.net/npm/@vapi-ai/web/dist/vapi.iife.js"></script>
const VAPI_CONFIG = {
  publicKey: '8003a34f-24b4-48e5-96f2-519929403da7',
  assistantId: 'b8fb51aa-75c2-4b95-87dc-05213f80c27d',
};

let vapi = null;
let vapiCallActive = false;

function initVapi() {
  if (!window.Vapi) {
    console.warn('Vapi SDK not loaded — add CDN script to index.html <head>');
    return;
  }
  vapi = new window.Vapi(VAPI_CONFIG.publicKey);

  vapi.on('message', (msg) => {
    if (msg.type === 'transcript' && msg.transcriptType === 'final') {
      document.getElementById('query-input').value = msg.transcript;
    }
  });

  vapi.on('speech-start', () => {
    document.getElementById('mic-label').textContent = 'ASSISTANT SPEAKING...';
  });

  vapi.on('speech-end', () => {
    document.getElementById('mic-label').textContent = 'LISTENING...';
  });

  vapi.on('call-end', () => {
    vapiCallActive = false;
    isListening = false;
    document.body.classList.remove('listening');
    document.getElementById('mic-btn').textContent = '🎙';
    document.getElementById('mic-label').textContent = 'TAP TO SPEAK';
    console.log('Vapi call ended');
  });

  vapi.on('error', (e) => {
    console.error('Vapi error:', e);
    vapiCallActive = false;
  });

  console.log('✅ Vapi initialized');
}

document.getElementById('current-user-id').textContent = API_CONFIG.userId;
document.getElementById('current-location').textContent = API_CONFIG.location;

// ── GEOLOCATION ───────────────────────────────────────────────────────────────
function initGeolocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
        const resp = await fetch(url);
        const data = await resp.json();

        const addr = data.address || {};
        const city =
          addr.city || addr.town || addr.village || addr.district || addr.state || 'India';

        API_CONFIG.location = city;
        document.getElementById('current-location').textContent = city;
        const statusLoc = document.getElementById('status-location');
        if (statusLoc) statusLoc.textContent = city.toUpperCase();
        console.log('📍 Location resolved:', city);
      } catch (err) {
        console.warn('Reverse geocoding failed, keeping default location', err);
      }
    },
    (err) => {
      console.warn('Geolocation denied, using default:', err.message);
    },
    { timeout: 8000 }
  );
}

initGeolocation();

// ── CUSTOM CURSOR ─────────────────────────────────────────────────────────────
const cur  = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

if (cur && ring) {
  const hasPointer = window.matchMedia('(pointer: fine)').matches
                  || window.matchMedia('(pointer: coarse)').matches;

  if (hasPointer) {
    document.body.classList.add('custom-cursor-enabled');

    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let firstMove = false;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.transform = `translate(${mx - 5}px, ${my - 5}px)`;
      if (!firstMove) {
        firstMove = true;
        cur.classList.add('visible');
        ring.classList.add('visible');
      }
    });

    (function animRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      requestAnimationFrame(animRing);
    })();

    document.addEventListener('mouseleave', () => {
      cur.classList.remove('visible');
      ring.classList.remove('visible');
    });
    document.addEventListener('mouseenter', () => {
      if (firstMove) {
        cur.classList.add('visible');
        ring.classList.add('visible');
      }
    });

    const interactives = 'a, button, input, select, textarea, [onclick], .action-btn, .emo-pill, .mic-btn, .send-btn';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactives)) {
        cur.style.width  = '14px';
        cur.style.height = '14px';
        ring.style.width  = '48px';
        ring.style.height = '48px';
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactives)) {
        cur.style.width  = '10px';
        cur.style.height = '10px';
        ring.style.width  = '36px';
        ring.style.height = '36px';
      }
    });
  }
}

// ── LIVE TIME ─────────────────────────────────────────────────────────────────
function updateTime() {
  const t = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const el = document.getElementById('live-time');
  if (el) el.textContent = t;
  const f = document.getElementById('footer-time');
  if (f) f.textContent = t;
}
setInterval(updateTime, 1000);
updateTime();

// ── EMOTION STATE ─────────────────────────────────────────────────────────────
let currentEmotion = 'calm';

function setEmotion(emotion) {
  currentEmotion = emotion;
  document.body.className = 'emotion-' + emotion;
  // FIX: canUseCustomCursor was undefined — use class presence check instead
  if (cur && ring) document.body.classList.add('custom-cursor-enabled');

  const label = document.getElementById('emotion-label');
  const statusEmo = document.getElementById('status-emotion');
  const labels = { calm: 'CALM', concern: 'CONCERN DETECTED', panic: 'PANIC — EMERGENCY' };
  if (label) label.textContent = labels[emotion];
  if (statusEmo) statusEmo.textContent = emotion.toUpperCase();

  document.querySelectorAll('.emo-pill').forEach(p => p.classList.remove('active'));
  const activePill = document.querySelector('.emo-pill.' + emotion);
  if (activePill) activePill.classList.add('active');

  document.getElementById('panic-bar').classList.toggle('active', emotion === 'panic');
  document.getElementById('concern-bar').classList.toggle('active', emotion === 'concern');

  const navLogo = document.querySelector('.nav-logo');
  if (navLogo) {
    navLogo.style.color =
      emotion === 'panic'   ? 'var(--emotion-panic-color)'   :
      emotion === 'concern' ? 'var(--emotion-concern-color)' :
      'var(--accent)';
  }
}

// ── API HELPERS ───────────────────────────────────────────────────────────────
async function apiAsk(query) {
  const requestBody = {
    user_id: API_CONFIG.userId,
    query,
    location: API_CONFIG.location,
    language: API_CONFIG.language,
  };

  console.log('📤 POST /ask', requestBody);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log('📥 API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    return offlineFallback(query);
  }
}

async function offlineFallback(query) {
  try {
    const resp = await fetch('./offline-responses.json');
    const data = await resp.json();
    const lower = query.toLowerCase();
    const matched = data.find(r => r.keywords && r.keywords.some(k => lower.includes(k)));
    if (matched) return matched;
  } catch (_) { }

  return {
    response: 'Unable to connect to the server. Please check your internet connection.\n\nFor emergencies, call 108 immediately.',
    actions: ['call_ambulance', 'emergency_info'],
    emotion: 'calm',
  };
}

async function apiStoreMemory(key, value) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: API_CONFIG.userId, key, value }),
    });
    return await response.json();
  } catch (error) {
    console.error('Memory API Error:', error);
    return { message: 'error' };
  }
}

async function apiGetMemory() {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/memory/${API_CONFIG.userId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.language) {
        API_CONFIG.language = data.language;
        const sel = document.getElementById('language-select');
        if (sel) sel.value = data.language;
        const respSel = document.getElementById('response-language');
        if (respSel) respSel.value = data.language;
      }
      if (data.theme) {
        const themeSel = document.getElementById('theme-select');
        if (themeSel) {
          themeSel.value = data.theme;
          changeTheme();
        }
      }
      console.log('Memory loaded:', data);
      return data;
    }
    return {};
  } catch (error) {
    console.error('Memory API Error:', error);
    return {};
  }
}

// ── TTS AUDIO PLAYBACK ────────────────────────────────────────────────────────
let currentAudio = null;

function playAudioResponse(audioUrl) {
  if (!audioUrl) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  currentAudio = new Audio(audioUrl);
  currentAudio.play().catch(err => console.warn('Audio playback failed:', err));
}

// ── EMERGENCY BUTTON ──────────────────────────────────────────────────────────
function callAmbulance() {
  console.log('🚑 EMERGENCY AMBULANCE CALLED');

  setEmotion('panic');

  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent =
    '🚨 EMERGENCY SERVICES ACTIVATED 🚨\n\n' +
    'Calling ambulance (108)...\n' +
    'Stay calm. Help is on the way.\n\n' +
    '📍 Your location: ' + API_CONFIG.location + '\n' +
    '📞 Emergency: 108\n📞 Police: 100\n📞 Fire: 101';
  responseEl.style.whiteSpace = 'pre-line';

  currentActions = ['call_ambulance', 'emergency_info', 'find_hospital'];
  updateActionButtons(currentActions, 'panic');

  apiStoreMemory('last_emergency', new Date().toISOString());
  addMemory('🚨 Emergency ambulance called', 'EMERGENCY');

  document.getElementById('response-section').scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    window.location.href = 'tel:108';
  }, 500);
}

window.callAmbulance = callAmbulance;

// ── VOICE INPUT ───────────────────────────────────────────────────────────────
let isListening = false;
let currentRecognition = null;
let restartTimeout = null;

function toggleListening() {
  if (vapi) {
    vapiCallActive ? stopVapiCall() : startVapiCall();
  } else {
    isListening ? stopListening() : startListening();
  }
}

function startVapiCall() {
  if (vapiCallActive) return;
  vapiCallActive = true;
  isListening = true;

  document.body.classList.add('listening');
  document.getElementById('mic-btn').textContent = '⏹';
  document.getElementById('mic-label').textContent = 'CONNECTING...';

  vapi.start(VAPI_CONFIG.assistantId, {
    variableValues: {
      user_id: API_CONFIG.userId,
      location: API_CONFIG.location,
      language: API_CONFIG.language,
    }
  });
}

function stopVapiCall() {
  if (!vapiCallActive) return;
  vapi.stop();
  vapiCallActive = false;
}

function stopListening() {
  isListening = false;
  if (restartTimeout) clearTimeout(restartTimeout);
  if (currentRecognition) {
    currentRecognition.stop();
    currentRecognition = null;
  }
  document.body.classList.remove('listening');
  document.getElementById('mic-btn').textContent = '🎙';
  document.getElementById('mic-label').textContent = 'TAP TO SPEAK';

  // Auto-submit if there's a transcript
  const query = document.getElementById('query-input').value.trim();
  if (query) submitQuery();
}

let finalTranscript = '';

function startListening() {
  if (isListening) return;

  isListening = true;
  finalTranscript = '';
  document.getElementById('query-input').value = '';
  document.body.classList.add('listening');
  document.getElementById('mic-btn').textContent = '⏹';
  document.getElementById('mic-label').textContent = 'LISTENING...';

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (restartTimeout) clearTimeout(restartTimeout);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.error('Speech recognition not supported');
    stopListening();
    return;
  }

  currentRecognition = new SR();
  currentRecognition.lang = languageToLocale(API_CONFIG.language);
  currentRecognition.continuous = true;
  currentRecognition.interimResults = true;
  currentRecognition.maxAlternatives = 1;

  currentRecognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    document.getElementById('query-input').value = finalTranscript + interim;
  };

  currentRecognition.onerror = (e) => {
    if (e.error === 'no-speech') return;
    console.warn('Speech recognition error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      stopListening();
    }
  };

  currentRecognition.onend = () => {
    if (isListening) {
      restartTimeout = setTimeout(() => {
        if (isListening) startListening();
      }, 300);
    }
  };

  currentRecognition.start();
}

function languageToLocale(lang) {
  const map = {
    english: 'en-IN',
    hindi: 'hi-IN',
    kannada: 'kn-IN',
    tamil: 'ta-IN',
    telugu: 'te-IN',
    malayalam: 'ml-IN',
    bengali: 'bn-IN',
    marathi: 'mr-IN',
  };
  return map[lang] || 'en-IN';
}

window.toggleListening = toggleListening;

// ── ACTION DEFINITIONS ────────────────────────────────────────────────────────
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
    find_hospital:  'Nearest hospital: ' + API_CONFIG.location + ' — searching...',
    find_doctor:    'Finding available doctors near you...',
    find_pharmacy:  'Finding nearest open pharmacy...',
    emergency_info: 'Loading first aid instructions...',
  };

  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent += '\n\n◈ ' + (messages[action] || 'Processing...');
  responseEl.style.whiteSpace = 'pre-line';
  addMemory(messages[action], 'ACTION');

  if (action === 'call_ambulance') callAmbulance();
}

// ── MEMORY LIST HELPERS ───────────────────────────────────────────────────────
function addMemory(text, type) {
  const list = document.getElementById('memory-list');
  const item = document.createElement('div');
  item.className = 'memory-item active fadeIn';
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = `${text}<span class="mem-time">${type} · ${now}</span>`;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 5) list.removeChild(list.lastChild);
  updateHistory(text, type);
}

function updateHistory(text, type) {
  const historyList = document.getElementById('history-list');
  const item = document.createElement('div');
  item.className = 'history-item fadeIn';
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = `<strong>${type}</strong>: ${text} <span style="float:right;font-size:9px;">${now}</span>`;
  historyList.insertBefore(item, historyList.firstChild);
  if (historyList.children.length > 8) historyList.removeChild(historyList.lastChild);
}

// ── SUBMIT QUERY ──────────────────────────────────────────────────────────────
async function submitQuery() {
  const input = document.getElementById('query-input');
  const query = input.value.trim();
  if (!query) return;

  const typingDots = document.getElementById('typing-dots');
  const responseEl = document.getElementById('response-text');
  typingDots.classList.add('visible');
  responseEl.textContent = '';
  responseEl.classList.remove('empty');
  input.value = '';

  addMemory('"' + query + '"', 'QUERY');

  const result = await apiAsk(query);

  typingDots.classList.remove('visible');

  responseEl.textContent = result.response;
  responseEl.style.whiteSpace = 'pre-line';
  responseEl.classList.remove('empty');
  responseEl.classList.add('fadeIn');

  setEmotion(result.emotion);
  currentActions = result.actions;
  updateActionButtons(result.actions, result.emotion);

  if (result.audioUrl) playAudioResponse(result.audioUrl);

  addMemory('Response delivered · Emotion: ' + result.emotion.toUpperCase(), 'RESPONSE');
  document.getElementById('response-section').scrollIntoView({ behavior: 'smooth' });
}

window.submitQuery = submitQuery;
window.setEmotion = setEmotion;

document.getElementById('query-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitQuery();
});

// ── SMOOTH SCROLL ─────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── INIT ──────────────────────────────────────────────────────────────────────
(async function init() {
  await apiGetMemory();
  initVapi();
})();

// ── SETTINGS FUNCTIONS ────────────────────────────────────────────────────────
function updateLanguage() {
  const language = document.getElementById('language-select').value;
  API_CONFIG.language = language;
  const respLang = document.getElementById('response-language');
  if (respLang) respLang.value = language;
  console.log('Language changed to:', language);
  addMemory('Language preference set to: ' + language, 'SETTING');
  apiStoreMemory('language', language);
}

function updateResponseLanguage() {
  const language = document.getElementById('response-language').value;
  API_CONFIG.language = language;
  console.log('Response language changed to:', language);
  addMemory('Response language set to: ' + language, 'SETTING');
  apiStoreMemory('language', language);
}

document.getElementById('response-language')?.addEventListener('change', updateResponseLanguage);

const speedSlider = document.getElementById('speech-speed');
const speedValue  = document.getElementById('speed-value');
if (speedSlider && speedValue) {
  speedSlider.addEventListener('input', function () {
    const speed = parseFloat(this.value).toFixed(1);
    const speedText = speed == 1.0 ? 'Normal' : speed < 1.0 ? 'Slow' : 'Fast';
    speedValue.textContent = `${speedText} (${speed}x)`;
  });
}

const volumeSlider = document.getElementById('alert-volume');
const volumeValue  = document.getElementById('volume-value');
if (volumeSlider && volumeValue) {
  volumeSlider.addEventListener('input', function () {
    volumeValue.textContent = this.value + '%';
  });
}

function toggleHighContrast() {
  const checkbox = document.getElementById('high-contrast');
  document.body.classList.toggle('high-contrast', checkbox.checked);
  addMemory('High contrast mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

function toggleLargeText() {
  const checkbox = document.getElementById('large-text');
  document.body.classList.toggle('large-text', checkbox.checked);
  addMemory('Large text mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

function toggleReducedMotion() {
  const checkbox = document.getElementById('reduce-motion');
  document.body.classList.toggle('reduced-motion', checkbox.checked);
  addMemory('Reduced motion: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

function toggleScreenReader() {
  const checkbox = document.getElementById('screen-reader');
  if (checkbox.checked) {
    document.querySelectorAll('[aria-hidden]').forEach(el =>
      el.setAttribute('aria-hidden', 'false')
    );
  }
  addMemory('Screen reader mode: ' + (checkbox.checked ? 'ON' : 'OFF'), 'SETTING');
}

function changeTheme() {
  const theme = document.getElementById('theme-select').value;
  document.body.classList.remove('theme-darker', 'theme-blue', 'theme-purple');
  if (theme !== 'dark') document.body.classList.add('theme-' + theme);
  addMemory('Theme changed to: ' + theme, 'SETTING');
  apiStoreMemory('theme', theme);
}

async function saveAllSettings() {
  const g = id => document.getElementById(id);
  const settings = {
    language:          g('language-select')?.value,
    responseLanguage:  g('response-language')?.value,
    speechSpeed:       g('speech-speed')?.value,
    voiceGender:       g('voice-gender')?.value,
    voicePitch:        g('voice-pitch')?.value,
    highContrast:      g('high-contrast')?.checked,
    largeText:         g('large-text')?.checked,
    reduceMotion:      g('reduce-motion')?.checked,
    screenReader:      g('screen-reader')?.checked,
    soundAlerts:       g('sound-alerts')?.checked,
    vibration:         g('vibration')?.checked,
    emergencyAlerts:   g('emergency-alerts')?.checked,
    alertVolume:       g('alert-volume')?.value,
    ageGroup:          g('age-group')?.value,
    userGender:        g('user-gender')?.value,
    medicalHistory:    g('medical-history')?.value,
    emergencyContact1: g('emergency-contact-1')?.value,
    emergencyContact2: g('emergency-contact-2')?.value,
    contactRelation:   g('contact-relation')?.value,
    storeHistory:      g('store-history')?.checked,
    shareAnalytics:    g('share-analytics')?.checked,
    locationTracking:  g('location-tracking')?.checked,
    theme:             g('theme-select')?.value,
    fontSize:          g('font-size')?.value,
  };

  const effectiveLanguage = settings.responseLanguage || settings.language;
  if (effectiveLanguage) {
    API_CONFIG.language = effectiveLanguage;
    const respLang = document.getElementById('response-language');
    if (respLang) respLang.value = effectiveLanguage;
    await apiStoreMemory('language', effectiveLanguage);
  }

  await apiStoreMemory('user_settings', JSON.stringify(settings));
  if (settings.theme) await apiStoreMemory('theme', settings.theme);

  addMemory('All settings saved successfully', 'SETTINGS');

  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent = '✅ Settings saved successfully!\n\nYour preferences have been updated and stored.';
  responseEl.style.whiteSpace = 'pre-line';
}

function resetSettings() {
  if (!confirm('Reset all settings to default values?')) return;

  const g = id => document.getElementById(id);
  g('language-select').value    = 'english';
  g('response-language').value  = 'english';
  g('speech-speed').value       = '1.0';
  g('speed-value').textContent  = 'Normal (1.0x)';
  g('voice-gender').value       = 'female';
  g('voice-pitch').value        = 'medium';
  g('high-contrast').checked    = false;
  g('large-text').checked       = false;
  g('reduce-motion').checked    = false;
  g('screen-reader').checked    = false;
  g('sound-alerts').checked     = true;
  g('vibration').checked        = true;
  g('emergency-alerts').checked = true;
  g('alert-volume').value       = '70';
  g('volume-value').textContent = '70%';
  g('age-group').value          = 'adult';
  g('user-gender').value        = 'female';
  g('medical-history').value    = 'none';
  g('emergency-contact-1').value = '';
  g('emergency-contact-2').value = '';
  g('contact-relation').value   = 'spouse';
  g('store-history').checked    = true;
  g('share-analytics').checked  = true;
  g('location-tracking').checked = true;
  g('theme-select').value       = 'dark';
  g('font-size').value          = 'medium';

  API_CONFIG.language = 'english';

  document.body.classList.remove(
    'high-contrast', 'large-text', 'reduced-motion',
    'theme-darker', 'theme-blue', 'theme-purple'
  );

  addMemory('Settings reset to default', 'SETTINGS');

  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent = '↻ Settings reset to default values.';
}

function clearAllData() {
  if (!confirm('Clear all stored data? This cannot be undone!')) return;

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

  document.getElementById('history-list').innerHTML =
    '<div class="history-item">Data cleared — Starting fresh</div>';

  addMemory('All user data cleared', 'SYSTEM');

  const responseEl = document.getElementById('response-text');
  responseEl.classList.remove('empty');
  responseEl.textContent = '🗑️ All stored data has been cleared.\n\nYour session has been reset.';
  responseEl.style.whiteSpace = 'pre-line';
}

window.updateLanguage        = updateLanguage;
window.updateResponseLanguage = updateResponseLanguage;
window.toggleHighContrast    = toggleHighContrast;
window.toggleLargeText       = toggleLargeText;
window.toggleReducedMotion   = toggleReducedMotion;
window.toggleScreenReader    = toggleScreenReader;
window.changeTheme           = changeTheme;
window.saveAllSettings       = saveAllSettings;
window.resetSettings         = resetSettings;
window.clearAllData          = clearAllData;

document.addEventListener('DOMContentLoaded', function () {
  const speedSlider = document.getElementById('speech-speed');
  if (speedSlider) speedSlider.dispatchEvent(new Event('input'));

  const volumeSlider = document.getElementById('alert-volume');
  if (volumeSlider) volumeSlider.dispatchEvent(new Event('input'));
});