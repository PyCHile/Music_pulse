varying float vAlpha;
uniform float uIntensity;
void main(){vec3 c=mix(vec3(.15,.34,.72),vec3(.72,.88,1.22),clamp(vAlpha,0.0,1.0));gl_FragColor=vec4(c*uIntensity,vAlpha);}
