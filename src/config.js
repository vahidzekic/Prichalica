/**
 * Central place for every tunable number in Prichalica.
 *
 * All durations are in milliseconds and all levels in dBFS (decibels relative
 * to full scale: 0 dBFS is the loudest possible sample, silence is about -100).
 */

export const DEFAULT_CONFIG = Object.freeze({
  /** Samples per analysis frame. 1024 samples is ~21 ms at 48 kHz. */
  frameSize: 1024,

  /** Voice activity detection (see src/audio/vad.js). */
  vad: Object.freeze({
    /** How far above the measured room noise a sound must be to count as speech. */
    startMarginDb: 12,
    /** Speech ends when the level drops this far below the start threshold (hysteresis). */
    hysteresisDb: 4,
    /** Never trigger on anything quieter than this, however quiet the room is. */
    minThresholdDb: -50,
    /** Sound must stay above the threshold this long to start a recording (ignores clicks). */
    attackMs: 60,
    /** Silence this long ends the recording. This is the "pause" before the toy talks back. */
    releaseMs: 700,
    /** Time spent measuring room noise right after the microphone opens. */
    calibrationMs: 500,
    /** Starting guess for the noise floor before calibration has run. */
    initialNoiseFloorDb: -60,
  }),

  /** Turning a stream of frames into finished utterances (see src/audio/segmenter.js). */
  segmenter: Object.freeze({
    /** Audio kept from just before speech was detected, so the first syllable is not cut off. */
    preRollMs: 300,
    /** Silence kept at the end of an utterance so it doesn't stop abruptly. */
    trailingSilenceMs: 150,
    /** Utterances with less voiced audio than this are dropped (coughs, door slams). */
    minSpeechMs: 250,
    /** Hard cap on one recording, so a noisy room cannot record forever. */
    maxSpeechMs: 10000,
  }),

  /** The funny-voice effect (see src/audio/effects.js). */
  effect: Object.freeze({
    /** 'chipmunk' (faster and higher, like the classic toys), 'pitch' (higher, same speed) or 'none'. */
    mode: 'chipmunk',
    /** Pitch change in semitones; 12 is one octave up. */
    semitones: 6,
  }),

  playback: Object.freeze({
    /** Pause after the toy finishes talking, so its own echo is not heard as new speech. */
    cooldownMs: 350,
  }),
});

/**
 * Builds a config from the defaults plus partial overrides, one section deep.
 *
 * @example createConfig({ effect: { semitones: 9 } })
 * @param {object} [overrides]
 */
export function createConfig(overrides = {}) {
  return {
    frameSize: overrides.frameSize ?? DEFAULT_CONFIG.frameSize,
    vad: { ...DEFAULT_CONFIG.vad, ...overrides.vad },
    segmenter: { ...DEFAULT_CONFIG.segmenter, ...overrides.segmenter },
    effect: { ...DEFAULT_CONFIG.effect, ...overrides.effect },
    playback: { ...DEFAULT_CONFIG.playback, ...overrides.playback },
  };
}
