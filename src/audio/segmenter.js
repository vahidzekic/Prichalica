/**
 * Turns a continuous stream of microphone frames into finished utterances.
 *
 * The VAD only says "speech started" / "speech ended". The segmenter does the
 * bookkeeping around it:
 *  - keeps a short pre-roll buffer, so the first syllable (which is quieter
 *    than the trigger level) is not cut off;
 *  - collects frames while speech is in progress;
 *  - trims most of the trailing silence the VAD had to wait through;
 *  - drops blips that are too short to be speech;
 *  - force-ends recordings that run too long.
 *
 * Pure JavaScript, no browser APIs: unit-tested in Node.
 */
import { VoiceActivityDetector } from './vad.js';

/**
 * @typedef {{ type: 'start' }
 *   | { type: 'end', audio: Float32Array, reason: 'silence' | 'max-length' }
 *   | { type: 'discard', reason: 'too-short' }} SegmentEvent
 */

export class SpeechSegmenter {
  /**
   * @param {object} options
   * @param {number} options.sampleRate
   * @param {number} options.frameSize
   * @param {object} options.vad Options for VoiceActivityDetector (frameMs is filled in).
   * @param {number} options.preRollMs
   * @param {number} options.trailingSilenceMs
   * @param {number} options.minSpeechMs
   * @param {number} options.maxSpeechMs
   */
  constructor({ sampleRate, frameSize, vad, preRollMs, trailingSilenceMs, minSpeechMs, maxSpeechMs }) {
    const frameMs = (frameSize / sampleRate) * 1000;
    const toFrames = (ms) => Math.ceil(ms / frameMs);

    this.vad = new VoiceActivityDetector({ ...vad, frameMs });
    this.frameMs = frameMs;

    this._preRollFrames = toFrames(preRollMs);
    this._trailingFrames = Math.min(toFrames(trailingSilenceMs), this.vad.releaseFrames);
    this._minSpeechFrames = toFrames(minSpeechMs);
    this._maxFrames = Math.max(1, toFrames(maxSpeechMs));

    /** @type {Float32Array[]} */
    this._preRoll = [];
    /** @type {Float32Array[]} */
    this._chunks = [];
    this._recording = false;
    this._voicedFrames = 0;
  }

  /** True while the VAD is still measuring room noise. */
  get calibrating() {
    return this.vad.calibrating;
  }

  /**
   * Feeds one frame. The segmenter keeps a reference to it, so callers must
   * not reuse the array afterwards (the capture worklet always sends new ones).
   *
   * @param {Float32Array} frame
   * @returns {{ levelDb: number, thresholdDb: number, calibrating: boolean, event: SegmentEvent | null }}
   */
  push(frame) {
    const { levelDb, event: vadEvent } = this.vad.process(frame);
    const result = {
      levelDb,
      thresholdDb: this.vad.startThresholdDb,
      calibrating: this.vad.calibrating,
      event: null,
    };

    if (!this._recording) {
      this._preRoll.push(frame);
      if (this._preRoll.length > this._preRollFrames) this._preRoll.shift();

      if (vadEvent === 'start') {
        // The pre-roll already holds the frames that triggered the VAD.
        this._chunks = this._preRoll;
        this._preRoll = [];
        this._recording = true;
        this._voicedFrames = this.vad.attackFrames;
        result.event = { type: 'start' };
      }
      return result;
    }

    this._chunks.push(frame);
    this._voicedFrames++;

    if (vadEvent === 'end') {
      result.event = this._finishOnSilence();
    } else if (this._chunks.length >= this._maxFrames) {
      result.event = { type: 'end', audio: concat(this._chunks), reason: 'max-length' };
      this.reset();
    }
    return result;
  }

  /** Drops any recording in progress and the pre-roll. Keeps the noise floor. */
  reset() {
    this._preRoll = [];
    this._chunks = [];
    this._recording = false;
    this._voicedFrames = 0;
    this.vad.reset();
  }

  /** @returns {SegmentEvent} */
  _finishOnSilence() {
    const releaseFrames = this.vad.releaseFrames;
    const voiced = this._voicedFrames - releaseFrames;

    // The last `releaseFrames` frames are the silence the VAD waited through.
    // Keep only a little of it so the playback starts right after you stop.
    const keep = this._chunks.length - releaseFrames + this._trailingFrames;
    const chunks = this._chunks.slice(0, Math.max(0, keep));
    this.reset();

    if (voiced < this._minSpeechFrames) return { type: 'discard', reason: 'too-short' };
    return { type: 'end', audio: concat(chunks), reason: 'silence' };
  }
}

/** Joins a list of frames into one contiguous buffer. */
function concat(chunks) {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
