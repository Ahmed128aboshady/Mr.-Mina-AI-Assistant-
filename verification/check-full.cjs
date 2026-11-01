const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/full');fs.mkdirSync(out,{recursive:true});
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4320';
const report={checks:[],issues:[],errors:[],missingAssets:[],requests:[]};
function check(name,ok,details){report.checks.push({name,ok,...(details?{details}: {})});if(!ok){report.issues.push({name,details});console.log('FAIL',name,details||'');}}
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/curriculum_data.js'),'utf8'),sandbox);
const curriculum=sandbox.window.CURRICULUM_GRADE_1,targets=curriculum.units.flatMap(u=>u.lessons.flatMap(l=>l.sessions.map(s=>({id:l.lessonId,title:l.title,session:s}))));
const audioIds=new Set();for(const {id,session:s} of targets){audioIds.add(id.split('_').slice(0,2).join('_')+'_s'+s.sessionNum);for(const w of s.whyQuestions||[])if(w.audio)audioIds.add(w.audio);for(const q of s.quiz||[])check('Quiz schema '+id+':'+s.sessionNum+':'+q.question,q.options.filter(o=>o.isCorrect).length===1&&!!q.explanation);}
for(const id of audioIds){const file=path.join(root,'audio_cache',id+'.mp3');if(!fs.existsSync(file)||fs.statSync(file).size<100)report.missingAssets.push(id);}
check('All session/why audio files exist',!report.missingAssets.length,report.missingAssets);
async function login(page,file){await page.goto(origin+'/'+file);await page.locator('#mena-auth-user').fill('student1');await page.locator('#mena-auth-pass').fill('123456');await page.locator('#mena-auth-submit-btn').click();await page.waitForFunction(()=>!document.querySelector('#mena-auth-overlay').classList.contains('active'));}
function track(page,label){page.on('pageerror',e=>{report.errors.push({label,error:e.message});console.log('PAGE ERROR',label,e.message)});page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))report.requests.push({url:r.url(),status:r.status()});});}
async function overflow(page,name){check(name,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const mobile=await browser.newContext({viewport:{width:390,height:760},reducedMotion:'reduce'});await mobile.route('**/*.supabase.co/**',r=>r.abort());
 const page=await mobile.newPage();track(page,'mobile');await page.addInitScript(()=>{window.__plays=[];const p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__plays.push(this.src);return p.call(this)};});await login(page,'mobile.html');await page.waitForTimeout(600);check('Mobile login silent',!(await page.evaluate(()=>__plays)).length);
 for(const t of targets){
  const key=t.id+':'+t.session.sessionNum;console.log('Mobile',key);
  await page.locator('.m-nav [data-view=courses]').click();await page.locator(`#courses-content [data-lesson="${t.id}"][data-session="${t.session.sessionNum}"]`).click();
  check('Lesson content '+key,(await page.locator('#lesson-content').textContent()).includes(t.session.summary.slice(0,30)));
  check('All why '+key,await page.locator('[data-why]').count()===(t.session.whyQuestions||[]).length);
  await overflow(page,'Lesson width '+key);
  await page.locator('.m-steps [data-view=quiz]').click();
  for(const q of t.session.quiz||[]){const correct=q.options.findIndex(o=>o.isCorrect);await page.locator(`[data-answer="${correct}"]`).click();await page.locator('#next-action').click();}
  check('Quiz result '+key,await page.locator('[data-action=retry-quiz]').isVisible());
  await page.locator('.m-nav [data-view=lab]').click();await page.waitForFunction(()=>window.interactiveLab?.renderer,{},{timeout:25000});
  check('Lab session '+key,await page.evaluate(n=>interactiveLab.currentSessionNum===n,t.session.sessionNum));
  const count=await page.locator('#lab-controls button').count();
  for(let i=0;i<count;i++){const b=page.locator('#lab-controls button').nth(i);if(await b.isVisible()&&await b.isEnabled()){const handler=await b.getAttribute('onclick')||await b.getAttribute('data-experiment-action');if(!handler)report.issues.push({name:'Inert lab button',details:{key,text:await b.textContent()}});await b.click();}}
  await overflow(page,'Lab width '+key);
 }
 check('Total mobile stars',Number(await page.locator('#stars').textContent())===targets.reduce((n,t)=>n+t.session.quiz.length,0));
 for(const [w,h]of [[375,568],[430,932],[768,1024],[1024,768],[667,375]]){
  await page.setViewportSize({width:w,height:h});await overflow(page,'Lab responsive '+w+'x'+h);await page.screenshot({path:path.join(out,'lab-'+w+'.png')});
  await page.locator('.m-nav [data-view=home]').click();check('Home fit '+w+'x'+h,await page.evaluate(()=>document.documentElement.scrollHeight===innerHeight&&document.documentElement.scrollWidth===innerWidth));
  await page.locator('#mentor').click();await page.locator('#chat-input').fill('اشرح الدرس');await page.locator('#chat-form button').click();await page.waitForFunction(()=>!document.querySelector('#chat-form button').disabled);check('Help send visible '+w+'x'+h,await page.locator('#chat-form button').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0}));await page.keyboard.press('Escape');await page.locator('.m-nav [data-view=lab]').click();await page.waitForFunction(()=>window.interactiveLab?.renderer);
 }
 await page.setViewportSize({width:390,height:760});await page.locator('.m-nav [data-view=home]').click();await page.screenshot({path:path.join(out,'mobile-home.png')});
 const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await desktop.route('**/*.supabase.co/**',r=>r.abort());const d=await desktop.newPage();track(d,'desktop');await d.addInitScript(()=>{window.__plays=[];const p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__plays.push(this.src);return p.call(this)};});await login(d,'index.html?desktop=1');await d.waitForTimeout(700);check('Desktop login silent',!(await d.evaluate(()=>__plays)).some(s=>s.includes('welcome_mr_mena')));await d.screenshot({path:path.join(out,'desktop-home.png')});
 for(const t of targets){const key=t.id+':'+t.session.sessionNum;console.log('Desktop',key);await d.evaluate(t=>appController.selectLessonSession(t.id,t.session.sessionNum),t);await d.waitForTimeout(150);
  check('Desktop all quiz '+key,await d.locator('.quiz-box').count()===t.session.quiz.length);
  const q=t.session.quiz[0];await d.locator('.quiz-box').first().locator('.quiz-opt-btn').nth(q.options.findIndex(o=>o.isCorrect)).click();check('Desktop score resets '+key,await d.evaluate(()=>appController._quizScore===10));
 }
 await d.evaluate(()=>appAudioManager.stopAll());
 check('No JavaScript errors',report.errors.length===0,report.errors);check('No missing HTTP resources',report.requests.length===0,report.requests);
 }catch(error){report.issues.push({name:'Audit interrupted',details:error.stack});console.error(error);}finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,issues:report.issues,errors:report.errors,missing:report.missingAssets},null,2));await browser.close();
 }
})();
