export class DepthLayerManager{sampleDepth(r:number,depth:number){return-8-Math.pow(r,.72)*(depth-8);}sampleRadius(r:number){return 1.4+Math.pow(r,.60)*30;}}
