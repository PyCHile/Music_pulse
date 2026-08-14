import { AudioEngine as BaseAudioEngine } from './AudioEngine.js?v=20260813-47';
export class AudioEngine extends BaseAudioEngine{
 constructor(...args){super(...args);this.mobile=true;this.playbackPending=false;this.lastPlaybackError=null;this.audioGraphPending=false;}
 play(){
  this.playbackPending=true;
  const main=this.audio.play();
  void Promise.resolve(main).then(()=>{this.playbackPending=false;this.lastPlaybackError=null;}).catch(error=>{this.playbackPending=false;this.lastPlaybackError=String(error);console.warn('[URUX] Main audio is not ready yet; visual journey continues.',error);});
  void this._unlockSupportTracks().catch(error=>console.warn('[URUX] Support audio unlock deferred.',error));
  if(!this.context){
   this.audioGraphPending=true;
   void this.ensureReady().then(()=>{this.audioGraphPending=false;this.startSleepBed();if(this.mixStage==='LIGHT'&&this.lightAudio.paused)void this.lightAudio.play().catch(()=>{});if(this.mixStage==='FETAL'&&this.fetalAudio.paused)void this.fetalAudio.play().catch(()=>{});}).catch(error=>{this.audioGraphPending=false;this.lastPlaybackError=String(error);console.warn('[URUX] WebAudio graph deferred; visual journey continues.',error);});
  }else{
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});this.startSleepBed();if(this.mixStage==='LIGHT'&&this.lightAudio.paused)void this.lightAudio.play().catch(()=>{});if(this.mixStage==='FETAL'&&this.fetalAudio.paused)void this.fetalAudio.play().catch(()=>{});
  }
  return Promise.resolve(true);
 }
 get playbackState(){return{pending:this.playbackPending,audioGraphPending:this.audioGraphPending,error:this.lastPlaybackError,readyState:this.audio.readyState,networkState:this.audio.networkState,duration:this.duration};}
}
