/* Mobile/tablet shell. Curriculum, auth and question resolver remain shared with desktop. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text = value => escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  const auth = window.MenaAuth;
  const engine = Object.create(AppController.prototype);
  Object.assign(engine, {currentGrade:1, _lastTopicId:'u1_l1_atom', _simplificationLevel:0, character:null});
  const audio = new Audio(); audio.preload = 'none';
  const state = {view:'home', grade:1, lesson:null, session:1, account:null, progress:{}, chats:[], pending:false, chatGeneration:0, quizzes:{}, lab:null, labGeneration:0, audioId:null, audioOwner:null, audioGeneration:0};
  let storageFailed = false;
  const available = () => window[`CURRICULUM_GRADE_${state.grade}`];
  const lessons = () => (available()?.units || []).flatMap(unit => unit.lessons);
  const currentSession = () => state.lesson?.sessions?.find(s => Number(s.sessionNum)===state.session);
  const sessionKey = () => `${state.grade}:${state.lesson?.lessonId}:${state.session}`;
  const owner = () => {const student=auth.getCurrentStudent();return student ? String(student.id || student.username) : null;};
  const storeKey = () => `mena_mobile_progress_v1:${state.account}`;
  function readProgress(){
    try {
      const saved=JSON.parse(localStorage.getItem(storeKey())||'{}');
      if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
      return Object.fromEntries(Object.entries(saved).filter(([,p])=>p&&typeof p==='object'&&!Array.isArray(p)).map(([key,p])=>[key,{visited:p.visited===true,completed:p.completed===true,stars:Array.isArray(p.stars)?p.stars.map(s=>s===true):[]}]));
    }catch{return {};}
  }
  function save(){try{localStorage.setItem(storeKey(),JSON.stringify(state.progress));storageFailed=false;}catch{storageFailed=true;}}
  function requireLogin(){if(auth.isLoggedIn())return true;$('#sheet').close();auth.showLoginModal();return false;}
  function totalStars(){return Object.values(state.progress).reduce((n,s)=>n+(s.stars||[]).filter(Boolean).length,0);}
  function updateStars(){$('#stars').textContent=totalStars();}
  function record(type,data){
    // Keep the existing desktop activity schema, including account identity for new records.
    engine.recordStudentActivity(type,{...data,studentId:state.account,grade:state.grade});
  }
  function syncAccount(){
    const id=owner();
    const button=$('#home-account');button.textContent=auth.getFirstLetter(auth.getCurrentStudent());
    if(id===state.account)return;
    stopAudio();stopMic();destroyLab();state.account=id;state.chatGeneration++;state.pending=false;state.chats=[];state.quizzes={};state.lesson=null;state.session=1;
    engine._currentLesson=null;engine._currentSessionNum=1;engine._lastTopicId='u1_l1_atom';engine._simplificationLevel=0;
    engine.studentDB=engine._loadStudentDB();
    state.progress=readProgress();
    updateStars();$('#sheet').close();
    if(id)restoreRoute(false);else show('home',false);
  }
  // Use the existing authentication flow while rendering only the approved mobile account button.
  auth.updateHeaderUI=syncAccount;
  const originalShowLogin=auth.showLoginModal.bind(auth), originalHideLogin=auth.hideLoginModal.bind(auth);
  auth.showLoginModal=()=>{originalShowLogin();$('.m-app').inert=true;stopAudio();destroyLab();};
  auth.hideLoginModal=()=>{originalHideLogin();$('.m-app').inert=false;};

  function showSheet(title,html,chat=false){
    if(!requireLogin())return;
    const sheet=$('#sheet');sheet.classList.toggle('m-chat-sheet',chat);
    $('#sheet-title').textContent=title;$('#sheet-content').innerHTML=html;
    if(!sheet.open)sheet.showModal();
    resizeSheet();
  }
  function resizeSheet(){
    const vv=window.visualViewport;
    const keyboard=vv && vv.scale===1 ? Math.max(0,innerHeight-vv.height-vv.offsetTop) : 0;
    $('#sheet').style.bottom=`${keyboard}px`;
    $('#sheet').style.maxHeight=`${Math.max(160,(vv?.height||innerHeight)*.9)}px`;
  }
  window.visualViewport?.addEventListener('resize',resizeSheet);
  window.visualViewport?.addEventListener('scroll',resizeSheet);
  $('#close-sheet').addEventListener('click',()=>$('#sheet').close());
  $('#sheet').addEventListener('click',event=>{if(event.target!==$('#sheet'))return;const r=event.target.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)event.target.close();});
  $('#sheet').addEventListener('close',()=>{stopMic();});

  function writeRoute(replace=false){
    const params=new URLSearchParams({view:state.view,grade:state.grade});
    if(state.lesson){params.set('lesson',state.lesson.lessonId);params.set('session',state.session);}
    const url=`${location.pathname}${location.search}#${params}`;
    if(location.href.endsWith('#'+params))return;
    history[replace?'replaceState':'pushState']({},'',url);
  }
  function restoreRoute(push=false){
    const params=new URLSearchParams(location.hash.slice(1));
    const grade=Number(params.get('grade'))||1;
    state.grade=window[`CURRICULUM_GRADE_${grade}`]?grade:1;engine.currentGrade=state.grade;
    const selected=lessons().find(l=>l.lessonId===params.get('lesson'));
    state.lesson=selected||null;
    state.session=selected?.sessions?.some(s=>Number(s.sessionNum)===Number(params.get('session')))?Number(params.get('session')):1;
    setContext();show(params.get('view')||'home',push);
  }
  window.addEventListener('popstate',()=>{$('#sheet').close();if(auth.isLoggedIn())restoreRoute(false);});
  function setContext(resetTopic=true){engine._currentLesson=state.lesson;engine._currentSessionNum=state.session;if(resetTopic&&state.lesson){engine._lastTopicId=state.lesson.lessonId;engine._simplificationLevel=0;}}
  function show(view,push=true){
    if(!['home','courses','lesson','labs','lab','quiz','progress'].includes(view))view='home';
    if(!state.lesson&&view==='lab')view='labs';
    if(!state.lesson&&['lesson','quiz'].includes(view))view='courses';
    stopAudio();destroyLab();state.view=view;
    document.body.dataset.view=view;
    const screen=view==='labs'?'lab':view;
    $$('[data-screen]').forEach(e=>e.hidden=e.dataset.screen!==screen);
    $$('.m-nav [data-view]').forEach(b=>{const active=b.dataset.view===screen||(view==='lesson'&&b.dataset.view==='courses');if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('#current-grade-label').textContent=available()?.grade?`الصف ${state.grade===1?'الأول':state.grade===2?'الثاني':'الثالث'} الإعدادي`:'';
    $$('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.grade)===state.grade)));
    renderSidebar();
    if(view==='courses')renderCourses();
    if(view==='lesson'){renderLesson();markUnavailableAudio();}
    if(view==='quiz')renderQuiz();
    if(view==='progress')renderProgress();
    if(view==='labs')renderLabPicker();
    if(view==='lab')renderLab();
    setNext();
    if(push)writeRoute();
    window.scrollTo(0,0);
    if(push){const heading=$(`[data-screen="${screen}"] h1`);if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}}
  }
  function setNext(){
    const button=$('#next-action');button.disabled=false;
    button.textContent=({home:'اختار المرحلة',courses:'ارجع للرئيسية ←',lesson:'نجرب في المعمل ←',labs:'ارجع للدروس ←',lab:'اختبر فهمك ←',progress:'اختار درساً ←'})[state.view]||'التالي ←';
    if(state.view==='quiz'){
      const run=quizRun(), count=currentSession()?.quiz?.length||0;
      button.disabled=count>0&&run.index<count&&!run.answers[run.index]?.solved;
      button.textContent=!count?'ارجع للشرح ←':run.index>=count?'راجع الحصة ←':run.index===count-1?'شوف إنجازك ←':'السؤال التالي ←';
    }
  }
  function sessionButtons(lesson,destination='lesson'){return (lesson.sessions||[]).map(s=>`<button class="m-session-button" data-lesson="${escape(lesson.lessonId)}" data-session="${s.sessionNum}" data-destination="${destination}"><strong>${destination==='lab'?'افتح المعمل · ':''}الحصة ${s.sessionNum}</strong><span>${escape(s.title)}</span></button>`).join('');}
  function renderLabPicker(){
    $('#lab-content').innerHTML='<h1>اختار تجربة المعمل</h1><p class="m-muted">اختار الدرس والحصة، وهتدخل المعمل مباشرة.</p>'+(available()?.units||[]).map(unit=>`<div class="m-section-title"><h2>${escape(unit.unitName)}</h2></div>${unit.lessons.map(l=>`<article class="m-course-card"><h2>${escape(l.title)}</h2><div class="m-session-list">${sessionButtons(l,'lab')}</div></article>`).join('')}`).join('');
  }
  function renderCourses(){
    $('#courses-content').innerHTML=(available()?.units||[]).map((unit,i)=>`<div class="m-section-title"><h2>${escape(unit.unitName)}</h2></div>${unit.lessons.map(l=>`<article class="m-course-card"><h2>${escape(l.title)}</h2><div class="m-session-list">${sessionButtons(l)}</div></article>`).join('')}`).join('')||'<p>لا يتوفر منهج لهذا الصف حالياً.</p>';
  }
  function renderSidebar(){
    $('#sidebar-lessons').innerHTML=(available()?.units||[]).map((unit,i)=>`<button class="m-side-link" data-unit="${i}">${escape(unit.unitName)}</button>`).join('')+(state.lesson?`<p class="m-muted">${escape(state.lesson.title)} · الحصة ${state.session}</p><button class="m-secondary" data-view="lesson">الشرح وعلل</button><button class="m-secondary" data-view="lab">المعمل</button><button class="m-secondary" data-view="quiz">التحدّي</button>`:'');
  }
  function openUnit(index){
    const unit=available()?.units?.[index];if(!unit)return;
    showSheet(unit.unitName,unit.lessons.map(l=>`<article class="m-course-card"><h2>${escape(l.title)}</h2>${sessionButtons(l)}</article>`).join(''));
  }
  function launch(id,num,destination='lesson'){
    const lesson=lessons().find(l=>l.lessonId===id);if(!lesson?.sessions?.some(s=>Number(s.sessionNum)===num))return;
    state.lesson=lesson;state.session=num;setContext();$('#sheet').close();
    state.progress[sessionKey()]??={stars:[]};state.progress[sessionKey()].visited=true;save();
    record('lesson',{lessonId:id,sessionNum:num});show(destination==='lab'?'lab':'lesson');
  }
  function renderLesson(){
    const session=currentSession();if(!session)return;
    const prefix=state.lesson.lessonId.split('_').slice(0,2).join('_');
    $('#lesson-content').innerHTML=`<p class="m-eyebrow">${escape(state.lesson.title)} · الحصة ${state.session}</p><h1>${escape(session.title)}</h1><div class="m-steps"><button data-view="lesson" aria-current="step">1 · افهم</button><button data-view="lab">2 · جرّب</button><button data-view="quiz">3 · اختبر</button></div><article class="m-lesson-idea"><h2>نفهم الفكرة</h2><p>${text(session.summary)}</p><button class="m-secondary" data-audio="${escape(prefix+'_s'+state.session)}" data-title="شرح الحصة ${state.session}">▷ اسمع شرح مستر مينا</button></article><div class="m-section-title"><h2>القواعد الأساسية</h2></div><ul class="m-rules">${(session.rules||[]).map(rule=>`<li>${text(rule)}</li>`).join('')}</ul><div class="m-section-title"><h2>فكّر… وعلّل</h2></div>${(session.whyQuestions||[]).map((q,i)=>`<div class="m-accordion"><button class="m-question" data-why="${i}" aria-expanded="false" aria-controls="why-answer-${i}"><span class="m-question-num">${i+1}</span><span>${escape(q.q)}</span><span class="m-plus" aria-hidden="true">+</span></button><div class="m-answer" id="why-answer-${i}" hidden><p>${text(q.a)}</p>${q.audio?`<button class="m-text-btn" data-audio="${escape(q.audio)}" data-title="${escape(q.q)}">▷ اسمع الإجابة تاني</button>`:''}</div></div>`).join('')}`;
  }
  function markUnavailableAudio(){
    if(!window.MENA_AUDIO_IDS)return;
    $$('#lesson-content [data-audio]').forEach(button=>{if(!window.MENA_AUDIO_IDS.has(button.dataset.audio)){button.disabled=true;button.textContent='التسجيل الصوتي غير متاح حالياً — تابع الشرح المكتوب';}});
  }
  function toggleWhy(index){
    const button=$(`[data-why="${index}"]`),opening=button.getAttribute('aria-expanded')!=='true';
    $$('[data-why]').forEach(b=>{b.setAttribute('aria-expanded','false');b.querySelector('.m-plus').textContent='+';$('#'+b.getAttribute('aria-controls')).hidden=true;});
    stopAudio();if(!opening)return;
    button.setAttribute('aria-expanded','true');button.querySelector('.m-plus').textContent='−';$('#'+button.getAttribute('aria-controls')).hidden=false;
    const q=currentSession().whyQuestions[index];if(q.audio)play(q.audio,q.q,index);
  }

  function stopAudio(){state.audioGeneration++;audio.pause();audio.removeAttribute('src');audio.load();state.audioId=null;state.audioOwner=null;$('#player').hidden=true;$('#player').classList.remove('is-playing');}
  async function play(id,title,owner=null){
    if(!requireLogin()||!/^[\w-]+$/.test(id))return;
    if(window.MENA_AUDIO_IDS&&!window.MENA_AUDIO_IDS.has(id)){
      stopAudio();$('#player').hidden=false;$('#audio-title').textContent=title;$('#audio-status').textContent='التسجيل غير متاح حالياً؛ تابع الشرح المكتوب.';$('#audio-toggle').disabled=true;return;
    }
    $('#audio-toggle').disabled=false;
    const generation=++state.audioGeneration;
    if(state.audioId!==id){audio.pause();audio.src=`audio_cache/${id}.mp3`;state.audioId=id;}else if(audio.error)audio.load();
    state.audioOwner=owner;$('#player').hidden=false;$('#audio-title').textContent=title;$('#audio-status').textContent='جارٍ تحميل الصوت…';
    try{await audio.play();}catch{if(generation===state.audioGeneration){$('#audio-status').textContent='تعذّر تشغيل الصوت؛ النص متاح. اضغط لإعادة المحاولة.';$('#audio-toggle').textContent='▷';$('#audio-toggle').setAttribute('aria-label','إعادة محاولة تشغيل الصوت');}}
  }
  audio.addEventListener('playing',()=>{$('#player').classList.add('is-playing');$('#audio-status').textContent='صوت مستر مينا';$('#audio-toggle').textContent='Ⅱ';$('#audio-toggle').setAttribute('aria-label','إيقاف الصوت مؤقتاً');});
  audio.addEventListener('pause',()=>{$('#player').classList.remove('is-playing');$('#audio-toggle').textContent='▷';$('#audio-toggle').setAttribute('aria-label','متابعة الصوت');if(state.audioId)$('#audio-status').textContent='متوقف مؤقتاً';});
  audio.addEventListener('ended',()=>{$('#audio-status').textContent='انتهى الشرح — اسمعه مرة أخرى';});
  audio.addEventListener('error',()=>{if(state.audioId){$('#player').classList.remove('is-playing');$('#audio-status').textContent='الصوت غير متاح؛ يمكنك قراءة الشرح وإعادة المحاولة.';}});
  $('#audio-toggle').addEventListener('click',()=>audio.paused?play(state.audioId,$('#audio-title').textContent,state.audioOwner):audio.pause());
  $('#audio-close').addEventListener('click',stopAudio);
  new ResizeObserver(()=>document.body.style.setProperty('--m-dock-height',`${$('.m-dock').getBoundingClientRect().height}px`)).observe($('.m-dock'));

  function quizRun(){return state.quizzes[sessionKey()]??={index:0,answers:[]};}
  function renderQuiz(){
    const questions=currentSession()?.quiz||[],run=quizRun();
    if(!questions.length){$('#quiz-content').innerHTML='<h1>اختبر فهمك</h1><p>لا توجد أسئلة لهذه الحصة حالياً. يمكنك مراجعة الشرح.</p>';return;}
    if(run.index>=questions.length){
      const count=run.answers.filter(a=>a?.firstCorrect).length;
      state.progress[sessionKey()]??={stars:[]};state.progress[sessionKey()].completed=true;save();
      $('#quiz-content').innerHTML=`<p class="m-eyebrow">أتممت تحدّي الحصة ${state.session}</p><h1>كل تجربة بتعلّمك!</h1><div class="m-achievement"><span class="m-big-star" aria-hidden="true">★</span><h2>${count} من ${questions.length} إجابات صحيحة من أول محاولة</h2><p>راجع السبب وخد وقتك. التعلّم أهم من النتيجة.</p><button class="m-secondary" data-action="retry-quiz">إعادة التحدّي</button><button class="m-secondary" data-view="courses">اختار حصة أخرى</button></div>`;return;
    }
    const q=questions[run.index],answer=run.answers[run.index];
    $('#quiz-content').innerHTML=`<p class="m-eyebrow">${escape(state.lesson.title)} · ${run.index+1} من ${questions.length}</p><h1>ورّينا فهمك</h1><div class="m-quiz-progress" role="progressbar" aria-label="تقدم التحدّي" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${run.index}"><div style="width:${100*run.index/questions.length}%"></div></div><div class="m-quiz-question"><span class="m-tag">خد وقتك</span><h2>${escape(q.question)}</h2></div><div class="m-answers">${q.options.map((opt,i)=>`<button class="m-option ${answer?.solved&&opt.isCorrect?'is-correct':answer?.wrong?.includes(i)?'is-wrong':''}" data-answer="${i}" ${answer?.solved||answer?.wrong?.includes(i)?'disabled':''}><span>${['أ','ب','ج','د','هـ'][i]||i+1}</span>${escape(opt.text)}${answer?.solved&&opt.isCorrect?' ✓':''}</button>`).join('')}</div><div id="feedback" class="m-feedback ${answer&&!answer.solved?'try-again':''}" role="status" ${answer?'':'hidden'}>${answer?answer.solved?`<span class="m-reward">${answer.firstCorrect?'★':'✓'}</span><strong>برافو، وصلت لها!</strong><p>${text(q.explanation)}</p>`:`<strong>جرّب تاني على مهلك.</strong><p>اقرأ الاختيارات مرة أخرى، أو ارجع للشرح.</p><button class="m-text-btn" data-view="lesson">راجع الشرح</button>`:''}</div>`;
  }
  function answerQuiz(index){
    const run=quizRun(),q=currentSession()?.quiz?.[run.index];if(!q||run.answers[run.index]?.solved)return;
    const opt=q.options[index];if(!opt)return;
    const answer=run.answers[run.index]??={wrong:[],solved:false,firstCorrect:false};
    if(answer.wrong.includes(index))return;
    if(opt.isCorrect){answer.solved=true;answer.firstCorrect=answer.wrong.length===0;const progress=state.progress[sessionKey()]??={stars:[]};progress.stars||=[];if(answer.firstCorrect)progress.stars[run.index]=true;save();updateStars();}
    else answer.wrong.push(index);
    record('quiz',{lessonId:state.lesson.lessonId,sessionNum:state.session,question:q.question,choice:opt.text,correct:opt.isCorrect,score:totalStars()*10});
    renderQuiz();setNext();
    const feedback=$('#feedback');requestAnimationFrame(()=>{const bottom=feedback.getBoundingClientRect().bottom,dockTop=$('.m-dock').getBoundingClientRect().top;if(bottom>dockTop)window.scrollBy(0,bottom-dockTop+16);});
  }
  function renderProgress(){
    const entries=Object.entries(state.progress).filter(([,p])=>p.visited);
    $('#progress-content').innerHTML=`<h1>إنجازك</h1><div class="m-achievement"><span class="m-big-star">★</span><h2>${totalStars()} نجوم</h2><p>كل إجابة صحيحة من أول محاولة تمنحك نجمة، مرة واحدة لكل سؤال.</p><p class="m-muted m-small">${storageFailed?'تعذّر الحفظ على هذا الجهاز؛ تقدم هذه الجلسة ما زال متاحاً.':'التقدم محفوظ لهذا الحساب على هذا المتصفح والجهاز.'}</p></div><div class="m-section-title"><h2>حصصك</h2></div>${entries.map(([key,p])=>{const [grade,id,num]=key.split(':');const l=window[`CURRICULUM_GRADE_${grade}`]?.units.flatMap(u=>u.lessons).find(l=>l.lessonId===id);return l?`<button class="m-session-button" data-lesson="${escape(id)}" data-session="${num}" data-progress-grade="${grade}">${escape(l.title)} · الحصة ${num}<span>${p.completed?'أتممت التحدّي':'بدأت الحصة'} · ${(p.stars||[]).filter(Boolean).length} نجوم</span></button>`:'';}).join('')||'<p>اختار أول حصة وابدأ رحلتك.</p>'}`;
  }

  const scriptPromises=new Map();
  function loadScript(src){
    if(scriptPromises.has(src))return scriptPromises.get(src);
    const promise=new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>{tag.remove();scriptPromises.delete(src);reject(new Error('script-load'));};document.head.append(tag);});scriptPromises.set(src,promise);return promise;
  }
  function destroyLab(){state.labGeneration++;state.lab?.destroy();state.lab=null;}
  async function renderLab(){
    const generation=state.labGeneration;
    $('#lab-content').innerHTML=`<p class="m-eyebrow">${escape(state.lesson.title)} · الحصة ${state.session}</p><h1>معملك التفاعلي</h1><button class="m-secondary" data-view="labs">غيّر الدرس أو التجربة</button><div id="mobile-lab-mount" aria-live="polite"><p>جارٍ تجهيز المعمل…</p></div>`;
    try{
      if(!window.THREE)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      if(!window.MobileInteractiveLab){await loadScript('js/interactive_lab.js?v=dedicated1');await loadScript('js/specialized-labs.js?v=dedicated1');await loadScript('js/mobile-lab.js?v=dedicated1');}
      if(generation!==state.labGeneration||state.view!=='lab')return;
      state.lab=new window.MobileInteractiveLab();window.interactiveLab=state.lab;
      state.lab.init($('#mobile-lab-mount'),state.lesson.lessonId,state.session);
    }catch(error){
      if(generation!==state.labGeneration)return;
      console.warn('Mobile lab could not start:',error);
      state.lab?.destroy();state.lab=null;
      $('#mobile-lab-mount').innerHTML=`<article class="m-lesson-idea"><h2>تعذّر تشغيل العرض ثلاثي الأبعاد</h2><p>قد تكون مكتبة العرض غير متاحة أو جهازك لا يدعم WebGL. يمكنك متابعة الشرح المكتوب والصوتي.</p><p>${text(currentSession()?.summary||'')}</p><button class="m-secondary" data-action="retry-lab">إعادة المحاولة</button><button class="m-secondary" data-view="lesson">ارجع للشرح</button></article>`;
    }
  }
  // The original lab builders call this single adapter for recorded teacher audio.
  window.appController={playLabAudio:(id,explanation)=>{if(state.view==='lab'&&state.lab&&!state.lab.building){
    $('#lab-audio-explanation')?.remove();
    if(explanation){const note=document.createElement('p');note.id='lab-audio-explanation';note.textContent=explanation;$('#lab-info-bar')?.append(note);}
    play(id,'شرح التجربة');
  }}};

  function openChat(){
    audio.pause();
    showSheet('مساعدة · اسأل مستر مينا',`<p class="m-chat-note">${state.lesson?`${escape(state.lesson.title)} · الحصة ${state.session}`:'اسأل عن أي درس في منهج العلوم'}</p><div id="chat-log" class="m-chat-log" role="log" aria-live="polite" aria-label="المحادثة"></div><form id="chat-form" class="m-chat-form"><label for="chat-input">اكتب سؤالك</label><textarea id="chat-input" placeholder="اكتب سؤالك هنا…" rows="1" maxlength="2000"></textarea><button class="m-primary" type="submit" ${state.pending?'disabled':''}>إرسال</button></form><div class="m-chat-extra"><button class="m-text-btn" data-action="microphone">🎙 إملاء صوتي</button><span id="mic-status" role="status"></span></div>`,true);
    renderMessages();
    $('#chat-form')?.addEventListener('submit',event=>{event.preventDefault();sendChat($('#chat-input').value);});
  }
  function renderMessages(){
    const log=$('#chat-log');if(!log)return;
    log.innerHTML='';
    const messages=state.chats.length?state.chats:[{role:'assistant',body:'أهلاً يا بطل! اسألني عن المنهج، أو اكتب «اشرح الدرس» وأنا معاك خطوة بخطوة.'}];
    messages.forEach(message=>{
      const bubble=document.createElement('div');bubble.className='m-chat-message'+(message.role==='user'?' is-student':'');
      const name=document.createElement('small');name.textContent=message.role==='user'?'أنت':'مساعد مستر مينا';bubble.append(name);
      const content=document.createElement('div');content.innerHTML=text(message.body);bubble.append(content);
      (message.actions||[]).forEach(action=>{const button=document.createElement('button');button.className='m-text-btn';button.textContent=action.label;button.addEventListener('click',()=>runAction(action.action,action.label));bubble.append(button);});
      if(message.retry){const button=document.createElement('button');button.className='m-text-btn';button.textContent='إعادة المحاولة';button.addEventListener('click',()=>sendChat(message.retry,false));bubble.append(button);}
      log.append(bubble);
    });
    if(state.pending){const status=document.createElement('p');status.textContent='جارٍ تجهيز الإجابة…';log.append(status);}
    log.scrollTop=log.scrollHeight;
    const send=$('#chat-form button');if(send)send.disabled=state.pending;
  }
  async function sendChat(question,append=true){
    question=question.trim();if(!question||state.pending||!requireLogin())return;
    const generation=state.chatGeneration,account=state.account;
    if(append)state.chats.push({role:'user',body:question});
    state.pending=true;if($('#chat-input'))$('#chat-input').value='';renderMessages();
    try{
      setContext(false);const response=await engine._askAI(question);
      if(generation!==state.chatGeneration||account!==owner())return;
      let body=response.answer;
      if(response.isOutOfCurriculum){body='السؤال ده خارج محتوى العلوم المتاح عندي. جرّب تختار موضوعاً من المنهج أو راجع مستر مينا.';}
      // Some legacy answers refer to lesson.summary while the data stores session summaries.
      body=body.replace(/\*\*ملخص سريع:\*\* undefined/g,'');
      state.chats.push({role:'assistant',body,actions:response.actions||[]});
      record('question',{question,topic:response.topic,lessonId:state.lesson?.lessonId,sessionNum:state.session});
    }catch{
      if(generation!==state.chatGeneration||account!==owner())return;
      state.chats.push({role:'assistant',body:'تعذّر تجهيز الإجابة. سؤالك محفوظ في المحادثة؛ جرّب مرة أخرى.',retry:question});
    }finally{if(generation===state.chatGeneration){state.pending=false;renderMessages();}}
  }
  function runAction(action,label=''){
    // Parse only known, fixed action signatures; never evaluate arbitrary JavaScript.
    let match=action?.match(/^window\.appController\.selectLessonSession\('([\w-]+)',\s*(\d+)\)$/);
    if(match){launch(match[1],Number(match[2]));if(label.includes('المعمل')&&state.lesson?.lessonId===match[1])show('lab');return;}
    match=action?.match(/^window\.appController\.toggleStageDropdown\((\d+),\s*'(?:left|right)'\)$/);
    if(match){openUnit(Number(match[1])-1);return;}
    match=action?.match(/^window\.appController\.quickAskChat\('([^']+)'\)$/);
    if(match)sendChat(match[1]);
  }
  let recognition=null;
  function stopMic(){recognition?.stop();recognition=null;}
  function startMic(){
    if(recognition){stopMic();return;}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){$('#mic-status').textContent='الإملاء غير متاح هنا؛ اكتب سؤالك.';return;}
    const instance=new Recognition();recognition=instance;instance.lang='ar-EG';instance.interimResults=false;instance.continuous=false;
    instance.onstart=()=>{if($('#mic-status'))$('#mic-status').textContent='بسمعك… اضغط لإيقاف التسجيل';};
    instance.onresult=event=>{if($('#chat-input'))$('#chat-input').value=event.results[0][0].transcript;};
    instance.onerror=()=>{if($('#mic-status'))$('#mic-status').textContent='تعذّر استخدام الميكروفون؛ يمكنك الكتابة.';};
    instance.onend=()=>{if(recognition===instance)recognition=null;if($('#mic-status')?.textContent.startsWith('بسمعك'))$('#mic-status').textContent='راجع النص واضغط إرسال.';};
    try{instance.start();}catch{recognition=null;$('#mic-status').textContent='تعذّر بدء الإملاء.';}
  }
  function accountSheet(){
    const student=auth.getCurrentStudent();
    showSheet('حسابي',`<p><strong>${escape(student?.full_name||student?.username)}</strong></p><p>${escape(student?.grade||'الصف الأول الإعدادي')}</p><button class="m-secondary" data-action="desktop">عرض الديسكتوب</button><button class="m-secondary" data-action="logout">تسجيل الخروج</button>`);
  }
  $('#mentor').addEventListener('click',()=>{if(requireLogin())openChat();});
  $('#home-account').addEventListener('click',()=>{if(requireLogin())accountSheet();});
  $('#next-action').addEventListener('click',()=>{
    if(!requireLogin())return;
    if(state.view==='quiz'){
      const run=quizRun(),count=currentSession()?.quiz?.length||0;
      if(!count||run.index>=count){show('lesson');return;}
      if(!run.answers[run.index]?.solved)return;
      run.index++;renderQuiz();setNext();window.scrollTo(0,0);return;
    }
    show(({courses:'home',lesson:'lab',labs:'courses',lab:'quiz',progress:'courses'})[state.view]||'home');
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.closest('#mena-auth-overlay'))return;
    if(button.dataset.view){if(!requireLogin())return;$('#sheet').close();show(button.dataset.view);}
    else if(button.dataset.unit!==undefined){if(requireLogin())openUnit(Number(button.dataset.unit));}
    else if(button.dataset.lesson){if(!requireLogin())return;if(button.dataset.progressGrade)state.grade=Number(button.dataset.progressGrade);launch(button.dataset.lesson,Number(button.dataset.session),button.dataset.destination);}
    else if(button.dataset.grade){
      if(!requireLogin())return;const grade=Number(button.dataset.grade);
      if(!window[`CURRICULUM_GRADE_${grade}`]){showSheet(`الصف ${grade===2?'الثاني':'الثالث'} الإعدادي`,'<p>منهج هذا الصف غير متاح في المنصة حالياً. يمكنك متابعة منهج أولى إعدادي.</p>');return;}
      state.grade=grade;engine.currentGrade=grade;state.lesson=null;setContext();show('home');
    }
    else if(button.dataset.why!==undefined){if(requireLogin())toggleWhy(Number(button.dataset.why));}
    else if(button.dataset.audio)play(button.dataset.audio,button.dataset.title);
    else if(button.dataset.answer!==undefined){if(requireLogin())answerQuiz(Number(button.dataset.answer));}
    else if(button.dataset.action){
      if(!requireLogin())return;
      switch(button.dataset.action){
        case 'account':accountSheet();break;
        case 'logout':auth.logout();break;
        case 'desktop':try{sessionStorage.setItem('mena_force_desktop','1');}catch{}location.href='index.html?desktop=1';break;
        case 'retry-quiz':delete state.quizzes[sessionKey()];renderQuiz();setNext();break;
        case 'retry-lab':destroyLab();renderLab();break;
        case 'microphone':startMic();break;
      }
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();stopMic();state.lab?.pause();}else state.lab?.resume();});
  window.addEventListener('pagehide',()=>{stopAudio();destroyLab();stopMic();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&auth.isLoggedIn()&&state.view==='lab')renderLab();});
  window.addEventListener('storage',event=>{
    if(event.key==='mena_current_student'){
      syncAccount();if(auth.isLoggedIn())auth.hideLoginModal();else auth.showLoginModal();
    }else if(event.key===storeKey()){state.progress=readProgress();updateStars();if(state.view==='progress')renderProgress();}
  });
  window.MobileApp={launchLesson:(id)=>launch(id,1),openStage:(num)=>openUnit(num-1),playWelcomeAudio:()=>{},closeLessonScreen:()=>show('home')};
  document.addEventListener('DOMContentLoaded',()=>{
    // Auth initialises first. Restore content only after the current local session is known.
    syncAccount();restoreRoute(false);writeRoute(true);
    if(!auth.isLoggedIn())$('.m-app').inert=true;
    const stage=Number(new URLSearchParams(location.search).get('stage'));
    if(stage&&auth.isLoggedIn())openUnit(stage-1);
    const overlay=$('#mena-auth-overlay');if(overlay){overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','تسجيل الدخول');}
    $('#mena-auth-user')?.setAttribute('autocomplete','username');$('#mena-auth-pass')?.setAttribute('autocomplete','current-password');
  });
})();
