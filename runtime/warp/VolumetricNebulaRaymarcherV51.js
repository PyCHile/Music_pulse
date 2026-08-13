import { VolumetricNebulaRaymarcher as Base } from './VolumetricNebulaRaymarcherV50.js?v=20260813-50';
export class VolumetricNebulaRaymarcher extends Base{
 constructor(){super();this.baseSteps=10;this.minSteps=6;this.baseShadowSteps=1;const u=this.material.uniforms;u.uRaySteps.value=8;u.uShadowSteps.value=1;this.mesh.visible=false;this.active=false;}
 update(dt,state,features){const demand=(state.nebulaPresence||0)+(state.galaxyReveal||0)*.8+(state.livingLight||0)*.6+(state.tunnelDrive||0)*.35;this.active=demand>.16;this.mesh.visible=this.active;if(!this.active)return;super.update(dt,state,features);const u=this.material.uniforms;u.uRaySteps.value=Math.min(10,Math.max(6,u.uRaySteps.value));u.uShadowSteps.value=1;}
}
