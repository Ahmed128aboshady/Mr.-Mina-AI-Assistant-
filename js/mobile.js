/**
 * 📱 MOBILE VERSION JAVASCRIPT ENGINE
 * تحكم كامل ومستقل بصفحة mobile.html مع ربط قاعدة بيانات المنهج الـ 12 درساً
 */

window.MobileApp = {
  currentGrade: 1,
  currentUnit: 1,
  selectedLesson: null,
  scene: null,
  camera: null,
  renderer: null,
  current3DGroup: null,

  init() {
    console.log("Mobile App Engine Initialized!");
  },

  selectGrade(gradeNum) {
    this.currentGrade = gradeNum;
    alert(`تم اختيار الصف ${gradeNum === 1 ? 'الأول' : gradeNum === 2 ? 'الثاني' : 'الثالث'} الإعدادي!`);
  },

  openStage(unitIndex) {
    this.currentUnit = unitIndex;
    const curr = window.CURRICULUM_GRADE_1;
    if (!curr || !curr.units) return;

    const unit = curr.units[unitIndex - 1] || curr.units[0];
    const drawerTitle = document.getElementById('mobile-drawer-title');
    const drawerContent = document.getElementById('mobile-drawer-content');
    const overlay = document.getElementById('mobile-drawer-overlay');

    if (drawerTitle) drawerTitle.textContent = unit.unitName;
    if (drawerContent) {
      drawerContent.innerHTML = unit.lessons.map((lesson, lIdx) => `
        <div class="mobile-lesson-item" onclick="MobileApp.launchLesson('${lesson.lessonId}')">
          <div>
            <div class="mobile-lesson-name">${lesson.title}</div>
            <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">عدد الحصص: ${lesson.sessionsCount || 2} حصص تفاعلية</div>
          </div>
          <span class="mobile-lesson-badge">ابدأ الدرس 👈</span>
        </div>
      `).join('');
    }

    if (overlay) overlay.classList.add('active');
  },

  closeDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  launchLesson(lessonId) {
    this.closeDrawer();
    const curr = window.CURRICULUM_GRADE_1;
    const lesson = curr?.units.flatMap(u => u.lessons).find(l => l.lessonId === lessonId);
    if (!lesson) return;

    this.selectedLesson = lesson;
    const screen = document.getElementById('mobile-lesson-screen');
    const title = document.getElementById('mobile-lesson-header-title');
    if (title) title.textContent = lesson.title;
    if (screen) screen.classList.add('active');

    this.init3DLab(lessonId);
  },

  closeLessonScreen() {
    const screen = document.getElementById('mobile-lesson-screen');
    if (screen) screen.classList.remove('active');
  },

  sendChat() {
    const input = document.getElementById('mobile-chat-input');
    const val = input ? input.value.trim() : '';
    if (!val) return;

    input.value = '';
    const overlay = document.getElementById('mobile-chat-overlay');
    const messages = document.getElementById('mobile-chat-messages');

    if (overlay) overlay.classList.add('active');
    if (messages) {
      // Add User Message
      const userMsg = document.createElement('div');
      userMsg.className = 'mobile-msg-user';
      userMsg.textContent = val;
      messages.appendChild(userMsg);

      // Bot Typing / Smart Response
      setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'mobile-msg-bot';
        botMsg.innerHTML = `يا بطل سؤالك عن <b>"${val}"</b> جميل جداً! تعال نبسطها: كل ذرة أو مادة في المنهج ليها سر علمي مبهر.. اضغط على أي كارت عشان نفتح المعمل ثلاثي الأبعاد ونفهمها سوا! 🚀`;
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
      }, 500);
    }
  },

  toggleMic() {
    alert("🎙️ المايك الذكي جاهز للاستماع إليك!");
  },

  closeChatOverlay() {
    const overlay = document.getElementById('mobile-chat-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  init3DLab(topicId) {
    const canvas = document.getElementById('mobile-lab-canvas');
    const controls = document.getElementById('mobile-pill-bar');
    if (!canvas) return;

    const width = canvas.parentElement.clientWidth || window.innerWidth;
    const height = canvas.parentElement.clientHeight || 400;

    if (!this.renderer) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x070b14);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(0, 3, 9);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setSize(width, height);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
      dirLight.position.set(5, 10, 7);
      this.scene.add(dirLight);

      const animate = () => {
        requestAnimationFrame(animate);
        if (this.current3DGroup) {
          this.current3DGroup.rotation.y += 0.01;
        }
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    if (this.current3DGroup) {
      this.scene.remove(this.current3DGroup);
    }

    this.current3DGroup = new THREE.Group();
    this.scene.add(this.current3DGroup);

    // Build 3D Model based on lesson
    if (topicId.includes('atom') || topicId.includes('u1_l1')) {
      const nucleusGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const nucleusMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.2 });
      const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      this.current3DGroup.add(nucleus);

      const ringGeo = new THREE.TorusGeometry(3, 0.06, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.5;
      this.current3DGroup.add(ring);

      if (controls) {
        controls.innerHTML = `
          <button class="mobile-pill-btn active">🔴 النواة المركزية (+)</button>
          <button class="mobile-pill-btn">🔵 مدارات الإلكترونات (-)</button>
        `;
      }
    } else {
      const sphereGeo = new THREE.SphereGeometry(1.6, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.5 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      this.current3DGroup.add(sphere);

      if (controls) {
        controls.innerHTML = `
          <button class="mobile-pill-btn active">🔍 فحص النموذج المجسم 3D</button>
        `;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MobileApp.init();
});
