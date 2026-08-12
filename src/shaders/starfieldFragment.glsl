varying float vAlpha;
varying float vSeed;
uniform float uShimmer;
uniform float uPulse;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=smoothstep(.48,0.0,d);
  float halo=smoothstep(.53,.15,d)*(.34+uPulse*.24);
  float t=fract(vSeed*13.731);
  vec3 whiteBlue=vec3(.82,.90,1.10);
  vec3 coolBlue=vec3(.48,.68,1.08);
  vec3 warmWhite=vec3(1.05,.93,.76);
  vec3 amber=vec3(1.15,.60,.24);
  vec3 c=t<.70?whiteBlue:(t<.86?coolBlue:(t<.96?warmWhite:amber));
  float rare=step(.955,fract(vSeed*5.173+uColorPhase*.03));
  float cross=(smoothstep(.026,0.0,abs(p.x))*smoothstep(.48,.06,abs(p.y))+smoothstep(.026,0.0,abs(p.y))*smoothstep(.48,.06,abs(p.x)))*rare;
  float warmBoost=step(.93,t)*uWarmth*.18;
  c=mix(c,amber,warmBoost);
  c=mix(c,vec3(.94,.98,1.08),clamp(uShimmer*.28+uPulse*.22,0.0,.46));
  float brightness=1.0+uShimmer*.48+uPulse*1.15;
  float alpha=min(1.0,(core+halo+cross*.55)*vAlpha*(1.0+uPulse*.34));
  gl_FragColor=vec4(c*brightness,alpha);
}
