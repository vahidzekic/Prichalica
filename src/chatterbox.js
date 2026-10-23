/**
 * Chatterbox: the talking-toy state machine and its main loop.
 *
 *            ┌──────────────┐
 *   start ──▶│ CALIBRATING  │  measure room noise (~0.5 s, first time only)
 *            └──────┬───────┘
 *                   ▼
 *            ┌──────────────┐  sound above threshold   ┌──────────────┐
 *     ┌─────▶│  LISTENING   │─────────────────────────▶│  RECORDING   │
 *     │      └──────────────┘◀─────────────────────────└──────┬───────┘
 *     │                         too short (discarded)         │ silence
 *     │                                                       ▼
 *     │      ┌──────────────┐                          ┌──────────────┐
 *     └──────│   SPEAKING   │◀─────────────────────────│  PROCESSING  │
 *  cooldown  └──────────────┘                          └──────────────┘
 *
 * Microphone frames keep arriving the whole time. While PROCESSING and
 * SPEAKING they are ignored, so the toy never records its own voice.
 *
 * Usage:
 *   const toy = new Chatterbox();
 *   toy.addEventListener('statechange', (e) => console.log(e.detail.state));
 *   await toy.start();   // must be called from a user gesture (click/tap)
 *   ...
 *   await toy.stop();
 */
import { createConfig } from './config.js';
import { Microphone } from './audio/microphone.js';
import { Player } from './audio/player.js';
import { SpeechSegmenter } from './audio/segmenter.js';
import { applyToyVoice } from './audio/effects.js';
import { rmsDb } from './audio/vad.js';

export const State = Object.freeze({
  IDLE: 'idle',
  CALIBRATING: 'calibrating',
  LISTENING: 'listening',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
});

/** States in which incoming microphone audio is analysed. */
const HEARING_STATES = new Set([State.CALIBRATING, State.LISTENING, State.RECORDING]);

/**
 * Events (all CustomEvents, payload in `event.detail`):
 *  - 'statechange' { state }
 *  - 'level'       { levelDb, thresholdDb }   for every mic frame (~50 per second)
 *  - 'utterance'   { durationMs, reason }     each time something is played back
 *  - 'error'       { error }
 */
export class Chatterbox extends EventTarget {
  /** @param {object} [overrides] Partial config, see src/config.js. */
  constructor(overrides) {
    super();
    this.config = createConfig(overrides);

    this._state = State.IDLE;
    this._running = false;
    /** @type {AudioContext | null} */
    this._context = null;
    /** @type {Microphone | null} */
    this._microphone = null;
    /** @type {Player | null} */
    this._player = null;
    /** @type {SpeechSegmenter | null} */
    this._segmenter = null;
    /** Resolves the promise returned by _listenForUtterance(). */
    this._deliverUtterance = null;
    /** @type {Promise<void> | null} */
    this._loop = null;
  }

  get state() {
    return this._state;
  }

  get running() {
    return this._running;
  }

  /** Loudness of what the toy is saying right now (RMS, 0 when silent). Drives lip-sync. */
  get outputLevel() {
    return this._player?.getLevel() ?? 0;
  }

  /** Opens the microphone and starts the listen → repeat loop. */
  async start() {
    if (this._running) return;

    // Browsers only let audio start after a user gesture, so start() must be
    // called from a click/tap handler.
    this._context = new AudioContext();
    await this._context.resume();

    const { sampleRate } = this._context;
    this._segmenter = new SpeechSegmenter({
      sampleRate,
      frameSize: this.config.frameSize,
      vad: this.config.vad,
      ...this.config.segmenter,
    });
    this._player = new Player(this._context);
    this._microphone = new Microphone(this._context, {
      frameSize: this.config.frameSize,
      onFrame: (frame) => this._onFrame(frame),
    });

    try {
      await this._microphone.start();
    } catch (error) {
      await this._teardown();
      throw error;
    }

    this._running = true;
    this._loop = this._run();
  }

  /** Stops listening, cuts off any playback and releases the microphone. */
  async stop() {
    if (!this._running) return;
    this._running = false;
    this._player?.stop();
    this._resolveUtterance(null); // wakes the loop if it is waiting
    await this._loop;
  }

  /** Changes the voice effect; applies from the next utterance. */
  setEffect(effect) {
    Object.assign(this.config.effect, effect);
  }

  /** Changes how far above room noise a sound must be to trigger recording. */
  setSensitivity(startMarginDb) {
    this.config.vad.startMarginDb = startMarginDb;
    if (this._segmenter) this._segmenter.vad.startMarginDb = startMarginDb;
  }

  /**
   * The main event loop: listen, record, transform, play, repeat until stopped.
   * Each `await` hands control back to the browser, so the page stays
   * responsive and microphone frames keep flowing into _onFrame().
   */
  async _run() {
    try {
      while (this._running) {
        const utterance = await this._listenForUtterance();
        if (!utterance || !this._running) break;

        this._setState(State.PROCESSING);
        const sampleRate = this._context.sampleRate;
        const voice = applyToyVoice(utterance.audio, sampleRate, this.config.effect);
        this._emit('utterance', {
          durationMs: (utterance.audio.length / sampleRate) * 1000,
          reason: utterance.reason,
        });

        this._setState(State.SPEAKING);
        await this._player.play(voice, sampleRate);

        // Let the room's echo of our own voice die down before listening again.
        await sleep(this.config.playback.cooldownMs);
      }
    } catch (error) {
      this._emit('error', { error });
    } finally {
      this._running = false;
      await this._teardown();
    }
  }

  /**
   * Switches to listening and resolves with the next complete utterance,
   * or with null if the toy is stopped first.
   * @returns {Promise<{ audio: Float32Array, reason: string } | null>}
   */
  _listenForUtterance() {
    // Forget anything heard before/while we were talking.
    this._segmenter.reset();
    this._setState(this._segmenter.calibrating ? State.CALIBRATING : State.LISTENING);
    return new Promise((resolve) => {
      this._deliverUtterance = resolve;
    });
  }

  /** Called for every microphone frame (~50 times a second). */
  _onFrame(frame) {
    if (!HEARING_STATES.has(this._state)) {
      // Deaf while processing/speaking, but keep the level meter alive.
      this._emit('level', { levelDb: rmsDb(frame), thresholdDb: null });
      return;
    }

    const { levelDb, thresholdDb, calibrating, event } = this._segmenter.push(frame);
    this._emit('level', { levelDb, thresholdDb: calibrating ? null : thresholdDb });

    if (this._state === State.CALIBRATING && !calibrating) this._setState(State.LISTENING);

    switch (event?.type) {
      case 'start':
        this._setState(State.RECORDING);
        break;
      case 'discard':
        this._setState(State.LISTENING);
        break;
      case 'end':
        // Switch state synchronously so the frames that arrive before the
        // loop resumes are already ignored.
        this._setState(State.PROCESSING);
        this._resolveUtterance({ audio: event.audio, reason: event.reason });
        break;
    }
  }

  _resolveUtterance(value) {
    const deliver = this._deliverUtterance;
    this._deliverUtterance = null;
    deliver?.(value);
  }

  async _teardown() {
    this._microphone?.stop();
    this._microphone = null;
    this._player = null;
    this._segmenter = null;
    if (this._context && this._context.state !== 'closed') await this._context.close();
    this._context = null;
    this._setState(State.IDLE);
  }

  _setState(state) {
    if (state === this._state) return;
    this._state = state;
    this._emit('statechange', { state });
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
