import { AudioEngine as BaseAudioEngine } from './AudioEngine.js?v=20260813-47';
export class AudioEngine extends BaseAudioEngine{
 constructor(...args){super(...args);this.mobile=true;}
}
