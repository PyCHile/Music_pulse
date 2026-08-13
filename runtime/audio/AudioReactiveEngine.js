export { DEFAULT_FEATURES } from './AudioReactiveEngineLegacy.js?v=20260813-51';
import { AudioReactiveEngine as Base } from './AudioReactiveEngineLegacy.js?v=20260813-51';
export class AudioReactiveEngine extends Base{
 constructor(audioEngine){super(audioEngine);this.lastSampleAt=0;this.interval=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800?66:33;}
 sample(dt=1/60){const now=performance.now();if(this.lastSampleAt&&now-this.lastSampleAt<this.interval)return this.features;const elapsed=this.lastSampleAt?Math.min(.12,(now-this.lastSampleAt)/1000):dt;this.lastSampleAt=now;return super.sample(elapsed);}
}
