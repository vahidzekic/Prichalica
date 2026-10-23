/** Plays a mono Float32Array through the speakers and reports when it is done. */
export class Player {
  /** @param {AudioContext} context */
  constructor(context) {
    this.context = context;
    /** @type {AudioBufferSourceNode | null} */
    this._source = null;
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
    source.connect(this.context.destination);
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
