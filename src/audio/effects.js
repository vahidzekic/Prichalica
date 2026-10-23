/**
 * The voice effect chain applied to each recorded utterance:
 * pitch shift -> (robot timbre) -> loudness normalisation -> short fades.
 */
import { pitchShift, resample, semitonesToRatio } from './pitch-shift.js';

export const VoiceMode = Object.freeze({
  /** Faster and higher, like a tape played too fast. The classic toy sound. */
  CHIPMUNK: 'chipmunk',
  /** Different pitch, original speed. */
  PITCH: 'pitch',
});

/**
 * Voice presets offered in the UI. Shifting pitch this way moves the voice's
 * formants (its "size") along with it, which is exactly what makes a shifted
 * voice sound like a bigger or smaller speaker.
 */
export const VOICES = Object.freeze({
  /** The classic talking toy: sped up and squeaky. */
  toy: Object.freeze({ mode: VoiceMode.CHIPMUNK, semitones: 6 }),
  /** Small speaker: high pitch, normal speed. */
  child: Object.freeze({ mode: VoiceMode.PITCH, semitones: 7 }),
  /** A few semitones up. */
  female: Object.freeze({ mode: VoiceMode.PITCH, semitones: 4 }),
  /** A few semitones down: deeper and "bigger". */
  male: Object.freeze({ mode: VoiceMode.PITCH, semitones: -5 }),
  /** Slightly lower, then ring-modulated and run through a metallic comb filter. */
  robot: Object.freeze({ mode: VoiceMode.PITCH, semitones: -2, robot: true }),
});

/**
 * @param {Float32Array} samples Recorded mono audio.
 * @param {number} sampleRate
 * @param {{ voice?: string, pitchOffset?: number }} effect
 *   `voice` is a key of VOICES; `pitchOffset` (semitones) fine-tunes the preset.
 * @returns {Float32Array} A new buffer, ready to play.
 */
export function applyToyVoice(samples, sampleRate, { voice = 'toy', pitchOffset = 0 } = {}) {
  const preset = VOICES[voice] ?? VOICES.toy;
  const semitones = preset.semitones + pitchOffset;

  const output =
    preset.mode === VoiceMode.CHIPMUNK
      ? resample(samples, semitonesToRatio(semitones))
      : pitchShift(samples, sampleRate, semitones);

  if (preset.robot) robotize(output, sampleRate);
  normalizePeak(output);
  applyFades(output, sampleRate);
  return output;
}

/**
 * Robot timbre, in place.
 *  - Ring modulation: multiplying by a low sine wave splits every harmonic in
 *    two and adds a buzz, the classic sci-fi robot sound.
 *  - A short feedback comb filter adds a tinny "speaking from a tin can" ring.
 */
export function robotize(samples, sampleRate, { carrierHz = 50, combMs = 5, feedback = 0.5 } = {}) {
  const step = (2 * Math.PI * carrierHz) / sampleRate;
  for (let i = 0; i < samples.length; i++) samples[i] *= Math.sin(step * i);

  const delay = Math.max(1, Math.round((sampleRate * combMs) / 1000));
  for (let i = delay; i < samples.length; i++) samples[i] += feedback * samples[i - delay];
  return samples;
}

/**
 * Scales the buffer in place so its loudest sample reaches `targetPeak`,
 * boosting by at most `maxGain` so quiet rooms aren't turned into hiss.
 */
export function normalizePeak(samples, targetPeak = 0.9, maxGain = 4) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak === 0) return samples;
  const gain = Math.min(targetPeak / peak, maxGain);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

/** Short linear fade-in and fade-out, in place, to avoid clicks at the edges. */
export function applyFades(samples, sampleRate, fadeMs = 8) {
  const n = Math.min(Math.floor((sampleRate * fadeMs) / 1000), Math.floor(samples.length / 2));
  for (let i = 0; i < n; i++) {
    const gain = i / n;
    samples[i] *= gain;
    samples[samples.length - 1 - i] *= gain;
  }
  return samples;
}
