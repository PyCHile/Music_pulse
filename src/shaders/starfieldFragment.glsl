varying float vAlpha;
varying float vSeed;
uniform float uShimmer;
uniform float uPulse;
uniform float uColorPhase;
uniform float uWarmth;
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=smoothstep(.46,0.0,d);
  float halo=smoothstep(.54,.12,d)*(.34+uPulse*.12);
  float t=fract(vSeed*13.731);
  vec3 coolWhite=vec3(.94,.965,1.0);
  vec3 cyan=vec3(.50,.93,1.0);
  vec3 rose=vec3(1.0,.69,.80);
  vec3 lavender=vec3(.78,.69,1.0);
  vec3 c=t<.55?coolWhite:(t<.78?cyan:(t<.90?rose:lavender));
  float brightness=.76+uShimmer*.11+uPulse*.16;
  float alpha=min(.88,(core+halo)*vAlpha*(1.0+uPulse*.12));
  gl_FragColor=vec4(c*brightness,alpha);
}
