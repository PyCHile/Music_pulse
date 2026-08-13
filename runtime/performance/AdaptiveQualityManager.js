export class AdaptiveQualityManager {
  constructor(renderer, composer, maxStars) {
    this.renderer = renderer;
    this.composer = composer;
    this.maxStars = maxStars;
    this.frames = 0;
    this.elapsed = 0;
    this.cooldown = 0;
    const ua = navigator.userAgent || '';
    this.mobile = /iPad|iPhone|iPod|Android/i.test(ua) || window.innerWidth < 800;
    this.quality = this.mobile ? 0.72 : 1;
    this.minQuality = this.mobile ? 0.48 : 0.62;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.mobile ? 0.88 : 2);
    this.applyPixelRatio();
  }
  applyPixelRatio() {
    const floor = this.mobile ? 0.55 : 0.8;
    const dpr = Math.max(floor, this.pixelRatio * this.quality);
    this.renderer.setPixelRatio(dpr);
    if (this.composer?.setPixelRatio) this.composer.setPixelRatio(dpr);
  }
  update(dt, starTunnel) {
    this.frames++;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.elapsed < 2) return;
    const fps = this.frames / this.elapsed;
    const target = this.mobile ? 28 : 55;
    this.frames = 0;
    this.elapsed = 0;
    if (this.cooldown > 0) return;
    if (fps < target && this.quality > this.minQuality) {
      this.quality = Math.max(this.minQuality, this.quality - (this.mobile ? 0.12 : 0.10));
      this.cooldown = this.mobile ? 2.5 : 4;
      this.applyPixelRatio();
    } else if (!this.mobile && fps > 58 && this.quality < 1) {
      this.quality = Math.min(1, this.quality + 0.05);
      this.cooldown = 5;
      this.applyPixelRatio();
    }
    const base = this.mobile ? 0.42 : 0.56;
    const span = this.mobile ? 0.58 : 0.44;
    const active = Math.floor(this.maxStars * (base + span * this.quality));
    starTunnel.setActiveCount(Math.max(this.mobile ? 180 : 320, active));
  }
}
