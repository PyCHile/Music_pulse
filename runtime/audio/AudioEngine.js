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
    this.fetalAnalyser=null;
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
    this.fetalTimeData=null;
    this.fetalPulse=0;
    this.fetalStartContextTime=null;
    this.mixStage='MAIN';
    this.supportStarted=false;
    this.sleepBedStarted=false;
    this.sleepEndTime=0;
    this.sleepNodes=[];
    this.chimeTimer=0;
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
      this.fetalAnalyser=this.context.createAnalyser();
      this.fetalAnalyser.fftSize=1024;
      this.fetalAnalyser.smoothingTimeConstant=.12;
      this.mainGain=this.context.createGain();
      this.lightGain=this.context.createGain();
      this.fetalGain=this.context.createGain();
      this.lightLowpass=this.context.createBiquadFilter();
      this.fetalLowpass=this.context.createBiquadFilter();
      this.lightLowpass.type='lowpass';
      this.lightLowpass.frequency.value=18000;
      this.lightLowpass.Q.value=.40;
      this.fetalLowpass.type='lowpass';
      this.fetalLowpass.frequency.value=1550;
      this.fetalLowpass.Q.value=.50;
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
      this.fetalSource.connect(this.fetalAnalyser);
      this.fetalAnalyser.connect(this.fetalLowpass);
      this.fetalLowpass.connect(this.fetalGain);
      this.fetalGain.connect(this.context.destination);
      this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData=new Uint8Array(this.analyser.fftSize);
      this.fetalTimeData=new Uint8Array(this.fetalAnalyser.fftSize);
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
  _makeOsc(freq,type='sine'){
    const osc=this.context.createOscillator();
    osc.type=type;
    osc.frequency.value=freq;
    return osc;
  }
  startSleepBed(){
    if(this.sleepBedStarted||!this.context)return;
    this.sleepBedStarted=true;
    const t=this.context.currentTime;
    this.sleepEndTime=t+1800;
    const master=this.context.createGain();
    master.gain.setValueAtTime(.0001,t);
    master.gain.linearRampToValueAtTime(.032,t+18);
    master.gain.setValueAtTime(.032,t+1740);
    master.gain.linearRampToValueAtTime(.0001,t+1800);
    master.connect(this.context.destination);
    const left=this._makeOsc(100),right=this._makeOsc(108);
    const leftPan=this.context.createStereoPanner(),rightPan=this.context.createStereoPanner();
    const carrierGain=this.context.createGain();
    carrierGain.gain.value=.13;
    leftPan.pan.value=-1;rightPan.pan.value=1;
    left.connect(leftPan).connect(carrierGain);
    right.connect(rightPan).connect(carrierGain);
    carrierGain.connect(master);
    right.frequency.setValueAtTime(108,t);
    right.frequency.linearRampToValueAtTime(104,t+600);
    right.frequency.setValueAtTime(104,t+1500);
    right.frequency.linearRampToValueAtTime(102,t+1800);
    const humGain=this.context.createGain();
    humGain.gain.value=.14;
    const hum1=this._makeOsc(52),hum2=this._makeOsc(67);
    hum1.connect(humGain);hum2.connect(humGain);humGain.connect(master);
    const isoGain=this.context.createGain();
    isoGain.gain.value=.018;
    const isoCarrier=this._makeOsc(58),isoLfo=this._makeOsc(4);
    const isoDepth=this.context.createGain();
    isoDepth.gain.value=.012;
    isoLfo.connect(isoDepth).connect(isoGain.gain);
    isoCarrier.connect(isoGain).connect(master);
    for(const osc of [left,right,hum1,hum2,isoCarrier,isoLfo]){osc.start(t);osc.stop(t+1801);this.sleepNodes.push(osc);}
    this.sleepNodes.push(master,carrierGain,humGain,isoGain,isoDepth,leftPan,rightPan);
    this._scheduleChime();
  }
  _scheduleChime(){
    if(!this.context||!this.sleepBedStarted)return;
    const delay=18000+Math.random()*32000;
    this.chimeTimer=setTimeout(()=>{
      if(!this.context||this.context.currentTime>=this.sleepEndTime)return;
      const t=this.context.currentTime;
      const osc=this.context.createOscillator();
      const gain=this.context.createGain();
      const pan=this.context.createStereoPanner();
      osc.type='sine';
      osc.frequency.setValueAtTime(420+Math.random()*480,t);
      osc.frequency.exponentialRampToValueAtTime(280+Math.random()*220,t+3.4);
      pan.pan.value=-.65+Math.random()*1.3;
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(.0035,t+.45);
      gain.gain.exponentialRampToValueAtTime(.0001,t+3.6);
      osc.connect(gain).connect(pan).connect(this.context.destination);
      osc.start(t);osc.stop(t+3.8);
      this._scheduleChime();
    },delay);
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
    this.startSleepBed();
    if(this.mixStage==='LIGHT'&&this.lightAudio.paused)await this.lightAudio.play().catch(()=>{});
    if(this.mixStage==='FETAL'&&this.fetalAudio.paused)await this.fetalAudio.play().catch(()=>{});
  }
  pause(){this.audio.pause();this.lightAudio.pause();this.fetalAudio.pause();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
  async toggle(){if(this.audio.paused){await this.play();return true;}this.pause();return false;}
  async transitionToLight(duration=24){
    if(this.mixStage!=='MAIN')return;
    await this.ensureReady();
    this.mixStage='LIGHT';
    this.lightAudio.currentTime=0;
    if(this.lightAudio.paused)await this.lightAudio.play().catch(()=>{});
    this._ramp(this.mainGain.gain,.18,duration);
    this._ramp(this.lightGain.gain,.76,duration);
    this._ramp(this.fetalGain.gain,0,Math.min(4,duration));
    this._expRamp(this.lightLowpass.frequency,14500,Math.min(5,duration));
  }
  async transitionToFetal(duration=22){
    if(this.mixStage==='FETAL'||this.mixStage==='SILENT')return;
    await this.ensureReady();
    this.mixStage='FETAL';
    this.fetalStartContextTime=this.context.currentTime;
    this.fetalAudio.currentTime=0;
    if(this.fetalAudio.paused)await this.fetalAudio.play().catch(()=>{});
    this._ramp(this.mainGain.gain,.035,duration);
    this._ramp(this.lightGain.gain,.10,duration);
    this._expRamp(this.lightLowpass.frequency,1050,duration);
    this._ramp(this.fetalGain.gain,.74,duration*.86);
    this._expRamp(this.fetalLowpass.frequency,1180,duration*.86);
  }
  getFetalPulse(){
    if(!this.fetalAnalyser||!this.fetalTimeData||this.mixStage!=='FETAL')return this.fetalPulse*=.90;
    this.fetalAnalyser.getByteTimeDomainData(this.fetalTimeData);
    let sum=0,peak=0;
    for(let i=0;i<this.fetalTimeData.length;i++){
      const v=(this.fetalTimeData[i]-128)/128;
      sum+=v*v;peak=Math.max(peak,Math.abs(v));
    }
    const rms=Math.sqrt(sum/this.fetalTimeData.length);
    const raw=Math.max(0,Math.min(1,(rms-.018)*13+Math.max(0,peak-.09)*1.5));
    this.fetalPulse=raw>this.fetalPulse?this.fetalPulse+(raw-this.fetalPulse)*.72:this.fetalPulse*.86;
    return this.fetalPulse;
  }
  getFetalElapsed(){return this.fetalStartContextTime==null||!this.context?0:Math.max(0,this.context.currentTime-this.fetalStartContextTime);}
  getFetalLightFade(){const elapsed=this.getFetalElapsed();return this.mixStage==='FETAL'?Math.max(0,Math.min(1,1-elapsed/60)):0;}
  fadeToSilence(duration=8){
    if(!this.context||this.mixStage==='SILENT')return;
    this.mixStage='SILENT';
    this._ramp(this.mainGain.gain,0,duration);
    this._ramp(this.lightGain.gain,0,duration);
    this._ramp(this.fetalGain.gain,0,duration);
  }
  getMixSnapshot(){return{stage:this.mixStage,main:this.mainGain?.gain.value??1,light:this.lightGain?.gain.value??0,fetal:this.fetalGain?.gain.value??0,lightCutoff:this.lightLowpass?.frequency.value??18000,fetalElapsed:this.getFetalElapsed(),fetalPulse:this.fetalPulse,sleepBedActive:this.sleepBedStarted};}
  get paused(){return this.audio.paused;}
  get ended(){return this.audio.ended;}
  get currentTime(){return this.audio.currentTime||0;}
  get duration(){return Number.isFinite(this.audio.duration)?this.audio.duration:0;}
}
