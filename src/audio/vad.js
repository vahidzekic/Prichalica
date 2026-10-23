/**
 * Energy-based Voice Activity Detection (VAD).
 *
 * This module is pure JavaScript with no Web Audio dependencies, so it runs
 * (and is unit-tested) in Node as well as in the browser.
 *
 * How it works:
 *  1. Every frame is reduced to one number: its loudness (RMS level in dBFS).
 *  2. The detector keeps a running estimate of the room's background noise
 *     (the "noise floor"). It adapts quickly when the room gets quieter and
 *     slowly when it gets louder, so short speech bursts barely move it.
 *  3. Speech STARTS when the level stays above `noiseFloor + startMarginDb`
 *     for `attackMs`. Speech ENDS when the level stays below a slightly lower
 *     threshold (hysteresis) for `releaseMs`. Using two thresholds stops the
 *     detector from flickering on and off around a single value.
 *
 * A neural VAD (e.g. Silero via ONNX) would be more robust in loud rooms; this
 * module keeps the same `process()` contract so it can be swapped in later.
 */

/** Level reported for digital silence; keeps the maths away from -Infinity. */
export const SILENCE_DB = -100;

/**
 * Root-mean-square level of a block of samples, in dBFS.
 * @param {Float32Array} frame Samples in the range [-1, 1].
 * @returns {number} Level between SILENCE_DB and about 0.
 */
export function rmsDb(frame) {
  if (frame.length === 0) return SILENCE_DB;
  let sumSquares = 0;
  for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i];
  const rms = Math.sqrt(sumSquares / frame.length);
  return rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB;
}

/** Noise-floor smoothing factors (per frame). */
const FLOOR_ALPHA_CALIBRATING = 0.3;
const FLOOR_ALPHA_FALLING = 0.2;
const FLOOR_ALPHA_RISING = 0.01;

export class VoiceActivityDetector {
  /**
   * @param {object} options
   * @param {number} options.frameMs Duration of one frame in ms.
   * @param {number} options.startMarginDb
   * @param {number} options.hysteresisDb
   * @param {number} options.minThresholdDb
   * @param {number} options.attackMs
   * @param {number} options.releaseMs
   * @param {number} options.calibrationMs
   * @param {number} options.initialNoiseFloorDb
   */
  constructor(options) {
    const { frameMs } = options;
    if (!(frameMs > 0)) throw new RangeError('frameMs must be a positive number');

    // Public so the UI can tweak sensitivity while running.
    this.startMarginDb = options.startMarginDb;
    this.hysteresisDb = options.hysteresisDb;
    this.minThresholdDb = options.minThresholdDb;

    this.attackFrames = Math.max(1, Math.ceil(options.attackMs / frameMs));
    this.releaseFrames = Math.max(1, Math.ceil(options.releaseMs / frameMs));
    this.calibrationFrames = Math.ceil(options.calibrationMs / frameMs);

    this.noiseFloorDb = options.initialNoiseFloorDb;
    this.speaking = false;

    this._framesSeen = 0;
    this._framesAbove = 0;
    this._framesBelow = 0;
  }

  /** True while the detector is still measuring the room and will not trigger. */
  get calibrating() {
    return this._framesSeen < this.calibrationFrames;
  }

  /** Level a frame must exceed to count towards the start of speech. */
  get startThresholdDb() {
    return Math.max(this.noiseFloorDb + this.startMarginDb, this.minThresholdDb);
  }

  /** Level a frame must fall below to count towards the end of speech. */
  get stopThresholdDb() {
    return this.startThresholdDb - this.hysteresisDb;
  }

  /**
   * Analyses one frame.
   * @param {Float32Array} frame
   * @returns {{ levelDb: number, event: 'start' | 'end' | null }}
   */
  process(frame) {
    const levelDb = rmsDb(frame);
    const calibrating = this.calibrating;
    this._framesSeen++;

    if (calibrating) {
      this._updateNoiseFloor(levelDb, FLOOR_ALPHA_CALIBRATING);
      return { levelDb, event: null };
    }

    let event = null;
    if (!this.speaking) {
      this._updateNoiseFloor(
        levelDb,
        levelDb < this.noiseFloorDb ? FLOOR_ALPHA_FALLING : FLOOR_ALPHA_RISING,
      );
      this._framesAbove = levelDb > this.startThresholdDb ? this._framesAbove + 1 : 0;
      if (this._framesAbove >= this.attackFrames) {
        this.speaking = true;
        this._framesBelow = 0;
        event = 'start';
      }
    } else {
      this._framesBelow = levelDb < this.stopThresholdDb ? this._framesBelow + 1 : 0;
      if (this._framesBelow >= this.releaseFrames) {
        this.speaking = false;
        this._framesAbove = 0;
        event = 'end';
      }
    }
    return { levelDb, event };
  }

  /** Forgets any speech in progress. The learned noise floor is kept. */
  reset() {
    this.speaking = false;
    this._framesAbove = 0;
    this._framesBelow = 0;
  }

  _updateNoiseFloor(levelDb, alpha) {
    this.noiseFloorDb += (levelDb - this.noiseFloorDb) * alpha;
  }
}
