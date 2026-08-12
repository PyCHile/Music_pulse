uniform float uOpacity; varying vec2 vUv; void main(){float d=distance(vUv,vec2(.5));float a=(1.0-smoothstep(.0,.72,d))*uOpacity;gl_FragColor=vec4(.03,.08,.18,a);}
