const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[],errors=[];
try{
for(const viewport of [{width:390,height:760},{width:1024,height:768}]){
 const context=await browser.newContext({viewport});await context.route('**/*.supabase.co/**',r=>r.abort());const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4320/mobile.html#view=courses&grade=1');await p.locator('#mena-auth-user').fill('student1');await p.locator('#mena-auth-pass').fill('123456');await p.locator('#mena-auth-submit-btn').click();await p.waitForFunction(()=>MenaAuth.isLoggedIn());
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.locator('.m-nav [data-view=lab]').click();
 assert.equal(await p.locator('body').getAttribute('data-view'),'labs');assert.equal(await p.locator('.m-nav [data-view=lab]').getAttribute('aria-current'),'page');assert.equal(await p.locator('#lab-content [data-destination=lab]').count(),24);
 await p.reload();await p.locator('#lab-content [data-lesson=u1_l1_atom][data-session="2"]').click();await p.waitForFunction(()=>window.interactiveLab?.renderer);assert.equal(await p.evaluate(()=>interactiveLab.currentSessionNum),2);assert.equal(await p.locator('body').getAttribute('data-view'),'lab');
 await p.locator('#lab-content [data-view=labs]').click();assert.equal(await p.evaluate(()=>interactiveLab.renderer),null);await p.locator('#lab-content [data-lesson=u1_l3_matter][data-session="1"]').click();await p.waitForFunction(()=>window.interactiveLab?.renderer);assert.equal(await p.evaluate(()=>interactiveLab.currentTopic),'u1_l3_matter');
 await p.goBack();assert.equal(await p.locator('body').getAttribute('data-view'),'labs');
 await p.locator('.m-nav [data-view=courses]').click();await p.locator('#courses-content [data-lesson=u1_l1_atom][data-session="1"]').click();assert.equal(await p.locator('body').getAttribute('data-view'),'lesson');await p.locator('.m-nav [data-view=lab]').click();await p.waitForFunction(()=>window.interactiveLab?.renderer);assert.equal(await p.evaluate(()=>interactiveLab.currentTopic),'u1_l1_atom');
 results.push({viewport,passed:['Lab tab opens picker before lesson selection','24 session choices','Reload preserves picker','Selection opens lab directly','Change experiment stays in lab flow','Back restores picker','Course entry still opens lesson','Selected lesson lab opens directly']});await context.close();
}
assert.equal(errors.length,0);fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'reports/lab-entry.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
