import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const PALETTE=[0xdbeeff,0xd9ddff,0xeadfff,0xd6f5ee,0xffefcf,0xe8f5ff];

function makeFigureTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;const c=canvas.getContext('2d');
  c.clearRect(0,0,256,384);
  const halo=c.createRadialGradient(128,175,8,128,175,120);halo.addColorStop(0,'rgba(255,255,255,.42)');halo.addColorStop(.42,'rgba(255,255,255,.13)');halo.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=halo;c.fillRect(0,45,256,285);
  const wings=c.createLinearGradient(0,110,256,260);wings.addColorStop(0,'rgba(255,255,255,0)');wings.addColorStop(.30,'rgba(255,255,255,.42)');wings.addColorStop(.50,'rgba(255,255,255,.10)');wings.addColorStop(.70,'rgba(255,255,255,.42)');wings.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=wings;
  c.beginPath();c.moveTo(121,145);c.bezierCurveTo(82,102,25,96,12,132);c.bezierCurveTo(43,145,70,176,98,235);c.bezierCurveTo(106,196,114,166,121,145);c.fill();
  c.beginPath();c.moveTo(135,145);c.bezierCurveTo(174,102,231,96,244,132);c.bezierCurveTo(213,145,186,176,158,235);c.bezierCurveTo(150,196,142,166,135,145);c.fill();
  const body=c.createLinearGradient(128,105,128,330);body.addColorStop(0,'rgba(255,255,255,.82)');body.addColorStop(.32,'rgba(255,255,255,.48)');body.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=body;c.beginPath();c.arc(128,105,20,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(128,125);c.bezierCurveTo(105,153,104,215,91,314);c.bezierCurveTo(112,292,120,282,128,279);c.bezierCurveTo(136,282,144,292,165,314);c.bezierCurveTo(152,215,151,153,128,125);c.fill();
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;return tex;
}

export class EtherealFiguresSystem{
  constructor(count=10){
    this.group=new THREE.Group();this.texture=makeFigureTexture();this.figures=[];this.time=0;
    for(let i=0;i<count;i++){
      const material=new THREE.SpriteMaterial({map:this.texture,color:PALETTE[i%PALETTE.length],transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
      const sprite=new THREE.Sprite(material);sprite.renderOrder=30;this.group.add(sprite);
      this.figures.push({sprite,material,seed:Math.random(),side:i%2===0?-1:1,z:-18-Math.random()*105,baseY:(Math.random()-.5)*12,speed:.55+Math.random()*.65,scale:3.2+Math.random()*3.8});
    }
  }
  recycle(f){f.side=Math.random()<.5?-1:1;f.z=-105-Math.random()*55;f.baseY=(Math.random()-.5)*13;f.speed=.55+Math.random()*.7;f.scale=3.2+Math.random()*4;f.seed=Math.random();}
  update(dt,state,features,vanishingPoint){
    this.time+=dt;const hook=clamp01(state.hookPresence||0),fade=1-(state.finalFade||0),intensity=hook*fade;
    this.group.position.x=vanishingPoint.x*4.0;this.group.position.y=vanishingPoint.y*3.0;
    for(const f of this.figures){
      f.z+=(4.2+state.speed*.24)*f.speed*dt;
      if(f.z>-2)this.recycle(f);
      const depth=clamp01(1-(-f.z/150));
      const near=Math.pow(depth,1.35);
      const lateral=(12+26*near)*f.side;
      f.sprite.position.set(lateral+Math.sin(this.time*.22+f.seed*9)*2.2,f.baseY+Math.sin(this.time*.17+f.seed*13)*2.6,f.z);
      const scale=f.scale*(.7+near*1.65)*(1+features.mid*.12);f.sprite.scale.set(scale,scale*1.55,1);
      const apparition=Math.sin((f.seed*.73+this.time*.035)*Math.PI*2)*.5+.5;
      f.material.opacity=intensity*(.08+.30*near)*(.55+.45*apparition);
      const colorIndex=Math.floor((f.seed*PALETTE.length+this.time*.012)%PALETTE.length);f.material.color.setHex(PALETTE[colorIndex]);
      f.sprite.material.rotation=f.side*.08*Math.sin(this.time*.28+f.seed*7);
    }
    this.group.visible=intensity>.008;
  }
  dispose(){for(const f of this.figures)f.material.dispose();this.texture.dispose();}
}
