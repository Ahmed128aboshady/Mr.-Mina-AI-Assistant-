const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin='http://127.0.0.1:4320',results=[];
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const c=await browser.newContext({viewport:{width:390,height:760}});await c.route('**/*.supabase.co/**',r=>r.abort());const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/mobile.html');await p.locator('#mena-auth-user').fill('student1');await p.locator('#mena-auth-pass').fill('wrong');await p.locator('#mena-auth-submit-btn').click();await p.locator('#mena-auth-error-box.active').waitFor();assert(await p.locator('#mena-auth-submit-btn').isEnabled());
 await p.locator('#mena-auth-pass').fill('123456');await p.locator('#mena-auth-submit-btn').click();await p.waitForFunction(()=>MenaAuth.isLoggedIn());assert.equal(await p.evaluate(()=>Object.hasOwn(MenaAuth.getCurrentStudent(),'password')),false);results.push('Wrong-password recovery and session excludes password.');
 const matches=await p.evaluate(async()=>{const engine=Object.create(AppController.prototype),failures=[];let count=0;for(const l of CURRICULUM_GRADE_1.units.flatMap(u=>u.lessons)){for(const s of l.sessions){engine._currentLesson=l;engine._currentSessionNum=s.sessionNum;for(const q of s.whyQuestions){count++;const r=await engine._askAI(q.q);if(!r.answer.includes(q.a)||r.answer.includes('undefined')||!r.actions.some(a=>a.action.includes(`'${l.lessonId}', ${s.sessionNum}`)))failures.push({id:l.lessonId,session:s.sessionNum,q:q.q,answer:r.answer});}}}return {count,failures};});
 fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts/chat-matches.json'),JSON.stringify(matches,null,2));assert.equal(matches.failures.length,0);results.push(matches.count+' exact why questions return their answer and correct session.');
 await p.locator('.m-nav [data-view=courses]').click();await p.locator('#courses-content [data-lesson=u1_l1_atom][data-session="1"]').click();await p.locator('#mentor').click();
 async function ask(q){await p.locator('#chat-input').fill(q);await p.locator('#chat-form button').click();await p.waitForFunction(()=>!document.querySelector('#chat-form button').disabled);return p.locator('.m-chat-message').last().textContent();}
 await ask('اشرحلي الكثافة');const simplified=await ask('بسطهالي اكتر');assert(/كثاف|طفو|يطفو|حديد/.test(simplified));results.push('Follow-up simplification keeps chat topic while another lesson is open.');
 await p.goBack();assert(!await p.locator('#sheet').isVisible());results.push('Browser Back closes sheet and restores screen.');
 await p.evaluate(()=>{localStorage.setItem('mena_mobile_progress_v1:1',JSON.stringify({bad:null,bad2:{stars:'invalid'},valid:{stars:[true,false],visited:true}}));localStorage.setItem('mena_student_db','{}');});await p.reload();await p.locator('.m-nav [data-view=courses]').click();await p.locator('#courses-content [data-lesson=u1_l1_atom][data-session="1"]').click();assert.equal(errors.length,0);results.push('Malformed stored progress/activity does not break lesson loading.');
 const second=await c.newPage();await second.goto(origin+'/mobile.html');await second.evaluate(()=>MenaAuth.logout());await p.locator('#mena-auth-overlay.active').waitFor();assert(await p.locator('.m-app').evaluate(el=>el.inert));results.push('Logout synchronizes across tabs and locks background.');
 // Real configuration with an unavailable client must not fall through to local demo users.
 await p.evaluate(()=>{MENA_SUPABASE_CONFIG.isLocalDemo=false;MENA_SUPABASE_CONFIG.isConfigured=()=>true;window.getSupabaseClient=()=>null;});const denied=await p.evaluate(()=>MenaAuth.login('student1','123456'));assert.equal(denied.success,false);results.push('Missing production auth client cannot use demo credentials.');
 assert.equal(errors.length,0);console.log(results);fs.writeFileSync(path.join(__dirname,'artifacts/edge-results.json'),JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
