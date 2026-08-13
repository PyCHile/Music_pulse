import{test,expect}from'@playwright/test';

test('mobile runtime uses bounded audio-first rendering',async({page})=>{
 test.setTimeout(60000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#enterBtn')).toBeVisible();
 await page.locator('#enterBtn').click();
 await page.waitForFunction(()=>Boolean((window as any).__MUSIC_PULSE_QA__?.started)&&Boolean((window as any).__MUSIC_PULSE_QA__?.runtimeReady)&&((window as any).__MUSIC_PULSE_QA__?.duration||0)>0,undefined,{timeout:15000});
 await page.waitForTimeout(3500);
 const state=await page.evaluate(()=>{const q=(window as any).__MUSIC_PULSE_QA__;return{profile:q.performanceProfile,stars:q.activeStars,raySteps:q.nebulaRaySteps,lightSteps:q.nebulaLightSteps,perf:q.performanceStats};});
 expect(state.profile).toBe('mobile-audio-stable');
 expect(state.stars).toBeGreaterThan(0);expect(state.stars).toBeLessThanOrEqual(420);
 expect(state.raySteps).toBeLessThanOrEqual(8);expect(state.lightSteps).toBeLessThanOrEqual(1);
 expect(errors).toEqual([]);
 const main=await(await page.request.get('/runtime/main.js')).text();expect(main).toContain('MobileInterstellarWarpScene.js');expect(main).toContain('audioSampleInterval=mobile?1000/15:0');
 const mobileScene=await(await page.request.get('/runtime/scene/MobileInterstellarWarpScene.js')).text();expect(mobileScene).not.toContain("from 'postprocessing'");expect(mobileScene).not.toContain('WebGPUComputeEnhancer');expect(mobileScene).toContain('maxStars=420');
 const tunnel=await(await page.request.get('/runtime/warp/StarTunnelSystem.js')).text();expect(tunnel).toContain('Math.min(this.maxStars,requested)');expect(tunnel).not.toContain('Math.max(900');
 const deep=await(await page.request.get('/runtime/warp/DeepSpaceSectorSystem.js')).text();expect(deep).toContain('uSpinTime');expect(deep).not.toContain('applyDifferentialRotation');
});
