/**
 * Plays a mono Float32Array through the speakers and reports when it is done.
 * Output goes through an AnalyserNode so the UI can move the avatar's mouth.
 */
export class Player {
  /** @param {AudioContext} context */
  constructor(context) {
    this.context = context;
    /** @type {AudioBufferSourceNode | null} */
    this._source = null;

    this._analyser = context.createAnalyser();
    this._analyser.fftSize = 512; // ~10 ms window: quick enough for lip-sync
    this._analyser.connect(context.destination);
    this._levelBuffer = new Float32Array(this._analyser.fftSize);
  }

  /** Current output loudness as RMS (0 = silent, ~0.3 = loud speech). */
  getLevel() {
    if (!this._source) return 0;
    this._analyser.getFloatTimeDomainData(this._levelBuffer);
    let sum = 0;
    for (const sample of this._levelBuffer) sum += sample * sample;
    return Math.sqrt(sum / this._levelBuffer.length);
  }

  /**
   * @param {Float32Array} samples
   * @param {number} sampleRate
   * @returns {Promise<void>} Resolves when playback ends or is stopped.
   */
  play(samples, sampleRate) {
    this.stop();
    if (samples.length === 0) return Promise.resolve();

    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this._analyser);
    this._source = source;

    return new Promise((resolve) => {
      source.onended = () => {
        source.disconnect();
        if (this._source === source) this._source = null;
        resolve();
      };
      source.start();
    });
  }

  /** Cuts off the current playback, if any. Its play() promise still resolves. */
  stop() {
    this._source?.stop();
  }
}
