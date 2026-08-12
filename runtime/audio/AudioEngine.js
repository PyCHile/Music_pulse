export class AudioEngine {
  constructor(url, lightUrl='./light-theme.mp3', fetalUrl='./fetal-heartbeat.mp3') {
    this.url=url;
    this.audio=new Audio(url);
    this.lightAudio=new Audio(lightUrl);
    this.fetalAudio=new Audio(fetalUrl);
    for(const media of [this.audio,this.lightAudio,this.fetalAudio]){media.preload='auto';media.playsInline=true;}
    this.audio.loop=false;
    this.lightAudio.loop=true;
    this.fetalAudio.loop=true;
    this.context=null;
    this.analyser=null;
    this.source=null;
    this.lightSource=null;
    this.fetalSource=null;
    this.mainGain=null;
    this.lightGain=null;
    this.fetalGain=null;
    this.lightLowpass=null;
    this.fetalLowpass=null;
    this.frequencyData=null;
    this.timeData=null;
    this.mixStage='MAIN';
    this.supportStarted=false;
  }
  async ensureReady(){
    if(!this.context){
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)throw new Error('Web Audio API no disponible');
      this.context=new AudioCtx({latencyHint:'interactive'});
      this.analyser=this.context.createAnalyser();
      this.analyser.fftSize=2048;
      this.analyser.smoothingTimeConstant=.62;
      this.analyser.minDecibels=-95;
      this.analyser.maxDecibels=-18;
      this.mainGain=this.context.createGain();
      this.lightGain=this.context.createGain();
      this.fetalGain=this.context.createGain();
      this.lightLowpass=this.context.createBiquadFilter();
      this.fetalLowpass=this.context.createBiquadFilter();
      this.lightLowpass.type='lowpass';
      this.lightLowpass.frequency.value=18000;
      this.lightLowpass.Q.value=.45;
      this.fetalLowpass.type='lowpass';
      this.fetalLowpass.frequency.value=1650;
      this.fetalLowpass.Q.value=.55;
      this.mainGain.gain.value=1;
      this.lightGain.gain.value=0;
      this.fetalGain.gain.value=0;
      this.source=this.context.createMediaElementSource(this.audio);
      this.lightSource=this.context.createMediaElementSource(this.lightAudio);
      this.fetalSource=this.context.createMediaElementSource(this.fetalAudio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.mainGain);
      this.mainGain.connect(this.context.destination);
      this.lightSource.connect(this.lightLowpass);
      this.lightLowpass.connect(this.lightGain);
      this.lightGain.connect(this.context.destination);
      this.fetalSource.connect(this.fetalLowpass);
      this.fetalLowpass.connect(this.fetalGain);
      this.fetalGain.connect(this.context.destination);
      this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData=new Uint8Array(this.analyser.fftSize);
    }
    if(this.context.state==='suspended')await this.context.resume();
  }
  _ramp(param,target,duration){
    const t=this.context.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(.0001,param.value),t);
    param.linearRampToValueAtTime(target,t+Math.max(.05,duration));
  }
  _expRamp(param,target,duration){
    const t=this.context.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(20,param.value),t);
    param.exponentialRampToValueAtTime(Math.max(20,target),t+Math.max(.05,duration));
  }
  async _unlockSupportTracks(){
    if(this.supportStarted)return;
    this.supportStarted=true;
    const results=await Promise.allSettled([this.lightAudio.play(),this.fetalAudio.play()]);
    if(results.some(r=>r.status==='rejected'))console.warn('Audio support tracks require the active AudioContext gesture.');
  }
  async play(){
    await this.ensureReady();
    await this.audio.play();
    await this._unlockSupportTracks();
    if(this.mixStage==='LIGHT'&&this.lightAudio.paused)await this.lightAudio.play().catch(()=>{});
    if(this.mixStage==='FETAL'&&this.fetalAudio.paused)await this.fetalAudio.play().catch(()=>{});
  }
  pause(){this.audio.pause();this.lightAudio.pause();this.fetalAudio.pause();}
  async toggle(){if(this.audio.paused)await this.play();else this.pause();return !this.audio.paused;}
  async transitionToLight(duration=10){
    if(this.mixStage!=='MAIN')return;
    await this.ensureReady();
    this.mixStage='LIGHT';
    this.lightAudio.currentTime=0;
    if(this.lightAudio.paused)await this.lightAudio.play().catch(()=>{});
    this._ramp(this.mainGain.gain,.07,duration);
    this._ramp(this.lightGain.gain,.92,duration);
    this._ramp(this.fetalGain.gain,0,Math.min(2,duration));
    this._expRamp(this.lightLowpass.frequency,18000,Math.min(1.2,duration));
  }
  async transitionToFetal(duration=13){
    if(this.mixStage==='FETAL'||this.mixStage==='SILENT')return;
    await this.ensureReady();
    this.mixStage='FETAL';
    this.fetalAudio.currentTime=0;
    if(this.fetalAudio.paused)await this.fetalAudio.play().catch(()=>{});
    this._ramp(this.mainGain.gain,.018,duration);
    this._ramp(this.lightGain.gain,.075,duration);
    this._expRamp(this.lightLowpass.frequency,720,duration);
    this._ramp(this.fetalGain.gain,.82,duration*.72);
    this._expRamp(this.fetalLowpass.frequency,1250,duration*.72);
  }
  fadeToSilence(duration=4){
    if(!this.context||this.mixStage==='SILENT')return;
    this.mixStage='SILENT';
    this._ramp(this.mainGain.gain,0,duration);
    this._ramp(this.lightGain.gain,0,duration);
    this._ramp(this.fetalGain.gain,0,duration);
  }
  getMixSnapshot(){return{stage:this.mixStage,main:this.mainGain?.gain.value??1,light:this.lightGain?.gain.value??0,fetal:this.fetalGain?.gain.value??0,lightCutoff:this.lightLowpass?.frequency.value??18000};}
  get paused(){return this.audio.paused;}
  get ended(){return this.audio.ended;}
  get currentTime(){return this.audio.currentTime||0;}
  get duration(){return Number.isFinite(this.audio.duration)?this.audio.duration:0;}
}
