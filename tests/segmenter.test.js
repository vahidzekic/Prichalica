import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpeechSegmenter } from '../src/audio/segmenter.js';
import { frames, noise, sine } from './helpers.js';

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 320; // 20 ms

function makeSegmenter(overrides = {}) {
  return new SpeechSegmenter({
    sampleRate: SAMPLE_RATE,
    frameSize: FRAME_SIZE,
    vad: {
      startMarginDb: 12,
      hysteresisDb: 4,
      minThresholdDb: -50,
      attackMs: 60, // 3 frames
      releaseMs: 300, // 15 frames
      calibrationMs: 200, // 10 frames
      initialNoiseFloorDb: -60,
    },
    preRollMs: 100, // 5 frames
    trailingSilenceMs: 100, // 5 frames
    minSpeechMs: 250,
    maxSpeechMs: 10000,
    ...overrides,
  });
}

const quiet = (i) => noise(FRAME_SIZE, 0.001, i + 1);
const loud = () => sine(440, SAMPLE_RATE, FRAME_SIZE, 0.3);

/** Pushes frames and returns the non-null events. */
function feed(segmenter, list) {
  return list.map((f) => segmenter.push(f).event).filter(Boolean);
}

test('returns one utterance with pre-roll and a short silence tail', () => {
  const seg = makeSegmenter();
  assert.deepEqual(feed(seg, frames(20, quiet)), []);

  const events = feed(seg, [...frames(50, loud), ...frames(40, quiet)]);
  assert.deepEqual(events.map((e) => e.type), ['start', 'end']);

  const end = events[1];
  assert.equal(end.reason, 'silence');
  // Pre-roll (2 quiet + 3 loud) + 47 loud + 5 kept silent frames = 57 frames.
  assert.equal(end.audio.length, 57 * FRAME_SIZE);
  // The utterance starts with the pre-roll noise, not cut mid-word.
  assert.equal(end.audio[0], quiet(18)[0]);
});

test('discards blips shorter than minSpeechMs', () => {
  const seg = makeSegmenter();
  feed(seg, frames(20, quiet));
  const events = feed(seg, [...frames(4, loud), ...frames(20, quiet)]);
  assert.deepEqual(events, [{ type: 'start' }, { type: 'discard', reason: 'too-short' }]);
});

test('force-ends a recording that reaches maxSpeechMs', () => {
  const seg = makeSegmenter({ maxSpeechMs: 400 }); // 20 frames
  feed(seg, frames(20, quiet));
  const events = feed(seg, frames(40, loud));
  const end = events.find((e) => e.type === 'end');
  assert.equal(end.reason, 'max-length');
  assert.equal(end.audio.length, 20 * FRAME_SIZE);
});

test('reports calibration and threshold for the level meter', () => {
  const seg = makeSegmenter();
  assert.equal(seg.push(quiet(0)).calibrating, true);
  feed(seg, frames(20, quiet));
  const result = seg.push(quiet(99));
  assert.equal(result.calibrating, false);
  assert.equal(result.thresholdDb, -50);
  assert.ok(result.levelDb < -60);
});

test('reset() drops a recording in progress', () => {
  const seg = makeSegmenter();
  feed(seg, frames(20, quiet));
  feed(seg, frames(10, loud));
  seg.reset();
  // After reset the same silence produces nothing: no stale 'end'.
  assert.deepEqual(feed(seg, frames(30, quiet)), []);
});
