varying float vAlpha;
varying float vSeed;
uniform float uShimmer;
uniform float uPulse;
uniform float uColorPhase;
uniform float uWarmth;
vec3 stellarColor(float seed){
  float t=fract(seed*13.731);
  vec3 hotBlue=vec3(.68,.80,1.00);
  vec3 blueWhite=vec3(.84,.90,1.00);
  vec3 neutralWhite=vec3(.98,.965,.92);
  vec3 ivory=vec3(1.00,.89,.73);
  if(t<.16)return hotBlue;
  if(t<.58)return blueWhite;
  if(t<.94)return neutralWhite;
  return ivory;
}
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=smoothstep(.44,.015,d);
  float inner=smoothstep(.50,.08,d);
  float halo=smoothstep(.55,.14,d);
  float magnitude=pow(1.0-fract(vSeed*7.913),2.4);
  float peak=.70+magnitude*.82+uShimmer*.10+uPulse*.14;
  float softPeak=peak/(1.0+peak*.22);
  float glowGate=.26+.74*sqrt(magnitude);
  float alpha=min(.90,(core+inner*.28+halo*.24*glowGate)*vAlpha*(1.0+uPulse*.10));
  vec3 c=stellarColor(vSeed);
  gl_FragColor=vec4(c*softPeak,alpha);
}
