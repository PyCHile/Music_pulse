varying float vAlpha;
uniform float uIntensity;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec3 deepBlue=vec3(.12,.28,.62);
  vec3 whiteBlue=vec3(.72,.86,1.10);
  vec3 warm=vec3(.92,.54,.24);
  vec3 c=mix(deepBlue,whiteBlue,clamp(vAlpha*1.15,0.0,1.0));
  c=mix(c,warm,uWarmth*.045);
  gl_FragColor=vec4(c*uIntensity,vAlpha);
}
