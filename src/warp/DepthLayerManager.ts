export class DepthLayerManager{sampleDepth(r:number,depth:number){return-8-Math.pow(r,.72)*(depth-8);}sampleRadius(r:number){return .55+Math.pow(r,1.72)*31.5;}}
