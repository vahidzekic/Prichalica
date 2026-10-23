# Contributing to Prichalica

Thanks for helping make the chatterbox chattier! 🐹

## Getting started

```bash
git clone https://github.com/<your-username>/prichalica.git
cd prichalica
npm start      # http://localhost:5173
npm test       # unit tests (Node 20+)
```

There is no build step and no dependencies to install. Edit a file, reload the page.

## Ground rules

- **Keep the core dependency-free.** Everything in `src/audio/` except
  `microphone.js`, `player.js` and `capture-processor.js` is plain JavaScript
  with no browser APIs, so it can be unit-tested in Node. Keep it that way.
- **Add a test** for any change to the VAD, segmenter or DSP code. Use the
  synthetic signals in `tests/helpers.js` rather than audio files.
- **New tunables go in `src/config.js`**, with a one-line comment saying what
  they do and in which unit.
- **Privacy is a feature.** Audio must never leave the device: no analytics,
  no uploads, no third-party scripts.
- Match the existing style (see `.editorconfig`): 2-space indent, ES modules,
  JSDoc on exported functions.

## Ideas welcome

- More voices: robot (ring modulation), deep monster voice, echo/reverb.
- A neural VAD (e.g. Silero via onnxruntime-web) as an optional drop-in for
  `VoiceActivityDetector`.
- Installable PWA / offline support.
- Character artwork with a mouth that moves with the playback level.

## Pull requests

1. Fork and create a branch from `main`.
2. Make your change and run `npm test`.
3. Try it in at least one browser with a real microphone.
4. Open a PR describing what you changed and how you tested it.
