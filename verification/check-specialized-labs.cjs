const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[],errors=[],out=path.join(__dirname,'artifacts/specialized');fs.mkdirSync(out,{recursive:true});
 try{for(const width of [390,1024,1440]){
  const desktop=width===1440,ctx=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  await ctx.route('**/*.supabase.co/**',r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__played=[];HTMLMediaElement.prototype.play=function(){__played.push(this.src);return Promise.resolve();};});
  await p.goto('http://127.0.0.1:4320/'+(desktop?'index.html?desktop=1':'mobile.html#view=labs&grade=1'));
  await p.locator('#mena-auth-user').fill('student1');await p.locator('#mena-auth-pass').fill('123456');await p.locator('#mena-auth-submit-btn').click();await p.waitForFunction(()=>MenaAuth.isLoggedIn());
  const click=async a=>{await p.locator(`[data-experiment-action="${a}"]`).click();};
  const reading=()=>p.evaluate(()=>interactiveLab.experimentReading);
  for(const [id,kind] of [['u2_l1_electric','electric'],['u2_l3_gravity','gravity'],['u3_l3_microbes','microbes']])for(const num of [1,2]){
   if(desktop){await p.locator(`#stage-card-${kind==='microbes'?3:2}`).click();await p.locator(`.drawer-session-btn[onclick*="'${id}', ${num}"]`).click();}
   else await p.locator(`#lab-content [data-lesson="${id}"][data-session="${num}"]`).click();
   await p.waitForFunction(({kind,num})=>window.interactiveLab?.experiment?.kind===kind&&interactiveLab.experiment?.session===num&&interactiveLab.renderer,{kind,num});
   await p.waitForTimeout(650);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert(await p.locator('#lab-controls button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=48)));
   assert((await p.evaluate(()=>interactiveLab.experimentGroup.children.length))>5);
   if(kind==='electric'&&num===1){await click('sign:-1');assert.equal((await reading()).interaction,'attract');await click('distance:2');assert.equal((await reading()).forceRatio,.25);await click('charge:2');assert.equal((await reading()).forceRatio,.5);}
   if(kind==='electric'&&num===2){await click('near:1');assert.equal((await reading()).netCharge,0);assert((await reading()).spread>0);await click('away');assert.equal((await reading()).spread,0);await click('contact:1');const spread=(await reading()).spread;await click('near:-1');assert((await reading()).spread<spread);await click('away');assert.equal((await reading()).netCharge,1);await click('ground');assert.equal((await reading()).netCharge,0);await click('contact:-1');}
   if(kind==='gravity'&&num===1){await click('massA:2');await click('massB:2');assert.equal((await reading()).forceRatio,4);await click('distance:2');assert.equal((await reading()).forceRatio,1);}
   if(kind==='gravity'&&num===2){assert.equal((await reading()).scaleReading,60);await click('world:moon');assert.equal((await reading()).scaleReading,10);await click('mass:24');await click('falling');assert.equal((await reading()).gravityForce,40);assert.equal((await reading()).scaleReading,0);await click('falling');assert.equal((await reading()).scaleReading,40);}
   if(kind==='microbes'&&num===1){await click('step');assert.equal((await reading()).acid,0);await click('starter');for(let i=0;i<4;i++)await click('step');assert.equal((await reading()).acid,12);assert(await p.locator('[data-experiment-action=step]').isDisabled());await click('cold');await click('step');assert.equal((await reading()).progress,.2);await click('mode:roots');await click('exchange');assert.equal((await reading()).exchange,true);}
   if(kind==='microbes'&&num===2){await click('step');assert((await reading()).gas>0);await click('sugar');await click('step');assert.equal((await reading()).gas,0);await click('mode:mold');const before=(await reading()).bacteriaVisible;await click('mold');assert((await reading()).bacteriaVisible<before);}
   await p.locator('#lab-3d-canvas').screenshot({path:path.join(out,`${width}-${kind}-${num}-canvas.png`)});
   await p.locator(desktop?'.interactive-lab-container':'.m-real-lab').screenshot({path:path.join(out,`${width}-${kind}-${num}.png`)});
   await click('reset');const baseline=await p.evaluate(()=>({...interactiveLab.renderer.info.memory}));for(let i=0;i<8;i++)await click('reset');assert.deepEqual(await p.evaluate(()=>({...interactiveLab.renderer.info.memory})),baseline);
   results.push({width,kind,session:num,interactive:true,resetMemoryStable:true,touchTargets48:true});
   if(desktop)await p.locator('#back-btn').click();else await p.locator('#lab-content [data-view=labs]').click();
   assert.equal(await p.evaluate(()=>interactiveLab.renderer),null);assert.equal(await p.evaluate(()=>interactiveLab.experiment),null);
  }
  assert.equal(await p.evaluate(()=>__played.length),0);console.log('Passed dedicated sessions',width);await ctx.close();
 }
 assert.deepEqual(errors,[]);fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'reports/specialized-labs.json'),JSON.stringify({results,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
