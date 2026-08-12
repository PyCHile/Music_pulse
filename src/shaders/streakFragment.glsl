varying float vAlpha;
uniform float uIntensity;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec3 blue=vec3(.14,.34,.76);
  vec3 cyan=vec3(.34,.78,1.08);
  vec3 violet=vec3(.58,.38,.98);
  vec3 gold=vec3(1.02,.68,.32);
  float wave=.5+.5*sin(uColorPhase*6.28318+vAlpha*2.2);
  vec3 c=mix(blue,cyan,wave*.55);
  c=mix(c,violet,(1.0-wave)*.28);
  c=mix(c,gold,uWarmth*.055);
  c=mix(c,vec3(.78,.90,1.18),clamp(vAlpha,0.0,1.0)*.58);
  gl_FragColor=vec4(c*uIntensity,vAlpha);
}
