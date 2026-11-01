const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4320';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),out=path.join(__dirname,'artifacts');
 const context=await browser.newContext({viewport:{width:390,height:760},reducedMotion:'reduce'});
 await context.route('**/*.supabase.co/**',r=>r.abort());
 await context.route('**/js/supabase_config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.getSupabaseClient=()=>null;'}));
 await context.addInitScript(()=>localStorage.setItem('mena_current_student',JSON.stringify({id:'local-visual-test',username:'preview',full_name:'معاينة محلية',grade:'الصف الأول الإعدادي'})));
 const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/mobile.html');await page.screenshot({path:path.join(out,'home.png')});
 await page.locator('#mentor').click();await page.locator('#chat-input').fill('ما هي الكثافة؟');await page.locator('#chat-form button').click();await page.waitForFunction(()=>document.querySelectorAll('.m-chat-message').length===2);await page.screenshot({path:path.join(out,'help.png')});await page.locator('#chat-log button').filter({hasText:'المعمل'}).click();await page.waitForFunction(()=>window.interactiveLab?.renderer);assert.equal(await page.locator('body').getAttribute('data-view'),'lab');results.push('Chat lab action opens the simulation directly.');await page.locator('#mentor').click();await page.keyboard.press('Escape');assert(!await page.locator('#sheet').isVisible());
 for(const id of ['u1_l1_atom','u1_l4_bonds']){
  await page.locator('.m-nav [data-view=courses]').click();await page.locator(`#courses-content [data-lesson="${id}"][data-session="2"]`).click();
  await page.locator('#next-action').click();await page.waitForFunction(()=>window.interactiveLab?.renderer);assert.equal(await page.evaluate(()=>interactiveLab.currentSessionNum),2);
  assert.equal(await page.locator('#lab-motion').isChecked(),false);assert.equal(await page.evaluate(()=>interactiveLab.animationId),null);
  await page.locator('[data-rotate=right]').click();assert.equal(await page.evaluate(()=>interactiveLab.scene.rotation.y),.25);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);results.push(id+' second session mounts with reduced motion and rotation controls.');
 }
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(100);
 const dimensions=await page.evaluate(()=>({canvas:interactiveLab.renderer.domElement.width,css:document.querySelector('#lab-canvas-wrap').clientWidth,dpr:interactiveLab.renderer.getPixelRatio(),horizontal:document.documentElement.scrollWidth-innerWidth}));assert.equal(dimensions.horizontal,0);assert(Math.abs(dimensions.canvas-dimensions.css*dimensions.dpr)<=1);results.push(dimensions);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'tablet-lab.png')});
 await page.setViewportSize({width:390,height:760});await page.locator('.m-nav [data-view=courses]').click();await page.locator('#courses-content [data-lesson=u1_l1_atom][data-session="1"]').click();await page.screenshot({path:path.join(out,'lesson.png')});
 await page.route('**/audio_cache/*.mp3',r=>r.fulfill({status:404,body:''}));await page.locator('[data-why="0"]').click();await page.waitForFunction(()=>/غير متاح|تعذّر/.test(document.querySelector('#audio-status').textContent));assert(await page.locator('#why-answer-0').isVisible());results.push('Missing audio retains readable answer and retry.');await page.locator('#audio-close').click();await page.unroute('**/audio_cache/*.mp3');
 await page.locator('.m-steps [data-view=quiz]').click();await page.screenshot({path:path.join(out,'quiz.png')});
 // A fresh browser document, blocked Three.js, then successful explicit retry.
 await page.route('**/three.min.js',r=>r.abort());await page.reload();await page.locator('.m-nav [data-view=lab]').click();await page.locator('[data-action=retry-lab]').waitFor();assert(await page.locator('#mobile-lab-mount').textContent());await page.unroute('**/three.min.js');await page.locator('[data-action=retry-lab]').click();await page.waitForFunction(()=>window.interactiveLab?.renderer);results.push('Unavailable 3D library has readable fallback and working retry.');
 assert.equal(errors.length,0);fs.writeFileSync(path.join(out,'responsive-results.json'),JSON.stringify({errors,results},null,2));console.log(results);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
