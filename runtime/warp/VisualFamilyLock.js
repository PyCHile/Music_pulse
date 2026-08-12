export const INTERSTELLAR_WARP='INTERSTELLAR_WARP';
export class VisualFamilyLock{constructor(){this.family=INTERSTELLAR_WARP;this.rules=Object.freeze({forbidThemeSwitch:true,preserveVanishingPoint:true,preserveForwardMotion:true,preserveRadialOpticalFlow:true});}sanitize(state){return{...state,family:INTERSTELLAR_WARP};}}
