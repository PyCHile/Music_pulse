import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const PALETTE=[0xdceff5,0xe4e7f4,0xd9eee9,0xe9e2ef,0xf1eadc];

function drawHumanoidMask(ctx){
  ctx.fillStyle='rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.ellipse(192,118,31,45,0,0,Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(178,157);
  ctx.bezierCurveTo(166,177,150,194,139,220);
  ctx.bezierCurveTo(128,249,127,309,123,396);
  ctx.bezierCurveTo(142,377,160,364,178,357);
  ctx.bezierCurveTo(187,353,197,353,206,357);
  ctx.bezierCurveTo(224,364,242,377,261,396);
  ctx.bezierCurveTo(257,309,256,249,245,220);
  ctx.bezierCurveTo(234,194,218,177,206,157);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(151,202);ctx.bezierCurveTo(128,230,112,279,101,347);ctx.bezierCurveTo(111,332,121,322,132,315);ctx.bezierCurveTo(137,270,143,232,151,202);ctx.fill();
  ctx.beginPath();
  ctx.moveTo(233,202);ctx.bezierCurveTo(256,230,272,279,283,347);ctx.bezierCurveTo(273,332,263,322,252,315);ctx.bezierCurveTo(247,270,241,232,233,202);ctx.fill();
}

function makeFigureTexture(){
  const w=384,h=640;
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;const m=mask.getContext('2d');
  drawHumanoidMask(m);

  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
  c.clearRect(0,0,w,h);

  c.save();c.globalAlpha=.16;c.filter='blur(32px)';c.drawImage(mask,0,0);c.restore();
  c.save();c.globalAlpha=.22;c.filter='blur(18px)';c.drawImage(mask,0,0);c.restore();
  c.save();c.globalAlpha=.18;c.filter='blur(8px)';c.drawImage(mask,0,0);c.restore();
  c.save();c.globalAlpha=.08;c.filter='blur(2px)';c.drawImage(mask,0,0);c.restore();

  const glow=c.createRadialGradient(192,126,7,192,126,95);
  glow.addColorStop(0,'rgba(255,255,255,.34)');glow.addColorStop(.34,'rgba(223,244,255,.17)');glow.addColorStop(1,'rgba(210,240,255,0)');
  c.fillStyle=glow;c.fillRect(80,24,224,220);

  const chest=c.createRadialGradient(192,230,5,192,230,90);
  chest.addColorStop(0,'rgba(255,255,255,.20)');chest.addColorStop(.45,'rgba(220,242,255,.08)');chest.addColorStop(1,'rgba(220,242,255,0)');
  c.fillStyle=chest;c.fillRect(90,135,204,210);

  c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
  for(let i=0;i<14;i++){
    const x=148+i*7.2;
    c.strokeStyle=`rgba(235,249,255,${0.025+(i%4)*0.008})`;
    c.lineWidth=2+(i%3)*.8;
    c.filter='blur(2px)';
    c.beginPath();
    c.moveTo(x,185);
    c.bezierCurveTo(x-12+Math.sin(i)*8,250,x+11-Math.cos(i)*7,335,x-5+Math.sin(i*.8)*12,470);
    c.stroke();
  }
  c.restore();

  c.save();c.globalCompositeOperation='lighter';c.filter='blur(7px)';c.lineWidth=5;c.lineCap='round';
  const wisps=[[-1,154,205,98,184,65,166],[-1,144,258,84,248,54,226],[1,230,205,286,184,319,166],[1,240,258,300,248,330,226]];
  for(const [,x1,y1,x2,y2,x3,y3] of wisps){c.strokeStyle='rgba(218,245,255,.055)';c.beginPath();c.moveTo(x1,y1);c.bezierCurveTo(x2,y2,x3,y3,x3+(x3<192?-26:26),y3-16);c.stroke();}
  c.restore();

  const fade=c.createLinearGradient(0,355,0,640);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(.58,'rgba(255,255,255,.48)');fade.addColorStop(1,'rgba(255,255,255,0)');
  c.save();c.globalCompositeOperation='destination-in';c.fillStyle=fade;c.fillRect(0,0,w,h);c.restore();

  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;return tex;
}

export class EtherealFiguresSystem{
  constructor(count=7){
    this.group=new THREE.Group();this.texture=makeFigureTexture();this.figures=[];this.time=0;
    for(let i=0;i<count;i++){
      const material=new THREE.SpriteMaterial({map:this.texture,color:PALETTE[i%PALETTE.length],transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
      const sprite=new THREE.Sprite(material);sprite.renderOrder=24;this.group.add(sprite);
      this.figures.push({sprite,material,seed:Math.random(),side:i%2===0?-1:1,z:-22-Math.random()*110,baseY:(Math.random()-.5)*11,speed:.48+Math.random()*.52,scale:3.7+Math.random()*3.9});
    }
  }
  recycle(f){f.side=Math.random()<.5?-1:1;f.z=-112-Math.random()*58;f.baseY=(Math.random()-.5)*12;f.speed=.48+Math.random()*.58;f.scale=3.7+Math.random()*4.2;f.seed=Math.random();}
  update(dt,state,features,vanishingPoint){
    this.time+=dt;const hook=clamp01(state.hookPresence||0),fade=1-(state.finalFade||0),intensity=hook*fade;
    this.group.position.x=vanishingPoint.x*3.2;this.group.position.y=vanishingPoint.y*2.5;
    for(const f of this.figures){
      f.z+=(3.5+state.speed*.18)*f.speed*dt;if(f.z>-2.3)this.recycle(f);
      const depth=clamp01(1-(-f.z/160)),near=Math.pow(depth,1.55),passFade=smoothstep01((depth-.08)/.20)*(1-smoothstep01((depth-.88)/.12));
      const lateral=(14+29*near)*f.side;
      f.sprite.position.set(lateral+Math.sin(this.time*.15+f.seed*9)*1.5,f.baseY+Math.sin(this.time*.12+f.seed*13)*1.8,f.z);
      const scale=f.scale*(.68+near*1.48)*(1+features.mid*.06);f.sprite.scale.set(scale,scale*1.72,1);
      const breathe=.78+.22*Math.sin(this.time*.24+f.seed*11);
      f.material.opacity=intensity*(.018+.115*near)*passFade*breathe;
      const colorIndex=Math.floor(f.seed*PALETTE.length)%PALETTE.length;f.material.color.setHex(PALETTE[colorIndex]);
      f.sprite.material.rotation=f.side*.025*Math.sin(this.time*.16+f.seed*7);
    }
    this.group.visible=intensity>.01;
  }
  dispose(){for(const f of this.figures)f.material.dispose();this.texture.dispose();}
}

function smoothstep01(x){const t=clamp01(x);return t*t*(3-2*t);}
