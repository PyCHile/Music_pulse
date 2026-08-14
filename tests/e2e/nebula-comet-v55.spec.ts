import{test,expect}from'@playwright/test';

test('v56 visibly traverses nebula clouds and uses the non-red real-comet system',async({page},testInfo)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#enterBtn')).toBeVisible();await page.locator('#enterBtn').click();await page.waitForFunction(()=>Boolean((window as any).__MUSIC_PULSE_QA__?.started)&&Boolean((window as any).__MUSIC_PULSE_QA__?.runtimeReady),undefined,{timeout:30000});
 await page.waitForFunction(()=>{const c=(window as any).__MUSIC_PULSE_QA__?.performanceStats?.scene?.warp?.clouds;return Boolean(c&&c.crossings>0&&c.peakOpacity>.12);},undefined,{timeout:35000});
 const runtime=await page.evaluate(()=>{const q=(window as any).__MUSIC_PULSE_QA__,clouds=q.performanceStats?.scene?.warp?.clouds||{},cinematic=q.cinematicEncounterStats||{};return{clouds,realComet:cinematic.realComet||null};});
 expect(runtime.clouds.mode).toBe('continuous-traversal');expect(runtime.clouds.layers).toBeGreaterThanOrEqual(11);expect(runtime.clouds.crossings).toBeGreaterThan(0);expect(runtime.clouds.peakOpacity).toBeGreaterThan(.12);expect(['procedural-fallback','hybrid-local-webgpu']).toContain(runtime.clouds.textureSource);
 if(runtime.realComet){expect(runtime.realComet.redThermalShell).toBe(false);expect(String(runtime.realComet.source)).toContain('67P');}
 const comet=await(await page.request.get('/runtime/journey/CinematicEncounterSystemV55.js')).text();expect(comet).toContain('morfología bilobulada tipo 67P');expect(comet).toContain('overtakePasses');expect(comet).not.toContain('0xff6a18');
 const clouds=await(await page.request.get('/runtime/warp/CloudNebulaLayerV55.js')).text();expect(clouds).toContain("mode:'continuous-traversal'");expect(clouds).toContain('sprite.position.z+=speed');expect(clouds).toContain('hybrid-local-webgpu');expect(clouds).toContain('peakOpacity');
 await page.screenshot({path:testInfo.outputPath('v56-visible-nebula-crossing.png'),animations:'disabled'});expect(errors).toEqual([]);
});
