varying float vAlpha;
uniform float uIntensity;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec3 deepBlue=vec3(.19,.38,.72);
  vec3 whiteBlue=vec3(.82,.91,1.0);
  vec3 c=mix(deepBlue,whiteBlue,clamp(vAlpha*1.15,0.0,1.0));
  gl_FragColor=vec4(c*uIntensity,vAlpha*.82);
}
