import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pitchShift, resample, semitonesToRatio, timeStretch } from '../src/audio/pitch-shift.js';
import { applyFades, applyToyVoice, normalizePeak, VoiceMode } from '../src/audio/effects.js';
import { sine, zeroCrossingFrequency } from './helpers.js';

const SAMPLE_RATE = 16000;
const tone = () => sine(440, SAMPLE_RATE, SAMPLE_RATE); // 1 second of A4

const near = (actual, expected, tolerance) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected} ± ${tolerance}, got ${actual}`);

test('semitonesToRatio: 12 semitones is an octave', () => {
  assert.equal(semitonesToRatio(0), 1);
  assert.equal(semitonesToRatio(12), 2);
  near(semitonesToRatio(7), 1.4983, 1e-4);
});

test('resample: ratio 2 halves the length and doubles the pitch (chipmunk)', () => {
  const out = resample(tone(), 2);
  assert.equal(out.length, SAMPLE_RATE / 2);
  near(zeroCrossingFrequency(out, SAMPLE_RATE), 880, 10);
});

test('resample: handles empty input and rejects bad ratios', () => {
  assert.equal(resample(new Float32Array(0), 1.5).length, 0);
  assert.throws(() => resample(tone(), 0), RangeError);
});

test('timeStretch: changes duration but not pitch', () => {
  const out = timeStretch(tone(), SAMPLE_RATE, 1.5);
  assert.equal(out.length, 1.5 * SAMPLE_RATE);
  near(zeroCrossingFrequency(out, SAMPLE_RATE), 440, 10);
});

test('pitchShift: raises pitch by an octave and keeps the duration', () => {
  const input = tone();
  const out = pitchShift(input, SAMPLE_RATE, 12);
  near(out.length, input.length, 2);
  near(zeroCrossingFrequency(out, SAMPLE_RATE), 880, 15);
});

test('pitchShift: 0 semitones returns an unchanged copy', () => {
  const input = tone();
  const out = pitchShift(input, SAMPLE_RATE, 0);
  assert.notEqual(out, input);
  assert.deepEqual(out, input);
});

test('normalizePeak boosts quiet audio, capped by maxGain', () => {
  const quiet = Float32Array.from([0.1, -0.2, 0.05]);
  normalizePeak(quiet, 0.9, 10);
  near(Math.max(...quiet.map(Math.abs)), 0.9, 1e-6);

  const veryQuiet = Float32Array.from([0.01, -0.01]);
  normalizePeak(veryQuiet, 0.9, 4);
  near(veryQuiet[0], 0.04, 1e-6);
});

test('applyFades starts and ends at silence', () => {
  const samples = new Float32Array(1000).fill(1);
  applyFades(samples, SAMPLE_RATE, 10);
  assert.equal(samples[0], 0);
  assert.ok(samples[samples.length - 1] < 0.01);
  assert.equal(samples[500], 1);
});

test('applyToyVoice: every mode returns a playable buffer without mutating the input', () => {
  const input = tone();
  const before = input.slice();
  for (const mode of Object.values(VoiceMode)) {
    const out = applyToyVoice(input, SAMPLE_RATE, { mode, semitones: 6 });
    assert.ok(out.length > 0, mode);
    assert.ok(out.every((s) => Math.abs(s) <= 1), `${mode} clipped`);
  }
  assert.deepEqual(input, before);
});
