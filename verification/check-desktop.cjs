const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4320';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),out=path.join(__dirname,'artifacts');
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await context.route('**/*.supabase.co/**',r=>r.abort());
 await context.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('mena_current_student',JSON.stringify({id:'local-visual-test',username:'preview',full_name:'معاينة محلية',grade:'الصف الأول الإعدادي'}));});
 const results=[];
 for(const mode of ['baseline','current']){
  const page=await context.newPage();await page.goto(origin+'/'+(mode==='baseline'?'baseline/':'')+'index.html?desktop=1');
  await page.waitForFunction(()=>window.appController?.character);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3500);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
  await page.waitForTimeout(250);
  console.log(mode,await page.locator('.header-logo-img').evaluate(el=>({style:el.getAttribute('style'),rect:el.getBoundingClientRect().toJSON(),transform:getComputedStyle(el).transform,wrap:el.parentElement.getAttribute('style')})));
  await page.screenshot({path:path.join(out,'desktop-'+mode+'.png')});results.push({mode,url:page.url(),mobileStyles:await page.locator('link[href*="mobile"]').count()});await page.close();
 }
 const baseline=fs.readFileSync(path.join(out,'desktop-baseline.png')),current=fs.readFileSync(path.join(out,'desktop-current.png'));
 results.push({desktopScreenshotIdentical:baseline.equals(current)});assert(baseline.equals(current));
 const tablet=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
 const page=await tablet.newPage();await page.goto(origin+'/index.html#view=lesson&grade=1&lesson=u1_l1_atom&session=2');assert(page.url().includes('mobile.html#view=lesson'));results.push('Tablet entry preserves session hash.');
 await page.setViewportSize({width:768,height:1024});assert(page.url().includes('session=2'));results.push('Rotation preserves route.');
 await page.goto(origin+'/index.html?desktop=1');assert(page.url().includes('index.html'));results.push('Explicit desktop choice respected on tablet.');
 fs.writeFileSync(path.join(out,'desktop-results.json'),JSON.stringify(results,null,2));console.log(results);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
