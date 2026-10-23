/** Synthetic test signals, so tests are deterministic and need no audio files. */

export function sine(frequency, sampleRate, length, amplitude = 0.5) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  return out;
}

/** Seeded uniform noise in [-amplitude, amplitude]. */
export function noise(length, amplitude, seed = 1) {
  const out = new Float32Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0; // LCG
    out[i] = ((state / 2 ** 32) * 2 - 1) * amplitude;
  }
  return out;
}

/** `count` independent frames of the given generator. */
export function frames(count, makeFrame) {
  return Array.from({ length: count }, (_, i) => makeFrame(i));
}

/** Rough fundamental frequency from upward zero crossings. Fine for pure tones. */
export function zeroCrossingFrequency(signal, sampleRate) {
  let crossings = 0;
  for (let i = 1; i < signal.length; i++) {
    if (signal[i - 1] < 0 && signal[i] >= 0) crossings++;
  }
  return (crossings * sampleRate) / signal.length;
}
