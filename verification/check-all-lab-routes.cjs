const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[],errors=[];
 try{
 for(const viewport of [{width:390,height:760},{width:1024,height:768}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.route('**/*.supabase.co/**',r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__played=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){__played.push(this.src);return play.call(this)};});
  await page.goto('http://127.0.0.1:4320/mobile.html#view=labs&grade=1');
  await page.locator('#mena-auth-user').fill('student1');await page.locator('#mena-auth-pass').fill('123456');await page.locator('#mena-auth-submit-btn').click();await page.waitForFunction(()=>MenaAuth.isLoggedIn());
  const targets=await page.evaluate(()=>CURRICULUM_GRADE_1.units.flatMap(u=>u.lessons.flatMap(l=>l.sessions.map(s=>({id:l.lessonId,num:s.sessionNum,question:s.quiz[0].question,correct:s.quiz[0].options.findIndex(o=>o.isCorrect)})))));
  for(const target of targets){
   await page.locator(`#lab-content [data-lesson="${target.id}"][data-session="${target.num}"]`).click();
   await page.waitForFunction(()=>window.interactiveLab?.renderer);
   assert.deepEqual(await page.evaluate(()=>({id:interactiveLab.currentTopic,num:interactiveLab.currentSessionNum})),{id:target.id,num:target.num});
   assert.equal(await page.locator('.m-nav [data-view=lab]').getAttribute('aria-current'),'page');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#next-action').click();assert((await page.locator('.m-quiz-question').textContent()).includes(target.question));
   await page.locator(`[data-answer="${target.correct}"]`).click();assert(await page.locator('#next-action').isEnabled());
   await page.locator('.m-nav [data-view=lab]').click();await page.waitForFunction(()=>window.interactiveLab?.renderer);
   await page.locator('#lab-content [data-view=labs]').click();assert.equal(await page.evaluate(()=>interactiveLab.renderer),null);
  }
  assert.equal(await page.evaluate(()=>__played.length),0);
  assert.equal(Number(await page.locator('#stars').textContent()),24);
  await page.reload();assert.equal(Number(await page.locator('#stars').textContent()),24);assert.equal(await page.locator('#lab-content [data-destination=lab]').count(),24);
  // Invalid/deleted lesson links should recover to the picker instead of a blank screen.
  await page.goto('http://127.0.0.1:4320/mobile.html#view=lab&grade=1&lesson=missing&session=99');
  assert.equal(await page.locator('body').getAttribute('data-view'),'labs');
  results.push({viewport,labRoutes:targets.length,quizMappings:targets.length,silentEntry:true,starsPersist:true,invalidLinkRecovery:true});
  console.log('Passed',viewport.width,targets.length,'lab routes');await context.close();
 }
 assert.equal(errors.length,0);fs.writeFileSync(path.join(__dirname,'reports/all-lab-routes.json'),JSON.stringify({results,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
