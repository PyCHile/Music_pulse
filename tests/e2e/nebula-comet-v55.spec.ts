import{test,expect}from'@playwright/test';

test('v55 traverses nebula clouds and uses the non-red 67P comet system',async({page},testInfo)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#enterBtn')).toBeVisible();await page.locator('#enterBtn').click();await page.waitForFunction(()=>Boolean((window as any).__MUSIC_PULSE_QA__?.started)&&Boolean((window as any).__MUSIC_PULSE_QA__?.runtimeReady),undefined,{timeout:15000});
 await page.waitForFunction(()=>(((window as any).__MUSIC_PULSE_QA__?.performanceStats?.scene?.warp?.clouds?.crossings)||0)>0,undefined,{timeout:20000});
 const runtime=await page.evaluate(()=>{const q=(window as any).__MUSIC_PULSE_QA__,clouds=q.performanceStats?.scene?.warp?.clouds||{},cinematic=q.cinematicEncounterStats||{};return{clouds,realComet:cinematic.realComet||null};});
 expect(runtime.clouds.mode).toBe('continuous-traversal');expect(runtime.clouds.layers).toBeGreaterThanOrEqual(11);expect(runtime.clouds.crossings).toBeGreaterThan(0);expect(runtime.clouds.nearClouds).toBeGreaterThanOrEqual(0);expect(runtime.clouds.maxOpacity).toBeGreaterThan(.02);expect(['procedural-fallback','webgpu-galaxy-cloud']).toContain(runtime.clouds.textureSource);
 if(runtime.realComet){expect(runtime.realComet.redThermalShell).toBe(false);expect(String(runtime.realComet.source)).toContain('67P');}
 const comet=await(await page.request.get('/runtime/journey/CinematicEncounterSystemV55.js')).text();expect(comet).toContain('morfología bilobulada tipo 67P');expect(comet).toContain('comet-67p.jpg');expect(comet).toContain('overtakePasses');expect(comet).not.toContain('0xff6a18');
 const clouds=await(await page.request.get('/runtime/warp/CloudNebulaLayerV55.js')).text();expect(clouds).toContain("mode:'continuous-traversal'");expect(clouds).toContain('sprite.position.z+=speed');expect(clouds).toContain('procedural-fallback');
 await page.screenshot({path:testInfo.outputPath('v55-nebula-crossing.png'),animations:'disabled'});expect(errors).toEqual([]);
});
