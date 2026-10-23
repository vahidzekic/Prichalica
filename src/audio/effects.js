/**
 * The toy-voice effect chain applied to each recorded utterance:
 * pitch shift -> loudness normalisation -> short fades.
 */
import { pitchShift, resample, semitonesToRatio } from './pitch-shift.js';

export const VoiceMode = Object.freeze({
  /** Faster and higher, like a tape played too fast. The classic toy sound. */
  CHIPMUNK: 'chipmunk',
  /** Higher pitch, original speed. */
  PITCH: 'pitch',
  /** Plain echo, no effect. */
  NONE: 'none',
});

/**
 * @param {Float32Array} samples Recorded mono audio.
 * @param {number} sampleRate
 * @param {{ mode: string, semitones: number }} effect
 * @returns {Float32Array} A new buffer, ready to play.
 */
export function applyToyVoice(samples, sampleRate, { mode, semitones }) {
  let output;
  switch (mode) {
    case VoiceMode.CHIPMUNK:
      output = resample(samples, semitonesToRatio(semitones));
      break;
    case VoiceMode.PITCH:
      output = pitchShift(samples, sampleRate, semitones);
      break;
    default:
      output = samples.slice();
  }
  normalizePeak(output);
  applyFades(output, sampleRate);
  return output;
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
