# Prichalica 🐹

**Prichalica** (Serbian/Croatian for *chatterbox*) is an open-source version of
those talking toys (the hamster or parrot that repeats everything you say in a
squeaky voice). Talk to it, pause, and it says it right back, only funnier.

It runs entirely in the browser: no install, no account, no server. **Your voice
never leaves your device.**

[![CI](https://github.com/<your-username>/prichalica/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/prichalica/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- 🎙️ **Hands-free.** Listens continuously, detects when you start and stop talking.
- 🐿️ **Three voices.** *Chipmunk* (faster and higher, the classic toy sound),
  *Squeaky* (higher pitch at normal speed) and *Plain echo*.
- 🔇 **Adapts to the room.** Measures background noise and only reacts to speech.
- 🙉 **Doesn't talk to itself.** Ignores the microphone while it is speaking.
- 📱 **Works everywhere** a modern browser does: desktop, Android, iPhone and iPad.
- 🪶 **Zero dependencies, no build step.** Plain ES modules you can read in an afternoon.

## Quick start

Requires [Node.js](https://nodejs.org/) 20 or newer (only for the dev server and tests).

```bash
git clone https://github.com/<your-username>/prichalica.git
cd prichalica
npm start
```

Open <http://localhost:5173>, press **Start**, allow the microphone, and say something.

> **Why not just open `index.html`?** Browsers only allow microphone access and
> AudioWorklets on secure pages (`https://` or `http://localhost`), not `file://`.
> Any static server works; `npm start` runs the tiny one in `scripts/serve.js`.

Run the tests:

```bash
npm test
```

## How it works

```
Microphone ─▶ AudioWorklet ─▶ frames (~21 ms) ─▶ VAD ─▶ Segmenter ─▶ utterance
                                                                        │
Speakers ◀── Player ◀── fades ◀── normalise ◀── pitch shift ◀───────────┘
```

The app is a small state machine driven by a single async loop
(`src/chatterbox.js`):

```
CALIBRATING ─▶ LISTENING ─▶ RECORDING ─▶ PROCESSING ─▶ SPEAKING ─┐
                   ▲            │ (too short)                     │
                   └────────────┴──────────── cooldown ◀──────────┘
```

1. **Capture.** An `AudioWorklet` on the real-time audio thread collects raw
   samples into ~21 ms frames and transfers them to the main thread.
2. **Voice activity detection** (`src/audio/vad.js`). Each frame's RMS level is
   compared against an adaptive noise floor. Speech starts when the level stays
   12 dB above the room for 60 ms, and ends after 700 ms below a slightly lower
   threshold (hysteresis prevents flicker).
3. **Segmentation** (`src/audio/segmenter.js`). Keeps 300 ms of pre-roll so the
   first syllable isn't clipped, trims trailing silence, discards coughs and
   clicks, and caps recordings at 10 s.
4. **Toy voice** (`src/audio/pitch-shift.js`, `src/audio/effects.js`).
   *Chipmunk* resamples the buffer (like playing a tape too fast). *Squeaky*
   time-stretches with WSOLA and then resamples, which raises pitch while keeping
   the duration. The result is peak-normalised and faded to avoid clicks.
5. **Playback and loop.** The buffer is played, the toy waits a short cooldown
   so it doesn't hear its own echo, and goes back to listening.

## Configuration

All tunables live in [`src/config.js`](src/config.js), each with a comment.
The most useful ones:

| Setting | Default | What it does |
| --- | --- | --- |
| `vad.startMarginDb` | `12` | How much louder than the room you must be (also in the Settings panel). |
| `vad.releaseMs` | `700` | Length of the pause that ends your sentence. Lower = snappier, but may cut you off. |
| `segmenter.minSpeechMs` | `250` | Ignore sounds shorter than this. |
| `segmenter.maxSpeechMs` | `10000` | Longest recording. |
| `effect.mode` | `'chipmunk'` | `'chipmunk'`, `'pitch'` or `'none'`. |
| `effect.semitones` | `6` | Pitch shift; 12 = one octave higher. |

You can also embed the engine in your own page:

```js
import { Chatterbox } from './src/chatterbox.js';

const toy = new Chatterbox({ effect: { mode: 'pitch', semitones: 9 } });
toy.addEventListener('statechange', (e) => console.log(e.detail.state));
button.onclick = () => toy.start(); // must be started from a user gesture
```

## Project structure

```
prichalica/
├── index.html                 # The page
├── src/
│   ├── main.js                # UI wiring (buttons, sliders, meter, character)
│   ├── chatterbox.js          # State machine + listen/repeat event loop
│   ├── config.js              # Every tunable number, documented
│   ├── styles.css
│   └── audio/
│       ├── microphone.js      # getUserMedia + AudioWorklet capture
│       ├── capture-processor.js  # AudioWorklet: 128-sample blocks → frames
│       ├── vad.js             # Adaptive energy-based voice activity detection
│       ├── segmenter.js       # Frames → utterances (pre-roll, trimming, limits)
│       ├── pitch-shift.js     # Resampling + WSOLA pitch shifting
│       ├── effects.js         # Voice modes, normalisation, fades
│       └── player.js          # AudioBuffer playback
├── tests/                     # node:test unit tests with synthetic signals
├── scripts/serve.js           # Zero-dependency dev server
└── .github/workflows/         # CI (tests) and GitHub Pages deployment
```

## Deploying

The app is static files, so any static host works. To publish it on GitHub Pages:
push to `main`, then set **Settings → Pages → Source** to **GitHub Actions**.
The included workflow (`.github/workflows/pages.yml`) deploys on every push.

## Troubleshooting

- **Nothing happens when I talk.** Watch the level meter: the bar must cross the
  vertical marker. Lower the *Trigger level* in Settings, or move closer.
- **It triggers on background noise.** Raise the *Trigger level*. Press Stop
  and Start in a quiet moment so it re-measures the room.
- **It cuts me off mid-sentence.** Increase `vad.releaseMs` in `src/config.js`.
- **Playback is quiet on iPhone.** iOS may route audio to the earpiece while the
  microphone is open. Turning the volume up or using headphones helps.
- **"Microphone access was blocked."** Click the camera/mic icon in the address
  bar and allow the microphone for this site.

## Browser support

Any current version of Chrome, Edge, Firefox or Safari (desktop and mobile).
Requires `AudioWorklet` and `getUserMedia` (Safari 14.5+).

## Contributing

Contributions are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Prichalica contributors
