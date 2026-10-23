/**
 * Opens the microphone and delivers fixed-size mono frames of raw samples.
 *
 *   getUserMedia ─▶ MediaStreamSource ─▶ AudioWorkletNode ─▶ (silent) ─▶ destination
 *                                              │
 *                                              └─ port.onmessage ─▶ onFrame(Float32Array)
 */

const CAPTURE_PROCESSOR_URL = new URL('./capture-processor.js', import.meta.url);

export class Microphone {
  /**
   * @param {AudioContext} context
   * @param {{ frameSize: number, onFrame: (frame: Float32Array) => void }} options
   */
  constructor(context, { frameSize, onFrame }) {
    this.context = context;
    this.frameSize = frameSize;
    this.onFrame = onFrame;

    /** @type {MediaStream | null} */
    this.stream = null;
    this._nodes = [];
  }

  /** Asks for permission and starts streaming frames. Throws if access is denied. */
  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser cannot access the microphone (a secure https:// or localhost page is required).');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Echo cancellation also helps stop the toy from hearing itself.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    await this.context.audioWorklet.addModule(CAPTURE_PROCESSOR_URL);

    const source = this.context.createMediaStreamSource(this.stream);
    const capture = new AudioWorkletNode(this.context, 'prichalica-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit', // downmix stereo mics to mono
      processorOptions: { frameSize: this.frameSize },
    });
    capture.port.onmessage = (event) => this.onFrame(event.data);

    // Some browsers only run nodes that are connected to the output, so we
    // route the worklet into a muted gain node. Nothing is audible.
    const mute = this.context.createGain();
    mute.gain.value = 0;

    source.connect(capture).connect(mute).connect(this.context.destination);
    this._nodes = [source, capture, mute];
  }

  /** Stops streaming and releases the microphone (the browser's mic indicator turns off). */
  stop() {
    for (const node of this._nodes) node.disconnect();
    this._nodes = [];
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
