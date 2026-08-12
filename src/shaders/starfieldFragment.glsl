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
  float halo=smoothstep(.53,.16,d)*(.20+uPulse*.12);
  float t=fract(vSeed*13.731);
  vec3 deepNavy=vec3(.18,.30,.58);
  vec3 electricBlue=vec3(.32,.58,1.00);
  vec3 softViolet=vec3(.56,.43,.90);
  vec3 warmWhite=vec3(.96,.94,.88);
  vec3 c=t<.43?deepNavy:(t<.76?electricBlue:(t<.91?softViolet:warmWhite));
  c=mix(c,warmWhite,clamp(uShimmer*.12+uPulse*.10,0.0,.16));
  float brightness=.52+uShimmer*.10+uPulse*.18;
  float alpha=min(.68,(core+halo)*vAlpha*(1.0+uPulse*.10));
  gl_FragColor=vec4(c*brightness,alpha);
}
