/**
 * UI wiring: connects the page's buttons, sliders and character to a Chatterbox.
 * All audio logic lives in chatterbox.js and src/audio/.
 */
import { Chatterbox, State } from './chatterbox.js';
import { DEFAULT_CONFIG } from './config.js';

const STATUS_TEXT = {
  [State.IDLE]: 'Press Start and allow the microphone.',
  [State.CALIBRATING]: 'Shh… measuring how quiet the room is.',
  [State.LISTENING]: "I'm listening. Say something!",
  [State.RECORDING]: 'Ooh, go on…',
  [State.PROCESSING]: 'Hmm…',
  [State.SPEAKING]: 'Squeak!',
};

/** Meter range in dBFS. */
const METER_MIN_DB = -80;
const METER_MAX_DB = -10;

const SETTINGS_KEY = 'prichalica.settings';

const $ = (id) => document.getElementById(id);
const ui = {
  buddy: $('buddy'),
  status: $('status'),
  meter: document.querySelector('.meter'),
  meterFill: $('meter-fill'),
  meterThreshold: $('meter-threshold'),
  toggle: $('toggle'),
  character: $('character'),
  mode: $('mode'),
  semitones: $('semitones'),
  semitonesValue: $('semitones-value'),
  sensitivity: $('sensitivity'),
  sensitivityValue: $('sensitivity-value'),
};

const settings = loadSettings();
const toy = new Chatterbox({
  effect: { mode: settings.mode, semitones: settings.semitones },
  vad: { startMarginDb: settings.sensitivity },
});

// --- Toy events -> UI ---

toy.addEventListener('statechange', ({ detail: { state } }) => {
  ui.buddy.dataset.state = state;
  ui.status.textContent = STATUS_TEXT[state];
  const on = state !== State.IDLE;
  ui.toggle.textContent = on ? 'Stop' : 'Start';
  ui.toggle.setAttribute('aria-pressed', String(on));
  if (!on) setMeter(METER_MIN_DB, null);
});

toy.addEventListener('level', ({ detail: { levelDb, thresholdDb } }) => {
  setMeter(levelDb, thresholdDb);
});

toy.addEventListener('error', ({ detail: { error } }) => {
  console.error(error);
  ui.status.textContent = `Something went wrong: ${error.message}`;
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
    ui.status.textContent = describeStartError(error);
  } finally {
    ui.toggle.disabled = false;
  }
});

ui.character.addEventListener('change', () => {
  ui.buddy.textContent = ui.character.value;
  saveSettings({ character: ui.character.value });
});

ui.mode.addEventListener('change', () => {
  toy.setEffect({ mode: ui.mode.value });
  ui.semitones.disabled = ui.mode.value === 'none';
  saveSettings({ mode: ui.mode.value });
});

ui.semitones.addEventListener('input', () => {
  const semitones = Number(ui.semitones.value);
  toy.setEffect({ semitones });
  ui.semitonesValue.textContent = `+${semitones}`;
  saveSettings({ semitones });
});

ui.sensitivity.addEventListener('input', () => {
  const db = Number(ui.sensitivity.value);
  toy.setSensitivity(db);
  ui.sensitivityValue.textContent = `${db} dB`;
  saveSettings({ sensitivity: db });
});

// --- Initial UI state from saved settings ---

ui.character.value = settings.character;
ui.buddy.textContent = settings.character;
ui.mode.value = settings.mode;
ui.semitones.value = String(settings.semitones);
ui.semitones.disabled = settings.mode === 'none';
ui.semitonesValue.textContent = `+${settings.semitones}`;
ui.sensitivity.value = String(settings.sensitivity);
ui.sensitivityValue.textContent = `${settings.sensitivity} dB`;

// --- Helpers ---

function setMeter(levelDb, thresholdDb) {
  ui.meterFill.style.width = `${dbToPercent(levelDb)}%`;
  ui.meter.dataset.hot = String(thresholdDb !== null && levelDb > thresholdDb);
  ui.meterThreshold.hidden = thresholdDb === null;
  if (thresholdDb !== null) ui.meterThreshold.style.left = `${dbToPercent(thresholdDb)}%`;
}

function dbToPercent(db) {
  const t = (db - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
  return Math.min(100, Math.max(0, t * 100));
}

function describeStartError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Microphone access was blocked. Allow it in the address bar and try again.';
    case 'NotFoundError':
      return 'No microphone was found. Plug one in and try again.';
    case 'NotReadableError':
      return 'The microphone is busy in another app.';
    default:
      return `Could not start: ${error?.message ?? error}`;
  }
}

/** Saved settings are a convenience only; everything works without storage. */
function loadSettings() {
  const defaults = {
    character: '🐹',
    mode: DEFAULT_CONFIG.effect.mode,
    semitones: DEFAULT_CONFIG.effect.semitones,
    sensitivity: DEFAULT_CONFIG.vad.startMarginDb,
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

function saveSettings(patch) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, blocked cookies): ignore.
  }
}
