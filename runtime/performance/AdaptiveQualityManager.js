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
    this.quality = this.mobile ? 0.74 : 1;
    this.minQuality = this.mobile ? 0.48 : 0.62;
    /* Mobile keeps a fixed framebuffer. Runtime reallocations cause visible Safari stalls. */
    this.pixelRatio = this.mobile ? 0.72 : Math.min(window.devicePixelRatio || 1, 2);
    this.applyPixelRatio();
  }
  applyPixelRatio() {
    const dpr = this.mobile ? this.pixelRatio : Math.max(0.8, this.pixelRatio * this.quality);
    this.renderer.setPixelRatio(dpr);
    if (this.composer?.setPixelRatio) this.composer.setPixelRatio(dpr);
  }
  update(dt, starTunnel) {
    this.frames++;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.elapsed < 2.5) return;
    const fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    if (this.cooldown > 0) return;
    if (this.mobile) {
      /* Never resize the renderer while audio is running. Only reduce CPU/GPU star work. */
      if (fps < 26.5 && this.quality > this.minQuality) {
        this.quality = Math.max(this.minQuality, this.quality - 0.10);
        this.cooldown = 3;
      } else if (fps > 29.4 && this.quality < 0.82) {
        this.quality = Math.min(0.82, this.quality + 0.04);
        this.cooldown = 5;
      }
      const active = Math.floor(this.maxStars * (0.44 + 0.56 * this.quality));
      starTunnel.setActiveCount(Math.max(160, Math.min(this.maxStars, active)));
      return;
    }
    if (fps < 50 && this.quality > this.minQuality) {
      this.quality = Math.max(this.minQuality, this.quality - 0.10);
      this.cooldown = 4;
      this.applyPixelRatio();
    } else if (fps > 58 && this.quality < 1) {
      this.quality = Math.min(1, this.quality + 0.05);
      this.cooldown = 5;
      this.applyPixelRatio();
    }
    const active = Math.floor(this.maxStars * (0.56 + 0.44 * this.quality));
    starTunnel.setActiveCount(Math.max(320, Math.min(this.maxStars, active)));
  }
}
