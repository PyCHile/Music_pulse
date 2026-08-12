export class AudioEngine {
  constructor(url) {
    this.url = url;
    this.audio = new Audio(url);
    this.audio.preload = 'auto';
    this.audio.playsInline = true;
    this.audio.loop = false;
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.frequencyData = null;
    this.timeData = null;
  }
  async ensureReady() {
    if (!this.context) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API no disponible');
      this.context = new AudioCtx({ latencyHint: 'interactive' });
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.62;
      this.analyser.minDecibels = -95;
      this.analyser.maxDecibels = -18;
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  async play() { await this.ensureReady(); await this.audio.play(); }
  pause() { this.audio.pause(); }
  async toggle() { if (this.audio.paused) await this.play(); else this.pause(); return !this.audio.paused; }
  get paused() { return this.audio.paused; }
  get ended() { return this.audio.ended; }
  get currentTime() { return this.audio.currentTime || 0; }
  get duration() { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
}
