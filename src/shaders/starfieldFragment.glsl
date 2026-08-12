varying float vAlpha;
uniform float uShimmer;
void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);float core=smoothstep(.50,0.0,d);float halo=smoothstep(.52,.18,d)*.45;vec3 c=mix(vec3(.52,.72,1.0),vec3(.78,.88,1.18),clamp(uShimmer,0.0,1.0));gl_FragColor=vec4(c*(1.0+uShimmer*.75),(core+halo)*vAlpha);}
