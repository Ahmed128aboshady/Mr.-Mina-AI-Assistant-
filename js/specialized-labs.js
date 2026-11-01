/* Focused models for six sessions. Loaded after interactive_lab.js on both layouts.
 * Geometry is illustrative; numerical force ratios and weight calculations are explicit.
 * All state changes are user-driven and work with reduced motion. No synthetic audio.
 */
(() => {
  'use strict';
  const P=InteractiveLab.prototype;
  const C={blue:0x38bdf8,red:0xfb7185,gold:0xfbbf24,green:0x5ee6b2,white:0xeaf6ff,muted:0x59738f};
  const fmt=n=>Number(n.toFixed(2)).toLocaleString('en-US');
  const button=(action,label,selected=false)=>`<button type="button" class="lab-pill-btn${selected?' active':''}" data-experiment-action="${action}" aria-pressed="${selected}">${label}</button>`;
  const group=(label,html)=>`<fieldset class="experiment-group"><legend>${label}</legend><div class="experiment-buttons">${html}</div></fieldset>`;
  const stat=(label,value)=>`<div class="experiment-stat"><span>${label}</span><strong>${value}</strong></div>`;
  P._startExperiment=function(kind,session,defaults){
    this.experimentAbort?.abort();this.experimentAbort=new AbortController();
    this.experiment={kind,session,...defaults};this.experimentDefaults={...this.experiment};
    this.experimentGroup=new THREE.Group();this.scene.add(this.experimentGroup);
    this.scene.traverse(object=>{if(object.isAmbientLight)object.intensity=.65;else if(object.isDirectionalLight)object.intensity=.9;else if(object.isPointLight)object.intensity=.4;});
    const controls=document.getElementById('lab-controls');controls.classList.add('special-lab-controls');
    document.getElementById('lab-info-bar').classList.add('special-lab-info');
    document.getElementById('lab-3d-canvas')?.setAttribute('aria-label','نموذج توضيحي تفاعلي؛ وصف النتيجة متاح في النص أسفله');
    controls.addEventListener('click',event=>{
      const target=event.target.closest('[data-experiment-action]');if(!target||target.disabled)return;
      this._experimentAction(target.dataset.experimentAction);
      // Redrawing controls must not strand keyboard or screen-reader focus.
      controls.querySelector(`[data-experiment-action="${target.dataset.experimentAction}"]`)?.focus({preventScroll:true});
    },{signal:this.experimentAbort.signal});
    this._renderExperiment();
  };
  P._buildElectricScene=function(controls,info,session){this._startExperiment('electric',session,session===1?{sign:1,charge:1,distance:1}:{net:0,rod:0});};
  P._buildGravityScene=function(controls,info,session){this._startExperiment('gravity',session,session===1?{massA:1,massB:1,distance:1}:{mass:6,world:'earth',falling:false});};
  P._buildMicrobesScene=function(controls,info,session){this._startExperiment('microbes',session,{mode:session===1?'yoghurt':'yeast',starter:false,cold:false,steps:0,progress:0,sugar:true,exchange:false,mold:false});};
  P._experimentAction=function(action){
    const s=this.experiment;if(!s||!this.scene)return;
    const [key,value]=action.split(':');
    if(key==='reset'){this.experiment={...this.experimentDefaults};}
    else if(s.kind==='electric'){
      if(s.session===1){if(['sign','charge','distance'].includes(key))s[key]=Number(value);}
      else if(key==='contact'){s.net=Number(value);s.rod=0;}
      else if(key==='near')s.rod=Number(value);
      else if(key==='away')s.rod=0;
      else if(key==='ground'){s.net=0;s.rod=0;}
    }else if(s.kind==='gravity'){
      if(s.session===1&&['massA','massB','distance'].includes(key))s[key]=Number(value);
      else if(key==='mass')s.mass=Number(value);
      else if(key==='world'){s.world=value;s.falling=false;}
      else if(key==='falling')s.falling=!s.falling;
    }else{
      if(key==='mode'){s.mode=value;s.progress=0;s.steps=0;}
      else if(key==='starter'){s.starter=!s.starter;s.steps=0;s.progress=0;}
      else if(key==='cold'){s.cold=!s.cold;s.steps=0;s.progress=0;}
      else if(key==='sugar'){s.sugar=!s.sugar;s.steps=0;s.progress=0;}
      else if(key==='exchange')s.exchange=!s.exchange;
      else if(key==='mold')s.mold=!s.mold;
      else if(key==='step'&&s.steps<4){s.steps++;if(s.mode==='yoghurt'&&s.starter)s.progress+=s.cold?.2:1;if(s.mode==='yeast'&&s.sugar)s.progress++;}
    }
    this._renderExperiment();
  };
  P._expMesh=function(geometry,color,x=0,y=0,z=0,options={}){
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.5,...options}));mesh.position.set(x,y,z);this.experimentGroup.add(mesh);return mesh;
  };
  P._expBall=function(radius,color,x,y,z=0){return this._expMesh(new THREE.SphereGeometry(radius,24,16),color,x,y,z);};
  P._expLine=function(points,color=C.white,radius=.035){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return this._expMesh(new THREE.TubeGeometry(curve,32,radius,6,false),color);
  };
  P._expArrow=function(x,y,z,dx,dy,dz,length,color=C.gold){
    const arrow=new THREE.ArrowHelper(new THREE.Vector3(dx,dy,dz).normalize(),new THREE.Vector3(x,y,z),length,color,.28,.18);this.experimentGroup.add(arrow);return arrow;
  };
  P._expLabel=function(text,x,y,z=0,width=2.8){
    const symbol=['+','−'].includes(text),canvas=document.createElement('canvas');canvas.width=symbol?112:512;canvas.height=112;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#102338';ctx.fillRect(0,0,canvas.width,112);
    ctx.fillStyle='#effaff';ctx.font=`bold ${symbol?100:68}px Tahoma, Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';ctx.fillText(text,canvas.width/2,56,canvas.width-16);
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));label.position.set(x,y,z);label.scale.set(width,symbol?width:width*112/512,1);label.renderOrder=10;this.experimentGroup.add(label);return label;
  };
  P._renderExperiment=function(){
    if(!this.experiment||!this.experimentGroup||!this.scene)return;
    this._clearGroup(this.experimentGroup);
    const s=this.experiment;let result;
    if(s.kind==='electric')result=s.session===1?this._drawCharges():this._drawElectroscope();
    else if(s.kind==='gravity')result=s.session===1?this._drawAttraction():this._drawWeight();
    else result=this._drawMicrobes();
    this.experimentReading=result.reading;
    document.getElementById('lab-controls').innerHTML=`<div class="experiment-title">${result.title}</div>${result.controls}<button type="button" class="lab-pill-btn experiment-reset" data-experiment-action="reset">↺ ابدأ من جديد</button>`;
    document.getElementById('lab-info-bar').innerHTML=`<div class="experiment-result" role="status" aria-live="polite"><h3>${result.title}</h3><div class="experiment-stats">${result.stats}</div><p>${result.explanation}</p><p class="experiment-note">${result.note}</p></div>`;
    if(this.fitView)this.fitView();else{
      this.camera.position.set(0,2.5,13);this.camera.lookAt(0,0,0);
    }
    if(this.renderer)this.renderer.render(this.scene,this.camera);
  };
  P._drawCharges=function(){
    const s=this.experiment,d=1.7*s.distance,ratio=s.charge/(s.distance*s.distance),attract=s.sign===-1;
    this._expBall(.63,C.red,-d,0);this._expBall(.63,s.sign===1?C.red:C.blue,d,0);
    this._expLabel('+',-d,0,.7,1);this._expLabel(s.sign===1?'+':'−',d,0,.7,1);
    this._expLabel('شحنة أ موجبة',-d,1.45,0,2.4);this._expLabel('شحنة ب',d,1.45,0,2.4);
    const length=.6+Math.min(1.4,ratio*.7);
    this._expArrow(-d,-1,0,attract?1:-1,0,0,length);this._expArrow(d,-1,0,attract?-1:1,0,0,length);
    this._expLine([[-d,-1.9,0],[0,-1.9,0],[d,-1.9,0]],C.muted,.02);
    this._expLabel('المسافة = '+s.distance+' × الأصل',0,-2.55,0,3.6);
    return {title:'الشحنات: تجاذب أم تنافر؟',
      controls:group('نوع الشحنة ب',button('sign:1','موجبة +',s.sign===1)+button('sign:-1','سالبة −',s.sign===-1))+group('مقدار الشحنة ب',button('charge:1','شحنة واحدة',s.charge===1)+button('charge:2','ضعف الشحنة',s.charge===2))+group('المسافة بين المركزين',button('distance:1','المسافة الأصلية',s.distance===1)+button('distance:2','ضعف المسافة',s.distance===2)),
      stats:stat('نوع القوة',attract?'تجاذب':'تنافر')+stat('مقدار القوة مقارنة بالأصل',fmt(ratio)+' ×'),
      explanation:attract?'الشحنتان مختلفتان؛ تؤثر على كل منهما قوة نحو الأخرى.':'الشحنتان متشابهتان؛ تؤثر على كل منهما قوة بعيداً عن الأخرى.',
      note:'ثبّتنا الشحنة أ. مضاعفة المسافة تجعل مقدار القوة ربع قيمتها، ومضاعفة الشحنة ب تضاعفه. الأسهم للقوة وليست مسارات حركة أو خطوط مجال. الأحجام توضيحية.',reading:{forceRatio:ratio,interaction:attract?'attract':'repel'}};
  };
  P._drawElectroscope=function(){
    const s=this.experiment,leafCharge=s.net+.45*s.rod,spread=Math.abs(leafCharge)*.6;
    this._expMesh(new THREE.CylinderGeometry(1.65,1.65,3.5,32,1,true),C.blue,0,-.5,0,{transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
    this._expMesh(new THREE.CylinderGeometry(1.8,1.8,.18,32),C.muted,0,-2.3);
    this._expMesh(new THREE.CylinderGeometry(.08,.08,2.9,12),C.white,0,.85);
    this._expBall(.48,C.gold,0,2.45);
    for(const side of [-1,1]){
      const leaf=this._expMesh(new THREE.BoxGeometry(.16,1.7,.045),C.gold,side*Math.sin(spread)*.85,-.6-Math.cos(spread)*.85,.1);leaf.rotation.z=side*spread;
      if(Math.abs(leafCharge)>.1)this._expLabel(leafCharge>0?'+':'−',side*(Math.sin(spread)*1.6+.2),-1.9,.5,.65);
    }
    if(s.rod){const rod=this._expMesh(new THREE.CylinderGeometry(.18,.18,2.1,12),s.rod>0?C.red:C.blue,2.4,2.5);rod.rotation.z=Math.PI/2;this._expLabel(s.rod>0?'+ + +':'− − −',2.4,3.15,0,2.5);}
    this._expLabel(s.net===0?'الكشاف متعادل':s.net>0?'الكشاف موجب':'الكشاف سالب',0,-3.05,0,3.5);
    const explanation=s.rod?(s.net===0?'تقريب الساق يعيد توزيع الإلكترونات داخل الكشاف المتعادل، فتتشابه شحنتا الورقتين وتنفرجان. لم يحدث تلامس أو انتقال للشحنة إلى الكشاف.':s.net===s.rod?'الساق من نفس نوع شحنة الكشاف؛ يزداد انفراج الورقتين.':'الساق مختلفة عن شحنة الكشاف؛ يقل انفراج الورقتين في هذا المثال لساق قريبة ضعيفة التأثير.'):(s.net===0?'الكشاف متعادل، وورقتاه متقاربتان. اشحنه بالتلامس أو قرّب ساقاً دون لمس.':'اكتسب الكشاف شحنة بالتلامس. تتنافر الورقتان لأنهما تحملان شحنة من النوع نفسه.');
    return {title:'الكشاف الكهربي',controls:group('اشحن الكشاف بالتلامس',button('contact:1','شحن موجب +',s.net===1)+button('contact:-1','شحن سالب −',s.net===-1))+group('قرّب ساقاً دون لمس',button('near:1','ساق موجبة',s.rod===1)+button('near:-1','ساق سالبة',s.rod===-1))+group('اختبر ما يحدث',button('away','أبعد الساق')+button('ground','أبعد الساق ثم أرض الكشاف')),
      stats:stat('صافي شحنة الكشاف',s.net===0?'متعادل':s.net>0?'موجب':'سالب')+stat('انفراج الورقتين',spread===0?'لا يوجد':s.rod&&s.net&&s.rod!==s.net?'أقل':s.rod===s.net&&s.net?'أكبر':'منفرجتان'),
      explanation,note:'الزوايا توضيحية وليست قياساً للشحنة. إبعاد الساق يعيد توزيع الشحنات؛ التأريض بعد إبعادها يفرّغ الكشاف.',reading:{netCharge:s.net,rod:s.rod,spread}};
  };
  P._drawAttraction=function(){
    const s=this.experiment,d=1.65*s.distance,ratio=s.massA*s.massB/s.distance**2;
    this._expBall(.7*Math.cbrt(s.massA),C.blue,-d,0);this._expBall(.6*Math.cbrt(s.massB),C.gold,d,0);
    this._expLabel('كتلة أ = '+s.massA+' ×',-d,1.5,0,2.8);this._expLabel('كتلة ب = '+s.massB+' ×',d,1.5,0,2.8);
    const length=.65+Math.min(1.2,ratio*.3);this._expArrow(-d,-1.1,0,1,0,0,length,C.green);this._expArrow(d,-1.1,0,-1,0,0,length,C.green);
    this._expLine([[-d,-2,0],[0,-2,0],[d,-2,0]],C.muted,.02);this._expLabel('المسافة = '+s.distance+' × الأصل',0,-2.6,0,3.8);
    return {title:'الجاذبية: الكتلة والمسافة',controls:group('كتلة الجسم أ',button('massA:1','الكتلة الأصلية',s.massA===1)+button('massA:2','ضعف الكتلة',s.massA===2))+group('كتلة الجسم ب',button('massB:1','الكتلة الأصلية',s.massB===1)+button('massB:2','ضعف الكتلة',s.massB===2))+group('المسافة بين المركزين',button('distance:1','المسافة الأصلية',s.distance===1)+button('distance:2','ضعف المسافة',s.distance===2)),stats:stat('نوع القوة','تجاذب دائماً')+stat('القوة مقارنة بالأصل',fmt(ratio)+' ×'),explanation:'الجسمان يتجاذبان عن بُعد بقوتين متساويتين في المقدار ومتعاكستين في الاتجاه. زيادة الكتلة تقوّي التجاذب، وزيادة المسافة تضعفه.',note:'مقارنة تعليمية لأجسام كروية؛ F تتناسب مع m₁ × m₂ ÷ r². الأسهم تبيّن القوة فقط، والأحجام ليست بمقياس فلكي.',reading:{forceRatio:ratio,massA:s.massA,massB:s.massB,distance:s.distance}};
  };
  P._drawWeight=function(){
    const s=this.experiment,g=s.world==='earth'?10:10/6,weight=s.mass*g,reading=s.falling?0:weight,extension=reading/240*1.6;
    this._expMesh(new THREE.BoxGeometry(4,.22,2),s.world==='earth'?C.blue:C.muted,0,-2.8);
    this._expMesh(new THREE.BoxGeometry(2.5,.15,.4),C.white,0,2.65);
    const points=[];for(let i=0;i<=100;i++){const t=i/100;points.push([Math.sin(t*Math.PI*14)*.22,2.5-t*(1.1+extension),Math.cos(t*Math.PI*14)*.22]);}this._expLine(points,C.gold,.035);
    const y=1.4-extension;this._expMesh(new THREE.BoxGeometry(1.35,.9,.85),C.red,0,y-.45);
    this._expLabel(s.mass+' kg',0,y-.45,.6,1.8);
    this._expArrow(1.4,.4,0,0,-1,0,.6+weight/240*1.3,C.green);
    this._expLabel('الميزان: '+fmt(reading)+' N',0,3.3,0,3.8);
    this._expLabel(s.world==='earth'?'الأرض':'القمر',0,-3.35,0,3);
    return {title:'نفس الكتلة… وزن مختلف',controls:group('كتلة الجسم',button('mass:6','6 كجم',s.mass===6)+button('mass:12','12 كجم',s.mass===12)+button('mass:24','24 كجم',s.mass===24))+group('المكان',button('world:earth','على الأرض',s.world==='earth')+button('world:moon','على القمر',s.world==='moon'))+group('حالة الميزان والجسم',button('falling',s.falling?'أعد تثبيت الميزان':'دع الميزان والجسم يسقطان معاً',s.falling)),stats:stat('الكتلة',s.mass+' kg')+stat('قوة الجاذبية: m × g',fmt(weight)+' N')+stat('قراءة الميزان',fmt(reading)+' N'),explanation:s.falling?'الجسم والميزان يسقطان معاً، فيختفي شد الزنبرك وتصبح القراءة صفراً تقريباً. قوة الجاذبية ما زالت تؤثر؛ هذا انعدام وزن ظاهري.':'الكتلة ثابتة عند تغيير المكان. قراءة الميزان المثبت تساوي الوزن؛ وزن الجسم على القمر يقارب سدس وزنه على الأرض.',note:'للتدريب الحسابي: g على الأرض = 10 N/kg، وعلى القمر = 10/6 N/kg تقريباً. وضع السقوط الحر لقطة توضيحية مع إهمال مقاومة الهواء، وليس غياباً للجاذبية.',reading:{mass:s.mass,g,gravityForce:weight,scaleReading:reading,falling:s.falling}};
  };
  P._microbeRod=function(x,y,z,color=C.green){const rod=this._expBall(.22,color,x,y,z);rod.scale.set(.65,1.7,.65);rod.rotation.z=.5;return rod;};
  P._drawMicrobes=function(){
    const s=this.experiment;
    const tabs=s.session===1?button('mode:yoghurt','بكتيريا الزبادي',s.mode==='yoghurt')+button('mode:roots','العقد الجذرية',s.mode==='roots'):button('mode:yeast','الخميرة والخبز',s.mode==='yeast')+button('mode:mold','فطر البنسيليوم',s.mode==='mold');
    let result;
    if(s.mode==='roots')result=this._drawRoots();else if(s.mode==='mold')result=this._drawMold();else result=this._drawFermentation();
    result.controls=group('اختار التجربة',tabs)+result.controls;return result;
  };
  P._drawFermentation=function(){
    const s=this.experiment,yoghurt=s.mode==='yoghurt',progress=s.progress/4;
    this._expMesh(new THREE.CylinderGeometry(1.75,1.5,3,32,1,true),C.blue,-1.4,0,0,{transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false});
    this._expMesh(new THREE.CylinderGeometry(1.48,1.35,yoghurt?1.8:1+progress,32),yoghurt?0xfff4df:0xe4b884,-1.4,yoghurt?-.5:-1+(1+progress)/2,0,{transparent:true,opacity:.55,depthWrite:false});
    this._expLabel(yoghurt?(progress>=.75?'لبن متخثر':'لبن'):progress?'العجين يرتفع':'عجين',-1.4,-2.25,0,2.8);
    for(let i=0;i<6;i++){
      const x=1.4+(i%2)*.65,y=1.2-Math.floor(i/2)*.7;
      if(yoghurt){if(s.starter)this._microbeRod(x,y,.1);}
      else{this._expBall(.25,C.gold,x,y);this._expBall(.12,C.gold,x+.23,y+.16);}
    }
    const particles=Math.round(progress*12);
    for(let i=0;i<12;i++){
      const x=-1.4+Math.cos(i*2.4)*1.1,z=Math.sin(i*2.4)*.8;
      if(yoghurt)this._expBall(.1,i<particles?C.red:C.gold,x,-.8+(i%3)*.4,z);
      else if(i<particles)this._expBall(.12,C.blue,x,.2+(i%4)*.4,z);
    }
    this._expLabel(yoghurt?'بكتيريا نافعة مكبّرة':'خميرة مكبّرة',2,2.25,0,3.3);
    const step=`<button type="button" class="lab-pill-btn" data-experiment-action="step" ${s.steps>=4?'disabled':''}>قدّم الزمن خطوة (${s.steps}/4)</button>`;
    return {title:yoghurt?'كيف تساعد البكتيريا في صنع الزبادي؟':'كيف ترفع الخميرة العجين؟',
      controls:(yoghurt?group('ظروف المقارنة',button('starter',s.starter?'قارن دون البادئ':'أضف بكتيريا البادئ',s.starter)+button('cold',s.cold?'الآن بارد — جرّب الدفء':'الآن دافئ — جرّب البرودة',s.cold)):group('الغذاء المتاح',button('sugar',s.sugar?'قارن دون سكر':'أضف السكر',s.sugar)))+group('شاهد التغير',step),
      stats:stat('خطوات زمنية',s.steps+' / 4')+stat(yoghurt?'تكوّن حمض اللاكتيك':'إنتاج غاز CO₂',progress===0?'لم يظهر بعد':progress<.5?'قليل':progress<.9?'يزداد':'واضح'),
      explanation:yoghurt?(s.starter?(s.cold?'في البرودة يقل نشاط البكتيريا، فتبطؤ عملية تحويل سكر اللبن إلى حمض اللاكتيك.':'تستهلك بكتيريا البادئ سكر اللبن وتنتج حمض اللاكتيك؛ زيادة الحموضة تساعد على تخثر اللبن.'):'دون بكتيريا البادئ لا يظهر التخمر في هذا النموذج. أضفها ثم قدّم الزمن.'):s.sugar?'الخميرة فطر وحيد الخلية يستخدم السكر في التخمر. غاز ثاني أكسيد الكربون المحتجز داخل العجين يساعد على ارتفاعه.':'في المقارنة المبسطة، أزلنا السكر القابل للاستخدام؛ لا نضيف فقاعات تخمر جديدة.',
      note:yoghurt?'الأصفر يمثل سكر اللبن، والوردي حمض اللاكتيك. تغيير البادئ أو الحرارة يعيد المقارنة من البداية. خطوات الزمن وسرعة التحول توضيحية، وليست وصفة إعداد طعام.':'الكرات الزرقاء تمثل الغاز، والكتل الصفراء خلايا خميرة مكبّرة. المقارنة مبسطة عند ثبات بقية الظروف؛ زمن النمو وحجم الفقاعات توضيحيان.',reading:{mode:s.mode,steps:s.steps,progress:s.progress,gas:yoghurt?0:particles,acid:yoghurt?particles:0}};
  };
  P._drawRoots=function(){
    const s=this.experiment;
    this._expLine([[0,-.7,0],[0,0,0],[0,2.1,0]],C.green,.1);
    for(const side of [-1,1]){
      const leaf=this._expBall(.6,C.green,side*.55,1.4);leaf.scale.set(1.4,.45,.6);leaf.rotation.z=side*.5;
      this._expLine([[0,-.4,0],[side*.8,-1.1,0],[side*1.4,-2.15,0]],0xc69570,.07);
      for(let i=0;i<3;i++)this._expBall(.18,C.gold,side*(.55+i*.25),-.8-i*.4,.1);
    }
    this._expLabel('عقد جذرية بها بكتيريا',0,-2.8,0,4);
    if(s.exchange){
      this._expArrow(-2,-1.6,0,0,1,0,2.5,C.blue);this._expLabel('مركبات نيتروجينية للنبات',-2.3,2.1,0,3.5);
      this._expArrow(2,1.1,0,0,-1,0,2.5,C.gold);this._expLabel('سكريات للبكتيريا',2.3,-2.1,0,3.2);
    }
    return {title:'تبادل المنفعة في العقد الجذرية',controls:group('تابع التبادل',button('exchange',s.exchange?'أخفِ أسهم التبادل':'أظهر أسهم التبادل',s.exchange)),stats:stat('النبات','نبات بقولي')+stat('الشريك','بكتيريا العقد الجذرية'),explanation:s.exchange?'تثبّت البكتيريا نيتروجين الهواء وتحوله إلى مركبات يستفيد بها النبات. وفي المقابل تحصل على سكريات من النبات؛ هذه علاقة تبادل منفعة.':'الكرات على الجذور تمثل عقداً تعيش داخلها بكتيريا نافعة. أظهر الأسهم لتعرف ماذا يقدم كل شريك للآخر.',note:'رسم توضيحي مكبّر؛ العقد ليست حبوب سماد، ولا يحصل النبات على النيتروجين مباشرة من الهواء في هذا المثال.',reading:{mode:'roots',exchange:s.exchange}};
  };
  P._drawMold=function(){
    const s=this.experiment;
    const plate=this._expMesh(new THREE.CylinderGeometry(2.55,2.55,.16,64),0x2b6575,0,0,0,{transparent:true,opacity:.8});plate.rotation.x=Math.PI/2;
    if(s.mold){const halo=this._expMesh(new THREE.CircleGeometry(1.15,48),0x9de6d2,-.65,.1,.12,{transparent:true,opacity:.32,side:THREE.DoubleSide});for(let i=0;i<8;i++)this._expBall(.23,C.green,-.65+Math.cos(i)*.28,.1+Math.sin(i)*.28,.2);}
    let visible=0;
    for(let i=0;i<56;i++){
      const angle=i*2.4,r=.5+((i*17)%43)/43*1.75,x=Math.cos(angle)*r,y=Math.sin(angle)*r;
      if(s.mold&&Math.hypot(x+.65,y-.1)<1.15)continue;
      this._expBall(.09,C.gold,x,y,.18);visible++;
    }
    this._expLabel(s.mold?'منطقة يقل فيها نمو البكتيريا':'بكتيريا تنمو على وسط غذائي',0,-3,0,5);
    return {title:'ملاحظة فلمنج: منطقة تثبيط النمو',controls:group('قارن الطبقين',button('mold',s.mold?'قارن دون الفطر':'أظهر فطر البنسيليوم',s.mold)),stats:stat('الفطر',s.mold?'البنسيليوم':'غير موجود في المقارنة')+stat('حول الفطر',s.mold?'منطقة خالية من النمو':'نمو منتشر'),explanation:s.mold?'يفرز الفطر مادة تثبّط نمو بعض البكتيريا الحساسة. المنطقة المحيطة به تقل فيها المستعمرات؛ ملاحظة شبيهة قادت فلمنج لاكتشاف البنسلين.':'الدوائر الصفراء تمثل مستعمرات بكتيرية. أظهر الفطر وقارن المنطقة المحيطة به بباقي الطبق.',note:'محاكاة تعليمية لبكتيريا حساسة؛ التأثير لا ينطبق على كل الميكروبات. أحجام المستعمرات والمنطقة المحيطة بالفطر توضيحية.',reading:{mode:'mold',mold:s.mold,bacteriaVisible:visible}};
  };
})();
