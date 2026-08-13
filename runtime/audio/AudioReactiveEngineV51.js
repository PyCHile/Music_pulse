export { DEFAULT_FEATURES } from './AudioReactiveEngine.js?v=legacy';
import { AudioReactiveEngine as Base } from './AudioReactiveEngine.js?v=legacy';
export class AudioReactiveEngine extends Base{
 constructor(audioEngine){super(audioEngine);this.lastSampleAt=0;this.interval=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800?66:33;}
 sample(dt=1/60){const now=performance.now();if(this.lastSampleAt&&now-this.lastSampleAt<this.interval)return this.features;const elapsed=this.lastSampleAt?Math.min(.12,(now-this.lastSampleAt)/1000):dt;this.lastSampleAt=now;return super.sample(elapsed);}
}
