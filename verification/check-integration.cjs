const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4320';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:760}});
 const errors=[],results=[];
 // Test-only replacement of database configuration. No production account/database requests.
 await context.route('**/js/supabase_config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.MENA_SUPABASE_CONFIG={isLocalDemo:true,isConfigured:()=>false,getUrl:()=>"",getAnonKey:()=>""};window.getSupabaseClient=()=>null;'}));
 await context.route('**/*.supabase.co/**',route=>route.abort());
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.type(),m.text());});page.on('requestfailed',r=>console.log('Request failed',r.url(),r.failure()));
 const url=origin+'/mobile.html';
 try{
  await page.goto(url);await page.locator('#mena-auth-overlay.active').waitFor();
  assert(await page.locator('.m-app').evaluate(e=>e.inert));
  await page.locator('#mena-auth-user').fill('mena_demo');await page.locator('#mena-auth-pass').fill('123456');await page.locator('#mena-auth-submit-btn').click();
  await page.waitForFunction(()=>!document.querySelector('#mena-auth-overlay').classList.contains('active'));results.push('Existing local-demo auth flow; background inert before login.');
  for(const [width,height] of [[375,568],[375,667],[390,760],[390,800],[430,932],[768,1024],[1024,768],[667,375]]){
    await page.setViewportSize({width,height});
    const fit=await page.evaluate(()=>({width:innerWidth,height:innerHeight,vertical:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,cards:[...document.querySelectorAll('.m-stage-image')].every(e=>e.getBoundingClientRect().bottom<=document.querySelector('.m-dock').getBoundingClientRect().top),small:[...document.querySelectorAll('.m-app button')].filter(e=>e.getClientRects().length&&(e.getBoundingClientRect().height<47||e.getBoundingClientRect().width<47)).map(e=>e.textContent)}));
    console.log('Viewport',fit);assert.equal(fit.vertical,0);assert.equal(fit.horizontal,0);assert(fit.cards);assert.equal(fit.small.length,0);results.push(fit);
  }
  await page.setViewportSize({width:390,height:760});await page.screenshot({path:path.join(out,'home.png')});
  await page.locator('.m-stage-image[data-unit="0"]').click();assert.equal(await page.locator('#sheet [data-lesson]').count(),8);results.push('All four lessons and eight sessions in unit one rendered from curriculum.');
  await page.locator('#sheet [data-lesson="u1_l1_atom"][data-session="1"]').click();
  assert.equal(await page.locator('[data-why]').count(),5);await page.locator('[data-why="0"]').click();
  await page.waitForFunction(()=>document.querySelector('#player').classList.contains('is-playing'));results.push('Real recorded question audio playing.');
  await page.locator('[data-why="1"]').click();assert(!await page.locator('#why-answer-0').isVisible());await page.locator('#audio-close').click();
  await page.locator('#mentor').click();await page.locator('#chat-input').fill('اشرح الدرس');await page.locator('#chat-form button').click();
  await page.waitForFunction(()=>document.querySelector('#chat-log').textContent.includes('ملخص الحصة'));
  assert(!(await page.locator('#chat-log').textContent()).includes('تجريبية'));results.push('Shared curriculum engine answers with current session context.');
  await page.locator('#chat-input').fill('<img src=x onerror="window.xss=true">');await page.locator('#chat-form button').click();
  await page.waitForFunction(()=>!document.querySelector('#chat-form button').disabled);assert.equal(await page.locator('#chat-log img').count(),0);
  const messages=await page.locator('.m-chat-message').count();await page.locator('#close-sheet').click();await page.locator('#mentor').click();assert.equal(await page.locator('.m-chat-message').count(),messages);await page.locator('#close-sheet').click();
  await page.locator('[data-view="quiz"]').filter({visible:true}).first().click();
  let quiz=await page.evaluate(()=>CURRICULUM_GRADE_1.units[0].lessons[0].sessions[0].quiz);
  for(let i=0;i<quiz.length;i++){
    const correct=quiz[i].options.findIndex(o=>o.isCorrect);
    if(i===0){const wrong=quiz[i].options.findIndex(o=>!o.isCorrect);await page.locator(`[data-answer="${wrong}"]`).click();assert(await page.locator('#feedback.try-again').isVisible());}
    await page.locator(`[data-answer="${correct}"]`).click();await page.locator('#next-action').click();
  }
  assert.equal(await page.locator('#stars').textContent(),String(quiz.length-1));results.push('Quiz uses all session questions; wrong-answer recovery and star count correct.');
  await page.reload();await page.locator('[data-screen="quiz"]').waitFor();assert.equal(await page.locator('#stars').textContent(),String(quiz.length-1));
  await page.locator('.m-nav [data-view="courses"]').click();
  const lessonCount=await page.evaluate(()=>CURRICULUM_GRADE_1.units.flatMap(u=>u.lessons).length);assert.equal(await page.locator('#courses-content .m-course-card').count(),lessonCount);
  await page.locator('#courses-content [data-lesson="u1_l1_atom"][data-session="2"]').click();await page.locator('#mentor').click();await page.locator('#chat-input').fill('اشرح الدرس');await page.locator('#chat-form button').click();await page.waitForFunction(()=>document.querySelector('#chat-log').textContent.includes('مستويات'));await page.locator('#close-sheet').click();
  const targets=await page.evaluate(()=>CURRICULUM_GRADE_1.units.flatMap(u=>u.lessons).map(l=>({id:l.lessonId,sessions:l.sessions.map(s=>s.sessionNum)})));
  for(const target of targets){
    await page.locator('.m-nav [data-view="courses"]').click();await page.locator(`#courses-content [data-lesson="${target.id}"]`).first().click();await page.locator('#next-action').click();
    await page.locator('#lab-3d-canvas').waitFor({timeout:25000});
    await page.waitForFunction(()=>window.interactiveLab?.renderer);
    assert(await page.locator('#lab-controls button,#lab-controls [role=note]').count()>0);results.push({lab:target.id,buttons:await page.locator('#lab-controls button').count()});
    if(target.id.includes('u1_l3')){await page.locator('#lab-controls button').filter({hasText:'حديد'}).click();assert(await page.evaluate(()=>interactiveLab.densityObjects.some(o=>o.userData.targetY<0)));await page.screenshot({path:path.join(out,'lab-density.png')});}
  }
  await page.locator('.m-nav [data-view="home"]').click();assert.equal(await page.evaluate(()=>window.interactiveLab.renderer),null);results.push('All lesson simulations mounted; renderer disposed on exit.');
  await page.locator('#home-account').click();await page.locator('[data-action="logout"]').click();await page.locator('#mena-auth-overlay.active').waitFor();assert(await page.locator('.m-app').evaluate(e=>e.inert));
  await page.locator('#mena-auth-user').fill('student2');await page.locator('#mena-auth-pass').fill('123456');await page.locator('#mena-auth-submit-btn').click();await page.waitForFunction(()=>!document.querySelector('#mena-auth-overlay').classList.contains('active'));assert.equal(await page.locator('#stars').textContent(),'0');await page.locator('#mentor').click();assert(!(await page.locator('#chat-log').textContent()).includes('onerror'));results.push('Account switch isolates progress and chat.');
  assert.equal(errors.length,0);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({errors,results},null,2));console.log(JSON.stringify({errors,results},null,2));
 }catch(error){await page.screenshot({path:path.join(out,'failure.png')});console.error(error);console.error('Page errors:',errors);process.exitCode=1;}finally{await browser.close();}
})();
