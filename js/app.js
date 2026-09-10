// ═════════════════════════════════════════════════════════════
//   المتحكم الصوتي الموحد (Global Audio Manager) لمنع تداخل الأصوات
// ═════════════════════════════════════════════════════════════
class GlobalAudioManager {
  constructor() {
    this.currentAudio = null;
  }

  stopAll() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    window.appController?.character?.setSpeaking(false);
  }

  play(audioSrc, onEndedCallback) {
    this.stopAll();

    const audio = new Audio(audioSrc);
    this.currentAudio = audio;

    window.appController?.character?.setSpeaking(true);

    audio.onended = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        window.appController?.character?.setSpeaking(false);
      }
      if (typeof onEndedCallback === 'function') onEndedCallback();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error:', audioSrc, e);
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        window.appController?.character?.setSpeaking(false);
      }
      if (typeof onEndedCallback === 'function') onEndedCallback();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Audio play catch:', err);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          window.appController?.character?.setSpeaking(false);
        }
      });
    }

    return audio;
  }
}
window.appAudioManager = new GlobalAudioManager();

class AppController {
  constructor() {
    this.character    = null;
    this.chat         = null;
    this.currentGrade = 1;          // المرحلة الأولى افتراضياً
    this.currentTopic = null;
    this.notebook     = this._loadNotebook();
    this.studentDB    = this._loadStudentDB();

    // ── YouTube config
    this.YT_KEY       = 'YOUR_YOUTUBE_API_KEY';

    this._init();
  }

  // ─────────────────────────────────────────────
  _init() {
    this._initCharacter();
    this._initChat();
    this._renderWelcomeAccordion();
    this._initGradeButtons();
    this._initBackButton();
    this._initNotebookUI();
    this._handleLoadingScreen();
    this._generateStars();
    this._injectToastContainer();
    this._initScrollDock();
  }

  // ── Scroll-driven adaptive avatar dock ───────
  _initScrollDock() {
    const bodyEl = document.querySelector('.explanation-body');
    const stageEl = document.getElementById('lesson-character-stage');
    if (!bodyEl || !stageEl) return;

    bodyEl.addEventListener('scroll', () => {
      const isScrolled = bodyEl.scrollTop > 120;
      stageEl.classList.toggle('scrolled-dock', isScrolled);
    }, { passive: true });
  }

  // ── Toast notification ────────────────────────
  _injectToastContainer() {
    if (document.getElementById('toast-container')) return;
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.style.cssText = `
      position:fixed; bottom:110px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:center; gap:8px;
      z-index:9999; pointer-events:none;
    `;
    document.body.appendChild(el);
  }

  _showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = { info:'#1d4ed8', success:'#16a34a', error:'#dc2626', warn:'#d97706' };
    const toast = document.createElement('div');
    toast.style.cssText = `
      background:${colors[type]||colors.info}; color:#fff;
      padding:10px 22px; border-radius:24px; font-family:Cairo,sans-serif;
      font-size:0.92rem; font-weight:700; box-shadow:0 6px 20px rgba(0,0,0,0.25);
      opacity:0; transition:opacity 0.3s; white-space:nowrap;
    `;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 2400);
  }

  // ══ STUDENT DATABASE ════════════════════════════
  _loadStudentDB() {
    try { return JSON.parse(localStorage.getItem('mena_student_db') || '[]'); }
    catch { return []; }
  }

  _saveStudentDB() {
    try { localStorage.setItem('mena_student_db', JSON.stringify(this.studentDB)); }
    catch(e) { console.warn('DB save error', e); }
  }

  /**
   * تسجيل تفاعل الطالب مع الدرس أو السؤال
   * @param {string} type   - 'question' | 'lesson' | 'quiz'
   * @param {object} data   - بيانات التفاعل
   */
  recordStudentActivity(type, data = {}) {
    const entry = {
      id:       Date.now(),
      type,
      grade:    this.currentGrade,
      time:     new Date().toLocaleString('ar-EG'),
      ...data
    };
    this.studentDB.unshift(entry);
    if (this.studentDB.length > 500) this.studentDB.length = 500;
    this._saveStudentDB();
  }

  /** إرجاع إحصائيات الطالب */
  getStudentStats() {
    const questions = this.studentDB.filter(e => e.type === 'question').length;
    const lessons   = this.studentDB.filter(e => e.type === 'lesson').length;
    const quizzes   = this.studentDB.filter(e => e.type === 'quiz');
    const correct   = quizzes.filter(e => e.correct).length;
    return { questions, lessons, quizCorrect: correct, quizTotal: quizzes.length };
  }

  selectGrade(grade) {
    // Support both numeric (1,2,3) and string ('1ع','2ع','3ع')
    const gradeNum = parseInt(grade);
    this.currentGrade = gradeNum;

    // Update active badge — swap image to active version with cyan fill and orange ring
    document.querySelectorAll('.grade-badge-btn').forEach(btn => {
      const btnGrade = parseInt(btn.dataset.grade);
      const isActive = (btnGrade === gradeNum);
      btn.classList.toggle('active', isActive);
      const img = btn.querySelector('img');
      if (img) {
        img.src = isActive ? `assets/${btnGrade}_active.png` : `assets/${btnGrade}.png`;
      }
    });

    // Close any open drawers when switching grade
    this.closeStageDrawers();

    // Show toast
    const gradeNames = { 1: 'الصف الأول الإعدادي', 2: 'الصف الثاني الإعدادي', 3: 'الصف الثالث الإعدادي' };
    this._showToast(`📚 ${gradeNames[gradeNum] || 'الصف الأول'}`, 'info');
  }

  toggleStageDropdown(stageNum, side) {
    const leftDrawer = document.getElementById('stage-drawer-left');
    const rightDrawer = document.getElementById('stage-drawer-right');
    const curriculum = window.CURRICULUM_GRADE_1;
    if (!curriculum) return;

    // Unit mapping: stage 1 -> unit 0, stage 2 -> unit 1, stage 3 -> unit 2, stage 4 -> unit 3
    const unitIndex = stageNum - 1;
    const unit = curriculum.units[unitIndex];
    if (!unit) return;

    const unitIcons = ['🧪', '⚡', '🌿', '🪐'];
    const icon = unitIcons[unitIndex] || '📂';

    if (side === 'right') {
      leftDrawer?.classList.remove('active');
      const titleEl = document.getElementById('drawer-title-right');
      const contentEl = document.getElementById('drawer-content-right');
      if (titleEl) titleEl.innerHTML = `${icon} ${unit.unitName}`;
      if (contentEl) {
        contentEl.innerHTML = this._buildDrawerUnitHTML(unit);
      }
      rightDrawer?.classList.toggle('active');
    } else {
      rightDrawer?.classList.remove('active');
      const titleEl = document.getElementById('drawer-title-left');
      const contentEl = document.getElementById('drawer-content-left');
      if (titleEl) titleEl.innerHTML = `${icon} ${unit.unitName}`;
      if (contentEl) {
        contentEl.innerHTML = this._buildDrawerUnitHTML(unit);
      }
      leftDrawer?.classList.toggle('active');
    }
  }

  _buildDrawerUnitHTML(unit) {
    return unit.lessons.map(lesson => `
      <div class="drawer-lesson-card">
        <div class="drawer-lesson-title">
          <span>📖</span>
          <span>${lesson.title}</span>
        </div>
        <div class="drawer-sessions-row">
          ${lesson.sessions.map(s => `
            <button class="drawer-session-btn" onclick="window.appController.selectLessonSession('${lesson.lessonId}', ${s.sessionNum})">
              <span>${lesson.sessionsCount === 1 ? '🪐' : (s.sessionNum === 1 ? '📘' : '📗')}</span>
              <span>${s.title}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  closeStageDrawers() {
    document.getElementById('stage-drawer-left')?.classList.remove('active');
    document.getElementById('stage-drawer-right')?.classList.remove('active');
  }

  submitHomeChat() {
    const inputEl = document.getElementById('home-chat-input');
    if (!inputEl) return;
    const query = inputEl.value.trim();
    if (!query) return;

    inputEl.value = '';

    // 📝 سجّل سؤال الطالب في الداتا بيز
    this.recordStudentActivity('question', { text: query, source: 'text' });

    this._handleQuestion(query);
  }

  toggleHomeMic() {
    const micBtn = document.getElementById('home-mic-btn');
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('الميكروفون غير مدعوم في هذا المتصفح. يرجى استخدام متصفح Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;

    micBtn?.classList.add('recording');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const inputEl = document.getElementById('home-chat-input');
      if (inputEl) {
        inputEl.value = transcript;
        // 🎙️ سجّل السؤال الصوتي في الداتا بيز
        this.recordStudentActivity('question', { text: transcript, source: 'voice' });
        this.submitHomeChat();
      }
    };

    recognition.onerror = () => {
      micBtn?.classList.remove('recording');
    };

    recognition.onend = () => {
      micBtn?.classList.remove('recording');
    };

    recognition.start();
  }

  _renderWelcomeAccordion() {
    const container = document.getElementById('welcome-accordion-container');
    if (!container || !window.CURRICULUM_GRADE_1) return;

    const unitIcons = ['🧪', '⚡', '🌿', '🪐'];

    container.innerHTML = window.CURRICULUM_GRADE_1.units.map((unit, uIdx) => `
      <div class="unit-accordion-card ${uIdx === 0 ? 'active' : ''}">
        <div class="unit-acc-header" onclick="window.appController.toggleUnitAccordion(this)">
          <div class="unit-acc-title">
            <span style="font-size: 1.15rem;">${unitIcons[uIdx] || '📂'}</span>
            <span>${unit.unitName}</span>
          </div>
          <div class="unit-acc-arrow">▼</div>
        </div>
        <div class="unit-acc-body">
          ${unit.lessons.map(lesson => `
            <div class="lesson-acc-item">
              <div class="lesson-acc-title">
                <span>📖</span>
                <span>${lesson.title}</span>
              </div>
              <div class="lesson-acc-sessions">
                ${lesson.sessions.map(s => `
                  <button class="session-badge-btn ${s.sessionNum === 2 ? 'session-2' : (lesson.sessionsCount === 1 ? 'session-full' : '')}" onclick="window.appController.selectLessonSession('${lesson.lessonId}', ${s.sessionNum})">
                    <span>${lesson.sessionsCount === 1 ? '🪐' : (s.sessionNum === 1 ? '📘' : '📗')}</span>
                    <span>${s.title}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  toggleUnitAccordion(headerEl) {
    const card = headerEl.closest('.unit-accordion-card');
    if (!card) return;
    card.classList.toggle('active');
  }

  // ══════════════════════════════════════════
  //   CHARACTER
  // ══════════════════════════════════════════
  _initCharacter() {
    if (typeof THREE === 'undefined') {
      setTimeout(() => this._initCharacter(), 200);
      return;
    }
    this.character = new CharacterViewer('character-canvas');
  }

  // ══════════════════════════════════════════
  //   CHAT
  // ══════════════════════════════════════════
  _initChat() {
    try {
      // ChatManager يحتاج العناصر القديمة — نشغله فقط لو موجودة
      if (document.getElementById('chat-messages') && document.getElementById('chat-input')) {
        this.chat = new ChatManager({
          onSend:  (text) => this._handleQuestion(text),
          onVoice: ()     => {},
        });
      } else {
        // Stub لمنع crash
        this.chat = {
          showTyping:  () => {},
          hideTyping:  () => {},
          addBotMessage: () => {},
          setWaiting:  () => {},
        };
      }
    } catch (e) {
      console.warn('ChatManager init skipped:', e);
      this.chat = { showTyping:()=>{}, hideTyping:()=>{}, addBotMessage:()=>{}, setWaiting:()=>{} };
    }
  }

  // ══════════════════════════════════════════
  //   FLOATING LIVE CHAT MANAGER (لايف شات مستر مينا)
  // ══════════════════════════════════════════
  toggleLiveChat(forceState) {
    const popup = document.getElementById('live-chat-popup');
    if (!popup) return;

    const isOpening = (forceState !== undefined) ? forceState : !popup.classList.contains('active');

    if (isOpening) {
      popup.classList.add('active');
      // 🙈 إخفاء شريط البحث السفلي في الهوم لمنع ظهور شريطي بحث معاً
      const homeChatPill = document.getElementById('home-bottom-chat-pill');
      if (homeChatPill) homeChatPill.style.display = 'none';

      const input = document.getElementById('live-chat-input');
      if (input) {
        setTimeout(() => input.focus(), 150);
      }
      this._scrollLiveChatToBottom();
    } else {
      popup.classList.remove('active');
      // 🌟 إعادة إظهار شريط بحث الهوم فقط إذا كان الطالب في صفحة الهوم (وليس داخل الدرس)
      const isInLesson = document.getElementById('explanation-section')?.classList.contains('visible');
      if (!isInLesson) {
        const homeChatPill = document.getElementById('home-bottom-chat-pill');
        if (homeChatPill) homeChatPill.style.display = 'flex';
      }
    }
  }

  submitLiveChat() {
    const inputEl = document.getElementById('live-chat-input');
    if (!inputEl) return;
    const query = inputEl.value.trim();
    if (!query) return;

    inputEl.value = '';

    // 📝 سجّل سؤال الطالب في الداتا بيز
    this.recordStudentActivity('question', { text: query, source: 'live_chat_text' });

    this._handleQuestion(query);
  }

  toggleLiveChatMic() {
    const micBtn = document.getElementById('live-chat-mic-btn');
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('الميكروفون غير مدعوم في هذا المتصفح. يرجى استخدام متصفح Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;

    micBtn?.classList.add('recording');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const inputEl = document.getElementById('live-chat-input');
      if (inputEl) {
        inputEl.value = transcript;
        this.recordStudentActivity('question', { text: transcript, source: 'live_chat_voice' });
        this.submitLiveChat();
      }
    };

    recognition.onerror = () => {
      micBtn?.classList.remove('recording');
    };

    recognition.onend = () => {
      micBtn?.classList.remove('recording');
    };

    recognition.start();
  }

  _scrollLiveChatToBottom() {
    const messagesEl = document.getElementById('live-chat-messages');
    if (messagesEl) {
      setTimeout(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }, 50);
    }
  }

  _setLiveChatLoading(loading) {
    const typingEl = document.getElementById('live-chat-typing');
    if (typingEl) {
      typingEl.style.display = loading ? 'flex' : 'none';
    }
    this._scrollLiveChatToBottom();
  }

  /** معالجة سؤال الطالب وعرض الرد في اللايف شات */
  async _handleQuestion(question) {
    // تأكد من فتح نافذة اللايف شات وإخفاء سيرش بار الهوم
    this.toggleLiveChat(true);

    // ─── عرض رسالة الطالب داخل اللايف شات ───
    this._appendLiveChatMessage(question, 'user');
    this._setLiveChatLoading(true);

    try {
      const response = await this._askAI(question);
      this._setLiveChatLoading(false);
      this.currentTopic = response.topic;

      // عرض رد مستر مينا مع الأزرار التفاعلية المباشرة
      this._appendLiveChatMessage(response.answer, 'bot', response.actions || []);

      // نطق الشرح الصوتي
      this._speakAudio(response.spokenText || response.answer);

      if (response.hasExplanation && response.topicContent) {
        this._topicData = {
          id: response.topic,
          titleAr: response.topicAr,
          question: question,
          content: response.topicContent
        };
      }

      if (response.isOutOfCurriculum) {
        this._recordToNotebook(question);
      }

    } catch (err) {
      this._setLiveChatLoading(false);
      console.error('Curriculum AI Error:', err);
      this._appendLiveChatMessage('معلش يا بطل، حصل خطأ بسيط. جرب تسألني تاني!', 'bot');
    }
  }

  /** إضافة رسالة تفاعلية داخل نافذة اللايف شات */
  _appendLiveChatMessage(text, role, actions = []) {
    const messagesEl = document.getElementById('live-chat-messages');
    if (!messagesEl) return;

    const isBot = role === 'bot';
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isBot ? 'bot-msg' : 'user-msg'}`;

    // تنسيق النص البرمجي والماركداون
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let avatarHTML = isBot 
      ? `<div class="msg-avatar-icon"><img src="assets/poses/01.png" alt="مستر مينا" /></div>`
      : `<div class="msg-avatar-icon">👤</div>`;

    let contentHTML = `
      ${avatarHTML}
      <div class="msg-bubble-content">
        <div>${formattedText}</div>
    `;

    // إضافة الأزرار التفاعلية المباشرة بتصميم نظيف واحترافي
    if (actions && actions.length > 0) {
      contentHTML += `
        <div class="chat-actions-container">
          ${actions.map((act) => `
            <button 
              class="chat-action-button" 
              onclick="${act.action}"
            >
              <span>${act.label}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    contentHTML += `</div>`;
    msgDiv.innerHTML = contentHTML;

    messagesEl.appendChild(msgDiv);
    
    // التمرير السلس للمحادثة لرؤية بداية الشرح بوضوح
    setTimeout(() => {
      msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  }

  /** إرسال سؤال سريع للايف شات عند الضغط على أي اقتراح */
  quickAskChat(query) {
    this.toggleLiveChat(true);
    const inputEl = document.getElementById('live-chat-input');
    if (inputEl) {
      inputEl.value = query;
      this.submitLiveChat();
    } else {
      this._handleQuestion(query);
    }
  }

  /** إظهار/إخفاء مؤشر التحميل في الشات */
  _setHomeChatLoading(loading) {
    let indicator = document.getElementById('home-chat-loading');
    if (loading) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'home-chat-loading';
        indicator.style.cssText = `
          position:fixed; bottom:98px; left:50%; transform:translateX(-50%);
          background:rgba(10,22,50,0.9); border:1px solid rgba(56,189,248,0.2);
          border-radius:12px; padding:10px 20px; z-index:89;
          color:#38bdf8; font-family:'Cairo',sans-serif; font-size:0.88rem;
          font-weight:700; display:flex; align-items:center; gap:8px;
          backdrop-filter:blur(10px);
        `;
        indicator.innerHTML = `
          <span style="display:inline-flex;gap:4px;">
            <span style="width:7px;height:7px;background:#38bdf8;border-radius:50%;animation:bounce 0.8s infinite 0s"></span>
            <span style="width:7px;height:7px;background:#38bdf8;border-radius:50%;animation:bounce 0.8s infinite 0.15s"></span>
            <span style="width:7px;height:7px;background:#38bdf8;border-radius:50%;animation:bounce 0.8s infinite 0.3s"></span>
          </span>
          مستر مينا بيفكر...
        `;
        document.body.appendChild(indicator);
      }
      // Add bounce animation once
      if (!document.getElementById('bounce-style')) {
        const s = document.createElement('style');
        s.id = 'bounce-style';
        s.textContent = '@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}';
        document.head.appendChild(s);
      }
    } else {
      indicator?.remove();
    }
  }

  /**
   * تشغيل الصوت: ينظف النص تماماً من الإيموجي والرموز ويشغل صوت مستر مينا الحقيقي
   */
  async _speakAudio(text) {
    // 1) تنظيف تام للإيموجي والرموز والماركداون وعبارات الواجهة
    let cleanText = text
      // إزالة كل الإيموجي بكل أنواعها بدون استثناء
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{2B50}\u{200D}\u{FE0F}\u{FE0E}\u{20E3}]/gu, '')
      // إزالة علامات الماركداون
      .replace(/[*#_~`>•\-\[\]\(\)]/g, ' ')
      // إزالة عبارات الواجهة والأزرار
      .replace(/اضغط على الزرار.*?👇/g, '')
      .replace(/شوف الشرح.*?👇/g, '')
      .replace(/اضغط.*?تحت/g, '')
      .replace(/👇/g, '')
      // استبدال الرموز العلمية بنطق مصري سليم وطبيعي
      .replace(/2n²/g, 'اثنين نون تربيع')
      .replace(/2n2/g, 'اثنين نون تربيع')
      .replace(/جم\/سم³/g, 'جرام لكل سنتيمتر مكعب')
      .replace(/g\/cm³/g, 'جرام لكل سنتيمتر مكعب')
      .replace(/كجم/g, 'كيلو جرام')
      .replace(/سم³/g, 'سنتيمتر مكعب')
      .replace(/م\/ث²/g, 'متر لكل ثانية مربعة')
      .replace(/H2O/gi, 'مية')
      .replace(/NaCl/gi, 'كلوريد الصوديوم')
      // إزالة المسافات والأسطر المتكررة
      .replace(/\s+/g, ' ')
      .trim();

    // نطق أول 250 حرف للشرح السريع والواضح
    if (cleanText.length > 280) {
      const sentenceEnd = cleanText.indexOf('.', 180);
      if (sentenceEnd > 0) {
        cleanText = cleanText.slice(0, sentenceEnd + 1);
      } else {
        cleanText = cleanText.slice(0, 280);
      }
    }

    if (!cleanText) return;

    // 💬 إذا كانت شاشة الشرح مفتوحة، شغل البوب اب التفاعلي للكتابة المتزامنة
    if (document.getElementById('explanation-section')?.classList.contains('visible')) {
      this.typewriterSpeech(cleanText);
    }

    // 2) تشغيل سيرفر الصوت المستنسخ لمستر مينا إن وُجد
    try {
      const res = await fetch('http://localhost:5050/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_url && data.status === 'success') {
          window.appAudioManager.play(data.audio_url);
          return;
        }
      }
    } catch (err) {
      // السيرفر المحلي غير متصل (أثناء التشغيل أونلاين على GitHub Pages)
    }

    // 3) بديل صوتي تلقائي وسلس عبر متصفح الهاتف والكمبيوتر (Web Speech API)
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ar-EG';
        utterance.rate = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic'));
        if (arabicVoice) utterance.voice = arabicVoice;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }

  // ══════════════════════════════════════════
  //   AI ENGINE & CURRICULUM RESOLVER (100% مستر مينا والمذكرات)
  // ══════════════════════════════════════════
  async _askAI(question) {
    // محرك المنهج المحلي الذكي المتخصص (مطابق 100% لمذكرات مستر مينا والكتاب المدرسي)
    return this._matchCurriculumQuestion(question);
  }

  /** معالجة وتطبيع النصوص العربية للبحث الذكي */
  _normalizeArabic(text) {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
      .replace(/[أإآء]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // إزالة علامات الترقيم والرموز
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** البحث في قاعدة معرفة المنهج والمطابقة الذكية الشاملة */
  _matchCurriculumQuestion(question) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const rawQ = question.trim();
        const qNorm = this._normalizeArabic(rawQ);
        const curr = window.CURRICULUM_GRADE_1;

        if (!curr || !curr.units) {
          resolve({
            answer: 'أهلاً بك يا بطل! اسألني في أي جزء من منهج علوم الصف الأول الإعدادي 🔬',
            topic: 'general',
            topicAr: 'منهج العلوم',
            hasExplanation: false,
            isOutOfCurriculum: false,
            actions: []
          });
          return;
        }

        // 1) كلمات التحية والترحيب
        const greetings = ['ازيك', 'مرحبا', 'سلام', 'السلام عليكم', 'هاي', 'صباح الخير', 'مساء الخير', 'مين انت', 'من انت', 'اهلا', 'يا هلا'];
        if (greetings.some(g => qNorm.includes(g)) && qNorm.length < 35) {
          resolve({
            answer: `أهلاً بك يا بطل! أنا **مستر مينا جرجس**، معلم العلوم ومساعدك الذكي. جاهز للإجابة على أي سؤال وشرح أي درس في منهج علوم الصف الأول الإعدادي بالكامل.\n\nتقدر تضغط على أي موضوع من المقترحات السريعة أو تكتبلي سؤالك فوراً:`,
            spokenText: `أهلاً بيك يا بطل في فصلي الذكي! أنا مستر مينا جرجس، جاهز أشرحلك أي درس في علوم أولى إعدادي بطريقة سهلة وممتعة.. تحب نبدأ بإيه النهاردة؟`,
            topic: 'general',
            topicAr: 'مستر مينا',
            hasExplanation: false,
            isOutOfCurriculum: false,
            actions: [
              { label: 'شرح تركيب الذرة ومستويات الطاقة', action: `window.appController.quickAskChat('اشرحلي الذرة')` },
              { label: 'شرح قانون الكثافة والطفو', action: `window.appController.quickAskChat('اشرحلي الكثافة')` },
              { label: 'شرح طاقة الوضع والحركة', action: `window.appController.quickAskChat('طاقة الوضع والحركة')` },
              { label: 'شرح ظواهر الكسوف والخسوف', action: `window.appController.quickAskChat('الكسوف والخسوف')` }
            ]
          });
          return;
        }

        // 2) طلب شرح عام أو استعراض الوحدات
        const genericExplainTriggers = ['اشرح الدرس', 'اشرحلي الدرس', 'شرح الدرس', 'عايز شرح', 'عاوز شرح', 'اشرح', 'اشرحلي', 'فهمني الدرس', 'ملخص المنهج', 'الدروس', 'اشرح درس', 'اشرحلي درس', 'عايز درس', 'عاوز درس', 'شرح', 'المنهج'];
        const isGenericExplain = (genericExplainTriggers.some(t => qNorm === t || qNorm === this._normalizeArabic(t))) || qNorm === 'شرح';

        if (isGenericExplain) {
          const activeLesson = this._currentLesson;
          if (activeLesson) {
            const currentSession = this._currentSessionNum || 1;
            const sessionSummary = activeLesson.sessions?.[currentSession - 1]?.summary || activeLesson.summary;
            const sessionRules = activeLesson.sessions?.[currentSession - 1]?.rules || activeLesson.rules || [];

            let answerText = `ملخص مركز لموضوع **${activeLesson.title}**:\n\n`;
            answerText += `**ملخص الحصة:**\n${sessionSummary}\n\n`;
            if (sessionRules.length > 0) {
              answerText += `**أهم القواعد والقوانين:**\n• ` + sessionRules.join('\n• ') + '\n\n';
            }

            resolve({
              answer: answerText,
              spokenText: activeLesson.spokenEgyptian || sessionSummary,
              topic: activeLesson.lessonId,
              topicAr: activeLesson.title,
              hasExplanation: true,
              topicContent: this._topicData?.content || null,
              isOutOfCurriculum: false,
              actions: [
                { label: `استكمال درس ${activeLesson.title.split(':')[1] || activeLesson.title}`, action: `window.appController.selectLessonSession('${activeLesson.lessonId}', ${currentSession})` },
                { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${activeLesson.lessonId}', ${currentSession})` }
              ]
            });
            return;
          } else {
            resolve({
              answer: `اختر الوحدة أو الدرس اللي تحب نبدأ بيه، وجاهز لشرحه فوراً مع المعمل التفاعلي ثلاثي الأبعاد:`,
              spokenText: `من عيوني يا بطل، اختار الوحدة اللي تحب نبدأ بيها وهشرحهالك فوراً بالتفصيل وبطريقة سهلة جداً!`,
              topic: 'general',
              topicAr: 'شرح المنهج',
              hasExplanation: false,
              isOutOfCurriculum: false,
              actions: [
                { label: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها', action: `window.appController.toggleStageDropdown(1, 'right')` },
                { label: 'الوحدة الثانية: الطاقة والقوى في الطبيعة', action: `window.appController.toggleStageDropdown(2, 'left')` },
                { label: 'الوحدة الثالثة: الكائنات الحية والتكيف والبيئة', action: `window.appController.toggleStageDropdown(3, 'right')` },
                { label: 'الوحدة الرابعة: الأرض والكون والفلك', action: `window.appController.toggleStageDropdown(4, 'left')` }
              ]
            });
            return;
          }
        }

        // 3) قاموس المعرفة الشامل لدروس المنهج ومطابقة الكلمات المفتاحية
        const TOPIC_KNOWLEDGE = [
          {
            lessonId: 'u1_l1_atom',
            title: 'الدرس الأول: تركيب الذرة ومستويات الطاقة',
            unitName: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها',
            primaryKeywords: [
              'ذره', 'الذره', 'نواه', 'النواه', 'بروتون', 'بروتونات', 'نيوترون', 'نيوترونات', 
              'الكترون', 'الكترونات', 'مستويات الطاقه', 'مستوى طاقه', 'توزيع الكتروني', 
              'العدد الذري', 'العدد الكتلي', 'كربون', 'هيدروجين', 'هيليوم', 'صوديوم', 'اكسجين', 
              '2n2', 'k', 'l', 'm', 'n', 'شحنه النواه', 'متعادله كهربيا', 'تركيب الذره', 'مستويات الطاقه الرئيسيه'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u1_l2_periodic',
            title: 'الدرس الثاني: الجدول الدوري وتصنيف العناصر',
            unitName: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها',
            primaryKeywords: [
              'جدول دوري', 'الجدول الدوري', 'مندليف', 'موزلي', 'بور', 'تصنيف العناصر', 
              'فلزات', 'فلز', 'لا فلزات', 'لا فلز', 'اشباه فلزات', 'غازات خامله', 'غاز خامل', 
              'دوره', 'دورات', 'مجموعه', 'مجموعات', 'فئه s', 'فئه p', 'فئه d', 'فئه f', 
              'جدول دوري حديث', 'موقع العنصر', 'جدول مندليف', 'جدول موزلي'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u1_l3_matter',
            title: 'الدرس الثالث: المادة وخواصها وسر الكثافة',
            unitName: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها',
            primaryKeywords: [
              'ماده', 'الماده', 'كثافه', 'الكثافه', 'كتله', 'الكتله', 'حجم', 'الحجم', 
              'طفو', 'غوص', 'يطفو', 'يغوص', 'زيت البترول', 'حرائق البترول', 'خشب', 'الخشب', 
              'فلين', 'الفلين', 'مسمار الحديد', 'بالونات الهيليوم', 'بالونات الهيدروجين', 
              'قانون الكثافه', 'تطبيقات الكثافه', 'درجه الانصهار', 'درجه الغليان', 'توصيل كهربي', 'توصيل حراري'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u1_l4_bonds',
            title: 'الدرس الرابع: الروابط الكيميائية (أيونية وتساهمية)',
            unitName: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها',
            primaryKeywords: [
              'رابطه', 'الرابطه', 'روابط', 'الروابط', 'رابطه ايونيه', 'رابطه تساهميه', 'ايونيه', 'تساهميه', 
              'ايون موجب', 'ايون سالب', 'ايونات', 'فقد الكترونات', 'اكتساب الكترونات', 'مشاركه الكترونيه', 
              'ملح الطعام', 'كلوريد الصوديوم', 'جزيء الماء', 'تساهميه احاديه', 'تساهميه ثنائيه', 'تساهميه ثلاثيه', 
              'h2o', 'nacl', 'تفاعل كيميائي'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u2_l1_energy',
            title: 'الدرس الأول: الطاقة وصورها وطاقة الوضع والحركة',
            unitName: 'الوحدة الثانية: الطاقة والقوى في الطبيعة',
            primaryKeywords: [
              'طاقه', 'الطاقه', 'شغل', 'الشغل', 'طاقه وضع', 'طاقه الوضع', 'طاقه حركه', 'طاقه الحركه', 
              'طاقه ميكانيكيه', 'الطاقه الميكانيكيه', 'بقاء الطاقه', 'قانون بقاء الطاقه', 'تحولات الطاقه', 
              'بندول', 'البندول البسيط', 'جول', 'نيوتن', 'ارتفاع', 'سرعه'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u2_l2_forces',
            title: 'الدرس الثاني: القوى الأساسية في الطبيعة والمغناطيسية',
            unitName: 'الوحدة الثانية: الطاقة والقوى في الطبيعة',
            primaryKeywords: [
              'قوه', 'القوه', 'قوى', 'القوى', 'جاذبيه', 'الجاذبيه', 'الجاذبيه الارضيه', 'وزن', 'الوزن', 
              'كتله ووزن', 'مركز الثقل', 'عجله الجاذبيه', 'كهرومغناطيسيه', 'مغناطيس كهربي', 'مغناطيس', 
              'دينامو', 'مولد كهربي', 'محرك كهربي', 'موتور', 'قوى نوويه'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u3_l1_cells',
            title: 'الدرس الأول: الخلية وحدة بناء الكائن الحي',
            unitName: 'الوحدة الثالثة: الكائنات الحية والتكيف والبيئة',
            primaryKeywords: [
              'خليه', 'الخليه', 'خلايا', 'الخلايا', 'خليه نباتيه', 'الخليه النباتيه', 'خليه حيوانيه', 'الخليه الحيوانيه', 
              'جدار خلوي', 'غشاء بلازمي', 'سيتوبلازم', 'نواه الخليه', 'بلاستيدات خضراء', 'بناء ضوئي', 'فجوه عصاريه', 
              'ميتوكوندريا', 'عضيات', 'وحده البناء والوظيفه'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u3_l2_adaptation',
            title: 'الدرس الثاني: تنوع الكائنات الحية وطرق التكيف',
            unitName: 'الوحدة الثالثة: الكائنات الحية والتكيف والبيئة',
            primaryKeywords: [
              'تكيف', 'التكيف', 'تنوع الكائنات', 'تصنيف الكائنات', 'تكيف تركيبي', 'تكيف وظيفي', 'تكيف سلوكي', 
              'بيات شتوي', 'خمول صيفي', 'هجره الطيور', 'مماتنه', 'المماتنه', 'حرباء', 'الحرباء', 'حشره العود', 
              'حشره ورقيه', 'نباتات مفترسه', 'نباتات اكاله الحشرات', 'دروسيرا', 'دايونيا', 'حامول الماء', 
              'منقار الصقر', 'خف الجمل', 'حافر الحصان'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u4_l1_earth_space',
            title: 'الدرس الأول: كوكب الأرض والبيئة الفضائية',
            unitName: 'الوحدة الرابعة: الأرض والكون والفلك',
            primaryKeywords: [
              'ارض', 'الارض', 'كوكب الارض', 'غلاف جوي', 'غلاف مائي', 'طبقات الارض', 'قشره ارضيه', 'وشاح', 
              'لب الارض', 'ضغط جوي', 'جاذبيه الارض', 'كوكب الحياه', 'اوزون', 'طبقه الاوزون', 'فضاء'
            ],
            defaultSession: 1
          },
          {
            lessonId: 'u4_l2_eclipses',
            title: 'الدرس الثاني: ظواهر الكسوف والخسوف الفلكية',
            unitName: 'الوحدة الرابعة: الأرض والكون والفلك',
            primaryKeywords: [
              'كسوف', 'خسوف', 'كسوف الشمس', 'خسوف القمر', 'الكسوف', 'الخسوف', 'مخروط الظل', 'شبه الظل', 
              'كسوف كلي', 'كسوف جزئي', 'كسوف حلقي', 'خسوف كلي', 'خسوف جزئي', 'استقامه واحده', 'حجب ضوء الشمس'
            ],
            defaultSession: 1
          }
        ];

        // 4) البحث عن مطابقة لأسئلة علل في كافة دروس المنهج
        let matchedWhy = null;
        let matchedWhyLesson = null;
        let bestWhyScore = 0;

        for (const unit of curr.units) {
          for (const lesson of unit.lessons) {
            for (const sess of (lesson.sessions || [])) {
              for (const why of (sess.whyQuestions || [])) {
                const whyNorm = this._normalizeArabic(why.q);
                const queryWords = qNorm.split(' ').filter(w => w.length > 2);
                let matchCount = 0;
                for (const w of queryWords) {
                  if (whyNorm.includes(w)) matchCount++;
                }
                if (matchCount >= 2 && matchCount > bestWhyScore) {
                  bestWhyScore = matchCount;
                  matchedWhy = why;
                  matchedWhyLesson = lesson;
                }
              }
            }
          }
        }

        // إذا تم العثور على سؤال علل
        if (matchedWhy && matchedWhyLesson) {
          let ans = `سؤال ممتاز في **${matchedWhyLesson.title}**:\n\n`;
          ans += `**سؤال علل:** ${matchedWhy.q}\n\n`;
          ans += `**إجابة مستر مينا النموذجية:**\n${matchedWhy.a}\n\n`;
          ans += `**ملخص سريع:** ${matchedWhyLesson.summary}`;

          resolve({
            answer: ans,
            spokenText: `سؤال جميل يا بطل! ${matchedWhy.a} ${matchedWhyLesson.spokenEgyptian || ''}`,
            topic: matchedWhyLesson.lessonId,
            topicAr: matchedWhyLesson.title,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: [
              { label: `فتح درس ${matchedWhyLesson.title.split(':')[1] || matchedWhyLesson.title}`, action: `window.appController.selectLessonSession('${matchedWhyLesson.lessonId}', 1)` },
              { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${matchedWhyLesson.lessonId}', 1)` }
            ]
          });
          return;
        }

        // 5) مطابقة الكلمات المفتاحية والمواضيع (حتى لو كتب كلمة واحدة مثل: ذرة، كثافة، طاقة، خلية)
        let bestTopic = null;
        let bestScore = 0;

        for (const topicItem of TOPIC_KNOWLEDGE) {
          let score = 0;
          for (const kw of topicItem.primaryKeywords) {
            const kwNorm = this._normalizeArabic(kw);
            if (kwNorm === qNorm) {
              score += 120; // تطابق تام للكلمة المفتاحية
            } else if (` ${qNorm} `.includes(` ${kwNorm} `)) {
              score += 40;
            } else if (qNorm.includes(kwNorm) || kwNorm.includes(qNorm)) {
              score += 25;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestTopic = topicItem;
          }
        }

        // إذا تم العثور على درس مطابق
        if (bestTopic && bestScore >= 25) {
          const matchedCurriculumLesson = curr.units.flatMap(u => u.lessons).find(l => l.lessonId === bestTopic.lessonId);
          const lessonTitle = matchedCurriculumLesson?.title || bestTopic.title;
          const lessonSummary = matchedCurriculumLesson?.sessions?.[0]?.summary || matchedCurriculumLesson?.summary || '';
          const lessonRules = matchedCurriculumLesson?.sessions?.[0]?.rules || matchedCurriculumLesson?.rules || [];
          const spokenText = matchedCurriculumLesson?.sessions?.[0]?.spokenEgyptian || matchedCurriculumLesson?.spokenEgyptian || lessonSummary;

          let answerText = `شرح مبسط لموضوع **${lessonTitle}**:\n\n`;
          answerText += `**ملخص مستر مينا:**\n${lessonSummary}\n\n`;

          if (lessonRules.length > 0) {
            answerText += `**أهم القواعد والقوانين:**\n• ` + lessonRules.slice(0, 2).join('\n• ') + '\n\n';
          }

          const actions = [
            { 
              label: `فتح درس ${lessonTitle.split(':')[1] || lessonTitle}`, 
              action: `window.appController.selectLessonSession('${bestTopic.lessonId}', 1)` 
            },
            { 
              label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', 
              action: `window.appController.selectLessonSession('${bestTopic.lessonId}', 1)` 
            }
          ];

          if (matchedCurriculumLesson?.sessions && matchedCurriculumLesson.sessions.length > 1) {
            actions.push({
              label: `الحصة 2: ${matchedCurriculumLesson.sessions[1].title.split(':')[1] || 'التطبيقات والقوانين'}`,
              action: `window.appController.selectLessonSession('${bestTopic.lessonId}', 2)`
            });
          }

          resolve({
            answer: answerText,
            spokenText: spokenText,
            topic: bestTopic.lessonId,
            topicAr: lessonTitle,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: actions
          });
          return;
        }

        // 6) السؤال خارج المنهج — يتم تسجيله بلطف في دفتر مستر مينا مع توفير أزرار لاستكشاف المنهج
        resolve({
          answer: `سؤالك ذكي وممتاز، وتخصصنا هنا في المنصة هو **منهج العلوم للصف الأول الإعدادي** لنضمن التفوق والدرجة النهائية معاً.\n\nتم **تسجيل سؤالك في دفتر مستر مينا** للإجابة عليه لاحقاً.\n\nيمكنك اختيار أي وحدة من وحدات المنهج لبدء دراستها الآن:`,
          spokenText: `يا بطل، سؤالك ذكي وجميل جداً، بس تخصصي هنا معاك هو منهج علوم أولى إعدادي عشان نضمن الدرجة النهائية سوا.. وعشانك سجلت سؤالك عندي في الدفتر وهبحثلك عنه للحصة الجاية!`,
          topic: 'out_of_curriculum',
          topicAr: 'خارج المنهج',
          hasExplanation: false,
          topicContent: null,
          isOutOfCurriculum: true,
          actions: [
            { label: 'الوحدة الأولى: المادة وتركيبها وتفاعلاتها', action: `window.appController.toggleStageDropdown(1, 'right')` },
            { label: 'الوحدة الثانية: الطاقة والقوى في الطبيعة', action: `window.appController.toggleStageDropdown(2, 'left')` },
            { label: 'الوحدة الثالثة: الكائنات الحية والتكيف والبيئة', action: `window.appController.toggleStageDropdown(3, 'right')` },
            { label: 'الوحدة الرابعة: الأرض والكون والفلك', action: `window.appController.toggleStageDropdown(4, 'left')` }
          ]
        });

      }, 10);
    });
  }

  // ══════════════════════════════════════════
  //   NOTEBOOK (دفتر مستر مينا للأسئلة الخارجية)
  // ══════════════════════════════════════════
  _loadNotebook() {
    try {
      const saved = localStorage.getItem('mr_mena_notebook');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  _saveNotebook() {
    try {
      localStorage.setItem('mr_mena_notebook', JSON.stringify(this.notebook));
      this._updateNotebookBadge();
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  _recordToNotebook(question) {
    const entry = {
      id: Date.now(),
      question: question,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
      status: 'قيد البحث والتحضير 🔍'
    };
    this.notebook.unshift(entry);
    this._saveNotebook();
  }

  _initNotebookUI() {
    // إضافة زرار الدفتر في الهيدر إذا لم يكن موجوداً
    const header = document.querySelector('.app-header');
    if (header && !document.getElementById('notebook-btn')) {
      const btn = document.createElement('button');
      btn.id = 'notebook-btn';
      btn.className = 'grade-btn';
      btn.style.cssText = 'background: rgba(245,200,66,0.15); border-color: var(--accent-gold); color: var(--accent-gold); display: flex; align-items: center; gap: 6px; font-weight: 600;';
      btn.innerHTML = `📓 دفتر مستر مينا <span id="notebook-badge" style="background:var(--accent-gold); color:#0a0e1a; padding:1px 6px; border-radius:10px; font-size:0.75rem;">${this.notebook.length}</span>`;
      btn.addEventListener('click', () => this.openNotebookModal());
      
      const gradeSelector = header.querySelector('.header-grade-selector');
      if (gradeSelector) {
        gradeSelector.parentNode.insertBefore(btn, gradeSelector.nextSibling);
      }
    }
  }

  _updateNotebookBadge() {
    const badge = document.getElementById('notebook-badge');
    if (badge) badge.textContent = this.notebook.length;
  }

  openNotebookModal() {
    let modal = document.getElementById('notebook-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'notebook-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200;
        display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-gold); width: 90%; max-width: 550px; max-height: 80vh; border-radius: var(--radius); padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-gold);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <h2 style="color: var(--accent-gold); font-size: 1.25rem; display: flex; align-items: center; gap: 8px;">
            📓 دفتر مستر مينا (أسئلة خارج المنهج)
          </h2>
          <button onclick="document.getElementById('notebook-modal').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
          الأسئلة التي يسألها الطلاب خارج منهج علوم 1ع يتم تسجيلها هنا تلقائياً ليقوم مستر مينا بالبحث عنها وتحضيرها للحصص القادمة! ✨
        </p>

        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; max-height: 45vh; padding-left: 4px;">
          ${this.notebook.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 30px 0;">
              الدفتر فارغ حالياً! أي سؤال خارج المنهج سيسجل هنا فوراً 📝
            </div>
          ` : this.notebook.map((item, idx) => `
            <div style="background: var(--bg-card2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 600;">سؤال #${this.notebook.length - idx}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${item.time}</span>
              </div>
              <div style="font-size: 0.92rem; color: var(--text-primary); font-weight: 500;">${item.question}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span style="font-size: 0.75rem; background: rgba(46,204,113,0.15); color: var(--accent-green); padding: 2px 8px; border-radius: 12px;">${item.status}</span>
                <button onclick="window.appController.removeNotebookItem(${item.id})" style="background:none; border:none; color:#e74c3c; font-size:0.75rem; cursor:pointer;">حذف 🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">إجمالي الأسئلة: ${this.notebook.length}</span>
          ${this.notebook.length > 0 ? `<button onclick="window.appController.clearNotebook()" style="background:none; border: 1px solid #e74c3c; color:#e74c3c; padding: 4px 12px; border-radius: 14px; font-size: 0.78rem; cursor:pointer;">مسح الدفتر 🗑️</button>` : ''}
        </div>
      </div>
    `;
  }

  removeNotebookItem(id) {
    this.notebook = this.notebook.filter(item => item.id !== id);
    this._saveNotebook();
    this.openNotebookModal();
  }

  clearNotebook() {
    this.notebook = [];
    this._saveNotebook();
    this.openNotebookModal();
  }

  // ══════════════════════════════════════════
  //   CURRICULUM & SESSIONS MODAL
  // ══════════════════════════════════════════
  openCurriculumModal() {
    const modalId = 'curriculum-modal';
    let modal = document.getElementById(modalId);

    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'notebook-modal';
      document.body.appendChild(modal);
    }

    modal.classList.add('active');
    modal.innerHTML = `
      <div class="notebook-modal-content" style="max-width: 780px; width: 92%;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div style="font-size: 1.25rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
            <span>📚</span>
            <span>خريطة منهج العلوم — أولى إعدادي (مستر مينا)</span>
          </div>
          <button onclick="document.getElementById('curriculum-modal').classList.remove('active')" style="background:none; border:none; color:var(--text-muted); font-size:1.4rem; cursor:pointer;">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
          المنهج مقسم لدروس، وكل درس مقسم على حصتين لسهولة الفهم، ما عدا الوحدة الأخيرة كل درس حصة واحدة مكثفة! اضغط على أي حصة لبدء الشروع والتجربة التفاعلية 🚀
        </p>

        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; max-height: 60vh; padding-left: 4px;">
          ${window.CURRICULUM_GRADE_1.units.map(unit => `
            <div style="background: var(--bg-card2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 18px;">
              <div style="font-weight: 700; font-size: 1.05rem; color: var(--accent-gold); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span>📂</span>
                <span>${unit.unitName}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${unit.lessons.map((lesson, lIdx) => `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: #f1f5f9; margin-bottom: 6px;">
                      ${lesson.title}
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${lesson.sessions.map(s => `
                        <button onclick="window.appController.openSessionFromModal('${lesson.lessonId}', ${s.sessionNum})" style="background: ${s.sessionNum === 1 ? 'rgba(56,189,248,0.15)' : 'rgba(46,204,113,0.15)'}; border: 1px solid ${s.sessionNum === 1 ? '#38bdf8' : '#2ecc71'}; color: ${s.sessionNum === 1 ? '#38bdf8' : '#2ecc71'}; padding: 5px 12px; border-radius: 14px; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: var(--transition);">
                          <span>${s.sessionNum === 1 ? '📘' : '📗'}</span>
                          <span>${s.title}</span>
                        </button>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  openSessionFromModal(lessonId, sessionNum) {
    document.getElementById('curriculum-modal')?.classList.remove('active');
    this.selectLessonSession(lessonId, sessionNum);
  }

  selectLessonSession(lessonId, sessionNum = 1) {
    const lesson = window.CURRICULUM_GRADE_1.units.flatMap(u => u.lessons).find(l => l.lessonId === lessonId);
    if (!lesson) return;

    this._currentLesson = lesson;
    this._currentSessionNum = sessionNum;

    const rulesList = lesson.sessions[sessionNum - 1]?.rules || lesson.rules || [];
    this._currentRules = rulesList;
    const whyQuestionsList = lesson.sessions[sessionNum - 1]?.whyQuestions || lesson.whyQuestions || [];
    this._currentWhyQuestions = whyQuestionsList;

    const topicData = {
      topic: lesson.lessonId,
      titleAr: `${lesson.title} ${lesson.sessionsCount > 1 ? `(الحصة ${sessionNum})` : '(حصة شاملة)'}`,
      content: {
        intro: lesson.sessions[sessionNum - 1]?.summary || lesson.summary,
        sections: [
          {
            title: 'القوانين والقواعد الأساسية للحصة',
            rules: rulesList
          },
          {
            title: 'أهم أسئلة علل وتفسيراتها',
            whyQuestions: whyQuestionsList
          }
        ],
        ytQuery: lesson.ytQuery
      }
    };

    this._topicData = topicData;

    // 📚 سجّل فتح الدرس في الداتا بيز
    this.recordStudentActivity('lesson', {
      lessonId:   lesson.lessonId,
      lessonTitle: lesson.title,
      sessionNum
    });

    this.showExplanation(lesson.lessonId);
  }

  // ══════════════════════════════════════════
  //   EXPLANATION SECTION & YOUTUBE
  // ══════════════════════════════════════════
  showExplanation(topicId) {
    if (!this._topicData || !this._topicData.content) return;

    // 🔒 Close unit drawers automatically when entering lesson
    this.closeStageDrawers();

    // 🙈 Hide bottom floating home chat bar during lesson
    const homeChatPill = document.getElementById('home-bottom-chat-pill');
    if (homeChatPill) homeChatPill.style.display = 'none';

    const targetTopic = topicId || this._topicData.topic || 'u1_l1_atom';
    if (!this._currentLesson && window.CURRICULUM_GRADE_1) {
      this._currentLesson = window.CURRICULUM_GRADE_1.units.flatMap(u => u.lessons).find(l => l.lessonId === targetTopic);
    }
    const section  = document.getElementById('explanation-section');
    const titleEl  = document.getElementById('explanation-title');
    const bodyEl   = document.getElementById('explanation-content');
    const ytEl     = document.getElementById('yt-videos-container');

    titleEl.textContent = `📚 ${this._topicData.titleAr}`;
    bodyEl.innerHTML    = this._renderContent(this._topicData.content, targetTopic);

    // 🏷️ شريط التبديل بين الحصص (الحصة 1 / الحصة 2) في الهيدر العلوي بجانب التابات
    const headerSessionsEl = document.getElementById('header-session-tabs');
    if (headerSessionsEl) {
      if (this._currentLesson && this._currentLesson.sessions && this._currentLesson.sessions.length > 1) {
        const currentSession = this._currentSessionNum || 1;
        headerSessionsEl.style.display = 'flex';
        headerSessionsEl.innerHTML = this._currentLesson.sessions.map(s => `
          <button class="header-session-btn ${s.sessionNum === currentSession ? 'active' : ''}" onclick="window.appController.selectLessonSession('${this._currentLesson.lessonId}', ${s.sessionNum})">
            <span>${s.sessionNum === 1 ? '📘' : '📗'}</span>
            <span>${s.title.split(':')[0]}</span>
          </button>
        `).join('');
      } else {
        headerSessionsEl.style.display = 'none';
        headerSessionsEl.innerHTML = '';
      }
    }

    section.classList.add('visible');

    // 🌟 إظهار زر اللايف شات العائم في صفحة الدرس
    const launcher = document.getElementById('live-chat-launcher');
    if (launcher) launcher.style.display = 'flex';

    // 🎨 تطبيق أبعاد ومواضع الأفاتار والبوب اب المخصصة من الاستوديو إن وجدت
    if (window.odooBuilder) {
      window.odooBuilder.applyLayerTransform('lessonAvatar');
      window.odooBuilder.applyLayerTransform('lessonBubble');
    }

    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => overlay.classList.remove('active'), 600);
    }

    // 🔬 تشغيل المعمل التفاعلي ثلاثي الأبعاد
    if (window.interactiveLab) {
      setTimeout(() => {
        const mount = document.getElementById('interactive-lab-mount');
        if (mount) {
          window.interactiveLab.init(mount, targetTopic);
        }
      }, 120);
    }

    this._loadYouTubeVideos(ytEl, this._topicData.content.ytQuery);

    // 💬 عند الدخول للدرس أو التبديل بين الحصص: نطق وكتابة الترحيب المخصص للحصة فقط (أول حصة / تاني حصة)
    const sessionNum = this._currentSessionNum || 1;
    const sessionWordMap = { 1: 'أول', 2: 'تاني', 3: 'تالت', 4: 'رابع' };
    const sessionWord = sessionWordMap[sessionNum] || 'أول';
    const welcomeSpeech = `أهلاً بيك يا بطل في ${sessionWord} حصة مع مستر مينا!`;

    setTimeout(() => {
      window.appAudioManager.stopAll();
      this.typewriterSpeech(welcomeSpeech);
      this._speakAudio(welcomeSpeech);
    }, 400);
  }

  _renderContent(data, topicId) {
    if (!data) return '';
    let html = '';

    // 🔬 حاوية المعمل التفاعلي ثلاثي الأبعاد مباشرة في قمة المحتوى
    html += `<div id="interactive-lab-mount" style="width: 100%; min-height: 540px; margin-bottom: 24px;"></div>`;

    if (data.intro) {
      html += `
        <div class="content-card">
          <div class="card-title">ملخص مستر مينا السريع</div>
          <div class="card-body"><p style="font-size: 1.05rem; line-height: 1.8;">${data.intro}</p></div>
        </div>
      `;
    }

    (data.sections || []).forEach((sec) => {
      html += `<div class="content-card"><div class="card-title">${sec.title}</div><div class="card-body">`;
      if (sec.rules && sec.rules.length) {
        html += `
          <div class="rule-questions-accordion">
            ${sec.rules.map((rule, idx) => {
              const parts = rule.split(':');
              const title = parts.length > 1 ? parts[0].trim() : `قاعدة ${idx + 1}`;
              const desc = parts.length > 1 ? parts.slice(1).join(':').trim() : rule.trim();
              const poses = ['checklist.png', 'point_up.png', 'idea.png', 'book.png', 'tablet.png', 'clipboard.png'];
              const poseImg = poses[idx % poses.length];
              return `
                <div class="rule-card" id="rule-card-${idx}">
                  <div class="rule-header" onclick="window.appController.toggleRule(${idx})">
                    <div class="rule-title-wrap">
                      <span class="rule-badge">🔹 قاعدة ${idx + 1}</span>
                      <span class="rule-q-text">${title}</span>
                    </div>
                    <div class="rule-action-hint">
                      <span class="rule-hint-text">اضغط للتفسير وقراءة القاعدة</span>
                      <span class="rule-arrow-icon">▼</span>
                    </div>
                  </div>
                  <div class="rule-answer-collapse" id="rule-ans-${idx}">
                    <div class="rule-answer-content">
                      <div class="rule-teacher-avatar-wrap">
                        <img src="assets/poses/${poseImg}" alt="مستر مينا يوضح القاعدة" class="rule-teacher-img" />
                      </div>
                      <div class="rule-speech-bubble">
                        <div class="rule-speaker-tag">
                          <span>💡 قاعدة مستر مينا الذهبية (${title}):</span>
                          <span class="rule-playing-indicator" id="rule-indicator-${idx}" style="display:none; color:#0284c7; font-size:0.82rem; font-weight:700;">
                            <span>🔊 يشرح القاعدة الآن...</span>
                          </span>
                        </div>
                        <div class="rule-answer-text">
                          <strong>${title}:</strong> ${desc}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (sec.whyQuestions && sec.whyQuestions.length) {
        html += `
          <div class="why-questions-accordion">
            ${sec.whyQuestions.map((wq, idx) => {
              const poses = ['chalkboard_point.png', 'blackboard_write.png'];
              const poseImg = poses[idx % poses.length];
              return `
                <div class="why-question-card" id="why-card-${idx}">
                  <div class="why-question-header" onclick="window.appController.toggleWhyQuestion(${idx})">
                    <div class="why-q-title-wrap">
                      <span class="why-badge">❓ سؤال علل</span>
                      <span class="why-q-text">${wq.q}</span>
                    </div>
                    <div class="why-action-hint">
                      <span class="why-hint-text">اضغط للتفسير والشرح الفوري</span>
                      <span class="why-arrow-icon">▼</span>
                    </div>
                  </div>
                  <div class="why-answer-collapse" id="why-ans-${idx}">
                    <div class="why-answer-content">
                      <div class="why-teacher-avatar-wrap">
                        <img src="assets/poses/${poseImg}" alt="مستر مينا يشرح على السبورة" class="why-teacher-img" />
                      </div>
                      <div class="why-speech-bubble">
                        <div class="why-speaker-tag">
                          <span>👨‍🏫 مستر مينا يشرح لك على السبورة:</span>
                          <span class="why-playing-indicator" id="why-indicator-${idx}" style="display:none; color:#16a34a; font-size:0.82rem; font-weight:700;">
                            <span>🔊 يتحدث الآن...</span>
                          </span>
                        </div>
                        <div class="why-answer-text">
                          ${wq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (sec.points?.length) {
        html += `<div class="key-points">`;
        sec.points.forEach(pt => {
          html += `<div class="key-point"><span class="kp-icon">${pt.icon}</span><span>${pt.text.replace(/\n/g, '<br>')}</span></div>`;
        });
        html += `</div>`;
      }
      html += `</div></div>`;
    });

    // 🏆 تحدي الأذكياء التفاعلي مع مستر مينا (Gamified Quiz)
    const quizzes = this._getQuizForTopic(topicId, this._currentSessionNum || 1);
    if (quizzes && quizzes.length) {
      html += `
        <div class="content-card" style="border: 2px solid #0284c7; box-shadow: 0 6px 24px rgba(2, 132, 199, 0.1);">
          <div class="card-title" style="color: #0369a1; font-weight: 900; font-size: 1.15rem; display: flex; justify-content: space-between; align-items: center;">
            <span>🏆 تحدي الأذكياء مع مستر مينا (الحصة ${this._currentSessionNum || 1})</span>
            <span id="quiz-score-badge" style="font-size: 0.85rem; background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; padding: 4px 14px; border-radius: 14px; font-weight: 700;">درجاتك: 0</span>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            ${quizzes.map((q, qIdx) => `
              <div class="quiz-box" style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;">
                <div style="font-weight: 800; font-size: 1rem; margin-bottom: 12px; color: #0f172a;">
                  ${qIdx + 1}. ${q.question}
                </div>
                <div class="quiz-options" style="display: flex; flex-direction: column; gap: 8px;">
                  ${q.options.map(opt => `
                    <button class="quiz-opt-btn" onclick="window.appController.checkQuizAnswer(this, ${opt.isCorrect}, '${opt.text}', '${q.explanation.replace(/'/g, "\\'")}')" style="background: #ffffff; border: 1.5px solid #cbd5e1; color: #1e293b; padding: 10px 16px; border-radius: 10px; text-align: right; cursor: pointer; font-family: inherit; font-size: 0.92rem; font-weight: 600; transition: all 0.2s;">
                      ${opt.text}
                    </button>
                  `).join('')}
                </div>
                <div class="quiz-feedback" style="display: none; margin-top: 10px; font-size: 0.88rem; font-weight: 700; padding: 10px 14px; border-radius: 8px;"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return html;
  }

  _getQuizForTopic(topicId, sessionNum = 1) {
    if (this._currentLesson && this._currentLesson.sessions) {
      const session = this._currentLesson.sessions[sessionNum - 1];
      if (session && session.quiz && session.quiz.length) {
        return session.quiz;
      }
    }

    if (window.CURRICULUM_GRADE_1) {
      const lesson = window.CURRICULUM_GRADE_1.units.flatMap(u => u.lessons).find(l => l.lessonId === topicId);
      const session = lesson?.sessions?.[sessionNum - 1];
      if (session?.quiz?.length) {
        return session.quiz;
      }
    }

    return [
      {
        question: 'هل الذرة في حالتها العادية متعادلة كهربياً؟',
        options: [
          { text: 'نعم، لتساوي البروتونات الموجبة مع الإلكترونات السالبة', isCorrect: true },
          { text: 'لا، لأن الإلكترونات أكثر دائماً', isCorrect: false }
        ],
        explanation: 'الذرة متعادلة كهربياً لتساوي عدد الشحنات الموجبة والسالبة!'
      }
    ];
  }

  checkQuizAnswer(btn, isCorrect, choiceText, explanation) {
    const parentBox = btn.closest('.quiz-box');
    const feedback = parentBox.querySelector('.quiz-feedback');
    const allBtns = parentBox.querySelectorAll('.quiz-opt-btn');

    allBtns.forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.7';
    });

    feedback.style.display = 'block';

    if (isCorrect) {
      btn.style.background = 'rgba(46, 204, 113, 0.25)';
      btn.style.borderColor = 'var(--accent-green)';
      btn.style.color = 'var(--accent-green)';
      btn.style.fontWeight = '700';
      feedback.className = 'quiz-feedback-card correct';
      feedback.style.display = 'flex';
      feedback.innerHTML = `
        <div class="quiz-feedback-avatar-wrap">
          <img src="assets/poses/quiz_correct.png" alt="مستر مينا يحتفل" class="quiz-feedback-img" />
        </div>
        <div class="quiz-feedback-bubble">
          <div class="quiz-feedback-title" style="color: #15803d;">
            <span>🎉 إجابة صحيحة وممتازة يا بطل! 🌟</span>
          </div>
          <div class="quiz-feedback-text">
            ${explanation}
          </div>
        </div>
      `;

      this._quizScore = (this._quizScore || 0) + 10;
      const scoreBadge = document.getElementById('quiz-score-badge');
      if (scoreBadge) scoreBadge.textContent = `درجاتك: ${this._quizScore} ⭐`;

      this.playLabAudio('quiz_correct_1', `الله ينور عليك يا بطل! إجابة صحيحة 100%! ${explanation}`);
    } else {
      btn.style.background = 'rgba(239, 68, 68, 0.25)';
      btn.style.borderColor = '#ef4444';
      btn.style.color = '#ef4444';
      feedback.className = 'quiz-feedback-card wrong';
      feedback.style.display = 'flex';
      feedback.innerHTML = `
        <div class="quiz-feedback-avatar-wrap">
          <img src="assets/poses/quiz_wrong.png" alt="مستر مينا ينبهك" class="quiz-feedback-img" />
        </div>
        <div class="quiz-feedback-bubble">
          <div class="quiz-feedback-title" style="color: #dc2626;">
            <span>⚠️ ركز يا بطل وخلي بالك من التريكة دي:</span>
          </div>
          <div class="quiz-feedback-text">
            ${explanation}
          </div>
        </div>
      `;

      this.playLabAudio('quiz_wrong_1', `ركز يا بطل! ${explanation}`);
    }

    // 🏆 سجّل إجابة الكويز في الداتا بيز
    this.recordStudentActivity('quiz', {
      lessonId: this._topicData?.topic || 'unknown',
      choice:   choiceText,
      correct:  isCorrect,
      score:    this._quizScore || 0
    });
  }

  // ═════════════════════════════════════════════════════════════
  // 🔹 INTERACTIVE RULES HANDLERS (تفاعل القوانين والقواعد مع مستر مينا)
  // ═════════════════════════════════════════════════════════════
  toggleRule(idx) {
    const card = document.getElementById(`rule-card-${idx}`);
    const ans = document.getElementById(`rule-ans-${idx}`);
    if (!card || !ans) return;

    const isAlreadyOpen = card.classList.contains('active');

    // Close any other open rule cards smoothly
    document.querySelectorAll('.rule-card.active').forEach(c => {
      c.classList.remove('active');
      const a = c.querySelector('.rule-answer-collapse');
      if (a) a.style.maxHeight = null;
      const ind = c.querySelector('.rule-playing-indicator');
      if (ind) ind.style.display = 'none';
    });

    if (!isAlreadyOpen) {
      card.classList.add('active');
      ans.style.maxHeight = '500px';

      const ind = document.getElementById(`rule-indicator-${idx}`);
      if (ind) ind.style.display = 'inline-flex';

      const rule = this._currentRules?.[idx];
      if (rule) {
        window.appAudioManager?.stopAll();
        // ينطق القاعدة فورياً بدون انتظار
        this._speakAudio(`القاعدة العلمية: ${rule}`);
      }
    } else {
      window.appAudioManager?.stopAll();
    }
  }

  // ═════════════════════════════════════════════════════════════
  // ❓ INTERACTIVE WHY QUESTIONS HANDLERS (تفاعل أسئلة علل مع مستر مينا)
  // ═════════════════════════════════════════════════════════════
  toggleWhyQuestion(idx) {
    const card = document.getElementById(`why-card-${idx}`);
    const ans = document.getElementById(`why-ans-${idx}`);
    if (!card || !ans) return;

    const isAlreadyOpen = card.classList.contains('active');

    // Close any other open why questions smoothly
    document.querySelectorAll('.why-question-card.active').forEach(c => {
      c.classList.remove('active');
      const a = c.querySelector('.why-answer-collapse');
      if (a) a.style.maxHeight = null;
      const ind = c.querySelector('.why-playing-indicator');
      if (ind) ind.style.display = 'none';
    });

    if (!isAlreadyOpen) {
      card.classList.add('active');
      ans.style.maxHeight = '500px';

      const ind = document.getElementById(`why-indicator-${idx}`);
      if (ind) ind.style.display = 'inline-flex';

      const wq = this._currentWhyQuestions?.[idx];
      if (wq) {
        window.appAudioManager?.stopAll();
        // ينطق الإجابة فورياً بدون انتظار
        this._speakAudio(`إجابة سؤال علل: ${wq.a}`);
      }
    } else {
      window.appAudioManager?.stopAll();
    }
  }

  speakWhyAnswer(idx, btn) {
    const wq = this._currentWhyQuestions?.[idx];
    if (!wq) return;
    window.appAudioManager?.stopAll();
    this._speakAudio(`إجابة مستر مينا: ${wq.a}`);
    if (btn) {
      const originalBg = btn.style.background;
      btn.style.background = '#16a34a';
      setTimeout(() => btn.style.background = originalBg, 3000);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 💬 LIVE TYPEWRITER SPEECH POP-UP (البوب اب التفاعلي لشرح مستر مينا)
  // ═════════════════════════════════════════════════════════════
  typewriterSpeech(text) {
    if (!text) return;
    const bubbleTextEl = document.getElementById('bubble-text-content');
    const statusTextEl = document.getElementById('bubble-status-text');
    const wavesEl = document.getElementById('live-audio-waves');
    const bubbleEl = document.getElementById('lesson-avatar-bubble');

    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }

    if (bubbleEl) {
      bubbleEl.classList.add('active-speaking');
    }
    if (statusTextEl) {
      statusTextEl.textContent = 'مستر مينا يشرح الآن...';
      statusTextEl.style.color = '#0284c7';
    }
    if (wavesEl) {
      wavesEl.style.display = 'inline-flex';
    }

    if (!bubbleTextEl) return;
    bubbleTextEl.textContent = '';

    const cleanText = text.replace(/[*#_~`]/g, '').trim();
    let charIndex = 0;
    const speed = Math.max(16, Math.min(42, Math.floor(4000 / (cleanText.length || 100))));

    this._typewriterTimer = setInterval(() => {
      if (charIndex < cleanText.length) {
        bubbleTextEl.textContent += cleanText[charIndex];
        charIndex++;
        bubbleTextEl.scrollTop = bubbleTextEl.scrollHeight;
      } else {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
        if (statusTextEl) {
          statusTextEl.textContent = 'جاهز للشرح';
          statusTextEl.style.color = '#16a34a';
        }
        if (wavesEl) {
          wavesEl.style.display = 'none';
        }
        if (bubbleEl) {
          bubbleEl.classList.remove('active-speaking');
        }
      }
    }, speed);
  }

  stopTypewriterSpeech() {
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    const statusTextEl = document.getElementById('bubble-status-text');
    const wavesEl = document.getElementById('live-audio-waves');
    const bubbleEl = document.getElementById('lesson-avatar-bubble');
    if (statusTextEl) {
      statusTextEl.textContent = 'جاهز للشرح';
      statusTextEl.style.color = '#16a34a';
    }
    if (wavesEl) {
      wavesEl.style.display = 'none';
    }
    if (bubbleEl) {
      bubbleEl.classList.remove('active-speaking');
    }
  }

  playLabAudio(audioId, fallbackText) {
    const labSpeechMap = {
      'lab_atom_C': 'ذرة الكربون عددها الذري 6 وكتلتها 12، وفيها 6 بروتونات و 6 نيوترونات، والمستوى الأول K فيه 2 والتاني L فيه 4 إلكترونات!',
      'lab_atom_H': 'ذرة الهيدروجين أبسط ذرة في الكون، فيها بروتون واحد وإلكترون واحد في المستوى K، ومافيهاش نيوترونات خالص!',
      'lab_atom_He': 'ذرة الهيليوم غاز خامل ومستقر جداً، فيها 2 بروتون و 2 نيوترون، ومستوى الطاقة الأول K ممتلئ تماماً بـ 2 إلكترون!',
      'lab_atom_O': 'ذرة الأكسجين عددها الذري 8، متوزعة 2 في المستوى الأول K و 6 في المستوى التاني L، ومحتاجة 2 إلكترون عشان تستقر!',
      'lab_atom_Na': 'ذرة الصوديوم فلز نشط جداً، عددها الذري 11، متوزعة 2 في K و 8 في L وإلكترون وحيد في M بتميل لفقده في التفاعلات!',
      'lab_density_wood': 'خشب كثافته 0.6 جم/سم³ أقل من كثافة الماء 1.0 عشان كده بيطفو على السطح!',
      'lab_density_oil': 'زيت البترول كثافته 0.8 جم/سم³ أقل من الماء فيطفو فوقه، وعشان كده لا تطفأ حرائق البترول بالماء!',
      'lab_density_cork': 'الفلين خفيف جداً وكثافته 0.2 جم/سم³ فيطفو بسهولة فوق سطح الماء!',
      'lab_density_iron': 'مسمار الحديد كتلته كبيرة بالنسبة لحجمه وكثافته 7.8 جم/سم³ أكبر من الماء عشان كده بيغوص في القاع!',
      'lab_eclipse_solar': 'في كسوف الشمس يقع القمر بين الشمس والأرض على استقامة واحدة ويحجب ضوء الشمس نهاراً!',
      'lab_eclipse_lunar': 'في خسوف القمر تقع الأرض بين الشمس والقمر وتحجب ضوء الشمس الساقط عليه ليلاً!',
      'lab_cell_plant': 'الخلية النباتية فيها جدار خلوي خارجي للحماية وبلاستيدات خضراء للبناء الضوئي وفجوة عصارية كبيرة!',
      'lab_cell_animal': 'الخلية الحيوانية محاطة بغشاء بلازمي فقط ومافيهاش جدار خلوي، وفيها فجوات عصارية صغيرة!'
    };

    const textToSpeak = fallbackText || labSpeechMap[audioId] || '';
    if (textToSpeak) {
      this.typewriterSpeech(textToSpeak);
    }

    const audioMp3 = `audio_cache/${audioId}.mp3`;
    const audioWav = `audio_cache/${audioId}.wav`;

    const testAudio = new Audio(audioMp3);
    testAudio.oncanplay = () => {
      window.appAudioManager.play(audioMp3);
    };
    testAudio.onerror = () => {
      const testWav = new Audio(audioWav);
      testWav.oncanplay = () => {
        window.appAudioManager.play(audioWav);
      };
      testWav.onerror = () => {
        if (textToSpeak) {
          this._speakAudio(textToSpeak);
        }
      };
    };
  }

  playCurrentLessonAudio() {
    window.appAudioManager.stopAll();
    const lesson = this._currentLesson || window.CURRICULUM_GRADE_1?.units.flatMap(u => u.lessons).find(l => l.lessonId === this._topicData?.topic);
    const sessionNum = this._currentSessionNum || 1;

    if (lesson) {
      const session = lesson.sessions?.[sessionNum - 1];
      const spokenText = session?.spokenEgyptian || lesson.spokenEgyptian || session?.summary || lesson.summary;
      if (spokenText) {
        this.typewriterSpeech(spokenText);
      }

      const prefix = (lesson.lessonId || 'u1_l1').split('_').slice(0, 2).join('_');
      const audioMp3 = `audio_cache/${prefix}_s${sessionNum}.mp3`;
      const audioWav = `audio_cache/${prefix}_s${sessionNum}.wav`;

      const testAudio = new Audio(audioMp3);
      testAudio.oncanplay = () => {
        window.appAudioManager.play(audioMp3);
      };
      testAudio.onerror = () => {
        const testWav = new Audio(audioWav);
        testWav.oncanplay = () => {
          window.appAudioManager.play(audioWav);
        };
        testWav.onerror = () => {
          if (spokenText) {
            this._speakAudio(spokenText);
          }
        };
      };
    }
  }

  playLabAudioForCurrentElement() {
    const topicId = this._topicData?.topic || 'u1_l1_atom';
    if (topicId.includes('atom') || topicId.includes('u1_l1')) {
      const el = window.interactiveLab?.atomData?.element || 'Carbon';
      const symbolMap = { 'Carbon': 'C', 'Hydrogen': 'H', 'Helium': 'He', 'Oxygen': 'O', 'Sodium': 'Na' };
      const sym = symbolMap[el] || 'C';
      this.playLabAudio(`lab_atom_${sym}`);
    } else if (topicId.includes('matter') || topicId.includes('u1_l3')) {
      this.playLabAudio('lab_density_wood');
    } else if (topicId.includes('eclipse') || topicId.includes('u4_l2')) {
      const mode = window.interactiveLab?.eclipseMode || 'solar';
      this.playLabAudio(`lab_eclipse_${mode}`);
    } else if (topicId.includes('cell') || topicId.includes('u3_l1')) {
      this.playLabAudio('lab_cell_plant');
    } else {
      this.playCurrentLessonAudio();
    }
  }

  // ══════════════════════════════════════════
  //   IN-LESSON LIVE CHAT WIDGET
  // ══════════════════════════════════════════
  async sendLessonChatMessage() {
    const inputEl = document.getElementById('lesson-chat-input');
    const msgContainer = document.getElementById('lesson-chat-messages');
    if (!inputEl || !msgContainer) return;

    const query = inputEl.value.trim();
    if (!query) return;

    // User bubble
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'background: linear-gradient(135deg, var(--accent-blue), #2171b5); color: #fff; border-radius: 8px; padding: 8px 10px; align-self: flex-start; max-width: 90%; word-break: break-word;';
    userMsg.innerHTML = `<strong>أنت:</strong> ${query}`;
    msgContainer.appendChild(userMsg);
    inputEl.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;

    // Bot Typing placeholder
    const botMsg = document.createElement('div');
    botMsg.style.cssText = 'background: var(--bg-card2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; color: var(--text-primary); align-self: flex-end; max-width: 95%; line-height: 1.5;';
    botMsg.innerHTML = `<em>👨‍🏫 مستر مينا بيفكر وبيجهز الرد...</em>`;
    msgContainer.appendChild(botMsg);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    // Resolve Answer
    try {
      const result = await this._askAI(query);
      botMsg.innerHTML = `<strong>👨‍🏫 مستر مينا:</strong><br>${result.answer.replace(/\n/g, '<br>')}`;
      msgContainer.scrollTop = msgContainer.scrollHeight;

      // Speak
      if (result.spokenText) {
        this._speakAudio(result.spokenText);
      }
    } catch (e) {
      botMsg.innerHTML = `<strong>👨‍🏫 مستر مينا:</strong><br>بص يا بطل، النقطة دي مهمة جداً وسجلتها في الدفتر عشان نراجعها سوا!`;
    }
  }

  toggleLessonChatMic() {
    const micBtn = document.getElementById('lesson-chat-mic');
    const inputEl = document.getElementById('lesson-chat-input');
    if (!micBtn || !inputEl) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المتصفح لا يدعم التسجيل الصوتي المباشر');
      return;
    }

    if (this._lessonRec && this._isLessonRecording) {
      this._lessonRec.stop();
      this._isLessonRecording = false;
      micBtn.style.color = 'var(--text-secondary)';
      return;
    }

    this._lessonRec = new SpeechRecognition();
    this._lessonRec.lang = 'ar-EG';
    this._lessonRec.continuous = false;
    this._lessonRec.interimResults = true;

    this._lessonRec.onstart = () => {
      this._isLessonRecording = true;
      micBtn.style.color = '#e74c3c';
    };

    this._lessonRec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      inputEl.value = transcript;
      if (e.results[e.results.length - 1].isFinal) {
        this._isLessonRecording = false;
        micBtn.style.color = 'var(--text-secondary)';
        this.sendLessonChatMessage();
      }
    };

    this._lessonRec.onend = () => {
      this._isLessonRecording = false;
      micBtn.style.color = 'var(--text-secondary)';
    };

    this._lessonRec.start();
  }

  toggleLiveChatModal(force) {
    const popup = document.getElementById('live-chat-popup');
    if (!popup) return;
    const isOpening = (force !== undefined) ? force : !popup.classList.contains('active');
    popup.classList.toggle('active', isOpening);
    if (isOpening) {
      setTimeout(() => document.getElementById('lesson-chat-input')?.focus(), 100);
    }
  }

  toggleLabVideoView() {
    const canvasWrap = document.getElementById('lab-canvas-wrap');
    const videoWrap = document.getElementById('lab-video-wrap');
    const tabBtn = document.getElementById('lab-video-tab-btn');
    if (!canvasWrap || !videoWrap) return;

    const isShowingVideo = videoWrap.style.display !== 'none';

    if (isShowingVideo) {
      videoWrap.style.display = 'none';
      canvasWrap.style.display = 'block';
      if (tabBtn) tabBtn.innerHTML = '<span>فيديو شرح الدرس 🎬</span>';
    } else {
      canvasWrap.style.display = 'none';
      videoWrap.style.display = 'flex';
      if (tabBtn) tabBtn.innerHTML = '<span>عرض المجسم 3D 🔬</span>';

      const ytContainer = document.getElementById('yt-videos-container');
      if (ytContainer) {
        this._loadYouTubeVideos(ytContainer, this._topicData?.content?.ytQuery);
      }
    }
  }

  hideExplanation() {
    window.appAudioManager.stopAll();
    if (window.interactiveLab) {
      window.interactiveLab.destroy();
    }
    this.closeStageDrawers();
    this.toggleLiveChat(false);
    document.getElementById('explanation-section')?.classList.remove('visible');

    // 🌟 إخفاء زر اللايف شات العائم في صفحة الهوم
    const launcher = document.getElementById('live-chat-launcher');
    if (launcher) launcher.style.display = 'none';

    // 🌟 Restore bottom floating home chat bar
    const homeChatPill = document.getElementById('home-bottom-chat-pill');
    if (homeChatPill) homeChatPill.style.display = 'flex';
  }

  async _loadYouTubeVideos(container, query) {
    if (!container) return;
    container.innerHTML = `
      <div class="yt-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#38bdf8;">
        <div class="yt-spinner"></div>
        <span>جاري جلب أفضل شروحات مستر مينا...</span>
      </div>
    `;

    const searchQuery = query || 'علوم أولى إعدادي مستر مينا جرجس';
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    setTimeout(() => {
      container.innerHTML = `
        <div class="yt-card" onclick="window.open('${searchUrl}', '_blank')" style="cursor:pointer; width:100%; max-width:580px; background:linear-gradient(135deg,#0f1e36,#0a1324); border:1.5px solid #0284c7; border-radius:18px; padding:24px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.4); transition:transform 0.2s;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🎬</div>
          <div style="font-weight:800; font-size:1.2rem; color:#f8fafc; margin-bottom:8px;">${searchQuery}</div>
          <div style="font-size:0.95rem; color:#38bdf8; margin-bottom:16px;">📺 قناة مستر مينا جرجس — علوم إعدادي</div>
          <button style="background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; padding:10px 24px; border-radius:24px; font-weight:800; font-size:0.95rem; cursor:pointer; font-family:inherit; box-shadow:0 4px 16px rgba(239,68,68,0.4);">شاهد الفيديو على يوتيوب الآن 👈</button>
        </div>
      `;
    }, 400);
  }

  // ══════════════════════════════════════════
  //   UI HELPERS
  // ══════════════════════════════════════════
  _initGradeButtons() {
    document.querySelectorAll('.grade-btn').forEach((btn) => {
      if (btn.id === 'notebook-btn') return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.grade-btn').forEach(b => {
          if (b.id !== 'notebook-btn') b.classList.remove('active');
        });
        btn.classList.add('active');
        this.currentGrade = btn.dataset.grade || '1ع';
      });
    });
  }

  _initBackButton() {
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.hideExplanation();
    });
  }

  _handleLoadingScreen() {
    setTimeout(() => {
      const screen = document.getElementById('loading-screen');
      if (screen) screen.classList.add('hidden');
    }, 400);
  }

  _generateStars() {
    const container = document.querySelector('.stars');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('span');
      star.style.cssText = `
        left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
        --dur: ${2 + Math.random() * 4}s; --delay: ${Math.random() * 4}s;
        --max-op: ${0.3 + Math.random() * 0.5};
        width: 2px; height: 2px;
      `;
      container.appendChild(star);
    }
  }
}

// ── Boot ────────────────────────────────────────
window.appController = null;
document.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
});

