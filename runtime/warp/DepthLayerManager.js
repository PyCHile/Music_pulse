export class DepthLayerManager{sampleDepth(random01,depth){const biased=Math.pow(random01,.72);return-8-biased*(depth-8);}sampleRadius(random01){return .55+Math.pow(random01,1.72)*31.5;}}
