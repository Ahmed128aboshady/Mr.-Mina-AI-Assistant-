/**
 * interactive_lab.js — معمل العلوم التفاعلي ثلاثي الأبعاد الشامل لكافة دروس المنهج
 * مستر مينا جرجس — محاكاة بصرية تفاعلية ثلاثية الأبعاد مخصصة لكل درس بدون استثناء!
 */

class InteractiveLab {
  constructor() {
    this.currentTopic = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationId = null;
    this.electrons = [];
    this.densityObjects = [];
    this.pendulumAngle = 0;
    this.earthGlobe = null;
  }

  /**
   * تهيئة وتركيب المعمل التفاعلي داخل شاشة الشرح
   */
  init(containerEl, topicId) {
    this.destroy();
    this.currentTopic = topicId || 'u1_l1_atom';

    const mountEl = document.getElementById('interactive-lab-mount') || containerEl;
    if (!mountEl) return;

    mountEl.innerHTML = `
      <div class="interactive-lab-container">
        <div class="lab-canvas-wrap" id="lab-canvas-wrap">
          <canvas id="lab-3d-canvas"></canvas>
          <div class="lab-overlay-controls" id="lab-controls"></div>

          <!-- 👨‍🏫 Teacher Avatar Inside 3D Lab (واقف بالكامل داخل الشاشة الغامقة) -->
          <div class="lesson-character-stage in-lab-screen" id="lesson-character-stage" onclick="window.appController?.playCurrentLessonAudio()" title="اضغط لسماع شرح مستر مينا">
            <div class="lesson-avatar-speech-bubble" id="lesson-avatar-bubble">
              <div class="bubble-header">
                <div class="bubble-speaker-info">
                  <span class="bubble-speaker-name">مستر مينا جرجس</span>
                </div>
                <div class="bubble-speaking-status" id="bubble-speaking-status">
                  <span class="live-audio-waves" id="live-audio-waves" style="display:none;">
                    <span></span><span></span><span></span><span></span>
                  </span>
                  <span id="bubble-status-text">جاهز للشرح</span>
                </div>
              </div>
              <div class="bubble-text-content" id="bubble-text-content">
                ${(window.appController?._currentSessionNum === 2) ? 'أهلاً بيك يا بطل في تاني حصة مع مستر مينا!' : 'أهلاً بيك يا بطل في أول حصة مع مستر مينا!'}
              </div>
            </div>
            <img src="assets/mina.png?v=9.0" alt="مستر مينا" class="lesson-mina-img" id="lesson-mina-img" />
          </div>
        </div>

        <div class="lab-video-wrap" id="lab-video-wrap" style="display: none; height: 540px; background: #070b14; border-radius: 14px; overflow: hidden; border: 1.5px solid #cbd5e1; position: relative; align-items: center; justify-content: center;">
          <div id="yt-videos-container" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 16px;"></div>
        </div>

        <div class="lab-info-bar" id="lab-info-bar"></div>
      </div>
    `;

    // 🎨 تطبيق أبعاد ومواضع الأفاتار والبوب اب المخصصة فورياً
    if (window.odooBuilder) {
      window.odooBuilder.applyLayerTransform('lessonAvatar');
      window.odooBuilder.applyLayerTransform('lessonBubble');
    }

    const canvas = document.getElementById('lab-3d-canvas');
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth || mountEl.clientWidth || window.innerWidth || 900;
    const height = 540;

    // Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 4, 11);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(6, 12, 8);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 25);
    pointLight.position.set(0, 3, 3);
    this.scene.add(pointLight);

    // Mouse & Touch Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMousePos = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.scene) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;
      this.scene.rotation.y += deltaX * 0.008;
      this.scene.rotation.x += deltaY * 0.008;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', (e) => {
      if (!isDragging || !this.scene || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;
      this.scene.rotation.y += deltaX * 0.008;
      this.scene.rotation.x += deltaY * 0.008;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    this._resizeHandler = () => {
      if (!canvas || !this.renderer || !this.camera) return;
      const newWidth = canvas.parentElement?.clientWidth || window.innerWidth || 900;
      const newHeight = 540;
      this.camera.aspect = newWidth / newHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', this._resizeHandler);

    // 🔬 توجيه المجسم المخصص للدرس
    this._buildSimulation(this.currentTopic);

    // Animation Loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this._updateSimulation();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  /**
   * بناء المجسم المخصص لكل درس في المنهج (10 مجسمات فريدة)
   */
  _buildSimulation(topicId) {
    const controlsEl = document.getElementById('lab-controls');
    const infoEl = document.getElementById('lab-info-bar');

    // 1. الدرس الأول: تركيب الذرة
    if (topicId.includes('u1_l1') || topicId.includes('atom')) {
      this._buildAtomScene(controlsEl, infoEl);
    }
    // 2. الدرس الثاني: الجدول الدوري وتصنيف العناصر
    else if (topicId.includes('u1_l2') || topicId.includes('periodic')) {
      this._buildPeriodicScene(controlsEl, infoEl);
    }
    // 3. الدرس الثالث: المادة وسر الكثافة والطفو
    else if (topicId.includes('u1_l3') || topicId.includes('matter') || topicId.includes('density')) {
      this._buildDensityScene(controlsEl, infoEl);
    }
    // 4. الدرس الرابع: الروابط الكيميائية (أيونية وتساهمية)
    else if (topicId.includes('u1_l4') || topicId.includes('bonds')) {
      this._buildBondsScene(controlsEl, infoEl);
    }
    // 5. الدرس الخامس: الطاقة والبندول البسيط
    else if (topicId.includes('u2_l1') || topicId.includes('energy')) {
      this._buildEnergyScene(controlsEl, infoEl);
    }
    // 6. الدرس السادس: القوى الأساسية والمغناطيس الكهربي
    else if (topicId.includes('u2_l2') || topicId.includes('forces') || topicId.includes('magnet')) {
      this._buildMagnetScene(controlsEl, infoEl);
    }
    // 7. الدرس السابع: الخلية النباتية والحيوانية
    else if (topicId.includes('u3_l1') || topicId.includes('cell')) {
      this._buildCellScene(controlsEl, infoEl);
    }
    // 8. الدرس الثامن: التكيف والمماتنة وتنوع الكائنات
    else if (topicId.includes('u3_l2') || topicId.includes('adaptation')) {
      this._buildAdaptationScene(controlsEl, infoEl);
    }
    // 9. الدرس التاسع: كوكب الأرض والبيئة الفضائية
    else if (topicId.includes('u4_l1') || topicId.includes('earth')) {
      this._buildEarthSpaceScene(controlsEl, infoEl);
    }
    // 10. الدرس العاشر: ظواهر الكسوف والخسوف
    else if (topicId.includes('u4_l2') || topicId.includes('eclipse')) {
      this._buildEclipseScene(controlsEl, infoEl);
    }
    else {
      this._buildAtomScene(controlsEl, infoEl);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 1. الذرة ومستويات الطاقة (u1_l1_atom)
  // ═════════════════════════════════════════════════════════════
  _buildAtomScene(controlsEl, infoEl) {
    this.atomData = {
      element: 'Carbon',
      nameAr: 'ذرة الكربون (6C)',
      atomicNum: 6,
      massNum: 12,
      protons: 6,
      neutrons: 6,
      shells: [2, 4]
    };

    this.nucleusGroup = new THREE.Group();
    this.scene.add(this.nucleusGroup);

    this.electronsGroup = new THREE.Group();
    this.scene.add(this.electronsGroup);

    this._rebuildAtom();

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active" data-symbol="C" onclick="window.interactiveLab.changeElement('C')">كربون (6C)</button>
          <button class="lab-pill-btn" data-symbol="H" onclick="window.interactiveLab.changeElement('H')">هيدروجين (1H)</button>
          <button class="lab-pill-btn" data-symbol="He" onclick="window.interactiveLab.changeElement('He')">هيليوم (2He)</button>
          <button class="lab-pill-btn" data-symbol="O" onclick="window.interactiveLab.changeElement('O')">أكسجين (8O)</button>
          <button class="lab-pill-btn" data-symbol="Na" onclick="window.interactiveLab.changeElement('Na')">صوديوم (11Na)</button>
        </div>
      `;
    }

    this._updateAtomInfo(infoEl);
  }

  changeElement(symbol) {
    const presets = {
      'C':  { nameAr: 'ذرة الكربون (6C)', atomicNum: 6, massNum: 12, protons: 6, neutrons: 6, shells: [2, 4], text: 'ذرة الكربون عددها الذري 6 وكتلتها 12، وفيها 6 بروتونات و 6 نيوترونات، والمستوى الأول K فيه 2 والتاني L فيه 4 إلكترونات!' },
      'H':  { nameAr: 'ذرة الهيدروجين (1H)', atomicNum: 1, massNum: 1, protons: 1, neutrons: 0, shells: [1], text: 'ذرة الهيدروجين أبسط ذرة في الكون، فيها بروتون واحد وإلكترون واحد في المستوى K، ومافيهاش نيوترونات خالص!' },
      'He': { nameAr: 'ذرة الهيليوم (2He - خامل)', atomicNum: 2, massNum: 4, protons: 2, neutrons: 2, shells: [2], text: 'ذرة الهيليوم غاز خامل ومستقر جداً، فيها 2 بروتون و 2 نيوترون، ومستوى الطاقة الأول K ممتلئ تماماً بـ 2 إلكترون!' },
      'O':  { nameAr: 'ذرة الأكسجين (8O)', atomicNum: 8, massNum: 16, protons: 8, neutrons: 8, shells: [2, 6], text: 'ذرة الأكسجين عددها الذري 8، متوزعة 2 في المستوى الأول K و 6 في المستوى التاني L، ومحتاجة 2 إلكترون عشان تستقر!' },
      'Na': { nameAr: 'ذرة الصوديوم (11Na - نشط)', atomicNum: 11, massNum: 23, protons: 11, neutrons: 12, shells: [2, 8, 1], text: 'ذرة الصوديوم فلز نشط جداً، عددها الذري 11، متوزعة 2 في K و 8 في L وإلكترون وحيد في M بتميل لفقده في التفاعلات!' }
    };

    if (presets[symbol]) {
      this.atomData = presets[symbol];
      this._rebuildAtom();
      this._updateAtomInfo(document.getElementById('lab-info-bar'));

      document.querySelectorAll('.lab-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.symbol === symbol);
      });

      window.appController?.playLabAudio(`lab_atom_${symbol}`, presets[symbol].text);
    }
  }

  _rebuildAtom() {
    while (this.nucleusGroup.children.length) this.nucleusGroup.remove(this.nucleusGroup.children[0]);
    while (this.electronsGroup.children.length) this.electronsGroup.remove(this.electronsGroup.children[0]);
    this.electrons = [];

    // 🔴 البروتونات (موجبة - أحمر متوهج) والنيوترونات (متعادلة - سماوي) داخل النواة
    const pMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.4, roughness: 0.25 });
    const nMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.25 });
    const sphereGeo = new THREE.SphereGeometry(0.22, 20, 20);

    const total = this.atomData.protons + this.atomData.neutrons;
    for (let i = 0; i < total; i++) {
      const isProton = i < this.atomData.protons;
      const mesh = new THREE.Mesh(sphereGeo, isProton ? pMat : nMat);
      const phi = Math.acos(-1 + (2 * i) / (total || 1));
      const theta = Math.sqrt((total || 1) * Math.PI) * phi;
      const r = 0.32 + (i % 3) * 0.12;
      mesh.position.set(r * Math.cos(theta) * Math.sin(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(phi));
      this.nucleusGroup.add(mesh);
    }

    // 🌌 مستويات الطاقة المدارية (K, L, M, N) كحلقات ثلاثية الأبعاد واضحة ودقيقة
    const radii = [2.2, 3.8, 5.4, 6.8];
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      transparent: true,
      opacity: 0.55
    });

    const eGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const eMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.65,
      roughness: 0.15
    });

    this.atomData.shells.forEach((count, sIdx) => {
      const r = radii[sIdx] || (2.2 + sIdx * 1.6);
      
      // مجسم الحلقة المدارية ثلاثية الأبعاد
      const ringGeo = new THREE.TorusGeometry(r, 0.024, 16, 120);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      this.electronsGroup.add(ringMesh);

      // الإلكترونات تدور بدقة متناهية على مسار الحلقة بالضبط
      for (let e = 0; e < count; e++) {
        const eMesh = new THREE.Mesh(eGeo, eMat);
        const angle = (e / count) * Math.PI * 2;
        eMesh.userData = { radius: r, angle: angle, speed: 0.022 / (sIdx + 1) };
        eMesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        this.electronsGroup.add(eMesh);
        this.electrons.push(eMesh);
      }
    });
  }

  _updateAtomInfo(infoEl) {
    if (!infoEl) return;
    const d = this.atomData;
    infoEl.innerHTML = `
      <div class="lab-stat"><span class="stat-label">العنصر:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">${d.nameAr}</span></div>
      <div class="lab-stat"><span class="stat-label">العدد الذري:</span><span class="stat-val" style="color:#ef4444;">${d.atomicNum} بروتون (+)</span></div>
      <div class="lab-stat"><span class="stat-label">العدد الكتلي:</span><span class="stat-val" style="color:#38bdf8;">${d.massNum}</span></div>
      <div class="lab-stat"><span class="stat-label">توزيع المستويات:</span><span class="stat-val" style="color:#7c3aed; font-weight:800;">${d.shells.map((c, i) => `[${['K','L','M'][i] || i}=${c}]`).join(' - ')}</span></div>
    `;
  }

  // ═════════════════════════════════════════════════════════════
  // 2. الجدول الدوري وتصنيف العناصر (u1_l2_periodic)
  // ═════════════════════════════════════════════════════════════
  _buildPeriodicScene(controlsEl, infoEl) {
    this.periodicGroup = new THREE.Group();
    this.scene.add(this.periodicGroup);

    const elements = [
      { sym: 'H', z: 1, col: 0x38bdf8, group: 'لافلز', pos: [-4, 2, 0] },
      { sym: 'He', z: 2, col: 0xa855f7, group: 'غاز خامل', pos: [4, 2, 0] },
      { sym: 'Li', z: 3, col: 0xef4444, group: 'فلز قلوي', pos: [-4, 0.5, 0] },
      { sym: 'Be', z: 4, col: 0xf59e0b, group: 'فلز ترابي', pos: [-2.5, 0.5, 0] },
      { sym: 'C', z: 6, col: 0x22c55e, group: 'لافلز', pos: [1, 0.5, 0] },
      { sym: 'O', z: 8, col: 0x38bdf8, group: 'لافلز نشط', pos: [2.5, 0.5, 0] },
      { sym: 'Ne', z: 10, col: 0xa855f7, group: 'غاز خامل', pos: [4, 0.5, 0] },
      { sym: 'Na', z: 11, col: 0xef4444, group: 'فلز قلوي', pos: [-4, -1, 0] },
      { sym: 'Cl', z: 17, col: 0x14b8a6, group: 'هالوجين', pos: [2.5, -1, 0] },
      { sym: 'Ar', z: 18, col: 0xa855f7, group: 'غاز خامل', pos: [4, -1, 0] }
    ];

    const boxGeo = new THREE.BoxGeometry(1.1, 1.1, 0.4);
    elements.forEach(item => {
      const mat = new THREE.MeshStandardMaterial({ color: item.col, roughness: 0.3 });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(...item.pos);
      this.periodicGroup.add(mesh);
    });

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active">📊 مصفوفة الجدول الدوري ثلاثية الأبعاد (7 دورات و 18 مجموعة)</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">ترتيب الجدول:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">تصاعدي حسب الأعداد الذرية</span></div>
        <div class="lab-stat"><span class="stat-label">المجموعات:</span><span class="stat-val" style="color:#ef4444">الأحمر: فلزات</span> | <span style="color:#38bdf8">الأزرق: لافلزات</span> | <span style="color:#a855f7">البنفسجي: غازات خاملة</span></div>
      `;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 3. الكثافة والمادة (u1_l3_matter)
  // ═════════════════════════════════════════════════════════════
  _buildDensityScene(controlsEl, infoEl) {
    this.densityObjects = [];

    const tankGeo = new THREE.BoxGeometry(6.5, 4.5, 3.2);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, roughness: 0.1 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    this.scene.add(tank);

    const waterGeo = new THREE.BoxGeometry(6.2, 3.4, 2.9);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.55, roughness: 0.2 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -0.4, 0);
    this.scene.add(water);

    this.dropItem('iron');
    this.dropItem('wood');

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn" onclick="window.interactiveLab.dropItem('wood')">🪵 خشب (يطفو)</button>
          <button class="lab-pill-btn" onclick="window.interactiveLab.dropItem('oil')">🛢️ زيت بترول (يطفو)</button>
          <button class="lab-pill-btn" onclick="window.interactiveLab.dropItem('cork')">🍾 فلين (يطفو)</button>
          <button class="lab-pill-btn" onclick="window.interactiveLab.dropItem('iron')">🔩 مسمار حديد (يغطس)</button>
          <button class="lab-pill-btn" onclick="window.interactiveLab.resetDensity()">🔄 تنظيف الحوض</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">كثافة الماء:</span><span class="stat-val" style="color:var(--accent-green)">1.00 جم/سم³</span></div>
        <div class="lab-stat"><span class="stat-label">سر الطفو:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">المواد الأقل من 1 تطفو، والأكبر تغوص في القاع!</span></div>
      `;
    }
  }

  dropItem(type) {
    const configs = {
      'wood': { name: 'خشب', color: 0x854d0e, targetY: 1.1, size: [1.0, 0.5, 1.0], speed: 0.05 },
      'oil':  { name: 'زيت', color: 0xfacc15, targetY: 1.25, size: [1.3, 0.2, 1.3], speed: 0.04 },
      'cork': { name: 'فلين', color: 0xd97706, targetY: 1.38, size: [0.8, 0.4, 0.8], speed: 0.06 },
      'iron': { name: 'حديد', color: 0x475569, targetY: -1.8, size: [0.5, 0.9, 0.5], speed: 0.09 }
    };

    const cfg = configs[type];
    if (!cfg) return;

    const geo = new THREE.BoxGeometry(...cfg.size);
    const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-2.2 + Math.random() * 4.4, 3.8, -0.6 + Math.random() * 1.2);
    mesh.userData = { targetY: cfg.targetY, speed: cfg.speed };
    this.scene.add(mesh);
    this.densityObjects.push(mesh);

    window.appController?.playLabAudio(`lab_density_${type}`);
  }

  resetDensity() {
    this.densityObjects.forEach(obj => this.scene.remove(obj));
    this.densityObjects = [];
  }

  // ═════════════════════════════════════════════════════════════
  // 4. الروابط الكيميائية (u1_l4_bonds)
  // ═════════════════════════════════════════════════════════════
  _buildBondsScene(controlsEl, infoEl) {
    this.bondsGroup = new THREE.Group();
    this.scene.add(this.bondsGroup);

    this.setBondType('ionic');

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active" id="btn-bond-ionic" onclick="window.interactiveLab.setBondType('ionic')">🧂 رابطة أيونية (ملح الطعام NaCl)</button>
          <button class="lab-pill-btn" id="btn-bond-covalent" onclick="window.interactiveLab.setBondType('covalent')">💧 رابطة تساهمية (جزيء الماء H2O)</button>
        </div>
      `;
    }
  }

  setBondType(type) {
    while (this.bondsGroup.children.length) this.bondsGroup.remove(this.bondsGroup.children[0]);
    const infoEl = document.getElementById('lab-info-bar');

    document.getElementById('btn-bond-ionic')?.classList.toggle('active', type === 'ionic');
    document.getElementById('btn-bond-covalent')?.classList.toggle('active', type === 'covalent');

    if (type === 'ionic') {
      // Sodium Cation (Na+)
      const na = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 24), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d }));
      na.position.set(-2.0, 0, 0);
      this.bondsGroup.add(na);

      // Chlorine Anion (Cl-)
      const cl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 24), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d }));
      cl.position.set(2.0, 0, 0);
      this.bondsGroup.add(cl);

      // Electric Attraction Bolt/Cylinder
      const bondCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      bondCyl.rotation.z = Math.PI / 2;
      this.bondsGroup.add(bondCyl);

      if (infoEl) {
        infoEl.innerHTML = `
          <div class="lab-stat"><span class="stat-label">نوع الرابطة:</span><span class="stat-val" style="color:#ef4444">رابطة أيونية (فقد واكتساب)</span></div>
          <div class="lab-stat"><span class="stat-label">الجزيء:</span><span class="stat-val">أيون الصوديوم الموجب (Na+) + أيون الكلوريد السالب (Cl-)</span></div>
        `;
      }
      window.appController?.playLabAudio('lab_bond_ionic', 'الرابطة الأيونية تنشأ بين فلز ولا فلز، بفقد واكتساب الإلكترونات مثل جزيء كلوريد الصوديوم ملح الطعام!');
    } else {
      // Oxygen (O) Center
      const o = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
      o.position.set(0, 0.4, 0);
      this.bondsGroup.add(o);

      // Hydrogen 1 (H)
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
      h1.position.set(-1.8, -1.0, 0);
      this.bondsGroup.add(h1);

      // Hydrogen 2 (H)
      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
      h2.position.set(1.8, -1.0, 0);
      this.bondsGroup.add(h2);

      if (infoEl) {
        infoEl.innerHTML = `
          <div class="lab-stat"><span class="stat-label">نوع الرابطة:</span><span class="stat-val" style="color:var(--accent-green)">رابطة تساهمية أحادية (مشاركة إلكترونية)</span></div>
          <div class="lab-stat"><span class="stat-label">الجزيء:</span><span class="stat-val">جزيء الماء H2O (زاويته 104.5 درجة)</span></div>
        `;
      }
      window.appController?.playLabAudio('lab_bond_covalent', 'الرابطة التساهمية تنشأ بين لا فلزين بالمشاركة الإلكترونية، مثل جزيء الماء H2O حيث تشارك ذرة الأكسجين مع ذرتي هيدروجين!');
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 5. الطاقة وصورها والبندول (u2_l1_energy)
  // ═════════════════════════════════════════════════════════════
  _buildEnergyScene(controlsEl, infoEl) {
    this.energyGroup = new THREE.Group();
    this.scene.add(this.energyGroup);

    // Fixed Ceiling Bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    bar.position.set(0, 3.5, 0);
    this.energyGroup.add(bar);

    // Pendulum Group (Pivoted at top)
    this.pendulumArm = new THREE.Group();
    this.pendulumArm.position.set(0, 3.5, 0);
    this.energyGroup.add(this.pendulumArm);

    // String
    const strMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 8), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
    strMesh.position.set(0, -2.25, 0);
    this.pendulumArm.add(strMesh);

    // Bob Sphere (Heavy Weight)
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.2 }));
    bob.position.set(0, -4.5, 0);
    this.pendulumArm.add(bob);

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active">⏱️ محاكاة البندول البسيط وقانون بقاء الطاقة الميكانيكية</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">عند أقصى ارتفاع:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">طاقة الوضع = أقصى ما يمكن (طاقة الحركة = 0)</span></div>
        <div class="lab-stat"><span class="stat-label">عند موضع السكون:</span><span class="stat-val" style="color:var(--accent-green)">طاقة الحركة = أقصى ما يمكن والسرعة قصوى!</span></div>
      `;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 6. القوى الأساسية والمغناطيس الكهربي (u2_l2_forces)
  // ═════════════════════════════════════════════════════════════
  _buildMagnetScene(controlsEl, infoEl) {
    this.magnetGroup = new THREE.Group();
    this.scene.add(this.magnetGroup);

    // Iron Core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 4.5, 24), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 }));
    this.magnetGroup.add(core);

    // Copper Coils
    const coilMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    for (let i = 0; i < 14; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 24), coilMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -1.8 + (i * 0.28), 0);
      this.magnetGroup.add(ring);
    }

    // Battery
    const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    batt.position.set(2.8, 0, 0);
    this.magnetGroup.add(batt);

    // Attracted Nails
    const nailMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    for (let i = 0; i < 4; i++) {
      const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), nailMat);
      nail.position.set(-0.3 + (i * 0.2), -2.6, 0);
      nail.rotation.z = Math.PI / 4;
      this.magnetGroup.add(nail);
    }

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active">🧲 المغناطيس الكهربي (يحول الطاقة الكهربية إلى طاقة مغناطيسية)</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">التركيب:</span><span class="stat-val">قضيب حديد مطاوع + ملف نحاسي + مصدر تيار كهربي</span></div>
        <div class="lab-stat"><span class="stat-label">التطبيقات:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">الجرس الكهربي وأوناش رفع الخردة بالكهرباء</span></div>
      `;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 7. الخلية النباتية والحيوانية ثلاثية الأبعاد الفائقة (u3_l1_cells)
  // ═════════════════════════════════════════════════════════════
  _buildCellScene(controlsEl, infoEl) {
    this.cellGroup = new THREE.Group();
    this.scene.add(this.cellGroup);

    // Enhanced lighting for cellular biology
    const cellPointLight = new THREE.PointLight(0x22c55e, 2.0, 18);
    cellPointLight.position.set(0, 2, 4);
    this.cellGroup.add(cellPointLight);

    const cellRimLight = new THREE.PointLight(0x38bdf8, 1.8, 16);
    cellRimLight.position.set(0, -2, -3);
    this.cellGroup.add(cellRimLight);

    this.currentCellType = 'plant';
    this.focusedOrganelle = 'all';

    this.setCellType('plant');

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group" style="flex-wrap: wrap; gap: 6px;">
          <button class="lab-pill-btn active" id="btn-plant" onclick="window.interactiveLab.setCellType('plant')">🌿 الخلية النباتية</button>
          <button class="lab-pill-btn" id="btn-animal" onclick="window.interactiveLab.setCellType('animal')">🐾 الخلية الحيوانية</button>
          <span style="border-left: 1.5px solid rgba(255,255,255,0.2); margin: 0 4px;"></span>
          <button class="lab-pill-btn" id="btn-org-all" onclick="window.interactiveLab.highlightOrganelle('all')">🔍 فحص كامل</button>
          <button class="lab-pill-btn" id="btn-org-nucleus" onclick="window.interactiveLab.highlightOrganelle('nucleus')">🟣 النواة والنوية</button>
          <button class="lab-pill-btn" id="btn-org-chloro" onclick="window.interactiveLab.highlightOrganelle('chloro')">🌿 البلاستيدات</button>
          <button class="lab-pill-btn" id="btn-org-vacuole" onclick="window.interactiveLab.highlightOrganelle('vacuole')">💧 الفجوة العصارية</button>
          <button class="lab-pill-btn" id="btn-org-mito" onclick="window.interactiveLab.highlightOrganelle('mito')">⚡ الميتوكوندريا</button>
          <button class="lab-pill-btn" id="btn-org-centro" onclick="window.interactiveLab.highlightOrganelle('centro')" style="display:none;">🌟 السنتروسوم</button>
        </div>
      `;
    }
  }

  setCellType(type) {
    this.currentCellType = type;
    while (this.cellGroup.children.length) this.cellGroup.remove(this.cellGroup.children[0]);
    this.organelleMeshes = {};

    document.getElementById('btn-plant')?.classList.toggle('active', type === 'plant');
    document.getElementById('btn-animal')?.classList.toggle('active', type === 'animal');

    const btnChloro = document.getElementById('btn-org-chloro');
    const btnVacuole = document.getElementById('btn-org-vacuole');
    const btnCentro = document.getElementById('btn-org-centro');
    if (btnChloro) btnChloro.style.display = (type === 'plant') ? 'inline-block' : 'none';
    if (btnVacuole) btnVacuole.style.display = (type === 'plant') ? 'inline-block' : 'none';
    if (btnCentro) btnCentro.style.display = (type === 'animal') ? 'inline-block' : 'none';

    if (type === 'plant') {
      this._buildUltraPlantCell();
    } else {
      this._buildUltraAnimalCell();
    }

    this.highlightOrganelle('all');
    window.appController?.playLabAudio(`lab_cell_${type}`);
  }

  // ── بناء الخلية النباتية المتقنة ──
  _buildUltraPlantCell() {
    // 1. الجدار الخلوي الخارجي (Cell Wall) — تصميم مجسم سداسي مقطوع لإظهار المحتويات
    const wallShape = new THREE.Shape();
    const w = 2.7, h = 2.0, r = 0.5;
    wallShape.moveTo(-w + r, -h);
    wallShape.lineTo(w - r, -h);
    wallShape.quadraticCurveTo(w, -h, w, -h + r);
    wallShape.lineTo(w, h - r);
    wallShape.quadraticCurveTo(w, h, w - r, h);
    wallShape.lineTo(-w + r, h);
    wallShape.quadraticCurveTo(-w, h, -w, h - r);
    wallShape.lineTo(-w, -h + r);
    wallShape.quadraticCurveTo(-w, -h, -w + r, -h);

    const extrudeSettings = { depth: 1.8, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: 0.15, bevelThickness: 0.15 };
    const wallGeo = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
    wallGeo.center();

    // خامة الجدار الخلوي (أخضر سليلوزي غني نصف شفاف)
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x15803d,
      emissive: 0x052e16,
      roughness: 0.35,
      metalness: 0.1,
      transmission: 0.55,
      opacity: 0.85,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.cellGroup.add(wallMesh);
    this.organelleMeshes.wall = wallMesh;

    // حواف ذهبية/خضراء تحدد أركان الجدار الخلوي السليلوزي
    const edges = new THREE.EdgesGeometry(wallGeo, 24);
    const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 2 }));
    this.cellGroup.add(edgeLines);

    // 2. الغشاء البلازمي الداخلي (Plasma Membrane)
    const memGeo = new THREE.BoxGeometry(5.0, 3.7, 1.7);
    const memMat = new THREE.MeshStandardMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.22,
      roughness: 0.2
    });
    this.cellGroup.add(new THREE.Mesh(memGeo, memMat));

    // 3. الفجوة العصارية المركزية الكبيرة (Large Central Vacuole) — قطرة سائلة كريستالية
    const vacGroup = new THREE.Group();
    const vacGeo = new THREE.SphereGeometry(1.2, 32, 32);
    vacGeo.scale(1.45, 1.15, 0.95);
    const vacMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.85,
      opacity: 0.78,
      transparent: true,
      reflectivity: 0.9
    });
    const vacMesh = new THREE.Mesh(vacGeo, vacMat);
    vacGroup.position.set(0.7, -0.15, 0);
    vacGroup.add(vacMesh);
    this.cellGroup.add(vacGroup);
    this.organelleMeshes.vacuole = vacGroup;

    // 4. النواة الكاملة والنوية (Nucleus & Nucleolus Complex)
    const nucGroup = new THREE.Group();
    nucGroup.position.set(-1.45, 0.45, 0.2);

    // الغلاف النووي البنفسجي المزدوج
    const nucGeo = new THREE.SphereGeometry(0.78, 32, 32);
    const nucMat = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      emissive: 0x3b0764,
      roughness: 0.3,
      metalness: 0.2
    });
    const nucMesh = new THREE.Mesh(nucGeo, nucMat);
    nucGroup.add(nucMesh);

    // النوية الداخلية الذهبية (Nucleolus)
    const nucleolusGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const nucleolusMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      roughness: 0.2
    });
    const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleolusMesh.position.set(0.18, 0.15, 0.25);
    nucGroup.add(nucleolusMesh);

    // الشبكة الإندوبلازمية المحيطة بالنواة (Endoplasmic Reticulum)
    const erMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const erRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.92 + (i * 0.16), 0.06, 8, 32, Math.PI * 1.2), erMat);
      erRibbon.rotation.x = 0.4 + (i * 0.3);
      erRibbon.rotation.y = 0.6;
      nucGroup.add(erRibbon);
    }

    this.cellGroup.add(nucGroup);
    this.organelleMeshes.nucleus = nucGroup;

    // 5. البلاستيدات الخضراء الفائقة (8 Chloroplasts with Thylakoids)
    const chloroGroup = new THREE.Group();
    const chloroGeo = new THREE.SphereGeometry(0.36, 24, 24);
    chloroGeo.scale(1.4, 0.7, 0.9);
    const chloroMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      emissive: 0x15803d,
      emissiveIntensity: 0.45,
      roughness: 0.25
    });

    const chloroPositions = [
      { x: -1.7, y: -0.95, z: 0.35, rot: 0.4 },
      { x: -1.85, y: 1.15, z: -0.2, rot: -0.5 },
      { x: -0.3, y: 1.25, z: 0.4, rot: 0.8 },
      { x: 0.8, y: 1.25, z: -0.35, rot: -0.3 },
      { x: 1.95, y: 1.1, z: 0.25, rot: 0.6 },
      { x: 2.05, y: -0.85, z: -0.3, rot: -0.7 },
      { x: 0.4, y: -1.25, z: 0.45, rot: 0.2 },
      { x: -0.85, y: -1.2, z: -0.35, rot: -0.4 }
    ];

    chloroPositions.forEach(pos => {
      const chlo = new THREE.Mesh(chloroGeo, chloroMat);
      chlo.position.set(pos.x, pos.y, pos.z);
      chlo.rotation.z = pos.rot;

      // أقراص الجرانا الثايلاكويد الداخلية (Internal Grana discs)
      const granaMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      for (let g = -1; g <= 1; g++) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), granaMat);
        disc.position.set(g * 0.15, 0, 0);
        disc.rotation.x = Math.PI / 2;
        chlo.add(disc);
      }

      chloroGroup.add(chlo);
    });
    this.cellGroup.add(chloroGroup);
    this.organelleMeshes.chloro = chloroGroup;

    // 6. الميتوكوندريا (4 Mitochondria with Inner Cristae)
    const mitoGroup = new THREE.Group();
    const mitoGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 16);
    const mitoMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xc2410c,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });

    const mitoPositions = [
      { x: -0.65, y: 0.35, z: 0.55, rotZ: 0.8, rotX: 0.4 },
      { x: -0.75, y: -0.45, z: -0.45, rotZ: -0.5, rotX: 0.7 },
      { x: 1.85, y: 0.15, z: 0.5, rotZ: 0.3, rotX: -0.6 },
      { x: 1.55, y: -0.95, z: -0.4, rotZ: -0.9, rotX: 0.3 }
    ];

    mitoPositions.forEach(pos => {
      const m = new THREE.Mesh(mitoGeo, mitoMat);
      m.position.set(pos.x, pos.y, pos.z);
      m.rotation.z = pos.rotZ;
      m.rotation.x = pos.rotX;
      mitoGroup.add(m);
    });
    this.cellGroup.add(mitoGroup);
    this.organelleMeshes.mito = mitoGroup;

    // 7. جهاز جولجي (Golgi Apparatus)
    const golgiGroup = new THREE.Group();
    const golgiMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const sac = new THREE.Mesh(new THREE.TorusGeometry(0.45 + (i * 0.08), 0.045, 8, 24, Math.PI * 0.65), golgiMat);
      sac.position.set(-1.1, -0.7 + (i * 0.09), 0.2);
      sac.rotation.z = 0.5;
      golgiGroup.add(sac);
    }
    this.cellGroup.add(golgiGroup);

    // 8. حبيبات الريبوسومات الدقيقة العائمة في السيتوبلازم (Ribosomes)
    const riboGeo = new THREE.BufferGeometry();
    const riboCount = 120;
    const riboPositions = new Float32Array(riboCount * 3);
    for (let i = 0; i < riboCount * 3; i += 3) {
      riboPositions[i] = (Math.random() - 0.5) * 4.4;
      riboPositions[i+1] = (Math.random() - 0.5) * 3.0;
      riboPositions[i+2] = (Math.random() - 0.5) * 1.5;
    }
    riboGeo.setAttribute('position', new THREE.BufferAttribute(riboPositions, 3));
    const riboMat = new THREE.PointsMaterial({ color: 0xfef08a, size: 0.06, transparent: true, opacity: 0.75 });
    this.cellGroup.add(new THREE.Points(riboGeo, riboMat));
  }

  // ── بناء الخلية الحيوانية المتقنة ──
  _buildUltraAnimalCell() {
    // 1. الغشاء البلازمي الخارجي المرن (Flexible Plasma Membrane) — شكل كروي بيضاوي ناعم
    const memGeo = new THREE.SphereGeometry(2.35, 36, 36);
    memGeo.scale(1.15, 1.0, 0.85);
    const memMat = new THREE.MeshPhysicalMaterial({
      color: 0xf472b6,
      emissive: 0x831843,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.65,
      opacity: 0.75,
      transparent: true,
      side: THREE.DoubleSide
    });
    const memMesh = new THREE.Mesh(memGeo, memMat);
    this.cellGroup.add(memMesh);
    this.organelleMeshes.wall = memMesh;

    // 2. النواة والنوية المركزية (Central Nucleus & Nucleolus)
    const nucGroup = new THREE.Group();
    nucGroup.position.set(-0.35, 0.1, 0.1);

    const nucGeo = new THREE.SphereGeometry(0.92, 32, 32);
    const nucMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x581c87,
      roughness: 0.3,
      metalness: 0.25
    });
    const nucMesh = new THREE.Mesh(nucGeo, nucMat);
    nucGroup.add(nucMesh);

    const nucleolusGeo = new THREE.SphereGeometry(0.36, 24, 24);
    const nucleolusMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      roughness: 0.2
    });
    const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleolusMesh.position.set(0.2, 0.2, 0.3);
    nucGroup.add(nucleolusMesh);

    // شبكة إندوبلازمية واسعة (Rough & Smooth ER)
    const erMat = new THREE.MeshStandardMaterial({ color: 0xd8b4fe, roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const er = new THREE.Mesh(new THREE.TorusGeometry(1.08 + (i * 0.18), 0.065, 8, 32, Math.PI * 1.3), erMat);
      er.rotation.x = 0.5 + (i * 0.25);
      er.rotation.y = 0.4;
      nucGroup.add(er);
    }
    this.cellGroup.add(nucGroup);
    this.organelleMeshes.nucleus = nucGroup;

    // 3. الجسم المركزي / السنتروسوم (Centrosome - 2 Centrioles at 90 degrees)
    const centroGroup = new THREE.Group();
    centroGroup.position.set(1.15, 1.05, 0.35);

    const centrioleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.52, 9, 1, true);
    const centrioleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, roughness: 0.2, metalness: 0.3 });

    const c1 = new THREE.Mesh(centrioleGeo, centrioleMat);
    centroGroup.add(c1);

    const c2 = new THREE.Mesh(centrioleGeo, centrioleMat);
    c2.rotation.x = Math.PI / 2;
    c2.position.set(0.25, 0, 0);
    centroGroup.add(c2);

    // هالة إشعاعية لخيوط المغزل (Spindle Ray Aster)
    const asterGeo = new THREE.RingGeometry(0.3, 0.65, 16);
    const asterMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    centroGroup.add(new THREE.Mesh(asterGeo, asterMat));

    this.cellGroup.add(centroGroup);
    this.organelleMeshes.centro = centroGroup;

    // 4. الميتوكوندريا الحيوية (6 Mitochondria)
    const mitoGroup = new THREE.Group();
    const mitoGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.68, 16);
    const mitoMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.45,
      roughness: 0.3
    });

    const mitoPositions = [
      { x: -1.45, y: -0.9, z: 0.2, rotZ: 0.6, rotX: 0.3 },
      { x: -1.55, y: 0.95, z: -0.3, rotZ: -0.7, rotX: 0.5 },
      { x: 0.85, y: -1.2, z: 0.3, rotZ: -0.4, rotX: 0.8 },
      { x: 1.55, y: -0.45, z: -0.2, rotZ: 0.9, rotX: -0.4 },
      { x: 1.35, y: 0.65, z: -0.35, rotZ: 0.4, rotX: 0.6 },
      { x: 0.15, y: 1.45, z: 0.25, rotZ: -0.8, rotX: 0.2 }
    ];

    mitoPositions.forEach(pos => {
      const m = new THREE.Mesh(mitoGeo, mitoMat);
      m.position.set(pos.x, pos.y, pos.z);
      m.rotation.z = pos.rotZ;
      m.rotation.x = pos.rotX;
      mitoGroup.add(m);
    });
    this.cellGroup.add(mitoGroup);
    this.organelleMeshes.mito = mitoGroup;

    // 5. الليسوسومات / الحويصلات الهاضمة (Lysosomes)
    const lysoGroup = new THREE.Group();
    const lysoGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const lysoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, roughness: 0.2 });
    const lysoPositions = [
      { x: -1.1, y: 1.2, z: 0.4 },
      { x: -0.4, y: -1.35, z: 0.3 },
      { x: 1.6, y: -0.95, z: 0.35 },
      { x: 0.9, y: -0.3, z: -0.55 }
    ];
    lysoPositions.forEach(p => {
      const l = new THREE.Mesh(lysoGeo, lysoMat);
      l.position.set(p.x, p.y, p.z);
      lysoGroup.add(l);
    });
    this.cellGroup.add(lysoGroup);

    // 6. فجوات عصارية صغيرة متعددة (Small Vacuoles)
    const smVacMat = new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transmission: 0.8, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 5; i++) {
      const sv = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), smVacMat);
      sv.position.set(Math.sin(i * 1.4) * 1.5, Math.cos(i * 1.4) * 1.2, (Math.random() - 0.5) * 0.8);
      this.cellGroup.add(sv);
    }
  }

  // ── تسليط الضوء وفحص العضيات التعليمية ──
  highlightOrganelle(organelleKey) {
    this.focusedOrganelle = organelleKey;
    const infoEl = document.getElementById('lab-info-bar');

    // Update button states
    ['all', 'nucleus', 'chloro', 'vacuole', 'mito', 'centro'].forEach(k => {
      document.getElementById(`btn-org-${k}`)?.classList.toggle('active', k === organelleKey);
    });

    const isPlant = (this.currentCellType === 'plant');

    const descriptions = {
      all: {
        title: isPlant ? '🌿 الخلية النباتية (وحدة بناء النبات)' : '🐾 الخلية الحيوانية (وحدة بناء الحيوان والإنسان)',
        desc: isPlant
          ? 'تتميز بوجود جدار خلوي سليلوزي قوي يعطيها شكلاً محدداً، وبلاستيدات خضراء للبناء الضوئي، وفجوة عصارية مركزية عملاقة لتخزين الماء والغذاء.'
          : 'تتميز بغشاء بلازمي مرن يسمح بتنوع أشكالها، وجسم مركزي (سنتروسوم) يفرز خيوط المغزل لانقسام الخلية، وميتوكوندريا لتوليد الطاقة.',
        audio: isPlant ? 'lab_cell_plant' : 'lab_cell_animal'
      },
      nucleus: {
        title: '🟣 النواة والنوية (مركز التحكم والعمليات الحيوية)',
        desc: 'تحتوي على المادة الوراثية (DNA/الكروموسومات) المسؤولة عن نقل الصفات الوراثية، وتنظيم جميع الأنشطة الحيوية وانقسام الخلية.',
        audio: 'lab_cell_nucleus'
      },
      chloro: {
        title: '🌿 البلاستيدات الخضراء (مصنع الغذاء والطاقة الضوئية)',
        desc: 'تحتوي على صبغة الكلوروفيل الخضراء التي تمتص ضوء الشمس للقيام بعملية البناء الضوئي وصنع سكر الجلوكوز والأكسجين للنبات.',
        audio: 'lab_cell_chloro'
      },
      vacuole: {
        title: '💧 الفجوة العصارية المركزية الكبيرة',
        desc: 'فجوة عملاقة في الخلية النباتية تمتلئ بالعصير الخلوي وتخزن الماء والأملاح والمواد الغذائية وتعطي الخلية دعامتها وامتلاءها.',
        audio: 'lab_cell_vacuole'
      },
      mito: {
        title: '⚡ الميتوكوندريا (بيوت الطاقة الخلوية)',
        desc: 'مركز التنفس الخلوي وأكسدة الغذاء لإنتاج جزيئات الطاقة ATP التي تمد الخلية بالحيوية اللازمة لجميع أنشطتها.',
        audio: 'lab_cell_mito'
      },
      centro: {
        title: '🌟 الجسم المركزي / السنتروسوم (خاص بالخلية الحيوانية)',
        desc: 'يتكون من حبيبتين مركزيتين (سنتريولان) وله دور أساسي في تكوين خيوط المغزل أثناء انقسام الخلية (غير موجود في النبات).',
        audio: 'lab_cell_centro'
      }
    };

    const data = descriptions[organelleKey] || descriptions.all;

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">العضو المحدد:</span><span class="stat-val" style="color:var(--accent-gold); font-weight:800;">${data.title}</span></div>
        <div class="lab-stat"><span class="stat-label">الوظيفة الحيوية:</span><span class="stat-val">${data.desc}</span></div>
      `;
    }

    // Camera animation towards target
    if (this.camera) {
      if (organelleKey === 'nucleus') {
        this.camera.position.set(-1.0, 1.5, 6.5);
      } else if (organelleKey === 'vacuole') {
        this.camera.position.set(1.5, 0.5, 6.5);
      } else if (organelleKey === 'chloro') {
        this.camera.position.set(0, 2.0, 7.0);
      } else if (organelleKey === 'centro') {
        this.camera.position.set(1.2, 1.5, 6.0);
      } else if (organelleKey === 'mito') {
        this.camera.position.set(0, -1.0, 6.5);
      } else {
        this.camera.position.set(0, 4, 11);
      }
      this.camera.lookAt(0, 0, 0);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 8. التكيف وتنوع الكائنات (u3_l2_adaptation)
  // ═════════════════════════════════════════════════════════════
  _buildAdaptationScene(controlsEl, infoEl) {
    this.adaptGroup = new THREE.Group();
    this.scene.add(this.adaptGroup);

    // Chameleon / Animal Camouflage Model
    const bodyGeo = new THREE.ConeGeometry(1.2, 3.5, 16);
    this.chameleonMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, this.chameleonMat);
    body.rotation.z = Math.PI / 2;
    this.adaptGroup.add(body);

    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    eye1.position.set(1.5, 0.5, 0.5);
    this.adaptGroup.add(eye1);

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active" onclick="window.interactiveLab.setCamouflage('desert')">🏜️ بيئة صحراوية (تكيف أصفر رملي)</button>
          <button class="lab-pill-btn" onclick="window.interactiveLab.setCamouflage('forest')">🌳 بيئة زراعية (تكيف أخضر - مماتنة)</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">المماتنة:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">قدرة الكائن على محاكاة ألوان البيئة للتخفي واقتناص الفرائس</span></div>
        <div class="lab-stat"><span class="stat-label">أنواع التكيف:</span><span class="stat-val">تركيبي (خف الجمل) | وظيفي (إفراز السم) | سلوكي (هجرة الطيور)</span></div>
      `;
    }
  }

  setCamouflage(env) {
    if (this.chameleonMat) {
      this.chameleonMat.color.setHex(env === 'desert' ? 0xd97706 : 0x16a34a);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 9. كوكب الأرض والبيئة الفضائية (u4_l1_earth_space)
  // ═════════════════════════════════════════════════════════════
  _buildEarthSpaceScene(controlsEl, infoEl) {
    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);

    // Earth Ocean Sphere
    const earthGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
    this.earthGlobe = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(this.earthGlobe);

    // Continents
    const continentMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), continentMat);
      const ang = i * 0.9;
      c.position.set(Math.cos(ang) * 2.2, Math.sin(ang) * 1.5, Math.sin(ang) * 2.2);
      this.earthGroup.add(c);
    }

    // Atmosphere Glow Layer
    const atmoGeo = new THREE.SphereGeometry(2.7, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, side: THREE.BackSide });
    this.earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active">🌍 كوكب الحياة (الغلاف الجوي + المائي 71% + الجاذبية)</button>
        </div>
      `;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="lab-stat"><span class="stat-label">الغلاف المائي:</span><span class="stat-val" style="color:#38bdf8">71% من مساحة الأرض</span></div>
        <div class="lab-stat"><span class="stat-label">الغلاف الجوي:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">78% نيتروجين - 21% أكسجين - طبقة الأوزون الحامية</span></div>
      `;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 10. الكسوف والخسوف (u4_l2_eclipses)
  // ═════════════════════════════════════════════════════════════
  _buildEclipseScene(controlsEl, infoEl) {
    const sunGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(-5.5, 0, 0);
    this.scene.add(this.sun);

    const earthGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.earth.position.set(2.5, 0, 0);
    this.scene.add(this.earth);

    const moonGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.position.set(0, 0, 0);
    this.scene.add(this.moon);

    this.setEclipseMode('solar');

    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="lab-pill-group">
          <button class="lab-pill-btn active" id="btn-solar" onclick="window.interactiveLab.setEclipseMode('solar')">☀️ كسوف الشمس (القمر في المنتصف نهاراً)</button>
          <button class="lab-pill-btn" id="btn-lunar" onclick="window.interactiveLab.setEclipseMode('lunar')">🌕 خسوف القمر (الأرض في المنتصف ليلاً)</button>
        </div>
      `;
    }
  }

  setEclipseMode(mode) {
    this.eclipseMode = mode;
    const infoEl = document.getElementById('lab-info-bar');
    document.getElementById('btn-solar')?.classList.toggle('active', mode === 'solar');
    document.getElementById('btn-lunar')?.classList.toggle('active', mode === 'lunar');

    if (mode === 'solar') {
      this.moon.position.set(-0.8, 0, 0);
      this.earth.position.set(3.5, 0, 0);
      if (infoEl) {
        infoEl.innerHTML = `
          <div class="lab-stat"><span class="stat-label">الظاهرة:</span><span class="stat-val" style="color:#0284c7; font-weight:800;">كسوف الشمس (نهاراً)</span></div>
          <div class="lab-stat"><span class="stat-label">الترتيب الفلكي:</span><span class="stat-val">الشمس ⬅️ القمر (يحجب الضوء) ⬅️ الأرض</span></div>
          <div class="lab-stat"><span class="stat-label">طور القمر:</span><span class="stat-val" style="color:var(--accent-green)">محاق (بداية الشهر)</span></div>
        `;
      }
    } else {
      this.earth.position.set(0.5, 0, 0);
      this.moon.position.set(4.2, 0, 0);
      if (infoEl) {
        infoEl.innerHTML = `
          <div class="lab-stat"><span class="stat-label">الظاهرة:</span><span class="stat-val" style="color:#ef4444">خسوف القمر (ليلاً)</span></div>
          <div class="lab-stat"><span class="stat-label">الترتيب الفلكي:</span><span class="stat-val">الشمس ⬅️ الأرض (تحجب الضوء) ⬅️ القمر</span></div>
          <div class="lab-stat"><span class="stat-label">طور القمر:</span><span class="stat-val" style="color:var(--accent-green)">بدر (منتصف الشهر)</span></div>
        `;
      }
    }

    window.appController?.playLabAudio(`lab_eclipse_${mode}`);
  }

  // ═════════════════════════════════════════════════════════════
  // Loop Updates
  // ═════════════════════════════════════════════════════════════
  _updateSimulation() {
    // 1) Atom electrons (تدور الكور بدقة متناهية على مسار الحلقات 100%)
    if (this.electrons && this.electrons.length) {
      this.electrons.forEach(e => {
        e.userData.angle += e.userData.speed;
        const r = e.userData.radius;
        e.position.set(
          Math.cos(e.userData.angle) * r,
          0,
          Math.sin(e.userData.angle) * r
        );
      });
      if (this.nucleusGroup) this.nucleusGroup.rotation.y += 0.005;
    }

    // 2) Density objects
    if (this.densityObjects && this.densityObjects.length) {
      this.densityObjects.forEach(obj => {
        if (obj.position.y > obj.userData.targetY) {
          obj.position.y -= obj.userData.speed;
        } else {
          obj.position.y = obj.userData.targetY + Math.sin(Date.now() * 0.003) * 0.03;
        }
      });
    }

    // 3) Pendulum swing
    if (this.pendulumArm) {
      this.pendulumAngle += 0.04;
      this.pendulumArm.rotation.z = Math.sin(this.pendulumAngle) * 0.55;
    }

    // 4) Periodic rotation
    if (this.periodicGroup) {
      this.periodicGroup.rotation.y += 0.003;
    }

    // 5) Earth rotation
    if (this.earthGroup) {
      this.earthGroup.rotation.y += 0.006;
    }

    // 6) Cell rotation
    if (this.cellGroup) {
      this.cellGroup.rotation.y += 0.004;
    }

    // 7) Bonds rotation
    if (this.bondsGroup) {
      this.bondsGroup.rotation.y += 0.006;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.electrons = [];
    this.densityObjects = [];
  }
}

window.interactiveLab = new InteractiveLab();
