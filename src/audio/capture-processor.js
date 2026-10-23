/**
 * AudioWorklet processor that runs on the browser's real-time audio thread.
 *
 * The audio engine hands us 128 samples at a time. Posting every block to the
 * main thread would mean ~375 messages a second, so we collect them into
 * frames of `frameSize` samples and transfer each full frame (zero-copy).
 *
 * Keep this file tiny and allocation-light: anything slow here causes glitches.
 * It is loaded with audioWorklet.addModule(), so it cannot import other modules.
 */
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.frameSize = options.processorOptions?.frameSize ?? 1024;
    this.frame = new Float32Array(this.frameSize);
    this.offset = 0;
  }

  process(inputs) {
    // inputs[0][0] is the first (and, with channelCount 1, only) channel.
    const channel = inputs[0]?.[0];
    if (channel) {
      let read = 0;
      while (read < channel.length) {
        const count = Math.min(channel.length - read, this.frameSize - this.offset);
        this.frame.set(channel.subarray(read, read + count), this.offset);
        this.offset += count;
        read += count;

        if (this.offset === this.frameSize) {
          this.port.postMessage(this.frame, [this.frame.buffer]);
          this.frame = new Float32Array(this.frameSize);
          this.offset = 0;
        }
      }
    }
    return true; // keep the processor alive
  }
}

registerProcessor('prichalica-capture', CaptureProcessor);
