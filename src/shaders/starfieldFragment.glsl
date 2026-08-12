varying float vAlpha;
varying float vSeed;
uniform float uShimmer;
uniform float uPulse;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=smoothstep(.50,0.0,d);
  float halo=smoothstep(.54,.14,d)*(.42+uPulse*.28);
  float h=fract(vSeed*.83+uColorPhase);
  vec3 blue=vec3(.42,.68,1.12);
  vec3 cyan=vec3(.34,.96,1.12);
  vec3 violet=vec3(.72,.50,1.16);
  vec3 magenta=vec3(1.02,.44,.82);
  vec3 gold=vec3(1.16,.82,.43);
  vec3 c=h<.34?mix(blue,cyan,h/.34):h<.70?mix(cyan,violet,(h-.34)/.36):mix(violet,magenta,(h-.70)/.30);
  float warmMask=smoothstep(.925,1.0,fract(vSeed*7.13+uColorPhase*.37));
  c=mix(c,gold,warmMask*uWarmth*.72);
  c=mix(c,vec3(.90,.96,1.15),clamp(uShimmer*.36+uPulse*.16,0.0,.52));
  float brightness=1.0+uShimmer*.58+uPulse*1.18;
  float alpha=min(1.0,(core+halo)*vAlpha*(1.0+uPulse*.38));
  gl_FragColor=vec4(c*brightness,alpha);
}
