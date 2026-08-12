attribute float aSize;
attribute float aAlpha;
attribute float aSeed;
varying float vAlpha;
varying float vSeed;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);float perspective=clamp(120.0/max(4.0,-mv.z),0.45,5.0);gl_PointSize=aSize*perspective;vAlpha=aAlpha;vSeed=aSeed;gl_Position=projectionMatrix*mv;}
