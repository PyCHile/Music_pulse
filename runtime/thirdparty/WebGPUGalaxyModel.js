/*
 * URUX CPU/WebGL port of the structural model from:
 * https://github.com/dgreenheck/webgpu-galaxy
 * Copyright (c) 2025 dgreenheck. MIT License.
 *
 * The equations below intentionally preserve the source project's particle
 * distribution model: hash -> radius -> arm -> logarithmic spiral ->
 * randomness -> Cartesian position -> radius-dependent thickness, plus its
 * differential-rotation law. Only the execution backend is changed from
 * WebGPU/TSL compute to JavaScript so URUX remains compatible with WebGL iPad.
 */

export function webgpuGalaxyHash(seed){
  const fract=v=>v-Math.floor(v);
  const p=fract(seed*0.1031);
  const h=p+19.19;
  return fract(h*(h+47.43)*p);
}

export function generateSpiralPosition(index,config,seedOffset=0){
  const seed=index+seedOffset;
  const radius=Math.pow(webgpuGalaxyHash(seed+1),0.5)*config.galaxyRadius;
  const normalizedRadius=radius/config.galaxyRadius;
  const armIndex=Math.floor(webgpuGalaxyHash(seed+2)*config.armCount);
  const armAngle=armIndex*6.28318/config.armCount;
  const spiralAngle=normalizedRadius*config.spiralTightness*6.28318;
  const angleOffset=(webgpuGalaxyHash(seed+3)-0.5)*config.randomness;
  const radiusOffset=(webgpuGalaxyHash(seed+4)-0.5)*config.armWidth;
  const angle=armAngle+spiralAngle+angleOffset;
  const offsetRadius=radius+radiusOffset;
  const x=Math.cos(angle)*offsetRadius;
  const z=Math.sin(angle)*offsetRadius;
  const thicknessFactor=1-normalizedRadius+0.2;
  const y=(webgpuGalaxyHash(seed+5)-0.5)*config.galaxyThickness*thicknessFactor;
  const radialSparsity=Math.abs(radiusOffset)/(config.armWidth*0.5+0.01);
  const angularSparsity=Math.abs(angleOffset)/(config.randomness*0.5+0.01);
  const sparsityFactor=Math.min(1,(radialSparsity+angularSparsity)*0.5);
  const orbitalSpeed=1/(offsetRadius+0.5)*5;
  return {position:[x,y,z],normalizedRadius,angle,sparsityFactor,orbitalVelocity:[-Math.sin(angle)*orbitalSpeed,0,Math.cos(angle)*orbitalSpeed]};
}

export function generateCloudPosition(index,config){
  const seed=index+10000;
  const radius=Math.pow(webgpuGalaxyHash(seed+1),0.7)*config.galaxyRadius;
  const normalizedRadius=radius/config.galaxyRadius;
  const armIndex=Math.floor(webgpuGalaxyHash(seed+2)*config.armCount);
  const armAngle=armIndex*6.28318/config.armCount;
  const spiralAngle=normalizedRadius*config.spiralTightness*6.28318;
  const angleOffset=(webgpuGalaxyHash(seed+3)-0.5)*config.randomness;
  const radiusOffset=(webgpuGalaxyHash(seed+4)-0.5)*config.armWidth;
  const angle=armAngle+spiralAngle+angleOffset;
  const offsetRadius=radius+radiusOffset;
  const thicknessFactor=1-normalizedRadius+0.15;
  return {
    position:[Math.cos(angle)*offsetRadius,(webgpuGalaxyHash(seed+5)-0.5)*config.galaxyThickness*thicknessFactor,Math.sin(angle)*offsetRadius],
    normalizedRadius,
    size:(webgpuGalaxyHash(seed+6)*0.5+0.7)*(1-normalizedRadius*0.5),
    rotation:webgpuGalaxyHash(seed+7)*6.28318
  };
}

export function applyDifferentialRotation(position,rotationSpeed,deltaTime){
  const [x,y,z]=position;
  const distance=Math.hypot(x,z);
  const rotationFactor=1/(distance*0.1+1);
  const angle=-rotationSpeed*rotationFactor*deltaTime;
  const c=Math.cos(angle),s=Math.sin(angle);
  return [x*c-z*s,y,x*s+z*c];
}

export const DEFAULT_WEBGPU_GALAXY_CONFIG={
  galaxyRadius:20,
  galaxyThickness:4.2,
  spiralTightness:1.25,
  armCount:4,
  armWidth:5.2,
  randomness:1.10,
  rotationSpeed:.05
};
