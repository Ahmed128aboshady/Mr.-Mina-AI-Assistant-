/* Reuse the production simulations with an isolated, responsive mobile renderer. */
window.MobileInteractiveLab = class extends InteractiveLab {
  init(mount,topicId,sessionNum=1){
    this.currentTopic=topicId;this.currentSessionNum=sessionNum;this.mount=mount;this.building=true;
    mount.innerHTML='<div class="m-real-lab"><div class="m-lab-visual"><div id="lab-canvas-wrap"><canvas id="lab-3d-canvas" role="img" aria-label="نموذج ثلاثي الأبعاد للدرس، يمكنك تدويره بالأزرار أسفله"></canvas></div><div class="m-rotation-controls" aria-label="تدوير النموذج"><button data-rotate="right">↻ تدوير يمين</button><button data-rotate="left">↺ تدوير يسار</button><button data-rotate="reset">إعادة العرض</button></div><label class="m-motion-control"><input type="checkbox" id="lab-motion"> حركة النموذج</label></div><div class="m-lab-tool-panel"><h2>جرّب بنفسك</h2><div id="lab-controls"></div><div id="lab-info-bar" aria-live="polite"></div></div></div>';
    const canvas=mount.querySelector('canvas'),wrap=mount.querySelector('#lab-canvas-wrap');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x070b14);
    this.camera=new THREE.PerspectiveCamera(45,1,.1,1000);this.camera.position.set(0,4,11);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.scene.add(new THREE.AmbientLight(0xffffff,.9));
    const light=new THREE.DirectionalLight(0xffffff,1.4);light.position.set(6,12,8);this.scene.add(light);
    const point=new THREE.PointLight(0x38bdf8,2.5,25);point.position.set(0,3,3);this.scene.add(point);
    this._buildSimulation(topicId,sessionNum);
    this.building=false;
    this.resizeObserver=new ResizeObserver(()=>{
      if(!this.renderer)return;
      const width=wrap.clientWidth,height=wrap.clientHeight;
      if(!width||!height)return;
      this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
      this.renderer.setSize(width,height,false);this.fitView();this.draw();
    });this.resizeObserver.observe(wrap);
    this.abort=new AbortController();const signal=this.abort.signal;
    mount.querySelectorAll('[data-rotate]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.rotate==='reset'){this.scene.rotation.set(0,0,0);this.focusedOrganelle='all';this.fitView();}else this.scene.rotation.y+=(button.dataset.rotate==='right'?1:-1)*.25;
      this.draw();
    },{signal}));
    // Vertical swipes remain ordinary page scrolling; horizontal drags rotate the scene.
    let start=null,rotating=false,lastX=0;
    canvas.style.touchAction='pan-y';
    canvas.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};lastX=e.clientX;rotating=false;},{signal});
    canvas.addEventListener('pointermove',e=>{
      if(!start)return;
      if(!rotating){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){start=null;return;}if(Math.abs(dx)<8)return;rotating=true;canvas.setPointerCapture(e.pointerId);}
      this.scene.rotation.y+=(e.clientX-lastX)*.008;lastX=e.clientX;this.draw();
    },{signal});
    ['pointerup','pointercancel'].forEach(type=>canvas.addEventListener(type,()=>{start=null;rotating=false;},{signal}));
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    const toggle=mount.querySelector('#lab-motion');toggle.checked=!this.motionQuery.matches;this.motionEnabled=toggle.checked;
    toggle.addEventListener('change',()=>{this.motionEnabled=toggle.checked;if(this.motionEnabled)this.resume();else this.pause();this.draw();},{signal});
    this.motionChange=()=>{toggle.checked=!this.motionQuery.matches;this.motionEnabled=toggle.checked;if(this.motionEnabled)this.resume();else this.pause();this.draw();};
    this.motionQuery.addEventListener('change',this.motionChange);
    // Builders update scene content synchronously; render the resulting state even with motion disabled.
    mount.querySelector('#lab-controls').addEventListener('click',()=>{
      if(!this.motionEnabled)this.settleDensity();this.draw();
    },{signal});
    if(!this.motionEnabled)this.settleDensity();
    this.resume();this.draw();
  }
  settleDensity(){for(const object of this.densityObjects||[])object.position.y=object.userData.targetY;}
  fitView(){
    if(!this.scene||!this.camera||(this.focusedOrganelle&&this.focusedOrganelle!=='all'))return;
    const bounds=new THREE.Box3().setFromObject(this.scene);
    if(bounds.isEmpty())return;
    if(this.experiment){
      const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const tan=Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2);
      const distance=size.z/2+Math.max(size.y/(2*tan),size.x/(2*tan*this.camera.aspect))*1.12;
      this.camera.position.set(center.x,center.y,center.z+distance);this.camera.lookAt(center);this.camera.updateProjectionMatrix();return;
    }
    const sphere=bounds.getBoundingSphere(new THREE.Sphere());
    const vertical=THREE.MathUtils.degToRad(this.camera.fov)/2;
    const horizontal=Math.atan(Math.tan(vertical)*this.camera.aspect);
    const distance=sphere.radius/Math.sin(Math.min(vertical,horizontal))*1.08;
    this.camera.position.copy(new THREE.Vector3(0,4,11).normalize().multiplyScalar(distance).add(sphere.center));
    this.camera.lookAt(sphere.center);this.camera.updateProjectionMatrix();
  }
  _rebuildAtom(){super._rebuildAtom();this.fitView();}
  draw(){if(this.renderer&&this.scene&&this.camera)this.renderer.render(this.scene,this.camera);}
  resume(){
    if(!this.renderer||!this.motionEnabled||this.animationId||document.hidden)return;
    const frame=()=>{if(!this.renderer||document.hidden){this.animationId=null;return;}this._updateSimulation();this.draw();this.animationId=requestAnimationFrame(frame);};
    this.animationId=requestAnimationFrame(frame);
  }
  pause(){if(this.animationId)cancelAnimationFrame(this.animationId);this.animationId=null;}
  resetDensity(){
    for(const object of this.densityObjects||[]){this.scene.remove(object);object.geometry?.dispose();object.material?.dispose();}
    this.densityObjects=[];this.draw();
  }
  destroy(){
    this.experimentAbort?.abort();this.experimentAbort=null;
    this.experiment=null;this.experimentReading=null;this.experimentGroup=null;
    this.pause();this.resizeObserver?.disconnect();this.abort?.abort();this.motionQuery?.removeEventListener('change',this.motionChange);
    const geometries=new Set(),materials=new Set(),textures=new Set();
    this.scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
    textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
    this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=null;this.scene=null;this.camera=null;
    this.electrons=[];this.densityObjects=[];
  }
};
