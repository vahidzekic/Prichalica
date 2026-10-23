/**
 * UI wiring: connects the page's controls, translations and animated avatar
 * to a Chatterbox. All audio logic lives in chatterbox.js and src/audio/.
 */
import { Chatterbox, State } from './chatterbox.js';
import { DEFAULT_CONFIG } from './config.js';
import { VOICES } from './audio/effects.js';
import { AVATARS, DEFAULT_AVATAR, avatarSvg } from './avatars.js';
import { DEFAULT_LANGUAGE, LANGUAGES, applyTranslations, translate } from './i18n.js';

/** Icon shown on each voice button. */
const VOICE_ICONS = { toy: '🧸', child: '👶', female: '👩', male: '👨', robot: '🤖' };

/** Meter range in dBFS. */
const METER_MIN_DB = -80;
const METER_MAX_DB = -10;

/** Output RMS that counts as a fully open mouth. */
const MOUTH_FULL_RMS = 0.22;

const SETTINGS_KEY = 'prichalica.settings';

const $ = (id) => document.getElementById(id);
const ui = {
  buddy: $('buddy'),
  figure: $('buddy-figure'),
  status: $('status'),
  meter: document.querySelector('.meter'),
  meterFill: $('meter-fill'),
  meterThreshold: $('meter-threshold'),
  toggle: $('toggle'),
  voices: $('voices'),
  characters: $('characters'),
  pitch: $('pitch'),
  pitchValue: $('pitch-value'),
  sensitivity: $('sensitivity'),
  sensitivityValue: $('sensitivity-value'),
  langButtons: document.querySelectorAll('[data-lang]'),
};

const settings = loadSettings();
const t = (key, params) => translate(settings.lang, key, params);
/** Message key + params currently shown in the status line (re-translated on language change). */
let statusMessage = { key: 'status.idle', params: {} };

const toy = new Chatterbox({
  effect: { voice: settings.voice, pitchOffset: settings.pitchOffset },
  vad: { startMarginDb: settings.sensitivity },
});

// --- Build the pickers ---

for (const id of Object.keys(VOICES)) {
  ui.voices.append(chip({ id, kind: 'voice', icon: VOICE_ICONS[id] }));
}
for (const id of Object.keys(AVATARS)) {
  ui.characters.append(chip({ id, kind: 'character', iconHtml: avatarSvg(id) }));
}

function chip({ id, kind, icon, iconHtml }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.dataset[kind] = id;
  const iconEl = document.createElement('span');
  iconEl.className = 'chip__icon';
  iconEl.setAttribute('aria-hidden', 'true');
  if (iconHtml) iconEl.innerHTML = iconHtml;
  else iconEl.textContent = icon;
  const label = document.createElement('span');
  label.className = 'chip__label';
  label.dataset.i18n = `${kind}.${id}`;
  button.append(iconEl, label);
  return button;
}

// --- Toy events -> UI ---

toy.addEventListener('statechange', ({ detail: { state } }) => {
  ui.buddy.dataset.state = state;
  setStatus(`status.${state}`);
  renderToggle();
  if (state === State.IDLE) setMeter(METER_MIN_DB, null);
});

toy.addEventListener('level', ({ detail: { levelDb, thresholdDb } }) => {
  setMeter(levelDb, thresholdDb);
});

toy.addEventListener('error', ({ detail: { error } }) => {
  console.error(error);
  setStatus('error.runtime', { message: error.message });
});

// --- UI -> toy ---

ui.toggle.addEventListener('click', async () => {
  ui.toggle.disabled = true;
  try {
    if (toy.running) {
      await toy.stop();
    } else {
      await toy.start();
    }
  } catch (error) {
    setStatus(...describeStartError(error));
  } finally {
    ui.toggle.disabled = false;
  }
});

ui.voices.addEventListener('click', (event) => {
  const button = event.target.closest('[data-voice]');
  if (!button) return;
  selectVoice(button.dataset.voice);
});

ui.characters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-character]');
  if (!button) return;
  selectCharacter(button.dataset.character);
});

ui.pitch.addEventListener('input', () => {
  const pitchOffset = Number(ui.pitch.value);
  toy.setEffect({ pitchOffset });
  ui.pitchValue.textContent = formatSigned(pitchOffset);
  saveSettings({ pitchOffset });
});

ui.sensitivity.addEventListener('input', () => {
  const db = Number(ui.sensitivity.value);
  toy.setSensitivity(db);
  ui.sensitivityValue.textContent = `${db} dB`;
  saveSettings({ sensitivity: db });
});

for (const button of ui.langButtons) {
  button.addEventListener('click', () => setLanguage(button.dataset.lang));
}

// --- Initial state ---

selectVoice(settings.voice);
selectCharacter(settings.character);
ui.pitch.value = String(settings.pitchOffset);
ui.pitchValue.textContent = formatSigned(settings.pitchOffset);
ui.sensitivity.value = String(settings.sensitivity);
ui.sensitivityValue.textContent = `${settings.sensitivity} dB`;
setLanguage(settings.lang);
startBlinking();
requestAnimationFrame(animateMouth);

// --- Language ---

function setLanguage(lang) {
  if (!(lang in LANGUAGES)) lang = DEFAULT_LANGUAGE;
  saveSettings({ lang });
  document.documentElement.lang = lang;
  document.title = translate(lang, 'app.title');
  document.querySelector('meta[name="description"]').content = translate(lang, 'app.description');
  applyTranslations(document, lang);
  for (const button of ui.langButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    button.title = LANGUAGES[button.dataset.lang];
  }
  for (const button of ui.characters.querySelectorAll('[data-character]')) {
    button.title = translate(lang, `character.${button.dataset.character}`);
  }
  renderToggle();
  renderStatus();
}

function setStatus(key, params = {}) {
  statusMessage = { key, params };
  renderStatus();
}

function renderStatus() {
  ui.status.textContent = t(statusMessage.key, statusMessage.params);
}

function renderToggle() {
  const on = toy.state !== State.IDLE;
  ui.toggle.textContent = t(on ? 'button.stop' : 'button.start');
  ui.toggle.setAttribute('aria-pressed', String(on));
}

// --- Voice and character ---

function selectVoice(voice) {
  if (!(voice in VOICES)) voice = DEFAULT_CONFIG.effect.voice;
  toy.setEffect({ voice });
  markSelected(ui.voices, 'voice', voice);
  saveSettings({ voice });
}

function selectCharacter(character) {
  if (!(character in AVATARS)) character = DEFAULT_AVATAR;
  ui.figure.innerHTML = avatarSvg(character);
  ui.buddy.dataset.character = character;
  markSelected(ui.characters, 'character', character);
  saveSettings({ character });
}

function markSelected(container, kind, id) {
  for (const button of container.querySelectorAll(`[data-${kind}]`)) {
    button.setAttribute('aria-pressed', String(button.dataset[kind] === id));
  }
}

// --- Avatar animation ---

/**
 * Lip-sync: every animation frame, read how loud the toy is talking and set
 * the --mouth CSS variable (0 = closed, 1 = wide open). The stylesheet turns
 * that into the mouth height, jaw drop and a little squash of the head.
 */
let mouth = 0;
function animateMouth() {
  const target = toy.state === State.SPEAKING ? Math.min(1, toy.outputLevel / MOUTH_FULL_RMS) : 0;
  // Open quickly, close a little slower, like a real mouth.
  mouth += (target - mouth) * (target > mouth ? 0.55 : 0.25);
  if (mouth < 0.01) mouth = 0;
  ui.buddy.style.setProperty('--mouth', mouth.toFixed(3));
  requestAnimationFrame(animateMouth);
}

/** Blinks at random intervals of 2–5.5 s, sometimes twice in a row. */
function startBlinking() {
  const blink = () => {
    ui.buddy.classList.add('is-blinking');
    setTimeout(() => ui.buddy.classList.remove('is-blinking'), 150);
  };
  const scheduleNext = () => {
    setTimeout(() => {
      blink();
      if (Math.random() < 0.25) setTimeout(blink, 300);
      scheduleNext();
    }, 2000 + Math.random() * 3500);
  };
  scheduleNext();
}

// --- Helpers ---

function setMeter(levelDb, thresholdDb) {
  ui.meterFill.style.width = `${dbToPercent(levelDb)}%`;
  ui.meter.dataset.hot = String(thresholdDb !== null && levelDb > thresholdDb);
  ui.meterThreshold.hidden = thresholdDb === null;
  if (thresholdDb !== null) ui.meterThreshold.style.left = `${dbToPercent(thresholdDb)}%`;
}

function dbToPercent(db) {
  const fraction = (db - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
  return Math.min(100, Math.max(0, fraction * 100));
}

function formatSigned(n) {
  return n > 0 ? `+${n}` : String(n);
}

/** @returns {[string, object?]} i18n key and params for a start() failure. */
function describeStartError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return ['error.blocked'];
    case 'NotFoundError':
      return ['error.notFound'];
    case 'NotReadableError':
      return ['error.busy'];
    case 'NotSupportedError':
      return ['error.unsupported'];
    default:
      return ['error.start', { message: error?.message ?? String(error) }];
  }
}

/** Saved settings are a convenience only; everything works without storage. */
function loadSettings() {
  const defaults = {
    lang: DEFAULT_LANGUAGE,
    character: DEFAULT_AVATAR,
    voice: DEFAULT_CONFIG.effect.voice,
    pitchOffset: DEFAULT_CONFIG.effect.pitchOffset,
    sensitivity: DEFAULT_CONFIG.vad.startMarginDb,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    // Only keep keys we know, so settings from older versions can't leak in.
    for (const key of Object.keys(defaults)) {
      if (typeof saved[key] === typeof defaults[key]) defaults[key] = saved[key];
    }
  } catch {
    // Storage unavailable or corrupt: use defaults.
  }
  return defaults;
}

function saveSettings(patch) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, blocked cookies): ignore.
  }
}
