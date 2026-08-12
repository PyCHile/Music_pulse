varying float vAlpha;
uniform float uShimmer;
uniform float uPulse;
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=smoothstep(.50,0.0,d);
  float halo=smoothstep(.54,.14,d)*(.42+uPulse*.28);
  vec3 c=mix(vec3(.52,.72,1.0),vec3(.82,.92,1.22),clamp(uShimmer+uPulse*.22,0.0,1.0));
  float brightness=1.0+uShimmer*.62+uPulse*1.20;
  float alpha=min(1.0,(core+halo)*vAlpha*(1.0+uPulse*.38));
  gl_FragColor=vec4(c*brightness,alpha);
}
