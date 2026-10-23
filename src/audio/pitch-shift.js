/**
 * Offline pitch-shifting of a recorded mono buffer.
 *
 * Two techniques are provided:
 *
 *  - `resample()`  The classic talking-toy "chipmunk" voice. Playing audio
 *                  faster raises its pitch and shortens it, exactly like a tape
 *                  played at the wrong speed. Cheap and very authentic.
 *
 *  - `pitchShift()` Raises the pitch but keeps the original duration. It first
 *                  stretches the audio in time with WSOLA (Waveform Similarity
 *                  Overlap-Add), then resamples it back to the original length.
 *
 * Pure JavaScript on Float32Arrays, no browser APIs: unit-tested in Node.
 */

/** Converts semitones to a frequency ratio (12 semitones = 2x = one octave). */
export function semitonesToRatio(semitones) {
  return 2 ** (semitones / 12);
}

/**
 * Resamples by `ratio` using linear interpolation.
 * ratio > 1 makes the audio shorter and higher; ratio < 1 longer and lower.
 *
 * No anti-aliasing filter is applied. For speech recorded at 44.1/48 kHz and
 * ratios up to one octave, the content that folds back is above ~11 kHz and
 * very quiet, so the result is clean enough for a toy.
 *
 * @param {Float32Array} input
 * @param {number} ratio
 * @returns {Float32Array}
 */
export function resample(input, ratio) {
  if (!(ratio > 0)) throw new RangeError('ratio must be a positive number');
  if (input.length === 0) return new Float32Array(0);

  const outLength = Math.floor((input.length - 1) / ratio) + 1;
  const output = new Float32Array(outLength);
  const last = input.length - 1;
  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const frac = position - index;
    const a = input[index];
    const b = index < last ? input[index + 1] : a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

/**
 * Changes duration without changing pitch, using WSOLA.
 *
 * The input is cut into overlapping windowed grains which are laid down at a
 * fixed output spacing. Each grain is taken from near its "nominal" input
 * position, nudged by up to `toleranceMs` to the spot whose waveform best
 * lines up with the previous grain, which avoids the phasey, echoey sound of
 * plain overlap-add.
 *
 * @param {Float32Array} input
 * @param {number} sampleRate
 * @param {number} stretch Output length / input length (2 = twice as long).
 * @param {{ grainMs?: number, toleranceMs?: number }} [options]
 * @returns {Float32Array}
 */
export function timeStretch(input, sampleRate, stretch, { grainMs = 40, toleranceMs = 5 } = {}) {
  if (!(stretch > 0)) throw new RangeError('stretch must be a positive number');
  const outLength = Math.round(input.length * stretch);
  if (input.length === 0 || outLength === 0) return new Float32Array(0);

  const grain = Math.max(4, 2 * Math.round((sampleRate * grainMs) / 2000)); // even length
  const hopOut = grain / 2; // 50% overlap: Hann windows then sum to a constant
  const hopIn = hopOut / stretch;
  const tolerance = Math.round((sampleRate * toleranceMs) / 1000);

  // Zero-pad so every read below stays in bounds without per-sample checks.
  const padded = new Float32Array(input.length + grain + 2 * tolerance + hopOut);
  padded.set(input);

  const window = hannWindow(grain);
  const output = new Float32Array(outLength + grain);
  const weight = new Float32Array(outLength + grain);

  let previous = 0;
  for (let k = 0; k * hopOut < outLength; k++) {
    const outPos = k * hopOut;
    const nominal = Math.round(k * hopIn);
    const position = k === 0 ? 0 : bestAlignment(padded, previous + hopOut, nominal, tolerance, hopOut);

    for (let i = 0; i < grain; i++) {
      output[outPos + i] += padded[position + i] * window[i];
      weight[outPos + i] += window[i];
    }
    previous = position;
  }

  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    result[i] = weight[i] > 1e-3 ? output[i] / weight[i] : 0;
  }
  return result;
}

/**
 * Shifts pitch by `semitones` while keeping the duration (within a sample or two).
 * @param {Float32Array} input
 * @param {number} sampleRate
 * @param {number} semitones
 * @returns {Float32Array}
 */
export function pitchShift(input, sampleRate, semitones) {
  if (semitones === 0) return input.slice();
  const ratio = semitonesToRatio(semitones);
  // Make it `ratio` times longer at the same pitch, then speed it back up:
  // the duration returns to normal and the pitch goes up by `ratio`.
  return resample(timeStretch(input, sampleRate, ratio), ratio);
}

/**
 * Finds where, within ±tolerance of `nominal`, the input best matches the
 * natural continuation of the previous grain (the samples at `target`).
 */
function bestAlignment(signal, target, nominal, tolerance, length) {
  const from = Math.max(0, nominal - tolerance);
  const to = nominal + tolerance;
  let best = Math.max(0, nominal);
  let bestScore = -Infinity;
  for (let candidate = from; candidate <= to; candidate++) {
    let score = 0;
    // Every other sample is plenty for a similarity score and twice as fast.
    for (let i = 0; i < length; i += 2) score += signal[candidate + i] * signal[target + i];
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/** Periodic Hann window: overlapping copies at 50% hop sum to exactly 1. */
function hannWindow(length) {
  const window = new Float32Array(length);
  for (let i = 0; i < length; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / length);
  return window;
}
