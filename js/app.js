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
    const audioId = audioSrc.match(/audio_cache\/([^/?]+)\.mp3/)?.[1];
    if (audioId && window.MENA_AUDIO_IDS && !window.MENA_AUDIO_IDS.has(audioId)) {
      if (typeof onEndedCallback === 'function') onEndedCallback();
      return null;
    }

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
    this._lastTopicId = 'u1_l1_atom';
    this._simplificationLevel = 0;
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
    try { const entries = JSON.parse(localStorage.getItem('mena_student_db') || '[]'); return Array.isArray(entries) ? entries.filter(e => e && typeof e === 'object') : []; }
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
    if(!window[`CURRICULUM_GRADE_${gradeNum}`]){this._showToast('منهج هذا الصف غير متاح حالياً. يمكنك متابعة الصف الأول الإعدادي.', 'info');return;}
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

  _playMessageChime() {
    try {
      const chime = new Audio('audio_cache/chat_reply_chime.mp3?v=1');
      chime.volume = 0.65;
      const p = chime.play();
      if(p !== undefined) {
        p.catch(() => this._playWebAudioChime());
      }
    } catch(e) {
      this._playWebAudioChime();
    }
  }

  _playWebAudioChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.28, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.42);
    } catch(e) {}
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
      const [response] = await Promise.all([
        this._askAI(question),
        new Promise(resolve => setTimeout(resolve, 750))
      ]);
      this._setLiveChatLoading(false);
      this.currentTopic = response.topic;
      this._playMessageChime();

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
    let formattedText = this._escapeHTML(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let avatarHTML = isBot 
      ? `<div class="msg-avatar-icon"><img src="assets/mena_avatar_centered.png" alt="مستر مينا" /></div>`
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
  _escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
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

  /** تمرير شريط الاقتراحات السريعة (كاروسيل) يميناً ويساراً */
  scrollChipsCarousel(direction) {
    const bar = document.getElementById('live-chat-chips-bar');
    if (!bar) return;
    const amount = direction === 'left' ? -130 : 130;
    bar.scrollBy({ left: amount, behavior: 'smooth' });
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

    // 💬 إذا كانت شاشة الشرح مفتوحة، شغل الكتابة المتزامنة بدون أي صوت اصطناعي (اعتماد حصري 100% على ريكوردات مستر مينا الحقيقية)
    if (document.getElementById('explanation-section')?.classList.contains('visible')) {
      this.typewriterSpeech(cleanText);
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

        // ─────────────────────────────────────────────────────────────
        // 1) كلمات التحية والترحيب والتعريف بالنفس
        // ─────────────────────────────────────────────────────────────
        const greetings = ['ازيك', 'مرحبا', 'سلام', 'السلام عليكم', 'هاي', 'صباح الخير', 'مساء الخير', 'مين انت', 'من انت', 'اهلا', 'يا هلا', 'يا مستر', 'مستر مينا'];
        if (greetings.some(g => qNorm.includes(g)) && qNorm.length < 35) {
          resolve({
            answer: `أهلاً بك يا بطل! أنا **مستر مينا جرجس**، معلم العلوم ومساعدك الذكي. جاهز للإجابة على أي سؤال وشرح أي مفهوم في منهج علوم الصف الأول الإعدادي بالكامل.\n\nتقدر تسألني مثلاً: **«عرف المركب»** أو **«ما هي الكثافة»** أو **«اشرحلي الذرة»**، أو تختار من المقترحات السريعة:`,
            spokenText: `أهلاً بيك يا بطل في فصلي الذكي! أنا مستر مينا جرجس، جاهز أشرحلك أي درس في علوم أولى إعدادي بطريقة سهلة وممتعة.. تحب نبدأ بإيه النهاردة؟`,
            topic: 'general',
            topicAr: 'مستر مينا',
            hasExplanation: false,
            isOutOfCurriculum: false,
            actions: [
              { label: 'شرح مفهوم المركب والعنصر', action: `window.appController.quickAskChat('عرف المركب')` },
              { label: 'شرح تركيب الذرة ومستويات الطاقة', action: `window.appController.quickAskChat('اشرحلي الذرة')` },
              { label: 'شرح قانون الكثافة والطفو', action: `window.appController.quickAskChat('اشرحلي الكثافة')` },
              { label: 'شرح ظواهر الكسوف والخسوف', action: `window.appController.quickAskChat('الكسوف والخسوف')` }
            ]
          });
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // 2) طلب شرح عام أو استعراض الوحدات
        // ─────────────────────────────────────────────────────────────
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
                { label: 'الوحدة الأولى: المادة', action: `window.appController.toggleStageDropdown(1, 'right')` },
                { label: 'الوحدة الثانية: مجالات القوى', action: `window.appController.toggleStageDropdown(2, 'right')` },
                { label: 'الوحدة الثالثة: الكائنات الحية تركيبها وعملياتها', action: `window.appController.toggleStageDropdown(3, 'left')` },
                { label: 'الوحدة الرابعة: نظام (الأرض - الشمس - القمر)', action: `window.appController.toggleStageDropdown(4, 'left')` }
              ]
            });
            return;
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 3) قاموس التبسيط المتدرج غير المحدود (Multi-Tier Progressive Simplification)
        // مستويات متعددة حقيقية:
        // Tier 1: التشبيه من الحياة اليومية (Everyday Life Analogy)
        // Tier 2: الكبسولة الذهبية في 3 نقط (Golden Capsule)
        // Tier 3: أسلوب السؤال والجواب مع مثال عملي وتحدي ذكاء (Interactive Challenge & Q&A)
        // Tier 4: خريطة الفهم الذهنية وتفكيك الصعوبة خطوة بخطوة (Step-by-step Mind Map)
        // Tier 5+: المساعد الشخصي المباشر لمستر مينا وتحديد النقطة المحددة (Personal Tutor Mode)
        // ─────────────────────────────────────────────────────────────
        const SIMPLIFIED_EXPLANATIONS = {
          'u1_l1_atom': {
            title: 'تركيب الذرة',
            tier1: {
              answer: `ولا يهمك يا بطل! تعال نبسطها بتشبيه بسيط جداً من حياتنا:\n\nتخيل الذرة دي عاملة زي **المجموعة الشمسية** بالظبط:\n• **الشمس في المركز وثابتة:** دي **النواة** اللي فيها الشحنة الموجبة (البروتونات) والتعادل (النيوترونات).\n• **الكواكب اللي بتلف حواليها بسرعة البرق:** دي **الإلكترونات** خفيفة جداً وشحنتها سالبة.\n\nوليه الذرة متعادلة؟ زي لما يكون عندك كفتين ميزان متساويين تماماً: عدد الموجب جوة النواة = عدد السالب اللي بيلف برة!`,
              spokenText: `ولا يهمك يا دكتور! تخيل الذرة عاملة زي المجموعة الشمسية، النواة في المركز زي الشمس، والإلكترونات بتلف حواليها زي الكواكب خفيفة وسريعة، وعدد الموجب جوة قد السالب برة عشان كده متعادلة.`
            },
            tier2: {
              answer: `خدها بقى في **كبسولة سحرية في 3 نقط ذهبية** عشان تثبت في دماغك:\n\n1. **النواة:** بيت تقيل وموجب (+) قاعد في النص وواخد كل وزن الذرة (بروتونات + نيوترونات).\n2. **الإلكترونات:** عيال شقية وخفيفة بتجري وتلف حوالين البيت وسالبة (-).\n3. **القانون الذهبي:** عدد الموجب جوة = عدد السالب برة.. عشان كده الذرة متعادلة ومبسوطة!`,
              spokenText: `الكبسولة السحرية: النواة بيت تقيل وموجب في النص، والإلكترونات عيال شقية وسالبة بتلف حواليه، والموجب قد السالب يعني متعادلة!`
            },
            tier3: {
              answer: `تعال ناخدها بطريقة **السؤال والجواب السريع وتحدي الذكاء**:\n\n❓ **سؤال 1: لو الصوديوم عنده 11 بروتون جوة النواة، تفتكر عنده كام إلكترون بيلف برة؟**\n👉 **الجواب:** 11 إلكترون سالب بالظبط! لأن الذرة كفتين ميزان متساويتين.\n\n❓ **سؤال 2: نوزع الـ 11 إلكترون إزاي في مستويات الطاقة؟**\n👉 المستوى الأول K يشيل 2.. يتبقى 9!\n👉 المستوى التاني L يشيل 8.. يتبقى 1!\n👉 المستوى التالت M ياخد الـ 1 الأخير! (التوزيع: 2 - 8 - 1).\n\n🧠 **تحدي تفكير سريع:** الذرة اللي آخر مستوى فيها فيه 1 إلكترون بتميل تفقده وتبقى أيون موجب ولا تكتسب؟ فكر فيها يا بطل!`,
              spokenText: `تعال نجربها بسؤال وجواب: الصوديوم عنده 11 بروتون يعني 11 إلكترون.. المستوى الأول K ياخد 2، التاني L ياخد 8، والتالت M ياخد 1.. شفت الحكاية سهلة إزاي؟`
            },
            tier4: {
              answer: `خريطة تفكيك عقدة الذرة في **مفتاح الامتحان**:\n\n🔑 **المفتاح الأول (العدد الذري):** هو رقم بطاقة العنصر = عدد البروتونات = عدد الإلكترونات.\n🔑 **المفتاح الثاني (العدد الكتلي):** وزن الذرة كله = بروتونات + نيوترونات.\n🔑 **المفتاح الثالث (قاعدة 2n²):** المستويات الأربعة الأولى بتتشبع بـ (2 ثم 8 ثم 18 ثم 32) ومفيش مستوى خارجي يشيل أكتر من 8 إلكترونات أبداً!`,
              spokenText: `المفتاح السحري للامتحان: العدد الذري عدد البروتونات، والعدد الكتلي بروتونات زائد نيوترونات، والمستويات بتشيل 2 ثم 8 ثم 18 ثم 32!`
            }
          },
          'u1_l2_periodic': {
            title: 'الجدول الدوري لتصنيف العناصر',
            tier1: {
              answer: `ولا يهمك يا بطل! تخيل الجدول الدوري ده زي **دولاب منظم في السوبر ماركت**:\nبدل ما نرمي كل البضاعة مفركشة، رتبنا العناصر حسب أرقامها الذرية وخواصها:\n• **الصفوف الأفقية (الدورات):** زي أرفف الدولاب.. كل رف بيمثل عدد مستويات الطاقة المشغولة بالإلكترونات.\n• **الأعمدة الرأسية (المجموعات):** زي الأصناف المتشابهة.. العناصر اللي في نفس العمود بتتصرف زي بعض كيميائياً عشان عندها نفس عدد الإلكترونات في آخر مستوى!`,
              spokenText: `تخيل الجدول الدوري زي دولاب منظم في السوبر ماركت، الصفوف الأفقية بتمثل مستويات الطاقة، والأعمدة الرأسية عناصر متشابهة في الخواص والتصرف الكيميائي.`
            },
            tier2: {
              answer: `الكبسولة السحرية للجدول الدوري في 3 نقط:\n\n1. هو **خريطة سحرية** رتبت كل عناصر الكون (118 عنصراً) عشان نلاقي أي عنصر في ثانية.\n2. كل صف أفقي = دورة (7 دورات)، وكل عمود رأسي = عيلة شبه بعض (18 مجموعة).\n3. رتبها موزلي وبور تصاعدياً حسب **العدد الذري** وليس الوزن الذري!`,
              spokenText: `الكبسولة السريعة: الجدول الدوري خريطة لكل عناصر الكون، 7 دورات أفقية و18 مجموعة رأسية، ومترتب تصاعدياً بالعدد الذري!`
            },
            tier3: {
              answer: `سؤال وجواب يخليك عبقري في تحديد مكان أي عنصر في الجدول:\n\n❓ **سؤال: لو قالك عنصر عدده الذري 12 (الماغنسيوم Mg)، مكانه فين؟**\n👉 **خطوة 1: وزع الإلكترونات:** K=2, L=8, M=2.\n👉 **خطوة 2: عد المستويات:** 3 مستويات (K, L, M) ➔ يبقى في **الدورة الثالثة**!\n👉 **خطوة 3: بص على آخر مستوى:** فيه 2 إلكترون ➔ يبقى في **المجموعة 2A**!\n\nشفت اللعبة سهلة وممتعة إزاي؟ أي عنصر توزعه تعرف بيته وعنوانه في الجدول في ثانية!`,
              spokenText: `عايز تعرف عنوان أي عنصر في الجدول؟ وزع إلكتروناته! عدد المستويات هو رقم الدورة، وعدد إلكترونات آخر مستوى هو رقم المجموعة!`
            },
            tier4: {
              answer: `خريطة فئات الجدول الدوري الأربع في الامتحان:\n\n• **الفئة s (شمال الجدول):** مجموعتين (1A فلزات أقلاء، 2A أقلاء أرضية).\n• **الفئة p (يمين الجدول):** 6 مجموعات وفيها اللافلزات والغازات الخاملة (المجموعة الصفرية 18).\n• **الفئة d (وسط الجدول):** العناصر الانتقالية (تبدأ من الدورة الرابعة).\n• **الفئة f (أسفل الجدول):** اللانثانيدات والأكتينيدات عشان الجدول مايبقاش عريض أوي!`,
              spokenText: `فئات الجدول الأربعة: s على الشمال، p على اليمين، d في النص، و f تحت الجدول خالص!`
            }
          },
          'u1_l3_matter': {
            title: 'المادة وخصائصها',
            tier1: {
              answer: `تعال نبسط الكثافة بتشبيه **الزحمة جوة الأوتوبيس**:\n• لو الأوتوبيس فيه 100 راكب مزنوقين في مساحة صغيرة = كثافته عالية جداً (زي الحديد فيغطس ويغوص في المية).\n• لو نفس الأوتوبيس فيه راكبين اتنين بس = كثافته خفيفة (زي الخشب والزيت فيعوم ويطفو فوق المية).\n\nالقانون بالبلدي: **الكثافة = الكتلة ÷ الحجم**.. أي حاجة كثافتها أقل من 1 (كثافة المية) تعوم وتطفو، وأكبر من 1 تغطس وتغوص!`,
              spokenText: `الكثافة عاملة زي الزحمة جوة الأوتوبيس، المليان بيغطس ويغوص زي الحديد، والخفيف بيعوم ويطفو زي الخشب والزيت، والقانون الكتلة على الحجم.`
            },
            tier2: {
              answer: `الكبسولة السحرية للمادة والكثافة:\n\n1. **الكثافة = الكتلة ÷ الحجم** (وحدتها جم/سم³).\n2. **الخفيف يطفو:** الزيت، الخشب، الفلين، وبالونات الهيليوم.\n3. **الثقيل يغوص:** مسمار الحديد، العملة المعدنية، النحاس.\n4. **المركب والعنصر:** العنصر مادة نقية نوع واحد من الذرات (زي النحاس)، والمركب اتحاد عناصر مختلفة بنسب ثابتة (زي ملح الطعام والماء).`,
              spokenText: `الكبسولة السريعة: الكثافة تساوي الكتلة على الحجم، الخفيف يطفو والثقيل بيغوص، والعنصر ذرات متشابهة والمركب ذرات مختلفة متحدة!`
            },
            tier3: {
              answer: `مسألة وسؤال امتحانات شهير بالأرقام:\n\n❓ **مسألة: قطعة حديد كتلتها 78 جرام وحجمها 10 سم³، احسب كثافتها وهل تطفو أم تغوص في الماء؟**\n👉 **الحل:** الكثافة = الكتلة ÷ الحجم = 78 ÷ 10 = **7.8 جم/سم³**.\n👉 بما أن كثافتها (7.8) أكبر من كثافة الماء (1 جم/سم³)، إذن **تغوص في الماء**!\n\n💡 **سؤال علل شهير:** ليه منطفئش حرائق البترول بالمية؟\n👉 لأن كثافة البترول أقل من كثافة الماء فيطفو البترول فوق الماء ويظل مشتعلاً!`,
              spokenText: `مسألة الكثافة المباشرة: نقسم الكتلة على الحجم.. لو الناتج أكبر من واحد يغوص، ولو أقل من واحد يطفو فوق المية!`
            },
            tier4: {
              answer: `خريطة المادة: مقارنة سريعة بين العنصر والمركب والمخلوط:\n\n• **العنصر:** أبسط صورة نقية للمادة لا يمكن تحليلها (ذراته من نفس النوع زي Fe حديد، O₂ أكسجين).\n• **المركب:** اتحاد كيميائي لعنصرين أو أكثر بنسب ثابتة وله خواص جديدة تماماً (زي H₂O ماء، NaCl ملح).\n• **المركبات العضوية:** أساسها الكربون والهيدروجين (زي الميثان والبلاستيك).\n• **المركبات غير العضوية:** زي الأحماض والأملاح والماء.`,
              spokenText: `العنصر نوع واحد من الذرات مبيتحللش، والمركب اتحاد عناصر مختلفة بنسب ثابتة وخواص جديدة!`
            }
          },
          'u1_l4_bonds': {
            title: 'الروابط الكيميائية',
            tier1: {
              answer: `تخيل الروابط دي عاملة زي **علاقة الصحاب ببعض**:\n• **الرابطة الأيونية (واحد كريم وواحد محتاج):** الفلز كريم يتنازل عن إلكترون ويديه للّافلز، فيتحول لموجب والتاني لسالب وينجذبوا لبعض زي المغناطيس (زي ملح الطعام NaCl).\n• **الرابطة التساهمية (اتنين صحاب بيشاركوا):** كل واحد فيهم يشارك بسندوتشاته عشان هما الاتنين يشبعوا ويكملوا مستواهم الأخير (زي جزيء المية H₂O وجزيء الأكسجين O₂).`,
              spokenText: `تخيل الروابط زي الصحاب، الأيونية واحد كريم يتنازل عن إلكترون وواحد يكتسب وينجذبوا، والتساهمية اتنين صحاب بيشاركوا إلكترونات بالتساوي عشان يستقروا.`
            },
            tier2: {
              answer: `الكبسولة السحرية للروابط الكيميائية:\n\n1. **أيونية:** فقد واكتساب ➔ تجاذب كهربي قوي بين أيون موجب لفلز وأيون سالب للافلز (تنتج مركبات فقط مثل NaCl).\n2. **تساهمية:** مشاركة وتقاسم للإلكترونات بين لافلزات (تنتج جزيئات عناصر مثل O₂ أو جزيئات مركبات مثل H₂O).\n3. **الهدف الأساسي:** كل ذرة تكمل 8 إلكترونات في آخر مستوى وتستقر!`,
              spokenText: `الكبسولة السريعة: أيونية يعني فقد واكتساب وتجاذب شحنات، وتساهمية يعني مشاركة، والهدف قفل المستوى الأخير بتمانية إلكترونات!`
            },
            tier3: {
              answer: `سؤال وجواب: إزاي تفرق بين الرابطة الأيونية والتساهمية في الامتحان؟\n\n❓ **سؤال: لو شفت جزيء وعايز تعرف نوع الرابطة فيه؟**\n👉 **قاعدة 1:** لو لقيت فلز (صوديوم Na، ماغنسيوم Mg، كالسيوم Ca) مع لافلز (كلور Cl، أكسجين O) ➔ فوراً **رابطة أيونية**!\n👉 **قاعدة 2:** لو لقيت ذرتين شبه بعض (O=O أو H-H أو N≡N) ➔ فوراً **رابطة تساهمية (عنصر)**!\n👉 **قاعدة 3:** لو لافلزات مختلفة (H مع O في المية، أو H مع Cl) ➔ **رابطة تساهمية (مركب)**!`,
              spokenText: `قاعدة الامتحان السحرية: فلز مع لافلز رابطة أيونية، ذرتين لافلز شبه بعض أو لافلزات مع بعض رابطة تساهمية!`
            },
            tier4: {
              answer: `أنواع الروابط التساهمية الثلاثة ومثال كل واحدة:\n\n1. **تساهمية أحادية (-):** كل ذرة تشارك بإلكترون واحد (زي جزيء الهيدروجين H-H، وجزيء الماء H-O-H، وكلوريد الهيدروجين H-Cl).\n2. **تساهمية ثنائية (=):** كل ذرة تشارك بإلكترونين (زي جزيء الأكسجين O=O).\n3. **تساهمية ثلاثية (≡):** كل ذرة تشارك بـ 3 إلكترونات (زي جزيء النيتروجين N≡N).`,
              spokenText: `التساهمية 3 أنواع: أحادية بشرطة واحدة زي الهيدروجين، ثنائية بشرطتين زي الأكسجين، ثلاثية بتلات شرط زي النيتروجين!`
            }
          },
          'u2_l1_electric': {
            title: 'القوى الكهربية',
            tier1: {
              answer: `تعال نبسط القوى الكهربية بتشبيه **الدلك والمغناطيس الخفي**:\n• لما تدلك مسطرة بشعرك أو صوف، بتجمع عليها شحنات سالبة إضافية بتجذب الورق الخفيف.\n• الشحنات زي الناس: **المتشابهين يتخانقوا ويتنافروا (+ مع + أو - مع -)**، و**المختلفين ينجذبوا لبعض (+ مع -)**!\n• والتيار الكهربي زي نهر جاري من الإلكترونات بيمشي في سلك النحاس وينور اللمبة في دائرة مقفولة.`,
              spokenText: `القوى الكهربية زي شحنات الدلك، المتشابه يتنافر والمختلف يتجاذب، والتيار نهر إلكترونات بيجري في سلك النحاس وينور اللمبة.`
            },
            tier2: {
              answer: `الكبسولة السحرية للقوى الكهربية:\n\n1. **القاعدة الذهبية:** الشحنات المتشابهة تتنافر والمختلفة تتجاذب.\n2. **التيار الكهربي:** سيل إلكترونات سالبة تتدفق في دائرة مغلقة.\n3. **الموصلات والعوازل:** النحاس والألمونيوم موصلات جيدة، والبلاستيك والمطاط عوازل تحمينا من الصعق الكهربي!`,
              spokenText: `الكبسولة السريعة: المتشابه يتنافر والمختلف يتجاذب، والتيار سيل إلكترونات، والنحاس موصل والبلاستيك عازل!`
            },
            tier3: {
              answer: `سؤال وجواب: طرق الشحن الكهربي التلاتة في الامتحان:\n\n❓ **سؤال: إزاي نخلي جسم مشحون بالكهرباء الاستاتيكية؟**\n👉 **1. الشحن بالدلك:** حك مادتين ببعض (زي الصوف والمسطرة البلاستيك).\n👉 **2. الشحن باللمس:** تلامس جسم مشحون مع جسم متعادل فيكتسب نفس شحنته.\n👉 **3. الشحن بالتأثير (الحث):** تقريب جسم مشحون دون لمس، فيجذب الشحنة المخالفة للطرف القريب!\n\n💡 **تطبيق:** الكشاف الكهربي بيستخدم لمعرفة نوع وشحنة الأجسام!`,
              spokenText: `طرق الشحن التلاتة: الدلك بالاحتكاك، اللمس بالتلامس، والتأثير بالتقريب بدون لمس!`
            },
            tier4: {
              answer: `خريطة الدائرة الكهربية البسيطة وشروط مرور التيار:\n\n• **البطارية (العمود الجاف):** مصدر ضخ ودفع الإلكترونات (الشحنات الكهربية).\n• **الأسلاك النحاسية:** الممر السالك لتدفق الإلكترونات.\n• **المفتاح الكهربي:** التحكم في فتح وقفل الدائرة (التيار يمر فقط والدائرة مغلقة).\n• **المصباح:** يحول الطاقة الكهربية إلى طاقة ضوئية وحرارية.`,
              spokenText: `الدائرة الكهربية البسيطة: بطارية تضخ الشحنات، وسلك يوصل، ومفتاح يتحكم، ولمبة تنور لما الدائرة تتقفل!`
            }
          },
          'u2_l2_magnetic': {
            title: 'القوى المغناطيسية',
            tier1: {
              answer: `تخيل القوى المغناطيسية دي زي **قوة الأبطال الخارقين في الأفلام**:\n• المغناطيس عنده قطب شمالي (N) وجنوبي (S)، وحواليه هالة غير مرئية اسمها **المجال المغناطيسي**.\n• المعجزة الكبرى: **الكهرباء بتصنع مغناطيس!** لما تلف سلك كهربي حول مسمار حديد يتحول لمغناطيس كهربي يشيل أطنان حديد في المصانع، والموتور يحول الكهربا لدوران وحركة!`,
              spokenText: `القوى المغناطيسية هالة غير مرئية حول المغناطيس، الشمالي مع الجنوبي يتجاذبوا والمتشابهين يتنافروا، وسريان الكهربا في سلك بيصنع مغناطيس كهربي قوي.`
            },
            tier2: {
              answer: `الكبسولة السحرية للقوى المغناطيسية:\n\n1. **الأقطاب المغناطيسية:** المتشابهة تتنافر والمختلفة تتجاذب (الشمالي ينجذب للجنوبي).\n2. **المغناطيس الكهربي:** تيار كهربي يمر في ملف ➔ يصنع مغناطيساً مؤقتاً في ثانية.\n3. **الموتور:** كهرباء ➔ حركة.. **الدينامو:** حركة ➔ كهرباء!`,
              spokenText: `الكبسولة السريعة: الأقطاب المتشابهة تتنافر والمختلفة تتجاذب، والموتور يحول الكهربا لحركة، والدينامو يحول الحركة لكهربا!`
            },
            tier3: {
              answer: `سؤال وجواب: إزاي تقوي المغناطيس الكهربي في المصانع؟\n\n❓ **سؤال: لو عندنا مغناطيس كهربي وعاوزين نخليه يشيل أوزان أتقل بكتير؟**\n👉 **طريقة 1:** زود عدد لفات السلك النحاسي حول قالب الحديد المطاوع.\n👉 **طريقة 2:** زود شدة التيار الكهربي (استخدم بطاريات أقوى).\n👉 **طريقة 3:** استخدم قلب من الحديد المطاوع لأنه يتمغنط ويفقد مغناطيسيته بسرعة وسهولة!`,
              spokenText: `عايز تقوي المغناطيس الكهربي؟ زود عدد لفات السلك وزود شدة التيار الكهربي واستخدم حديد مطاوع!`
            },
            tier4: {
              answer: `المقارنة الذهبية بين الموتور (المحرك) والدينامو (المولد):\n\n• **المحرك الكهربي (الموتور):** تديله كهربا ➔ يديك حركة ودوران (زي المروحة والغسالة وخلاط البيت).\n• **المولد الكهربي (الدينامو):** تديله حركة ودوران ➔ يولد كهرباء وينور (زي دينامو العجلة ومحطات توليد الكهرباء بالسد العالي).`,
              spokenText: `الموتور يحول الكهربا لحركة، والدينامو يحول الحركة لكهربا!`
            }
          },
          'u2_l3_gravity': {
            title: 'قوى الجاذبية',
            tier1: {
              answer: `تعال نفهم الجاذبية بتشبيه **مغناطيس كوكب الأرض العملاق**:\n• الأرض عندها جاذبية بتشد كل حاجة لمركزها لأسفل ومخلية المية والغلاف الجوي ثابتين ومبنطيرش في الفضاء.\n• ولغز الكتلة والوزن: **كتلتك** هي لحمك وعضمك وثابتة في أي كوكب.. لكن **وزنك** هو قوة شد الأرض ليك (الوزن = الكتلة × 9.8).. على القمر وزنك بيبقى سدس وزنك عشان القمر أصغر وجاذبيته أضعف!`,
              spokenText: `الجاذبية مغناطيس الأرض اللي شاددنا لتحت، وكتلتك ثابتة في أي مكان، لكن وزنك قوة جذب الأرض ويساوي الكتلة في عجلة الجاذبية، وعلى القمر سدس وزنك.`
            },
            tier2: {
              answer: `الكبسولة السحرية للجاذبية في 3 نقط:\n\n1. **الكتلة:** مقدار ما يحتويه الجسم من مادة، وثابتة لا تتغير أبداً في أي مكان في الكون (وحدتها كجم).\n2. **الوزن:** قوة جذب الأرض للجسم، ويتغير بتغير المكان والجاذبية.. والقانون: **الوزن = الكتلة × عجلة الجاذبية** (وحدته نيوتن).\n3. **وزن القمر = ⅙ وزن الأرض**، ومركز الثقل هو نقطة تأثير جذب الأرض للجسم.`,
              spokenText: `الكبسولة السريعة: الكتلة ثابتة والوزن يتغير ويساوي الكتلة في العجلة، ووزنك على القمر سدس وزنك على الأرض!`
            },
            tier3: {
              answer: `مسألة امتحانات مضمونة في جيبك على الوزن والكتلة:\n\n❓ **مسألة: جسم كتلته على الأرض 60 كجم، احسب:**\n1. كتلته على سطح القمر؟\n👉 **الجواب:** 60 كجم بالظبط! لأن الكتلة مقدار ثابت لا يتغير بتغير المكان!\n\n2. وزنه على سطح الأرض (باعتبار عجلة الجاذبية 10 م/ث²)؟\n👉 **الجواب:** الوزن = الكتلة × عجلة الجاذبية = 60 × 10 = **600 نيوتن**.\n\n3. وزنه على سطح القمر؟\n👉 **الجواب:** وزن القمر = ⅙ وزن الأرض = 600 ÷ 6 = **100 نيوتن**!`,
              spokenText: `مسألة الامتحان الشهيرة: الكتلة ثابتة لا تتغير، والوزن على الأرض نضرب الكتلة في العجلة، والوزن على القمر نقسم على 6!`
            },
            tier4: {
              answer: `مفاهيم الجاذبية الأساسية في الامتحان:\n\n• **عجلة الجاذبية الأرضية (g):** تتغير تغيراً طفيفاً من مكان لآخر على سطح الأرض بسبب تفلطح الأرض عند القطبين وانبعاجها عند خط الاستواء (عند القطبين أكبر من خط الاستواء).\n• **مركز الثقل:** نقطة تأثير وزن الجسم (قوة جذب الأرض له)، ويكون في المركز الهندسي للأجسام المنتظمة.\n• **الميزان الزنبركي:** الأداة المستخدمة لقياس الوزن بالنيوتن (يعتمد على استطالة السلك الزنبركي).`,
              spokenText: `عجلة الجاذبية عند القطبين أكبر من خط الاستواء، والوزن يقاس بالميزان الزنبركي، ونقطة التأثير هي مركز الثقل!`
            }
          },
          'u3_l1_cells': {
            title: 'الخلايا والحياة',
            tier1: {
              answer: `تخيل الخلية دي زي **شقة صغيرة كاملة الخدمات**:\n• **الجدار والغشاء:** سور العمارة وباب الشقة اللي بيحميها وينظم مين يدخل ومين يخرج.\n• **النواة:** صاحب البيت ومدير العمليات والمسؤول عن انقسام الخلية والمادة الوراثية.\n• **الميتوكوندريا:** محول ومحطة الكهربا اللي بتولد الطاقة للخلية (ATP).\n• **البلاستيدات الخضراء (في النبات بس):** المطبخ اللي بيطبخ الأكل بنور الشمس (البناء الضوئي).`,
              spokenText: `الخلية زي شقة صغيرة، النواة هي المدير، والغشاء هو الباب، والميتوكوندريا هي محطة الطاقة، والبلاستيدات الخضراء هي مطبخ النبات اللي بيعمل الأكل بالشمس.`
            },
            tier2: {
              answer: `الكبسولة السحرية للخلية:\n\n1. هي **أصغر وحدة بناء ووظيفة** في جسم الكائن الحي.\n2. **الخلية النباتية:** تتميز بجدار خلوي من السليلوز، وبلاستيدات خضراء لصنع الغذاء بالبناء الضوئي، وفجوة عصارية كبيرة.\n3. **الخلية الحيوانية:** محاطة بغشاء بلازمي مرن، وتحتوي على سنتروسوم (جسم مركزي) لانقسام الخلية، وبدون جدار خلوي أو بلاستيدات.`,
              spokenText: `الكبسولة السريعة: الخلية أصغر طوبة في الكائن الحي، النباتية عندها جدار وبلاستيدات لصنع الغذاء، والحيوانية عندها غشاء مرن ونواة وسيتوبلازم.`
            },
            tier3: {
              answer: `سؤال وجواب: جدول المقارنة الامتحاني بين الخلية النباتية والحيوانية:\n\n❓ **سؤال: إيه اللي موجود في النباتية ومش موجود في الحيوانية؟**\n👉 **1. الجدار الخلوي:** يحيط بالنباتية ليعطيها شكلاً ثابتاً ومحدداً ويحميها.\n👉 **2. البلاستيدات الخضراء:** مصانع الغذاء التي تمتص ضوء الشمس بواسطة صبغ الكلوروفيل.\n\n❓ **سؤال: إيه اللي موجود في الحيوانية ومش موجود في النباتية؟**\n👉 **السنتروسوم (الجسم المركزي):** مسؤول عن تكوين خيوط المغزل أثناء انقسام الخلية (في النباتية ينقسم السيتوبلازم بدلاً منه).`,
              spokenText: `النباتية عندها جدار خلوي وبلاستيدات خضراء، والحيوانية عندها جسم مركزي سنتروسوم لانقسام الخلية!`
            },
            tier4: {
              answer: `وظائف عضيات الخلية في كلمات سريعة:\n\n• **النواة:** تنظم العمليات الحيوية وتحتوي على المادة الوراثية وتتحكم في انقسام الخلية.\n• **الميتوكوندريا:** مراكز إنتاج الطاقة (التنفس الخلوي وتوليد جزيئات ATP).\n• **الغشاء البلازمي:** نفاذية اختيارية (ينظم دخول وخروج الماء والأملاح).\n• **السيتوبلازم:** سائل هلامي يملأ فراغ الخلية وتحدث به العمليات الحيوية وتسبح فيه العضيات.`,
              spokenText: `النواة هي المدير، والميتوكوندريا مصنع الطاقة، والغشاء حارس البوابة، والسيتوبلازم بحر الخلية!`
            }
          },
          'u3_l2_traits': {
            title: 'الصفات العامة للكائنات الحية',
            tier1: {
              answer: `تخيل التكيف والصفات الحية زي **تجهيزات الرحلات والمغامرات**:\n• الكائن الحي بيتميز بـ 7 خصائص: تغذية، تنفس، إخراج، نمو، حركة، إحساس، تكاثر.\n• وعشان يعيش في البيئة الصعبة بيتكيف بـ 3 طرق: **تركيبي** في جسمه (زي خف الجمل العريض عشان ميرغزش في الرملة)، و**وظيفي** بإفرازات (زي سم الثعبان والعرق)، و**سلوكي** بتصرفات (زي هجرة الطيور للدفء)، و**المماتنة** للتخفي زي الحرباء!`,
              spokenText: `الكائن الحي بيتميز بالتغذية والتنفس والتكاثر، وبيتكيف في جسمه تركيبي زي خف الجمل، ووظيفي في إفرازاته، وسلوكي في هجرة الطيور والمماتنة للتخفي.`
            },
            tier2: {
              answer: `الكبسولة السحرية لصفات الكائنات والتكيف:\n\n1. **العمليات الحيوية:** التكاثر يحمي النوع من الانقراض، والتنفس يولد الطاقة، والإخراج يطرد السموم.\n2. **أنواع التكيف:** تركيبي (عضو في تركيب الجسم)، وظيفي (إفراز سوائل ومواد)، سلوكي (أوقات وتصرفات).\n3. **المماتنة:** التخفي لمحاكاة البيئة كالحرباء وحشرة العود والحشرة الورقية.`,
              spokenText: `الكبسولة السريعة: التكاثر يحمي من الانقراض، والتكيف تركيبي في الجسم ووظيفي بالإفرازات وسلوكي بالتصرفات والمماتنة للتخفي!`
            },
            tier3: {
              answer: `سؤال وجواب: إزاي تحدد نوع التكيف في سؤال الامتحان؟\n\n❓ **سؤال: صنف أنواع التكيف الآتية:**\n👉 **1. خف الجمل المفلطح أو حافر الحصان القوي:** ➔ **تكيف تركيبي** (لأنه جزء من تركيب عظام وتشريح الجسم).\n👉 **2. إفراز سم الثعبان أو إفراز العرق في الإنسان:** ➔ **تكيف وظيفي** (لأنه إفراز سائل من غدة وأنسجة متخصصة).\n👉 **3. هجرة الطيور في الشتاء أو نشاط الخفاش ليلاً أو البيات الشتوي:** ➔ **تكيف سلوكي** (لأنه تصرف واختيار وقت معين)!`,
              spokenText: `لو جزء في الجسم يبقى تركيبي، لو إفراز سوائل يبقى وظيفي، لو تصرف ومواعيد يبقى سلوكي!`
            },
            tier4: {
              answer: `أسرار المماتنة والتخفي:\n\n• **تعريف المماتنة:** قدرة بعض الكائنات الحية على محاكاة الظروف البيئية السائدة بغرض التخفي من الأعداء أو اقتناص الفرائس.\n• **أمثلة شهيرة:**\n1. **الحشرة الورقية:** تشبه أوراق النباتات تماماً في اللون والتعرق فلا يراها الأعداء.\n2. **حشرة العود:** تشبه أغصان النباتات الجافة.\n3. **الحرباء:** تغير لون جلدها حسب البيئة المحيطة (خضراء في الزرع، وصفراء في الرمل).`,
              spokenText: `المماتنة يعني التخفي: الحشرة الورقية زي ورقة الشجر، حشرة العود زي الغصن، والحرباء بتغير لونها!`
            }
          },
          'u3_l3_microbes': {
            title: 'الميكروبات',
            tier1: {
              answer: `تعال نبسط الميكروبات بتشبيه **سكان المدينة المجهرية الخفية**:\n• الميكروبات كائنات صغيرة جداً لا نراها إلا بالمجهر: بكتيريا، فيروسات، فطريات، وأوليات مائية (زي الأميبا والبراميسيوم).\n• **مش كلها أشرار!** بكتيريا الزبادي بتخمر اللبن، وفطر البنسيليوم صنعنا منه المضاد الحيوي، وفطر الخميرة بنعمل بيه العيش.. والضار منها بنحاربه بالنظافة واللقاحات والمناعة!`,
              spokenText: `الميكروبات كائنات مجهرية دقيقة، منها بكتيريا وفيروسات وفطريات، فيها النافع زي فطر البنسلين وبكتيريا الزبادي والخميرة، وفيها الضار اللي بنحاربه باللقاح والنظافة.`
            },
            tier2: {
              answer: `الكبسولة السحرية للميكروبات في 3 نقط:\n\n1. **الكائنات الأولية:** الأميبا تتحرك بأقدام كاذبة، والبراميسيوم بالأهداب، واليوجلينا بالسوط.\n2. **الفيروسات:** كائنات متطفلة إجبارياً على حافة الحياة لا تتكاثر إلا داخل العائل.\n3. **الميكروبات النافعة:** البنسيليوم ينتج البنسلين، وبكتيريا اللبن تنتج الزبادي، وفطر الخميرة ينتج الخبز.`,
              spokenText: `الكبسولة السريعة: الأميبا أقدام كاذبة والبراميسيوم أهداب، والفيروسات متطفلة، والبنسيليوم مضاد حيوي وبكتيريا التخمر لصنع الزبادي!`
            },
            tier3: {
              answer: `سؤال وجواب: طرق حركة الأوليات المجهرية في مياه البرك:\n\n❓ **سؤال: إزاي بتتحرك الكائنات الأولية وحيدة الخلية؟**\n👉 **1. الأميبا:** بتمد **أقدام كاذبة** تتدفق بيها وتبتلع الطعام.\n👉 **2. البراميسيوم:** مجدافه هو **الأهداب** (شعر دقيق يحيط بجسمه يجدف بيه بسرعة).\n👉 **3. اليوجلينا:** بتتحرك بواسطة **السوط** (ديل طويل كرباجي)، وتتميز بوجود بلاستيدات خضراء لصنع الغذاء!`,
              spokenText: `الأميبا أقدام كاذبة، البراميسيوم أهداب، واليوجلينا سوط كرباجي طويل!`
            },
            tier4: {
              answer: `مقارنة الميكروبات النافعة والضارة وطرق الوقاية:\n\n• **النافعة:** فطر البنسيليوم (إنتاج البنسلين)، فطر الخميرة (صناعة الخبز وتصاعد CO₂)، بكتيريا حمض اللاكتيك (صناعة الزبادي والجبن).\n• **الضارة:** مسببات الأمراض (الإنفلونزا، التسمم، الكوليرا).\n• **طرق الحماية:** البسترة (تسخين ثم تبريد مفاجئ للقضاء على ميكروبات اللبن)، التعقيم، التطعيم واللقاحات لتقوية جهاز المناعة.`,
              spokenText: `النافع بنسيليوم وخميرة وزبادي، والضار فيروسات وبكتيريا بنحاربها بالبسترة والتعقيم واللقاحات!`
            }
          },
          'u4_l1_solar_system': {
            title: 'الأرض والنظام الشمسي',
            tier1: {
              answer: `تخيل النظام الشمسي زي **ساعة فلكية عملاقة وجميلة**:\n• الشمس في النص وبيلف حواليها 8 كواكب، والأرض في المركز التالت وكوكب الحياة الأزرق (71% مياه).\n• **حركتين للأرض بتظبط دنيتنا:** دوران الأرض حول نفسها كل 24 ساعة بيعمل **الليل والنهار**، ودورانها حول الشمس كل سنة مع ميل محورها 23.5 درجة بيعمل **الفصول الأربعة** (صيف، خريف، شتاء، ربيع)!`,
              spokenText: `الأرض الكوكب التالت في المجموعة الشمسية وكوكب الحياة، بتلف حول نفسها كل أربعة وعشرين ساعة لتعاقب الليل والنهار، وحول الشمس سنوياً لتعاقب فصول السنة الأربعة.`
            },
            tier2: {
              answer: `الكبسولة السحرية للأرض والنظام الشمسي:\n\n1. **كوكب الحياة:** ماء 71%، غلاف جوي غني بالأكسجين، وأوزون يحمي من الأشعة فوق البنفسجية.\n2. **دوران حول المحور (يومي):** 24 ساعة ➔ تعاقب الليل والنهار، واختلاف موضع وطول الظل.\n3. **دوران حول الشمس + ميل المحور 23.5° (سنوي):** 365.25 يوم ➔ تعاقب فصول السنة الأربعة!`,
              spokenText: `الكبسولة السريعة: الأرض كوكب الحياة بالمية والأكسجين، دورانها حول محورها يعمل ليل ونهار، وحول الشمس بمحور مائل يعمل فصول السنة!`
            },
            tier3: {
              answer: `سؤال وجواب: ليه الظل بيتغير طول اليوم وليه الفصول الأربعة بتيجي؟\n\n❓ **سؤال: إمتى بيكون ظل الجسم أقصر ما يمكن؟**\n👉 **الجواب:** عند **الظهيرة**! لأن الشمس بتكون في أعلى قمة وارتفاع ظاهري في السماء فوق الرأس مباشرة.\n\n❓ **سؤال: ماذا يحدث لو لم يكن محور الأرض مائلاً بزاوية 23.5 درجة؟**\n👉 **الجواب:** كانت أشعة الشمس هتسقط بزاوية ثابتة طوال العام، وبالتالي **لن تتعاقب فصول السنة الأربعة** وكان المناخ هيفضل ثابت في كل منطقة!`,
              spokenText: `الظل أقصر ما يمكن وقت الضهر، وميل محور الأرض هو السر الأساسي في تعاقب الصيف والشتا والفصول الأربعة!`
            },
            tier4: {
              answer: `ترتيب كواكب المجموعة الشمسية الثمانية من الأقرب للأبعد عن الشمس:\n\n• **الكواكب الداخلية (الصخرية):** عطارد ➔ الزهرة ➔ الأرض (كوكبنا) ➔ المريخ (الكوكب الأحمر).\n• **الكواكب الخارجية (الغازية العملاقة):** المشتري (الأضخم) ➔ زحل (الحلقات المبهرة) ➔ أورانوس ➔ نبتون (الكوكب الأزرق الأبعد والأبرد).`,
              spokenText: `الكواكب بالترتيب: عطارد، الزهرة، الأرض، المريخ، المشتري، زحل، أورانوس، نبتون!`
            }
          },
          'u4_l2_eclipse': {
            title: 'خسوف القمر',
            tier1: {
              answer: `تعال نفهم خسوف القمر بلعبة **كشاف الموبايل في أوضة ضلمة**:\n• لما تحط كفك قدام الكشاف، كفك بيحجب النور ويعمل ظل على الحيطة.\n• **خسوف القمر (بالليل):** الأرض بتقف في النص بين الشمس والقمر على استقامة واحدة، فتحجب ضوء الشمس عن القمر فيضلم ويحمر ويبقى آمن تماماً للعين.\n• **كسوف الشمس (بالنهار):** القمر هو اللي في النص ويحجب الشمس لدقايق وممنوع النظر ليه بدون نظارات!`,
              spokenText: `تخيل خسوف القمر بكشاف الموبايل، الأرض بتقف في النص بين الشمس والقمر بالليل وتحجب الضوء، والخسوف آمن للعين ويستمر لساعتين، وفي الكسوف القمر في النص نهاراً.`
            },
            tier2: {
              answer: `الكبسولة السحرية لخسوف القمر في كلمتين ونص:\n\n1. **الشرط:** الأرض في المنتصف بين الشمس والقمر على استقامة واحدة في ليلة البدر (منتصف الشهر القمري).\n2. **الأنواع:** خسوف كلي (القمر كله بمخروط الظل ويظهر أحمر قرمزي) وخسوف جزئي (لا يوجد خسوف حلقي للقمر لأن ظل الأرض أكبر بكثير من القمر).\n3. **الأمان:** آمن 100% للرؤية بالعين المجردة بدون أي نظارات خاصة!`,
              spokenText: `الكبسولة السريعة: الأرض في النص يعني خسوف قمر بالليل وآمن للعين، قمر في النص يعني كسوف شمس بالنهار ويحتاج نظارات خاصة!`
            },
            tier3: {
              answer: `سؤال وجواب: المقارنة الفاصلة بين خسوف القمر وكسوف الشمس في الامتحان:\n\n• **خسوف القمر:**\n- الوقت: ليلاً (منتصف الشهر القمري / ليلة البدر).\n- الجسم الأوسط: **كوكب الأرض**.\n- زمن الاستمرار: ساعة أو ساعتين.\n- الأمان: **آمن تماماً** بالعين المجردة.\n\n• **كسوف الشمس:**\n- الوقت: نهاراً (أول الشهر القمري / محاق).\n- الجسم الأوسط: **القمر**.\n- زمن الاستمرار: دقائق معدودة (أقصاها 7 دقائق و40 ثانية).\n- الأمان: **شديد الخطورة** وممنوع النظر له بالعين المجردة لأنه يسبب العمى!`,
              spokenText: `خسوف القمر بالليل والأرض في النص وآمن للعين، كسوف الشمس بالنهار والقمر في النص وخطر جداً على العين!`
            },
            tier4: {
              answer: `أسرار وحقائق خسوف القمر في الامتحان:\n\n• **ليه القمر بيظهر بلون أحمر قرمزي في الخسوف الكلي؟**\n👉 لأن الغلاف الجوي للأرض يشتت الأشعة الزرقاء والقصيرة، بينما تمر الأشعة الحمراء الطويلة وتنكسر لتصل إلى سطح القمر وتنعكس إلينا.\n• **ليه مبنشفش غير وجه واحد بس للقمر دايماً؟**\n👉 لأن زمن دوران القمر حول محوره (27.3 يوم) يساوي بالظبط زمن دورانه حول كوكب الأرض!`,
              spokenText: `القمر بيحمر في الخسوف لأن الغلاف الجوي بيمرر الأشعة الحمراء الطويلة، وبنشوف وجه واحد للقمر لأن زمن دورانه حول نفسه قد زمن دورانه حول الأرض!`
            }
          }
        };

        // ─────────────────────────────────────────────────────────────
        // 3.5) معالجة عبارات "مش فاهم" والتبسيط المتدرج غير المحدود
        // ─────────────────────────────────────────────────────────────
        const notUnderstoodTriggers = [
          'مش فاهم', 'مش فاهمه', 'مش فاهم حاجه', 'مش فاهم اوي', 'مش فاهمها',
          'مفهمتش', 'مفهمتهاش', 'ما فهمت', 'ما فهمتش', 'لسه مش فاهم', 'مش مستوعب',
          'بسط اكتر', 'بسطهالي', 'بسطها', 'بسط اكتر من كده', 'بسطهالي اكتر',
          'فهمني اكتر', 'اشرحلي اكتر', 'اشرح اكتر', 'وضح اكتر', 'وضحلي اكتر', 'وضح اكتر من كده',
          'صعبه', 'صعبه اوي', 'معقده', 'مش واضحه', 'اشرح بطريقه اسهل', 'اشرح باسلوب اسهل',
          'اشرح بالبلدي', 'عيد تاني', 'كرر تاني', 'مش فاهم الدرس', 'وضحلي تاني', 'قول تاني',
          'تقدر تبسط', 'مش قادر افهم', 'لسه صعبه', 'تقيله', 'مش داخله دماغي', 'صعب', 'كمان مره', 'تاني'
        ];
        const isSimplificationRequest = notUnderstoodTriggers.some(t => qNorm.includes(t)) || qNorm === 'مش فاهم' || qNorm === 'بسط';

        if (isSimplificationRequest) {
          // استنتاج الدرس المطلوب تبسيطه
          let detectedTopicId = null;
          for (const topicItem of (curr.units.flatMap(u => u.lessons))) {
            const lessonNorm = this._normalizeArabic(topicItem.title);
            if (qNorm.includes(lessonNorm)) {
              detectedTopicId = topicItem.lessonId;
              break;
            }
          }

          const targetTopicId = detectedTopicId || this._lastTopicId || this._currentLesson?.lessonId || 'u1_l1_atom';
          
          if (detectedTopicId && detectedTopicId !== this._lastTopicId) {
            this._simplificationLevel = 1;
          } else {
            this._simplificationLevel = (this._simplificationLevel || 0) + 1;
          }
          this._lastTopicId = targetTopicId;

          const simpData = SIMPLIFIED_EXPLANATIONS[targetTopicId] || SIMPLIFIED_EXPLANATIONS['u1_l1_atom'];
          const level = this._simplificationLevel;

          let chosenContent = null;
          let nextLevelLabel = '';

          if (level === 1) {
            chosenContent = simpData.tier1;
            nextLevelLabel = '⚡ كبسولة التبسيط (المستوى 2)';
          } else if (level === 2) {
            chosenContent = simpData.tier2;
            nextLevelLabel = '❓ سؤال وجواب وتحدي تفكير (المستوى 3)';
          } else if (level === 3) {
            chosenContent = simpData.tier3;
            nextLevelLabel = '🔑 مفتاح وحل الامتحان (المستوى 4)';
          } else if (level === 4) {
            chosenContent = simpData.tier4;
            nextLevelLabel = '👨‍🏫 المساعد الشخصي لمستر مينا (توجيه فردي)';
          } else {
            // المستوى 5 وما بعده: وضع المعلم الشخصي الخاص
            chosenContent = {
              answer: `ولا تشيل أي هم يا دكتور! كل العلماء الكبار كانت بتقابلهم أجزاء محتاجة تركيز في الأول.\n\nأنا معاك خطوة بخطوة ومش هسيبك غير وإنت دكتور وفاهم درس **${simpData.title}** بنسبة 100%:\n\n💡 **الحل الأفضل دلوقتي:**\n1. افتح معايا **المعمل ثلاثي الأبعاد (3D)** بالضغط على الزرار بالأسفل، وجرب تحرك العناصر بإيدك.. التجربة العملية بتفهم في ثانية!\n2. أو اكتبلي هنا **الكلمة أو الجملة المحددة اللي حاسس إنها ملخبطاك** وهشرحهالك لوحدها بمثال من بيتك فوراً!`,
              spokenText: `ولا تشيل هم خالص يا بطل! ادخل معايا المعمل ثلاثي الأبعاد وجربها عملي، أو اكتبلي الكلمة المحددة اللي ملخبطاك وأنا معاك خطوة بخطوة لحد ما تفهمها تماماً!`
            };
            nextLevelLabel = '🔄 ابدأ التبسيط من جديد (المستوى 1)';
          }

          const actions = [
            { label: `فتح درس ${simpData.title}`, action: `window.appController.selectLessonSession('${targetTopicId}', 1)` },
            { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${targetTopicId}', 1)` }
          ];

          if (level <= 4) {
            actions.push({ label: nextLevelLabel, action: `window.appController.quickAskChat('بسطهالي اكتر')` });
          } else {
            actions.push({ label: nextLevelLabel, action: `window.appController.quickAskChat('اشرحلي الدرس ببساطة')` });
          }

          resolve({
            answer: chosenContent.answer,
            spokenText: chosenContent.spokenText,
            topic: targetTopicId,
            topicAr: simpData.title,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: actions
          });
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // 4) قاموس المفاهيم والمصطلحات والتعريفات الشامل لمنهج العلوم
        // يغطي كافة أسئلة: "عرف ...", "ما هو ...", "ما المقصود بـ ...", "يعني ايه ..."
        // ─────────────────────────────────────────────────────────────
        const CONCEPTS_DICTIONARY = [
          {
            name: 'المركب',
            keywords: ['مركب', 'المركب', 'مركبات', 'المركبات', 'مركب كيميائي', 'المركبات الكيميائية', 'جزيء مركب', 'جزيئات المركبات'],
            definition: 'مادة نقية ناتجة من اتحاد كيميائي لعنصرين أو أكثر بنسب وزنية ثابتة، ويمكن فصل مكوناته بالطرق الكيميائية (مثل تفكك أكسيد الزئبق بالحرارة، أو تحليل الماء كهربياً بجهاز فولتامتر هوفمان إلى هيدروجين وأكسجين).',
            minaExplanation: 'المركب عامل زي كيكة معمولة من مقادير ثابتة ومضبوطة.. عناصر مختلفة اتحدت مع بعض كيميائياً وطلعت مادة جديدة بخواص جديدة تماماً ومبتتفككش غير بتفاعل كيميائي!',
            details: '• أنواع المركبات: مركبات أيونية (مثل ملح الطعام NaCl)، مركبات تساهمية (مثل الماء H₂O)، مركبات عضوية (أساسها الكربون والهيدروجين مثل الميثان)، ومركبات غير عضوية.',
            lessonId: 'u1_l3_matter',
            sessionNum: 1
          },
          {
            name: 'العنصر',
            keywords: ['عنصر', 'العنصر', 'عناصر', 'العناصر', 'ابسط صوره نقيه للماده', 'جزيء عنصر', 'جزيئات العناصر'],
            definition: 'أبسط صورة نقية للمادة لا يمكن تحليلها كيميائياً أو فيزيائياً إلى ما هو أبسط منها بالطرق الكيميائية المعروفة.',
            minaExplanation: 'العنصر هو الطوبة الأولى الصافية في الكون! ذراته كلها من نفس النوع وميتقسمش لحاجة تانية.. زي قطعة دهب صافي أو نحاس خالص أو غاز الأكسجين.',
            details: '• يوجد في الطبيعة 92 عنصراً، ويضم الجدول الدوري 118 عنصراً (منها الفلزات واللافلزات وأشباه الفلزات والغازات الخاملة).',
            lessonId: 'u1_l3_matter',
            sessionNum: 1
          },
          {
            name: 'المادة',
            keywords: ['ماده', 'الماده', 'كل ما له كتله وحجم'],
            definition: 'كل ما له كتلة وحجم ويشغل حيزاً من الفراغ.',
            minaExplanation: 'أي حاجة حواليك تقدر توزنها وتشغل مكان في الدنيا هي مادة! الهواء، المية، كتابك، جسمك، حتى ذرات الغبار.',
            details: '• المادة تتكون من جزيئات، والجزيئات تتكون من ذرات، وتنقسم لمواد نقية (عناصر ومركبات) ومخاليط.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'الذرة',
            keywords: ['ذره', 'الذره', 'اصغر وحده بنائيه للماده'],
            definition: 'أصغر وحدة بنائية للمادة يمكن أن تشترك في التفاعلات الكيميائية.',
            minaExplanation: 'الذرة هي أصغر قطعة ليجو في الطبيعة! صغيرة جداً لدرجة لا ترى بالمجهر العادي، وتتكون من نواة في المركز بتلف حواليها إلكترونات سريعة.',
            details: '• تتكون الذرة من بروتونات موجبة ونيوترونات متعادلة داخل النواة، وإلكترونات سالبة تدور في مستويات الطاقة.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'الكثافة',
            keywords: ['كثافه', 'الكثافه', 'قانون الكثافه', 'وحده قياس الكثافه', 'كتله وحده الحجوم'],
            definition: 'كتلة وحدة الحجوم من المادة، وقانونها: الكثافة = الكتلة ÷ الحجم (وحدة قياسها جم/سم³ أو كجم/م³).',
            minaExplanation: 'الكثافة هي درجة الزحمة والتقل في الحجم الصغير! لو الحجم الصغير تقيل ومليان جزيئات تبقى كثافته عالية ويغوص زي الحديد، ولو خفيف يطفو زي الخشب والزيت.',
            details: '• كثافة الماء النقي = 1 جم/سم³.. المواد ذات الكثافة الأقل من 1 تطفو فوق الماء، والأكبر من 1 تغوص في الماء.',
            lessonId: 'u1_l3_matter',
            sessionNum: 1
          },
          {
            name: 'الكتلة',
            keywords: ['كتله', 'الكتله', 'مقدار ما يحتويه الجسم من ماده', 'وحده قياس الكتله'],
            definition: 'مقدار ما يحتويه الجسم من مادة، وهي مقدار ثابت لا يتغير بتغير المكان أو الكوكب (تقاس بالجرام أو الكيلوجرام بالميزان المعتاد أو الحساس).',
            minaExplanation: 'كتلتك هي لحمك وعضمك وخلاياك.. لو طلعت على القمر أو المريخ كتلتك بتفضل ثابتة متتغيرش أبداً لأن كمية مادتك هي هي!',
            details: '• الكتلة ثابتة لا تتأثر بالجاذبية.. بينما الوزن يتغير بتغير الجاذبية من كوكب لآخر.',
            lessonId: 'u2_l3_gravity',
            sessionNum: 1
          },
          {
            name: 'الوزن',
            keywords: ['وزن', 'الوزن', 'قانون الوزن', 'وحده قياس الوزن', 'قوه جذب الارض للجسم'],
            definition: 'قوة جذب الأرض للجسم، ويتجه دائماً نحو مركز الأرض.. قانونه: الوزن = الكتلة × عجلة الجاذبية (وحدة قياسه النيوتن N بالميزان الزنبركي).',
            minaExplanation: 'الوزن مش كتلتك.. الوزن هو المغناطيس بتاع الأرض اللي بيشدك لتحت! عشان كده على القمر وزنك بيبقى سدس وزنك لأن جاذبية القمر أضعف بكتير.',
            details: '• وزن الجسم على القمر = ⅙ وزنه على الأرض.. مركز الثقل هو نقطة تأثير وزن الجسم.',
            lessonId: 'u2_l3_gravity',
            sessionNum: 1
          },
          {
            name: 'الحجم',
            keywords: ['حجم', 'الحجم', 'الحيز الذي يشغله الجسم'],
            definition: 'مقدار الحيز الذي يشغله الجسم من الفراغ (يقاس بالسنتيمتر المكعب سم³ أو المتر المكعب م³ أو اللتر).',
            minaExplanation: 'الحجم هو المكان والوسع اللي جسمك أو الشيء واخده في الأوضة أو في الفراغ!',
            details: '• الحجم = الكتلة ÷ الكثافة.. يقاس حجم السوائل والأجسام غير المنتظمة بالمخبار المدرج.',
            lessonId: 'u1_l3_matter',
            sessionNum: 1
          },
          {
            name: 'العدد الذري',
            keywords: ['العدد الذري', 'عدد ذري', 'عدد البروتونات الموجبه'],
            definition: 'عدد البروتونات الموجبة الموجودة داخل نواة ذرة العنصر، وهو نفسه عدد الإلكترونات السالبة التي تدور حول النواة في الذرة المتعادلة (يكتب أسفل يسار رمز العنصر Z).',
            minaExplanation: 'العدد الذري هو رقم البطاقة والرقم القومي للعنصر! مفيش عنصرين في الكون ليهم نفس العدد الذري، وهو اللي بيحدد شخصية العنصر وتصرفاته الكيميائية.',
            details: '• في الذرة المتعادلة: العدد الذري = عدد البروتونات = عدد الإلكترونات.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'العدد الكتلي',
            keywords: ['العدد الكتلي', 'عدد كتلي', 'مجموع البروتونات والنيوترونات', 'النيوكليونات'],
            definition: 'مجموع أعداد البروتونات والنيوترونات الموجودة داخل نواة ذرة العنصر (يكتب أعلى يسار رمز العنصر A).',
            minaExplanation: 'العدد الكتلي هو الوزن الإجمالي للنواة! لأن كتلة الإلكترونات برة خفيفة جداً فبنجمع التقيل بس اللي جوة النواة: بروتونات + نيوترونات.',
            details: '• العدد الكتلي = عدد البروتونات + عدد النيوترونات.. عدد النيوترونات n = العدد الكتلي A - العدد الذري Z.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'البروتونات',
            keywords: ['بروتون', 'البروتون', 'بروتونات', 'البروتونات', 'شحنه البروتون'],
            definition: 'جسيمات ذرية ثقيلة موجبة الشحنة (+1) توجد داخل نواة الذرة، وكتلتها النسبية تساوي 1 وحدة كتل ذرية (1u).',
            minaExplanation: 'البروتونات هي أثقال النواة الإيجابية والموجبة! عددها مبيتغيرش في الذرة وبيحدد نوع العنصر وعدده الذري.',
            details: '• اكتشفها رذرفورد، ورمزها p، شحنتها تعادل شحنة الإلكترون السالب بالمقدار ولكنها موجبة.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'النيوترونات',
            keywords: ['نيوترون', 'النيوترون', 'نيوترونات', 'النيوترونات', 'شحنه النيوترون'],
            definition: 'جسيمات ذرية ثقيلة متعادلة الشحنة الكهربية (0) توجد داخل نواة الذرة، وكتلتها النسبية تساوي 1 وحدة كتل ذرية (1u).',
            minaExplanation: 'النيوترونات هي الجسيمات الهادية المحايدة جوة النواة! ملهاش شحنة كهربية بس بتدي ثقل للنواة وتساعد على استقرارها.',
            details: '• رمزها n، وكتلتها مساوية تقريباً لكتلة البروتون.. اختلاف عددها في ذرات نفس العنصر يسبب ظاهرة النظائر.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'الإلكترونات',
            keywords: ['الكترون', 'الالكترون', 'الكترونات', 'الالكترونات', 'شحنه الالكترون'],
            definition: 'جسيمات متناهية الصغر سالبة الشحنة الكهربية (-1) تدور حول نواة الذرة بسرعة فائقة جداً في مستويات الطاقة، وكتلتها ضئيلة جداً يمكن إهمالها (1/1836 u).',
            minaExplanation: 'الإلكترونات هي الفراشات السريعة الشقية للذرة! بتلف بسرعة البرق حوالين النواة، وخفيفة جداً، وهي اللي بتعمل كل التفاعلات والروابط الكيميائية.',
            details: '• رمزها e⁻، ويحدد عدد إلكترونات المستوى الخارجي تكافؤ العنصر وخواصه الكيميائية.',
            lessonId: 'u1_l1_atom',
            sessionNum: 1
          },
          {
            name: 'مستويات الطاقة',
            keywords: ['مستويات الطاقه', 'مستوى طاقه', 'مدارات الطاقه', 'k l m n'],
            definition: 'مناطق وهمية وتخيلية حول نواة الذرة تدور فيها الإلكترونات كلٌ حسب طاقته، وعددها 7 مستويات رئيسية في أثقل الذرات المعروفة (K, L, M, N, O, P, Q).',
            minaExplanation: 'مستويات الطاقة زي أدوار عمارة سكنية حوالين النواة.. الدور الأول K قريب وأقل طاقة، وكل ما تبعد لفوق تزيد الطاقة وسعة الدور للإلكترونات!',
            details: '• السعة بقاعدة 2n²: المستوى الأول K=2، الثاني L=8، الثالث M=18، الرابع N=32.. ولا تنطبق بعد المستوى الرابع لأن الذرة تصبح غير مستقرة.',
            lessonId: 'u1_l1_atom',
            sessionNum: 2
          },
          {
            name: 'النظائر',
            keywords: ['نظائر', 'النظائر', 'isotopes', 'نظائر الهيدروجين'],
            definition: 'صور وذرات مختلفة لنفس العنصر تتفق في العدد الذري (عدد البروتونات) وتختلف في العدد الكتلي لاختلاف عدد النيوترونات داخل أنويتها.',
            minaExplanation: 'النظائر زي توأم متشابه ليهم نفس الوش ونفس الشخصية الكيميائية، بس واحد فيهم أتخن شوية من التاني عشان واكل نيوترونات زيادة!',
            details: '• نظائر الهيدروجين الثلاثة: البروتيوم (¹H بدون نيوترونات)، الديوتيريوم (²H به نيوترون واحد)، والتريتيوم (³H به نيوترونان).',
            lessonId: 'u1_l1_atom',
            sessionNum: 2
          },
          {
            name: 'الرابطة الأيونية',
            keywords: ['رابطه ايونيه', 'الرابطه الايونيه', 'رابطة ايونية', 'الرابطة الأيونية', 'تجاذب الكتروستاتيكي'],
            definition: 'رابطة كيميائية تنشأ نتيجة قوى التجاذب الكهربي (الإلكتروستاتيكي) بين أيون موجب لذرة عنصر فلزي (فقدت إلكتروناً أو أكثر) وأيون سالب لذرة عنصر لافلزي (اكتسبت إلكتروناً أو أكثر).',
            minaExplanation: 'الرابطة الأيونية زي الصداقة بين واحد كريم وواحد محتاج: الصوديوم الفلز معاه إلكترون زايد يديه للكلور اللافلز، ده يبقى موجب وده سالب وينجذبوا لبعض زي المغناطيس ويعملوا ملح الطعام!',
            details: '• الرابطة الأيونية لا تنتج إلا جزيئات مركبات فقط (مثل ملح الطعام NaCl، وأكسيد الماغنسيوم MgO) لأنها تنشأ دائماً بين ذرات مختلفة.',
            lessonId: 'u1_l4_bonds',
            sessionNum: 1
          },
          {
            name: 'الرابطة التساهمية',
            keywords: ['رابطه تساهميه', 'الرابطه التساهميه', 'رابطة تساهمية', 'الرابطة التساهمية', 'مشاركه الكترونيه'],
            definition: 'رابطة كيميائية تنشأ بين ذرات اللافلزات عن طريق مشاركة كل ذرة بعدد من الإلكترونات مساوٍ للعدد الذي تحتاجه لاكتمال مستوى طاقتها الخارجي.',
            minaExplanation: 'الرابطة التساهمية زي اتنين صحاب قرروا يتشاركوا: محدش بيتنازل عن إلكترون للتاني، بيحطوا إلكتروناتهم في النص هما الاتنين عشان كل ذرة تستقر وتقفل مستواها بـ 8 إلكترونات!',
            details: '• أنواعها: تساهمية أحادية (H-H، H₂O)، تساهمية ثنائية (O=O)، تساهمية ثلاثية (N≡N).. وتنتج جزيئات عناصر أو جزيئات مركبات.',
            lessonId: 'u1_l4_bonds',
            sessionNum: 2
          },
          {
            name: 'الجدول الدوري الحديث',
            keywords: ['جدول دوري حديث', 'الجدول الدوري الحديث', 'اساس الجدول الدوري الحديث', 'فئات الجدول الدوري'],
            definition: 'جدول رتبت فيه العناصر تصاعدياً وفقاً لأعدادها الذرية وطريقة ملء مستويات الطاقة الفرعية بالإلكترونات، ويضم 7 دورات أفقية و18 مجموعة رأسية و118 عنصراً مقسمة إلى 4 فئات (s, p, d, f).',
            minaExplanation: 'الجدول الدوري هو الخريطة العظمى للكيمياء! رتب كل العناصر من الهيدروجين 1 لحد الأوجانيسون 118 في صفوف وعائلات منظمة جداً.',
            details: '• الفئة s (يسار الجدول)، الفئة p (يمين الجدول)، الفئة d (وسط الجدول وتسمى العناصر الانتقالية)، والفئة f (أسفل الجدول تضم اللانثانيدات والأكتينيدات).',
            lessonId: 'u1_l2_periodic',
            sessionNum: 1
          },
          {
            name: 'الفلزات',
            keywords: ['فلزات', 'الفلزات', 'فلز', 'الفلز', 'خواص الفلزات'],
            definition: 'عناصر كيميائية يحتوي مستوى طاقتها الخارجي على أقل من 4 إلكترونات (1 أو 2 أو 3)، وتتميز بالبريق واللمعان وجودة التوصيل للحرارة والكهرباء وقابليتها للسحب والطرق، وتميل لفقد الإلكترونات وتكوين أيونات موجبة.',
            minaExplanation: 'الفلزات هي المواد الصلبة اللامعة الكريمة زي النحاس والحديد والألمونيوم والصوديوم.. بتوصل كهربا وسهل تشكيلها وبتحب تفقد إلكترونات في التفاعل.',
            details: '• جميع الفلزات صلبة ما عدا الزئبق (Hg) فهو الفلز السائل الوحيد.',
            lessonId: 'u1_l2_periodic',
            sessionNum: 2
          },
          {
            name: 'اللافلزات',
            keywords: ['لا فلزات', 'اللافلزات', 'لا فلز', 'اللافلز', 'خواص اللافلزات'],
            definition: 'عناصر كيميائية يحتوي مستوى طاقتها الخارجي غالباً على أكثر من 4 إلكترونات (5 أو 6 أو 7)، رديئة التوصيل للحرارة والكهرباء (باستثناء الجرافيت الكربون موصل للكهرباء)، وغير قابلة للطرق، وتميل لاكتساب أو مشاركة الإلكترونات.',
            minaExplanation: 'اللافلزات زي الفحم والكبريت وغاز الأكسجين والنيتروجين والكلور.. معندهاش لمعان وبتتكسر ومبتوصلش حرارة وبتحب تكتسب إلكترونات وتعمل أيونات سالبة.',
            details: '• يوجد منها صلب (كربون، كبريت، فوسفور)، وسائل وحيد (البروم Br)، وغازات (أكسجين، هيدروجين، نيتروجين، فلور، كلور).',
            lessonId: 'u1_l2_periodic',
            sessionNum: 2
          },
          {
            name: 'الغازات الخاملة (النبيلة)',
            keywords: ['غازات خامله', 'الغازات الخامله', 'غاز خامل', 'الغازات النبيله', 'المجموعه الصفريه'],
            definition: 'عناصر تقع في أقصى يمين الجدول الدوري (المجموعة 18 أو الصفرية)، تتميز باكتمال مستوى طاقتها الخارجي بـ 8 إلكترونات (ما عدا الهيليوم يكتمل بـ 2)، ولذلك لا تشترك في التفاعلات الكيميائية في الظروف العادية وتكافؤها صفر.',
            minaExplanation: 'الغازات الخاملة هي ملوك الكيمياء المستريحين! مستواهم مليان وشبعان إلكترونات ومكتفيين بذاتهم، لا بيفقدوا ولا بيكتسبوا: هيليوم، نيون، أرجون، كريبتون، زينون، رادون.',
            details: '• جزيئاتها تتكون من ذرة واحدة مفردة، وتستخدم في ملء مصابيح الإعلانات (النيون) ومصابيح الإضاءة (الأرجون).',
            lessonId: 'u1_l2_periodic',
            sessionNum: 2
          },
          {
            name: 'القوى الكهربية',
            keywords: ['قوى كهربيه', 'القوى الكهربيه', 'قوه كهربيه', 'الشحنات الكهربيه'],
            definition: 'قوى تجاذب أو تنافر تنشأ بين الأجسام المشحونة كهربياً.. فالشحنات المتشابهة تتنافر والشحنات المختلفة تتجاذب.',
            minaExplanation: 'القوى الكهربية هي الجاذبية الخفية بين الشحنات الموجبة والسالبة! زي لما تدلك مسطرة بشعرك وتجذب قصاصات الورق، أو البرق في السماء.',
            details: '• طرق الشحن: الدلك، اللمس، والتأثير.. والكشاف الكهربي أداة للكشف عن الشحنات.',
            lessonId: 'u2_l1_electric',
            sessionNum: 1
          },
          {
            name: 'التيار الكهربي',
            keywords: ['تيار كهربي', 'التيار الكهربي', 'سيل من الالكترونات', 'الدائره الكهربيه'],
            definition: 'تدفق وسيل من الشحنات الكهربية السالبة (الإلكترونات) عبر موصل كهربي (سلك معدني) في مسار مغلق.',
            minaExplanation: 'التيار الكهربي زي نهر مياه جاري بسرعة فائقة من ملايين الإلكترونات جوة سلك النحاس عشان يشغل اللمبة والمروحة والتليفزيون!',
            details: '• شروط سريان التيار: وجود مصدر كهربي (بطارية) ومسار مغلق (دائرة كهربائية مغلقة).',
            lessonId: 'u2_l1_electric',
            sessionNum: 2
          },
          {
            name: 'المغناطيس الكهربي',
            keywords: ['مغناطيس كهربي', 'المغناطيس الكهربي', 'تركيب المغناطيس الكهربي'],
            definition: 'مغناطيس مؤقت يتكون عند مرور تيار كهربي في سلك نحاسي معزول ملفوف حول قلب من الحديد المطاوع، ويفقد مغناطيسيته بمجرد انقطاع التيار الكهربي.',
            minaExplanation: 'المغناطيس الكهربي هو السحر العلمي اللي بيحول الكهربا لقوة مغناطيس جبارة! تشغل الزرار يشيل أطنان حديد في الموانئ، تطفي الزرار يسيب الحديد في مكانه فوراً.',
            details: '• يدخل في تركيب: أوناش المصانع العملاقة، الجرس الكهربي، والمحركات الكهربية.',
            lessonId: 'u2_l2_magnetic',
            sessionNum: 1
          },
          {
            name: 'المجال المغناطيسي',
            keywords: ['مجال مغناطيسي', 'المجال المغناطيسي', 'خطوط الفيض المغناطيسي'],
            definition: 'الحيز المحيط بالمغناطيس من جميع الجهات والذي تظهر فيه آثار قوته وتأثيره المغناطيسي.',
            minaExplanation: 'المجال المغناطيسي هو الهالة وقوة الحماية غير المرئية اللي حوالين المغناطيس.. أي مسمار حديد يدخل جوة الهالة دي ينجذب فوراً!',
            details: '• يخطط ببرادة الحديد.. وتخرج خطوط المجال المغناطيسي من القطب الشمالي N إلى القطب الجنوبي S خارج المغناطيس.',
            lessonId: 'u2_l2_magnetic',
            sessionNum: 1
          },
          {
            name: 'المحرك الكهربي (الموتور)',
            keywords: ['موتور', 'الموتور', 'محرك كهربي', 'المحرك الكهربي'],
            definition: 'جهاز يحول الطاقة الكهربية إلى طاقة حركية (ميكانيكية) بالاعتماد على التأثير المغناطيسي للتيار الكهربي.',
            minaExplanation: 'الموتور تديله كهربا يديك حركة ودوران! موجود في المروحة، الغسالة، خلاط المطبخ، وعربيات المترو.',
            details: '• عكس الدينامو (المولد الكهربي) الذي يحول الحركة إلى كهرباء.',
            lessonId: 'u2_l2_magnetic',
            sessionNum: 2
          },
          {
            name: 'المولد الكهربي (الدينامو)',
            keywords: ['دينامو', 'الدينامو', 'مولد كهربي', 'المولد الكهربي'],
            definition: 'جهاز يحول الطاقة الحركية (الميكانيكية) إلى طاقة كهربية عن طريق تحريك ملف بين قطبي مغناطيس.',
            minaExplanation: 'الدينامو هو صانع الكهربا من الحركة! لما تدور العجلة أو يدور التوربين بالسد العالي يولد تيار كهربي ينور المدن.',
            details: '• فكرة عمله اكتشفها العالم فاراداي بالحث الكهرومغناطيسي.',
            lessonId: 'u2_l2_magnetic',
            sessionNum: 2
          },
          {
            name: 'الجاذبية الأرضية',
            keywords: ['جاذبيه', 'الجاذبيه', 'جاذبيه ارضيه', 'الجاذبيه الارضيه', 'قانون الجذب'],
            definition: 'قوة سحب وتجاذب غير مرئية تؤثر بها كتلة كوكب الأرض على جميع الأجسام نحو مركزها.',
            minaExplanation: 'الجاذبية هي اللي متبتانا في كوكب الأرض ومخليانا ماشيين على الأرض والمحيطات ثابتة في مكانها والهواء محاوطنا ومبنطيرش في الفضاء!',
            details: '• اكتشف قوانينها العالم إسحاق نيوتن.. وتعتمد على كتلة الجسمين والمسافة بينهما.',
            lessonId: 'u2_l3_gravity',
            sessionNum: 1
          },
          {
            name: 'عجلة الجاذبية الأرضية',
            keywords: ['عجله الجاذبيه', 'عجلة الجاذبية', 'عجله الجاذبيه الارضيه', 'تسارع الجاذبيه'],
            definition: 'معدل زيادة سرعة الأجسام أثناء سقوطها سقوطاً حراً نحو مركز الأرض، وقيمتها المتوسطة حوالي 9.8 م/ث² (تقرب لـ 10 م/ث² في المسائل).',
            minaExplanation: 'عجلة الجاذبية هي معدل السرعة اللي الأرض بتشد بيها أي حاجة بتقع.. وكل ما تقرب لمركز الأرض تزيد العجلة شوية.',
            details: '• تختلف قليلاً من مكان لآخر بسبب تفلطح الأرض عند القطبين (9.83 م/ث²) وانبعاجها عند خط الاستواء (9.78 م/ث²).',
            lessonId: 'u2_l3_gravity',
            sessionNum: 1
          },
          {
            name: 'مركز الثقل',
            keywords: ['مركز الثقل', 'مركز ثقل الجسم', 'نقطه تاثير الوزن'],
            definition: 'النقطة التي تؤثر عندها محصلة قوى جذب الأرض لجميع أجزاء الجسم (نقطة تأثير وزن الجسم).',
            minaExplanation: 'مركز الثقل هي نقطة التوازن السحرية لأي جسم! لو حطيت صباعك تحتها بالضبط الجسم يقف متوازن ميميلش ولا يقع.',
            details: '• في الأجسام المتماثلة المنتظمة (مثل الكرة أو المسطرة المنتظمة)، يقع مركز الثقل في مركزها الهندسي تماماً.',
            lessonId: 'u2_l3_gravity',
            sessionNum: 2
          },
          {
            name: 'الخلية',
            keywords: ['خليه', 'الخليه', 'وحده البناء والوظيفه', 'اصغر وحده بنائيه'],
            definition: 'أصغر وحدة بنائية ووظيفية في جسم الكائن الحي قادرة على القيام بجميع العمليات الحيوية.',
            minaExplanation: 'الخلية هي أصغر طوبة حية مبني منها جسمك وجسم النبات والحيوان! معجزة مجهرية بتتنفس وتتغذى وتولد طاقة وتنقسم.',
            details: '• اكتشفها وفحصها العالم روبرت هوك عام 1665 باستخدام المجهر البسيط.',
            lessonId: 'u3_l1_cells',
            sessionNum: 1
          },
          {
            name: 'الجدار الخلوي',
            keywords: ['جدار خلوي', 'الجدار الخلوي', 'جدار السليلوز'],
            definition: 'جدار صلب وسميك يحيط بالخلية النباتية فقط من الخارج، يتكون بصفة أساسية من مادة السليلوز، ووظيفته حماية الخلية وتدعيمها وإعطاؤها شكلاً محدداً وثابتاً.',
            minaExplanation: 'الجدار الخلوي هو درع وسور القلعة القوي للنبات! عشان النبات معندوش عظام، الجدار ده هو اللي مخليه واقف صلب وقوي وموجود في النباتية بس ومش موجود في الإنسان أو الحيوان.',
            details: '• لا يوجد في الخلية الحيوانية.. يحتوي على ثقوب دقيقة تسمح بمرور الماء والذائبات.',
            lessonId: 'u3_l1_cells',
            sessionNum: 1
          },
          {
            name: 'الغشاء البلازمي',
            keywords: ['غشاء بلازمي', 'الغشاء البلازمي', 'الغشاء الخلوي', 'النفاذيه الاختياريه'],
            definition: 'غشاء رقيق شبه منفذ يحيط بسيتوبلازم الخلية (في النباتية والحيوانية)، ينظم مرور ودخول وخروج المواد والماء من وإلى الخلية بخاصية النفاذية الاختيارية.',
            minaExplanation: 'الغشاء البلازمي هو حارس بوابة الخلية وأمن المبنى! بيسمح للحاجات المفيدة تدخل ويمنع الضارة ويخرج الفضلات بذكاء شديد.',
            details: '• يحيط بالسيتوبلازم مباشرة في الخلية الحيوانية، ويقع تحت الجدار الخلوي في الخلية النباتية.',
            lessonId: 'u3_l1_cells',
            sessionNum: 1
          },
          {
            name: 'السيتوبلازم',
            keywords: ['سيتوبلازم', 'السيتوبلازم', 'سائل الخليه'],
            definition: 'سائل هلامي غير متجانس يملأ فراغ الخلية بين النواة والغشاء البلازمي، يتكون معظمه من الماء والمواد العضوية، وتسبح فيه جميع عضيات الخلية وتحدث به التفاعلات والعمليات الحيوية.',
            minaExplanation: 'السيتوبلازم هو بحر ومياه حمام السباحة الشفافة جوة الخلية.. كل العضيات والمصانع عايمة فيه وشغالة طول اليوم!',
            details: '• يحتوي على هيكل الخلية والأملاح والإنزيمات اللازمة لنشاط الخلية.',
            lessonId: 'u3_l1_cells',
            sessionNum: 1
          },
          {
            name: 'الميتوكوندريا',
            keywords: ['ميتوكوندريا', 'الميتوكوندريا', 'محطات انتاج الطاقه', 'تنفس خلوي', 'atp'],
            definition: 'عضيات خلوية غشائية مسؤولة عن التنفس الخلوي وأكسدة المواد الغذائية لإنتاج جزيئات الطاقة (ATP) اللازمة لجميع أنشطة الخلية الحيوية.',
            minaExplanation: 'الميتوكوندريا هي محطة ومولد الكهرباء والطاقة للخلية! بتاخد السكر والأكسجين وتطلع جزيئات طاقة ATP تشغل بيها كل أعضاء الجسم.',
            details: '• تكثر الميتوكوندريا في خلايا العضلات والكبد لأنها تحتاج طاقة عالية ومستمرة.',
            lessonId: 'u3_l1_cells',
            sessionNum: 2
          },
          {
            name: 'البلاستيدات الخضراء',
            keywords: ['بلاستيدات خضراء', 'البلاستيدات الخضراء', 'كلوروبلاست', 'الكلوروفيل', 'البناء الضوئي'],
            definition: 'عضيات خلوية توجد في الخلية النباتية فقط والطحالب، تحتوي على صبغ الكلوروفيل الأخضر، وظيفتها امتصاص الطاقة الضوئية من الشمس والقيام بعملية البناء الضوئي لصنع الغذاء (النشا والسكريات).',
            minaExplanation: 'البلاستيدات الخضراء هي مطبخ الشيف في أوراق النبات! بتاخد نور الشمس والمية وثاني أكسيد الكربون وتطبخ سكر وغذاء للنبات وتطلع لنا أكسجين نتنفسه.',
            details: '• لا توجد في الخلية الحيوانية.. وتكسب النبات لونه الأخضر المميز.',
            lessonId: 'u3_l1_cells',
            sessionNum: 2
          },
          {
            name: 'نواة الخلية',
            keywords: ['نواه الخليه', 'النواه في الخليه', 'الماده الوراثيه', 'dna'],
            definition: 'أوضح وأهم عضيات الخلية، مسؤولة عن تنظيم العمليات الحيوية والأنشطة الخلوية، وتحتوي على المادة الوراثية (الكروموسومات و DNA)، وهي المسؤولة عن انقسام الخلية ونقل الصفات الوراثية.',
            minaExplanation: 'نواة الخلية هي عقل الإدارة والمدير التنفيذي للخلية! شايلا شفرات الوراثة بتاعتك ومسؤولة عن تكاثر وانقسام الخلية.',
            details: '• محاطة بغشاء نووي مزدوج تتوسطه نوية ومادة وراثية.',
            lessonId: 'u3_l1_cells',
            sessionNum: 2
          },
          {
            name: 'التكيف',
            keywords: ['تكيف', 'التكيف', 'مفهوم التكيف', 'انواع التكيف'],
            definition: 'تحور أو تعديل في سلوك الكائن الحي أو تركيب جسمه أو وظائفه الحيوية ليصبح أكثر ملاءمة وقدرة على البقاء والتكاثر في ظروف بيئته السائدة.',
            minaExplanation: 'التكيف هو سلاح الكائنات الحية عشان تعيش وتنتصر على صعوبات الطبيعة: البرد الشديد، حرارة الصحراء، أو قلة المية!',
            details: '• ينقسم إلى 3 أنواع رئيسية: تكيف تركيبي، تكيف وظيفي، وتكيف سلوكي.',
            lessonId: 'u3_l2_traits',
            sessionNum: 1
          },
          {
            name: 'التكيف التركيبي',
            keywords: ['تكيف تركيبي', 'التكيف التركيبي', 'خف الجمل', 'حافر الحصان'],
            definition: 'تحور وتغير في تركيب أحد أجزاء أو أعضاء جسم الكائن الحي ليناسب البيئة التي يعيش فيها (مثل خف الجمل المفلطح للمشي على الرمال الساخنة، وحافر الحصان القوي للمشي على الصخور).',
            minaExplanation: 'التكيف التركيبي هو جزء مصنوع في خلقة وتشريح جسم الكائن.. زي منقار الصقر المعقوف لتمزيق الفريسة.',
            details: '• أمثلة: أطراف الخفافيش المتحورة لأجنحة، وزعانف الحيتان للسباحة.',
            lessonId: 'u3_l2_traits',
            sessionNum: 1
          },
          {
            name: 'التكيف الوظيفي',
            keywords: ['تكيف وظيفي', 'التكيف الوظيفي', 'سم الثعبان', 'افراز العرق'],
            definition: 'تحور في أنسجة وأعضاء معينة في جسم الكائن الحي لتصبح قادرة على أداء وظيفة معينة استجابة لتغيرات البيئة (مثل إفراز سم الثعبان عند الخطر، أو إفراز العرق في الإنسان لتبريد الجسم).',
            minaExplanation: 'التكيف الوظيفي هو قدرة خلايا وغدد الجسم على إفراز مواد وسوائل كيميائية في مواقف معينة لحماية الكائن أو إنقاذه.',
            details: '• أمثلة: إفراز اللعاب لهضم الطعام، وإفراز السم في العقارب.',
            lessonId: 'u3_l2_traits',
            sessionNum: 1
          },
          {
            name: 'التكيف السلوكي',
            keywords: ['تكيف سلوكي', 'التكيف السلوكي', 'هجره الطيور', 'نشاط الخفاش ليلا'],
            definition: 'تحور وتعديل في سلوك وتصرفات الكائن الحي في أوقات محددة من اليوم أو فصول السنة للتغلب على الظروف القاسية (مثل هجرة الطيور شتاءً للدفء والتكاثر، أو نشاط الخفافيش ليلاً).',
            minaExplanation: 'التكيف السلوكي هو شطارة وتصرف ذكي في مواعيد وأوقات نشاط الكائن لحماية نفسه!',
            details: '• أمثلة: البيات الشتوي في الضفادع، الخمول الصيفي في اليربوع، وهجرة الطيور.',
            lessonId: 'u3_l2_traits',
            sessionNum: 1
          },
          {
            name: 'المماتنة (التخفي)',
            keywords: ['مماتنه', 'المماتنه', 'التخفي', 'الحرباء', 'حشره العود', 'الحشره الورقيه'],
            definition: 'قدرة بعض الكائنات الحية على محاكاة البيئة السائدة (في اللون أو الشكل) بغرض التخفي من الأعداء أو لاقتناص الفرائس في البيئات الطبيعية.',
            minaExplanation: 'المماتنة هي فن التخفي والتمويه العبقري في الحيوانات والحشرات! الحشرة الورقية شكلها ورق شجر بالظبط، وحشرة العود شبه الغصن الناشف، والحرباء بتغير لونها حسب المكان!',
            details: '• الحرباء تتلون بلون البيئة (أخضر في النباتات وأصفر في الرمال)، وتستخدم لسانها اللزج الطويل لصيد الحشرات.',
            lessonId: 'u3_l2_traits',
            sessionNum: 2
          },
          {
            name: 'الميكروبات (الكائنات الدقيقة)',
            keywords: ['ميكروب', 'ميكروبات', 'الميكروبات', 'كائنات دقيقه', 'الكائنات الدقيقه'],
            definition: 'كائنات حية مجهرية دقيقة جداً وحيدة الخلية لا ترى بالعين المجردة وتنتشر في الهواء والماء والتربة وتضم: البكتيريا، الفيروسات، الفطريات، والأوليات المائية.',
            minaExplanation: 'الميكروبات هي عالم كامل تحت المجهر.. منها المفيد جداً زي فطر البنسلين وخميرة العيش وبكتيريا الزبادي، ومنها الضار اللي بيسبب الأمراض ونحاربه باللقاحات.',
            details: '• فحص مياه البرك يكشف عن كائنات أولية مائية مثل الأميبا والبراميسيوم واليوجلينا.',
            lessonId: 'u3_l3_microbes',
            sessionNum: 1
          },
          {
            name: 'الأوليات المائية (الأميبا والبراميسيوم واليوجلينا)',
            keywords: ['اميبا', 'الاميبا', 'براميسيوم', 'البراميسيوم', 'يوجلينا', 'اليوجلينا', 'اوليات مجهريه'],
            definition: 'كائنات حية وحيدة الخلية مجهرية تعيش في مياه البرك والمستنقعات، وتختلف في طريقة حركتها: الأميبا بالأقدام الكاذبة، البراميسيوم بالأهداب، واليوجلينا بالسوط.',
            minaExplanation: 'الأوليات المائية هي سكان قطرة مياه البركة! الأميبا بتمد إيدين ورجلين كاذبة، البراميسيوم عنده شعر دقيق يجدف بيه، واليوجلينا عندها كرباج ديل طويل وتعمل بناء ضوئي!',
            details: '• تصنف جميعها ضمن الكائنات وحيدة الخلية وتتكاثر بالانقسام الثنائي.',
            lessonId: 'u3_l3_microbes',
            sessionNum: 1
          },
          {
            name: 'فطر البنسيليوم والمضادات الحيوية',
            keywords: ['بنسيليوم', 'البنسيليوم', 'بنسلين', 'البنسلين', 'مضاد حيوي', 'المضاد الحيوي'],
            definition: 'فطر نافع مجهري يُفرز مادة كيميائية تقتل البكتيريا تُسمى "البنسلين"، وهو أول وأشهر مضاد حيوي اكتشفه العالم ألكسندر فلمنج عام 1928 وأنقذ به ملايين البشر.',
            minaExplanation: 'فطر البنسيليوم هو البطل الطبي في عالم الفطريات! اكتشفه فلمنج بالصدفة لما لقى فطر قتل بكتيريا في طبق المعمل، وصنعنا منه البنسلين أعظم مضاد حيوي.',
            details: '• المضادات الحيوية تعالج العدوى البكتيرية ولا تؤثر على الفيروسات.',
            lessonId: 'u3_l3_microbes',
            sessionNum: 2
          },
          {
            name: 'كوكب الأرض',
            keywords: ['كوكب الارض', 'الارض', 'الكوكب الازرق', 'كوكب الحياه'],
            definition: 'الكوكب الثالث بعداً عن الشمس في المجموعة الشمسية، ويسمى "كوكب الحياة" و"الكوكب المائي" لأن الماء يغطي 71% من مساحة سطحه ويحتوي على غلاف جوي يحمي الحياة.',
            minaExplanation: 'الأرض هي بيتنا العظيم في الفضاء! الكوكب الوحيد المؤهل للحياة بفضل الأكسجين والمياه السائلة والحرارة المعتدلة وطبقة الأوزون الحامية.',
            details: '• يدور حول نفسه كل 24 ساعة (تعاقب الليل والنهار)، ويدور حول الشمس كل 365.25 يوم (تعاقب فصول السنة).',
            lessonId: 'u4_l1_solar_system',
            sessionNum: 1
          },
          {
            name: 'تعاقب الليل والنهار',
            keywords: ['الليل والنهار', 'تعاقب الليل والنهار', 'دوران الارض حول محورها', 'دوران الارض حول نفسها'],
            definition: 'ظاهرة فلكية يومية تحدث نتيجة دوران كوكب الأرض حول محوره (نفسه) من الغرب إلى الشرق مرة واحدة كل 24 ساعة (اليوم الكامل).',
            minaExplanation: 'الأرض بتلف حول نفسها زي البلبل كل 24 ساعة.. الجزء اللي باصص للشمس بيبقى نهار، والجزء التاني بيبقى ليل!',
            details: '• يؤدي أيضاً لاختلاف موضع وطول ظل الأجسام على مدار ساعات النهار (أقصر ظل عند الظهيرة).',
            lessonId: 'u4_l1_solar_system',
            sessionNum: 2
          },
          {
            name: 'تعاقب الفصول الأربعة',
            keywords: ['الفصول الاربعه', 'تعاقب الفصول الاربعه', 'دوران الارض حول الشمس', 'ميل محور الارض'],
            definition: 'ظاهرة فلكية سنوية تحدث نتيجة دوران كوكب الأرض حول الشمس مرة كل 365.25 يوماً مع ميل محور دوران الأرض بزاوية ثابتة مقدارها 23.5 درجة.',
            minaExplanation: 'الفصول الأربعة (صيف، خريف، شتاء، ربيع) بتحصل لسببين مع بعض: دوران الأرض حول الشمس سنوياً، وميل محور الأرض اللي بيخلي أشعة الشمس تتركز أكتر في الصيف وتتوزع بميل في الشتاء!',
            details: '• إذا لم يكن محور الأرض مائلاً لما تعاقبت فصول السنة ولظل المناخ ثابتاً في كل بقعة على الأرض.',
            lessonId: 'u4_l1_solar_system',
            sessionNum: 2
          },
          {
            name: 'خسوف القمر',
            keywords: ['خسوف القمر', 'خسوف', 'الخسوف', 'خسوف كلي', 'خسوف جزئي', 'ليله البدر'],
            definition: 'ظاهرة فلكية تحدث في منتصف الشهر القمري الهجري (عندما يكون القمر بدراً) عندما تقع الأرض بين الشمس والقمر على استقامة واحدة فيحجب كوكب الأرض ضوء الشمس عن القمر.',
            minaExplanation: 'خسوف القمر بيحصل بالليل لما الأرض تقف في النص بين الشمس والقمر وتحجب عنه الضوء.. القمر يضلم ويحمر ويبقى آمن 100% تبصله بعينك بدون أي نظارات!',
            details: '• أنواعه: خسوف كلي (يظهر بلون أحمر قرمزي) وخسوف جزئي.. ولا يوجد خسوف حلقي للقمر لأن ظل كوكب الأرض أكبر بكثير من قطر القمر.',
            lessonId: 'u4_l2_eclipse',
            sessionNum: 1
          },
          {
            name: 'كسوف الشمس',
            keywords: ['كسوف الشمس', 'كسوف', 'الكسوف', 'كسوف كلي', 'كسوف حلقي'],
            definition: 'ظاهرة فلكية تحدث نهاراً في أول الشهر القمري (المحاق) عندما يقع القمر بين الأرض والشمس على استقامة واحدة فيحجب قرص الشمس كلياً أو جزئياً.',
            minaExplanation: 'كسوف الشمس بيحصل بالنهار لما القمر يجي في النص ويحجب نور الشمس لدقايق.. خطر جداً وممنوع النظر للشمس بالعين المجردة لأنه بيسبب العمى!',
            details: '• يستمر دقائق معدودة (أقصاها 7 دقائق و40 ثانية)، ويحتاج نظارات خاصة معتمدة لمشاهدته.',
            lessonId: 'u4_l2_eclipse',
            sessionNum: 2
          },
          {
            name: 'أطوار القمر',
            keywords: ['اطوار القمر', 'اوجه القمر', 'محاق', 'هلال', 'بدر', 'تربيع'],
            definition: 'أشكال الجزء المضيء من القمر التي نراها من الأرض، وتتغير شهرياً نتيجة دوران القمر حول الأرض وتغير زاويته بالنسبة للشمس والأرض (محاق، هلال أول، تربيع أول، أحدب أول، بدر، أحدب ثانٍ، تربيع ثانٍ، هلال ثانٍ).',
            minaExplanation: 'القمر جسم معتم أصلاً وبيعكس ضوء الشمس.. وهو بيلف حوالينا كل شهر بنشوف زوايا مختلفة من النور، يبدأ هلال ويكبر يبقى بدر ويرجع يصغر تاني!',
            details: '• نرى وجهاً واحداً للقمر دائماً لأن زمن دوران القمر حول محوره (27.3 يوماً) يساوي زمن دورانه حول كوكب الأرض.',
            lessonId: 'u4_l2_eclipse',
            sessionNum: 2
          }
        ];

        // ─────────────────────────────────────────────────────────────
        // 4.5) استخراج المصطلح والبحث الذكي في قاموس المفاهيم
        // ─────────────────────────────────────────────────────────────
        const questionPrefixes = [
          'عرف', 'تعريف', 'ما هو', 'ما هي', 'ماهو', 'ماهي', 'ما المقصود ب', 'ما المقصود بـ',
          'ماالمقصود ب', 'ما معنى', 'مامعنى', 'يعني ايه', 'ايه هو', 'ايه هي', 'شو هو',
          'مفهوم', 'اشرحلي', 'اشرح', 'وضحلي', 'وضح', 'كلمني عن', 'عايز اعرف', 'عاوز اعرف',
          'قولي عن', 'ما وظيفة', 'ايه وظيفة', 'وظيفة', 'اهمية', 'فايدة', 'ايه فايدة',
          'قانون', 'وحدة قياس', 'ما الفرق بين', 'قارن بين', 'علل', 'ليه', 'فسر', 'لماذا'
        ];

        let strippedQuery = qNorm;
        for (const p of questionPrefixes) {
          const pn = this._normalizeArabic(p);
          if (strippedQuery.startsWith(pn + ' ')) {
            strippedQuery = strippedQuery.slice(pn.length).trim();
            break;
          } else if (strippedQuery === pn) {
            break;
          }
        }

        // مطابقة قاموس المفاهيم
        let matchedConcept = null;
        let bestConceptScore = 0;

        for (const concept of CONCEPTS_DICTIONARY) {
          let score = 0;
          for (const kw of concept.keywords) {
            const kwNorm = this._normalizeArabic(kw);
            if (strippedQuery === kwNorm || qNorm === kwNorm) {
              score = Math.max(score, 100);
            } else if (` ${qNorm} `.includes(` ${kwNorm} `) || ` ${strippedQuery} `.includes(` ${kwNorm} `)) {
              score = Math.max(score, 80);
            } else if (kwNorm.includes(strippedQuery) && strippedQuery.length >= 3) {
              score = Math.max(score, 60);
            } else if (strippedQuery.includes(kwNorm) && kwNorm.length >= 3) {
              score = Math.max(score, 50);
            }
          }
          if (score > bestConceptScore) {
            bestConceptScore = score;
            matchedConcept = concept;
          }
        }

        if (matchedConcept && bestConceptScore >= 50) {
          this._lastTopicId = matchedConcept.lessonId;
          this._simplificationLevel = 0;

          const matchedLesson = curr.units.flatMap(u => u.lessons).find(l => l.lessonId === matchedConcept.lessonId);
          const lessonTitle = matchedLesson?.title || matchedConcept.name;

          let answerText = `🎯 **مفهوم ${matchedConcept.name} في منهج العلوم:**\n\n`;
          answerText += `📌 **التعريف المعتمد:**\n${matchedConcept.definition}\n\n`;
          answerText += `💡 **شرح وتوضيح مستر مينا:**\n${matchedConcept.minaExplanation}\n\n`;
          if (matchedConcept.details) {
            answerText += `${matchedConcept.details}\n\n`;
          }
          answerText += `📚 **مكانه في المنهج:** [${lessonTitle}] - الحصة ${matchedConcept.sessionNum}`;

          const spokenText = `تعريف ${matchedConcept.name} في منهجنا: ${matchedConcept.definition} ${matchedConcept.minaExplanation}`;

          resolve({
            answer: answerText,
            spokenText: spokenText,
            topic: matchedConcept.lessonId,
            topicAr: matchedConcept.name,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: [
              { label: `فتح درس ${lessonTitle.split(':')[1] || lessonTitle}`, action: `window.appController.selectLessonSession('${matchedConcept.lessonId}', ${matchedConcept.sessionNum})` },
              { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${matchedConcept.lessonId}', ${matchedConcept.sessionNum})` },
              { label: '⚡ بسطهالي أكتر (شرح أسهل)', action: `window.appController.quickAskChat('بسطهالي اكتر')` }
            ]
          });
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // 5) البحث العميق في كافة قواعد المنهج الـ 154 قاعدة بمطابقة الكلمات الكاملة
        // ─────────────────────────────────────────────────────────────
        const stopWords = new Set(['مين', 'فاز', 'على', 'الي', 'اللي', 'مع', 'عن', 'كان', 'يكون', 'هذا', 'هذه', 'ذلك', 'تلك', 'حيث', 'كيف', 'متى', 'اين', 'بين', 'عند', 'منذ', 'غير', 'جدا', 'اكثر', 'اقل', 'كل', 'بعض', 'اي', 'ايه', 'هو', 'هي', 'هم', 'نحن', 'انت']);
        let matchedRuleItem = null;
        let bestRuleScore = 0;

        for (const unit of curr.units) {
          for (const lesson of unit.lessons) {
            for (const sess of (lesson.sessions || [])) {
              for (const rule of (sess.rules || [])) {
                const ruleNorm = this._normalizeArabic(rule);
                const queryWords = strippedQuery.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
                let matchCount = 0;
                for (const w of queryWords) {
                  if ((' ' + ruleNorm + ' ').includes(' ' + w + ' ')) {
                    matchCount += 2;
                  }
                }

                if ((' ' + ruleNorm + ' ').includes(' ' + strippedQuery + ' ') && strippedQuery.length >= 4) {
                  matchCount += 5;
                }

                if (matchCount > bestRuleScore && matchCount >= 2 && queryWords.length > 0) {
                  bestRuleScore = matchCount;
                  matchedRuleItem = { rule, lesson, sess };
                }
              }
            }
          }
        }

        if (matchedRuleItem && bestRuleScore >= 1) {
          this._lastTopicId = matchedRuleItem.lesson.lessonId;
          this._simplificationLevel = 0;

          let ans = `إجابة سؤالك من قواعد وقوانين **${matchedRuleItem.lesson.title}**:\n\n`;
          ans += `📌 **القاعدة العلمية المقررة:**\n${matchedRuleItem.rule}\n\n`;
          if (matchedRuleItem.sess.summary) {
            ans += `💡 **ملخص الحصة:**\n${matchedRuleItem.sess.summary}\n\n`;
          }

          resolve({
            answer: ans,
            spokenText: `إجابة سؤالك من درس ${matchedRuleItem.lesson.title.split(':')[1] || matchedRuleItem.lesson.title}: ${matchedRuleItem.rule}`,
            topic: matchedRuleItem.lesson.lessonId,
            topicAr: matchedRuleItem.lesson.title,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: [
              { label: `فتح درس ${matchedRuleItem.lesson.title.split(':')[1] || matchedRuleItem.lesson.title}`, action: `window.appController.selectLessonSession('${matchedRuleItem.lesson.lessonId}', ${matchedRuleItem.sess.sessionNum})` },
              { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${matchedRuleItem.lesson.lessonId}', ${matchedRuleItem.sess.sessionNum})` },
              { label: '⚡ بسطهالي أكتر', action: `window.appController.quickAskChat('بسطهالي اكتر')` }
            ]
          });
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // 6) البحث في أسئلة "علل" التفاعلية الـ 84 في كافة الدروس
        // ─────────────────────────────────────────────────────────────
        let matchedWhy = null;
        let matchedWhyLesson = null;
        let matchedWhySession = null;
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
                const exact = whyNorm === qNorm;
                const score = exact ? 10000 : matchCount;
                if ((exact || (matchCount >= 2 && matchCount >= queryWords.length * .5)) && score > bestWhyScore) {
                  bestWhyScore = score;
                  matchedWhy = why;
                  matchedWhyLesson = lesson;
                  matchedWhySession = sess;
                }
              }
            }
          }
        }

        if (matchedWhy && matchedWhyLesson) {
          this._lastTopicId = matchedWhyLesson.lessonId;
          this._simplificationLevel = 0;

          let ans = `سؤال علل ممتاز في **${matchedWhyLesson.title}**:\n\n`;
          ans += `❓ **السؤال:** ${matchedWhy.q}\n\n`;
          ans += `💡 **إجابة مستر مينا النموذجية:**\n${matchedWhy.a}\n\n`;
          if (matchedWhySession.summary) {
            ans += `**ملخص الحصة:** ${matchedWhySession.summary}`;
          }

          resolve({
            answer: ans,
            spokenText: `سؤال جميل يا بطل! ${matchedWhy.a}`,
            topic: matchedWhyLesson.lessonId,
            topicAr: matchedWhyLesson.title,
            hasExplanation: true,
            topicContent: null,
            isOutOfCurriculum: false,
            actions: [
              { label: `فتح درس ${matchedWhyLesson.title.split(':')[1] || matchedWhyLesson.title}`, action: `window.appController.selectLessonSession('${matchedWhyLesson.lessonId}', ${matchedWhySession.sessionNum})` },
              { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${matchedWhyLesson.lessonId}', ${matchedWhySession.sessionNum})` },
              { label: '⚡ بسطهالي أكتر', action: `window.appController.quickAskChat('بسطهالي اكتر')` }
            ]
          });
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // 7) مطابقة الكلمات المفتاحية والمواضيع العامة للدروس الـ 12
        // ─────────────────────────────────────────────────────────────
        const TOPIC_KNOWLEDGE = [
          {
            lessonId: 'u1_l1_atom',
            title: 'الدرس الأول: تركيب الذرة',
            primaryKeywords: ['ذره', 'الذره', 'نواه', 'النواه', 'بروتون', 'بروتونات', 'نيوترون', 'نيوترونات', 'الكترون', 'الكترونات', 'مستويات الطاقه', 'مستوى طاقه', 'توزيع الكتروني', 'العدد الذري', 'العدد الكتلي', 'كربون', 'هيدروجين', 'هيليوم', 'صوديوم', 'اكسجين', '2n2', 'k', 'l', 'm', 'n', 'شحنه النواه', 'متعادله كهربيا', 'تركيب الذره', 'نظائر', 'النظائر']
          },
          {
            lessonId: 'u1_l2_periodic',
            title: 'الدرس الثاني: الجدول الدوري لتصنيف العناصر',
            primaryKeywords: ['جدول دوري', 'الجدول الدوري', 'مندليف', 'موزلي', 'بور', 'تصنيف العناصر', 'فلزات', 'فلز', 'لا فلزات', 'لا فلز', 'اشباه فلزات', 'غازات خامله', 'غاز خامل', 'دوره', 'دورات', 'مجموعه', 'مجموعات', 'فئه s', 'فئه p', 'فئه d', 'فئه f', 'جدول دوري حديث', 'موقع العنصر']
          },
          {
            lessonId: 'u1_l3_matter',
            title: 'الدرس الثالث: المادة وخصائصها',
            primaryKeywords: ['ماده', 'الماده', 'كثافه', 'الكثافه', 'كتله', 'الكتله', 'حجم', 'الحجم', 'طفو', 'غوص', 'يطفو', 'يغوص', 'زيت البترول', 'حرائق البترول', 'خشب', 'فلين', 'مسمار الحديد', 'بالونات الهيليوم', 'قانون الكثافه', 'تطبيقات الكثافه', 'مركب', 'المركب', 'عنصر', 'العنصر', 'مواد نقيه', 'مركبات عضويه', 'مركبات غير عضويه']
          },
          {
            lessonId: 'u1_l4_bonds',
            title: 'الدرس الرابع: الروابط الكيميائية',
            primaryKeywords: ['رابطه', 'الرابطه', 'روابط', 'الروابط', 'رابطه ايونيه', 'رابطه تساهميه', 'ايونيه', 'تساهميه', 'ايون موجب', 'ايون سالب', 'ايونات', 'فقد الكترونات', 'اكتساب الكترونات', 'مشاركه الكترونيه', 'ملح الطعام', 'كلوريد الصوديوم', 'جزيء الماء', 'h2o', 'nacl', 'تفاعل كيميائي']
          },
          {
            lessonId: 'u2_l1_electric',
            title: 'الدرس الأول: القوى الكهربية',
            primaryKeywords: ['كهرباء', 'الكهرباء', 'قوى كهربيه', 'القوى الكهربيه', 'شحنه كهربيه', 'شحنات كهربيه', 'شحنه موجبه', 'شحنه سالبه', 'تجاذب وتنافر', 'كهرباء ساكنه', 'دلك', 'شحن بالدلك', 'شحن باللمس', 'شحن بالتاثير', 'كشاف كهربي', 'تيار كهربي', 'دائره كهربيه', 'موصلات', 'عوازل']
          },
          {
            lessonId: 'u2_l2_magnetic',
            title: 'الدرس الثاني: القوى المغناطيسية',
            primaryKeywords: ['مغناطيس', 'المغناطيس', 'قوى مغناطيسيه', 'القوى المغناطيسيه', 'مجال مغناطيسي', 'المجال المغناطيسي', 'قطب شمالي', 'قطب جنوبي', 'اقطاب مغناطيسيه', 'مغناطيس كهربي', 'المغناطيس الكهربي', 'دينامو', 'مولد كهربي', 'محرك كهربي', 'موتور', 'بوصله', 'حديد مطاوع']
          },
          {
            lessonId: 'u2_l3_gravity',
            title: 'الدرس الثالث: قوى الجاذبية',
            primaryKeywords: ['جاذبيه', 'الجاذبيه', 'قوى الجاذبيه', 'جاذبيه ارضيه', 'الجاذبيه الارضيه', 'نيوتن', 'وزن', 'الوزن', 'كتله ووزن', 'الفرق بين الكتله والوزن', 'عجله الجاذبيه', 'مركز الثقل', 'ميزان زنبركي', 'جاذبيه القمر', 'قانون الوزن']
          },
          {
            lessonId: 'u3_l1_cells',
            title: 'الدرس الأول: الخلايا والحياة',
            primaryKeywords: ['خليه', 'الخليه', 'خلايا', 'الخلايا', 'خليه نباتيه', 'الخليه النباتيه', 'خليه حيوانيه', 'الخليه الحيوانيه', 'جدار خلوي', 'غشاء بلازمي', 'سيتوبلازم', 'نواه الخليه', 'بلاستيدات خضراء', 'بناء ضوئي', 'ميتوكوندريا', 'عضيات', 'روبرت هوك', 'سنتروسوم']
          },
          {
            lessonId: 'u3_l2_traits',
            title: 'الدرس الثاني: الصفات العامة للكائنات الحية',
            primaryKeywords: ['صفات عامه', 'صفات الكائنات', 'خصائص حيويه', 'تغذيه', 'تنفس', 'اخراج', 'تكاثر', 'احساس', 'حركه', 'نمو', 'تكيف', 'التكيف', 'تكيف تركيبي', 'تكيف وظيفي', 'تكيف سلوكي', 'بيات شتوي', 'خمول صيفي', 'هجره الطيور', 'مماتنه', 'المماتنه', 'حرباء', 'حشره العود', 'خف الجمل']
          },
          {
            lessonId: 'u3_l3_microbes',
            title: 'الدرس الثالث: الميكروبات',
            primaryKeywords: ['ميكروب', 'ميكروبات', 'الميكروبات', 'كائنات دقيقه', 'الكائنات الدقيقه', 'بكتيريا', 'البكتيريا', 'فيروس', 'فيروسات', 'فطريات', 'الفطريات', 'اوليات مجهريه', 'اميبا', 'الاميبا', 'براميسيوم', 'البراميسيوم', 'يوجلينا', 'فطر الخميره', 'فطر البنسيليوم', 'بنسلين', 'مضاد حيوي', 'بكتيريا الزبادي']
          },
          {
            lessonId: 'u4_l1_solar_system',
            title: 'الدرس الأول: الأرض والنظام الشمسي',
            primaryKeywords: ['ارض', 'الارض', 'كوكب الارض', 'نظام شمسي', 'المجموعه الشمسيه', 'كواكب', 'عطارد', 'الزهره', 'المريخ', 'المشتري', 'زحل', 'اورانوس', 'نبتون', 'كوكب الحياه', 'كوكب ازرق', 'دوران الارض', 'تعاقب الليل والنهار', 'فصول السنه', 'فصول السنه الاربعه', 'ميل محور الارض']
          },
          {
            lessonId: 'u4_l2_eclipse',
            title: 'الدرس الثاني: خسوف القمر',
            primaryKeywords: ['خسوف', 'خسوف القمر', 'الخسوف', 'كسوف', 'كسوف الشمس', 'الكسوف', 'مخروط الظل', 'شبه الظل', 'خسوف كلي', 'خسوف جزئي', 'كسوف كلي', 'كسوف جزئي', 'استقامه واحده', 'اطوار القمر', 'محاق', 'هلال', 'بدر']
          }
        ];

        let bestTopic = null;
        let bestScore = 0;

        for (const topicItem of TOPIC_KNOWLEDGE) {
          let score = 0;
          for (const kw of topicItem.primaryKeywords) {
            const kwNorm = this._normalizeArabic(kw);
            if (kwNorm === qNorm || kwNorm === strippedQuery) {
              score += 120;
            } else if (` ${qNorm} `.includes(` ${kwNorm} `) || ` ${strippedQuery} `.includes(` ${kwNorm} `)) {
              score += 40;
            } else if (qNorm.includes(kwNorm) || strippedQuery.includes(kwNorm)) {
              score += 25;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestTopic = topicItem;
          }
        }

        if (bestTopic && bestScore >= 25) {
          this._lastTopicId = bestTopic.lessonId;
          this._simplificationLevel = 0;

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
            { label: `فتح درس ${lessonTitle.split(':')[1] || lessonTitle}`, action: `window.appController.selectLessonSession('${bestTopic.lessonId}', 1)` },
            { label: 'المعمل التفاعلي ثلاثي الأبعاد (3D)', action: `window.appController.selectLessonSession('${bestTopic.lessonId}', 1)` },
            { label: '⚡ بسطهالي أكتر', action: `window.appController.quickAskChat('بسطهالي اكتر')` }
          ];

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

        // ─────────────────────────────────────────────────────────────
        // 8) السؤال خارج المنهج — يسجل بلطف في دفتر مستر مينا
        // ─────────────────────────────────────────────────────────────
        resolve({
          answer: `سؤالك ذكي وممتاز يا بطل! وتخصصنا هنا في المنصة هو **منهج العلوم للصف الأول الإعدادي** لنضمن التفوق والدرجة النهائية معاً.\n\nتم **تسجيل سؤالك في دفتر مستر مينا** للإجابة عليه لاحقاً.\n\nيمكنك اختيار أي وحدة أو درس من المنهج لشرحه فوراً:`,
          spokenText: `يا بطل، سؤالك ذكي وجميل جداً، بس تخصصي هنا معاك هو منهج علوم أولى إعدادي عشان نضمن الدرجة النهائية سوا.. وعشانك سجلت سؤالك عندي في الدفتر وهبحثلك عنه للحصة الجاية!`,
          topic: 'out_of_curriculum',
          topicAr: 'خارج المنهج',
          hasExplanation: false,
          topicContent: null,
          isOutOfCurriculum: true,
          actions: [
            { label: 'الوحدة الأولى: المادة', action: `window.appController.toggleStageDropdown(1, 'right')` },
            { label: 'الوحدة الثانية: مجالات القوى', action: `window.appController.toggleStageDropdown(2, 'right')` },
            { label: 'الوحدة الثالثة: الكائنات الحية تركيبها وعملياتها', action: `window.appController.toggleStageDropdown(3, 'left')` },
            { label: 'الوحدة الرابعة: نظام (الأرض - الشمس - القمر)', action: `window.appController.toggleStageDropdown(4, 'left')` }
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
    const generation=this._lessonGeneration=(this._lessonGeneration||0)+1;
    window.appAudioManager.stopAll();
    clearTimeout(this._quizCompleteTimer);
    this._quizScore = 0;

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
    if(section)section.inert=false;
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
        if(generation!==this._lessonGeneration)return;
        const mount = document.getElementById('interactive-lab-mount');
        if (mount) {
          window.interactiveLab.init(mount, targetTopic, this._currentSessionNum || 1);
        }
      }, 120);
    }

    this._loadYouTubeVideos(ytEl, this._topicData.content.ytQuery);

    // Entering or switching a session is silent. The student chooses when to listen.
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
                        <img src="assets/mena_avatar_centered.png" alt="مستر مينا يوضح القاعدة" class="rule-teacher-img" />
                      </div>
                      <div class="rule-speech-bubble">
                        <div class="rule-speaker-tag">
                          <span>💡 قاعدة مستر مينا الذهبية (${title}):</span>
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
                        <img src="assets/mena_avatar_centered.png" alt="مستر مينا يشرح على السبورة" class="why-teacher-img" />
                      </div>
                      <div class="why-speech-bubble">
                        <div class="why-speaker-tag">
                          <span>👨‍🏫 مستر مينا يشرح لك على السبورة:</span>
                          ${wq.audio ? `
                            <span class="why-playing-indicator" id="why-indicator-${idx}" style="display:none; color:#16a34a; font-size:0.82rem; font-weight:700;">
                              <span>🔊 مستر مينا يشرح بصوته...</span>
                            </span>
                          ` : ''}
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
    if (btn.disabled || !btn.isConnected) return;
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
          <img src="assets/mena_avatar_centered.png" alt="مستر مينا يحتفل" class="quiz-feedback-img" style="border: 2px solid #16a34a;" />
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

      const correctAudios = ['quiz_correct_1', 'quiz_correct_2'];
      const chosenCorrect = correctAudios[Math.floor(Math.random() * correctAudios.length)];
      this.playLabAudio(chosenCorrect, `الله ينور عليك يا بطل! إجابة صحيحة 100%! ${explanation}`);
    } else {
      btn.style.background = 'rgba(239, 68, 68, 0.25)';
      btn.style.borderColor = '#ef4444';
      btn.style.color = '#ef4444';
      feedback.className = 'quiz-feedback-card wrong';
      feedback.style.display = 'flex';
      feedback.innerHTML = `
        <div class="quiz-feedback-avatar-wrap">
          <img src="assets/mena_avatar_centered.png" alt="مستر مينا ينبهك" class="quiz-feedback-img" style="border: 2px solid #ef4444;" />
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

      const wrongAudios = ['quiz_wrong_1', 'quiz_wrong_2'];
      const chosenWrong = wrongAudios[Math.floor(Math.random() * wrongAudios.length)];
      this.playLabAudio(chosenWrong, `ركز يا بطل! ${explanation}`);

    }
    const boxes = document.querySelectorAll('.quiz-box');
    if (isCorrect && boxes.length && document.querySelectorAll('.quiz-feedback-card.correct').length === boxes.length) {
      clearTimeout(this._quizCompleteTimer);
      this._quizCompleteTimer = setTimeout(() => {
        if (parentBox.isConnected && document.getElementById('explanation-section')?.classList.contains('visible')) {
          this.playLabAudio('quiz_completed_perfect', 'برافو يا بطل! أجبت عن كل الأسئلة إجابة صحيحة.');
        }
      }, 3500);
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
    });

    if (!isAlreadyOpen) {
      card.classList.add('active');
      ans.style.maxHeight = '600px';
    }
  }

  // ═════════════════════════════════════════════════════════════
  // ❓ INTERACTIVE WHY QUESTIONS HANDLERS (تفاعل أسئلة علل بصوت مستر مينا الحقيقي فقط)
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
      ans.style.maxHeight = '650px';

      const questions = this._currentWhyQuestions || (this._topicData?.content?.sections?.find(s => s.whyQuestions)?.whyQuestions) || [];
      const wq = questions[idx];
      const ind = document.getElementById(`why-indicator-${idx}`);

      // إذا كان السؤال له تسجيل حقيقي فقط يتم تشغيله، وإذا كان audio: null يتوقف الصوت تماماً بدون أي أصوات ذكاء اصطناعي
      if (wq && wq.audio) {
        if (ind) ind.style.display = 'inline-flex';
        window.appAudioManager?.stopAll();
        window.appAudioManager?.play(`audio_cache/${wq.audio}.mp3`, () => {
          const currentInd = document.getElementById(`why-indicator-${idx}`);
          if (currentInd) currentInd.style.display = 'none';
        });
      } else {
        if (ind) ind.style.display = 'none';
        window.appAudioManager?.stopAll();
      }

      if (wq) {
        this.typewriterSpeech(`إجابة سؤال علل: ${wq.a}`);
      }
    } else {
      window.appAudioManager?.stopAll();
    }
  }

  playWelcomeVoice() {
    window.appAudioManager?.stopAll();
    const welcomeText = 'أهلاً بيك يا دكتور أنا مستر مينا جرجس معلم العلوم ومساعدك الذكي! جاهز لشرح أي درس في المنهج، وتوضيح أي تجربة في المعمل، والإجابة على كل أسئلتك فوراً. يلا بينا نبدأ رحلة التفوق مع بعض!';
    this.typewriterSpeech(welcomeText);
    window.appAudioManager?.play('audio_cache/welcome_mr_mena.mp3');
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
    if(window.interactiveLab?.building)return;
    const labSpeechMap = {
      'lab_atom_C': 'ذرة الكربون C أساس كل الكائنات الحية، عددها الذري 6 وكتلتها 12، توزيعها 2 في المستوى K و 4 في المستوى L، وبتقدر تعمل أربع روابط تساهمية قوية!',
      'lab_atom_H': 'ذرة الهيدروجين H هي أبسط ذرة في الكون، نواتها فيها بروتون واحد بس وبدون أي نيوترونات، وبيدور حواليها إلكترون واحد في المستوى K!',
      'lab_atom_He': 'ذرة الهيليوم He غاز خامل نبيل، نواتها فيها 2 بروتون و 2 نيوترون، ومستوى طاقتها الوحيد K مكتمل بـ 2 إلكترون عشان كده مستقرة ومبتتفاعلش!',
      'lab_atom_O': 'ذرة الأكسجين O سر التنفس والحياة، عددها الذري 8، وتوزيعها 2 في المستوى K و 6 في المستوى L، ولازم تكتسب أو تشارك بـ 2 إلكترون عشان تكمل مستواها الخارجي بـ 8 وتستقر!',
      'lab_atom_Na': 'ذرة الصوديوم Na فلز نشط جداً، عددها الذري 11، توزيعها 2 في المستوى K و 8 في المستوى L و 1 في المستوى M، بتميل إنها تفقد الإلكترون الأخير بسهولة وتتحول لأيون موجب Na+!',
      'lab_atom_H1': 'البروتيوم هو الهيدروجين العادي وأبسط ذرة في الكون؛ نواته فيها بروتون واحد فقط وبدون أي نيوترونات (n=0)، كتلته 1 وعنده إلكترون واحد يدور في المستوى K!',
      'lab_atom_H2': 'الديوتيريوم نظير هيدروجين؛ نواته فيها بروتون واحد وانضاف له نيوترون متعادل، عدده الذري 1 بس كتلته بقت 2! ونفس الخواص الكيميائية عشان مداره فيه إلكترون واحد!',
      'lab_atom_H3': 'التريتيوم نظير هيدروجين مشع أثقل؛ نواته فيها بروتون واحد و 2 نيوترون فكتلته بقت 3! لاحظ إن التلاتة متفقين في العدد الذري 1 ومختلفين في الكتلة عشان النيوترونات!',
      'lab_atom_Ne': 'غاز النيون عدد ذري 10، توزيعه [K=2, L=8]. مداره الخارجي مكتمل تماماً بـ 8 إلكترونات، عشان كده هو غاز خامل ومستقر كيميائياً ومش محتاج يدخل أي تفاعل!',
      'lab_atom_Ar': 'غاز الأرجون عدده الذري 18، متوزع [K=2, L=8, M=8]. لا يتحمل المدار الخارجي لأي ذرة أكثر من 8 إلكترونات، وهو مستقر جداً ولا يتفاعل!',
      'lab_atom_Cl': 'الكلور عدده الذري 17، توزيعه [K=2, L=8, M=7]. مداره الخارجي ناقصه إلكترون واحد عشان يكتمل لـ 8، فبيميل لاكتسابه في التفاعل، عشان كده هو لافلز نشط جداً!',
      'lab_density_wood': 'الخشب كثافته أقل من كثافة الماء (1 جم/سم³)، عشان كده بيطفو الخشب فوق سطح الماء ومبيغوصش في القاع أبداً!',
      'lab_density_oil': 'الزيت كثافته أقل من كثافة الماء، عشان كده بيطفو الزيت فوق سطح الماء، وده يفسر سر خطير في الامتحانات: ليه حرائق البترول لا تطفأ بالماء؟ لأن الزيت يطفو ويستمر في الاشتعال!',
      'lab_density_cork': 'الفلين مادة مسامية خفيفة جداً مليانة هواء وكثافتها أقل بكثير من كثافة الماء، عشان كده بيطفو الفلين بثبات عالي فوق سطح الماء!',
      'lab_density_iron': 'الحديد مادة ثقيلة وكثافتها أكبر بكثير من كثافة الماء (حوالي 7.8 جم/سم³)، عشان كده مسمار الحديد بيهبط ويغوص لقاع الحوض فوراً!',
      'lab_eclipse_solar': 'في كسوف الشمس يقع القمر بين الشمس والأرض على استقامة واحدة ويحجب ضوء الشمس نهاراً!',
      'lab_eclipse_lunar': 'في خسوف القمر تقع الأرض بين الشمس والقمر وتحجب ضوء الشمس الساقط عليه ليلاً!',
      'lab_cell_plant': 'الخلية النباتية وحدة بناء النبات، بتتميز بوجود جدار خلوي قوي من السليلوز بيديها شكل ثابت، وبلاستيدات خضراء للبناء الضوئي، وفجوة عصارية مركزية عملاقة!',
      'lab_cell_animal': 'الخلية الحيوانية وحدة بناء جسم الحيوان والإنسان، محاطة بغشاء بلازمي مرن ومافيهاش جدار خلوي، وبتتميز بوجود الجسم المركزي (السنتروسوم) لانقسام الخلية!',
      'lab_cell_nucleus': 'النواة هي عقل ومركز تحكم الخلية! بتحتوي على المادة الوراثية DNA والكروموسومات اللي بتنقل صفاتك الوراثية، ومسؤولة عن تنظيم كل أنشطة الخلية وانقسامها!',
      'lab_cell_chloro': 'البلاستيدات الخضراء دي مصنع أكل النبات! فيها صبغة الكلوروفيل الخضراء اللي بيمتص طاقة ضوء الشمس عشان تعمل عملية البناء الضوئي وتنتج سكر الجلوكوز وغاز الأكسجين!',
      'lab_bond_ionic': 'الرابطة الأيونية بتنشأ نتيجة تجاذب كهربي قوي بين أيون موجب لفلز فقد إلكترون زي الصوديوم Na+ وأيون سالب للافلز اكتسب إلكترون زي الكلور Cl-، فبيدونا بلورة ملح الطعام NaCl!',
      'lab_bond_covalent': 'الرابطة التساهمية بتنشأ بين اللافلزات عن طريق مشاركة كل ذرة بعدد من الإلكترونات، في جزيء الماء H2O ذرة الأكسجين بتشارك بإلكترون مع كل ذرة هيدروجين فتعمل رابطتين تساهميتين أحاديتين!'
    };

    const missingAudio = window.MENA_AUDIO_IDS && !window.MENA_AUDIO_IDS.has(audioId);
    const textToSpeak = (fallbackText || labSpeechMap[audioId] || '') + (missingAudio ? '\nالتسجيل الصوتي لهذه الفقرة غير متاح حالياً؛ يمكنك متابعة الشرح المكتوب.' : '');
    if (textToSpeak) {
      this.typewriterSpeech(textToSpeak);
    }

    const audioMp3 = `audio_cache/${audioId}.mp3`;
    window.appAudioManager.stopAll();
    window.appAudioManager.play(audioMp3);
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
      if (window.MENA_AUDIO_IDS && !window.MENA_AUDIO_IDS.has(`${prefix}_s${sessionNum}`)) {
        this.typewriterSpeech('التسجيل الصوتي لهذه الحصة غير متاح حالياً.\n' + (spokenText || 'يمكنك متابعة الشرح المكتوب.'));
        return;
      }
      window.appAudioManager.play(audioMp3);
    }
  }

  playLabAudioForCurrentElement() {
    const topicId = this._topicData?.topic || 'u1_l1_atom';
    if (topicId.includes('atom') || topicId.includes('u1_l1')) {
      const el = window.interactiveLab?.atomData?.element || 'Carbon';
      const symbolMap = {
        'Carbon': 'C', 'Hydrogen': 'H', 'Helium': 'He', 'Oxygen': 'O', 'Sodium': 'Na',
        'Hydrogen-1': 'H1', 'Hydrogen-2': 'H2', 'Hydrogen-3': 'H3',
        'Neon': 'Ne', 'Argon': 'Ar', 'Chlorine': 'Cl'
      };
      const sym = symbolMap[el] || el || 'C';
      const fallback = window.interactiveLab?.atomData?.text || '';
      this.playLabAudio(`lab_atom_${sym}`, fallback);
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
    userMsg.innerHTML = `<strong>أنت:</strong> ${this._escapeHTML(query)}`;
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
      botMsg.innerHTML = `<strong>👨‍🏫 مستر مينا:</strong><br>${this._escapeHTML(result.answer).replace(/\n/g, '<br>')}`;
      msgContainer.scrollTop = msgContainer.scrollHeight;

      // Speak
      if (result.spokenText) {
        this._speakAudio(result.spokenText);
      }
    } catch (e) {
      botMsg.innerHTML = `<strong>👨‍🏫 مستر مينا:</strong><br>تعذّر تجهيز الإجابة؛ حاول مرة أخرى.`;
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
    this._lessonGeneration=(this._lessonGeneration||0)+1;
    clearTimeout(this._quizCompleteTimer);
    window.appAudioManager.stopAll();
    if (window.interactiveLab) {
      window.interactiveLab.destroy();
    }
    this.closeStageDrawers();
    this.toggleLiveChat(false);
    const section=document.getElementById('explanation-section');
    if(section){section.inert=true;section.classList.remove('visible');}

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
  if (document.body.classList.contains('mina-mobile')) return;
  window.appController = new AppController();
});

