import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmsDb, SILENCE_DB, VoiceActivityDetector } from '../src/audio/vad.js';
import { frames, noise, sine } from './helpers.js';

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 320; // 20 ms

const vadOptions = {
  frameMs: 20,
  startMarginDb: 12,
  hysteresisDb: 4,
  minThresholdDb: -50,
  attackMs: 60, // 3 frames
  releaseMs: 300, // 15 frames
  calibrationMs: 200, // 10 frames
  initialNoiseFloorDb: -60,
};

const quiet = (i) => noise(FRAME_SIZE, 0.001, i + 1); // about -65 dBFS
const loud = () => sine(440, SAMPLE_RATE, FRAME_SIZE, 0.3); // about -13 dBFS

test('rmsDb measures silence and a known sine wave', () => {
  assert.equal(rmsDb(new Float32Array(256)), SILENCE_DB);
  assert.equal(rmsDb(new Float32Array(0)), SILENCE_DB);
  // A full-period sine of amplitude A has RMS A/sqrt(2): 0.5 -> -9.03 dB.
  assert.ok(Math.abs(rmsDb(sine(100, 16000, 1600, 0.5)) - -9.03) < 0.05);
});

test('does not trigger while calibrating, even on loud input', () => {
  const vad = new VoiceActivityDetector(vadOptions);
  assert.equal(vad.calibrationFrames, 10);
  for (let i = 0; i < 9; i++) {
    assert.equal(vad.process(loud()).event, null);
    assert.ok(vad.calibrating);
  }
});

test('learns the noise floor from a quiet room', () => {
  const vad = new VoiceActivityDetector(vadOptions);
  for (const frame of frames(30, quiet)) vad.process(frame);
  assert.ok(Math.abs(vad.noiseFloorDb - -65) < 2, `floor was ${vad.noiseFloorDb}`);
  // Floor + margin is below the absolute minimum, so the minimum wins.
  assert.equal(vad.startThresholdDb, -50);
});

test('detects speech start after the attack time and end after the release time', () => {
  const vad = new VoiceActivityDetector(vadOptions);
  for (const frame of frames(30, quiet)) assert.equal(vad.process(frame).event, null);

  const startEvents = frames(5, loud).map((f) => vad.process(f).event);
  assert.deepEqual(startEvents, [null, null, 'start', null, null]);
  assert.ok(vad.speaking);

  const endEvents = frames(20, quiet).map((f) => vad.process(f).event);
  assert.equal(endEvents.indexOf('end'), 14); // the 15th quiet frame
  assert.equal(endEvents.filter(Boolean).length, 1);
  assert.ok(!vad.speaking);
});

test('ignores a click shorter than the attack time', () => {
  const vad = new VoiceActivityDetector(vadOptions);
  for (const frame of frames(30, quiet)) vad.process(frame);
  vad.process(loud());
  vad.process(loud());
  const events = frames(10, quiet).map((f) => vad.process(f).event);
  assert.ok(events.every((e) => e === null));
});

test('reset() drops speech in progress but keeps the noise floor', () => {
  const vad = new VoiceActivityDetector(vadOptions);
  for (const frame of frames(30, quiet)) vad.process(frame);
  for (const frame of frames(3, loud)) vad.process(frame);
  const floor = vad.noiseFloorDb;
  vad.reset();
  assert.ok(!vad.speaking);
  assert.ok(!vad.calibrating);
  assert.equal(vad.noiseFloorDb, floor);
});
