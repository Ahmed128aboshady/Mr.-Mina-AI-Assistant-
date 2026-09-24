/**
 * auth.js — نظام إدارة الطلاب والدخول الحصري بجهاز واحد (Strict Single-Device Lock)
 * منصة الكيميائي في العلوم - أ. مينا جرجس
 * مزود بقاعدة بيانات Supabase (https://supabase.com/)
 */

window.MenaAuth = {
  // ── 1. معرّف الجهاز الثابت (Persistent Device Fingerprint) ──
  getDeviceId() {
    let devId = localStorage.getItem('mena_device_uuid');
    if (!devId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        devId = 'dev_' + crypto.randomUUID();
      } else {
        devId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      }
      localStorage.setItem('mena_device_uuid', devId);
    }
    return devId;
  },

  getDeviceName() {
    const ua = navigator.userAgent;
    let os = 'جهاز غير معروف';
    if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone/iPad (iOS)';
    else if (/Android/i.test(ua)) os = 'هاتف Android';
    else if (/Windows/i.test(ua)) os = 'كمبيوتر Windows';
    else if (/Macintosh|Mac OS/i.test(ua)) os = 'جهاز Mac';
    else if (/Linux/i.test(ua)) os = 'نظام Linux';

    let browser = 'متصفح ويب';
    if (/Chrome|CriOS/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';

    return `${os} (${browser})`;
  },

  // ── 2. إدارة الجلسة المحلية (Session Management) ──
  getCurrentStudent() {
    try {
      const raw = localStorage.getItem('mena_current_student');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(student) {
    localStorage.setItem('mena_current_student', JSON.stringify(student));
    this.updateHeaderUI();
  },

  logout() {
    localStorage.removeItem('mena_current_student');
    this.updateHeaderUI();
    this.showLoginModal();
  },

  isLoggedIn() {
    return !!this.getCurrentStudent();
  },

  // ── 3. تسجيل الدخول والتحقق من الجهاز المشدد ──
  async login(username, password) {
    username = (username || '').trim();
    password = (password || '').trim();

    if (!username || !password) {
      return { success: false, message: 'برجاء إدخال اسم المستخدم وكلمة المرور.' };
    }

    const currentDeviceId = this.getDeviceId();
    const currentDeviceName = this.getDeviceName();
    const isConfigured = window.MENA_SUPABASE_CONFIG?.isConfigured();
    const supabase = window.getSupabaseClient();

    // ── الحالة أ: Supabase متصل بالإنترنت ──
    if (isConfigured && supabase) {
      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('username', username)
          .single();

        if (error || !student) {
          return { success: false, message: 'اسم المستخدم غير مسجل، برجاء مراجعة مستر مينا.' };
        }

        if (student.password !== password) {
          return { success: false, message: 'كلمة المرور غير صحيحة، حاول مرة أخرى.' };
        }

        if (student.is_active === false) {
          return { success: false, message: '⚠️ هذا الحساب معطل حالياً، برجاء مراجعة مستر مينا.' };
        }

        // 🔒 التحقق الصارم من قفل الجهاز الواحد (Single Device Enforcement)
        if (!student.registered_device_id) {
          // أول تسجيل دخول: ربط الحساب بهذا الجهاز فورياً وتثبيته
          const nowIso = new Date().toISOString();
          const { error: updateErr } = await supabase
            .from('students')
            .update({
              registered_device_id: currentDeviceId,
              registered_device_name: currentDeviceName,
              registered_at: nowIso,
              last_login: nowIso
            })
            .eq('id', student.id);

          if (updateErr) {
            console.warn("Device bind error:", updateErr);
          }

          student.registered_device_id = currentDeviceId;
          student.registered_device_name = currentDeviceName;
          this.setSession(student);
          this.logActivity(student.id, username, 'login_first_device', { device: currentDeviceName });
          return { success: true, student, firstDevice: true };
        } else if (student.registered_device_id === currentDeviceId) {
          // نفس الجهاز المعتمد
          const nowIso = new Date().toISOString();
          await supabase
            .from('students')
            .update({ last_login: nowIso })
            .eq('id', student.id);

          this.setSession(student);
          this.logActivity(student.id, username, 'login_success', { device: currentDeviceName });
          return { success: true, student };
        } else {
          // 🚫 جهاز مختلف! محاولة دخول من جهاز ثاني مرفوضة تماماً
          this.logActivity(student.id, username, 'login_blocked_multidevice', {
            attemptedDevice: currentDeviceName,
            registeredDevice: student.registered_device_name
          });

          return {
            success: false,
            deviceLocked: true,
            message: `⚠️ تنبيه أمني مشدد: هذا الحساب مسجل ومربوط بالفعل بجهاز آخر (${student.registered_device_name || 'جهاز معتمد سابق'}) ولا يمكن استخدامه إلا على جهاز واحد فقط. برجاء التواصل مع مستر مينا جرجس لإعادة ضبط جهازك.`
          };
        }
      } catch (err) {
        console.error("Login request error:", err);
        return { success: false, message: 'حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت.' };
      }
    }

    // ── الحالة ب: محاكاة محلية ذكية حتى يتم إدخال مفاتيح Supabase ──
    const mockDbKey = 'mena_mock_students_db';
    let mockStudents = [];
    try {
      mockStudents = JSON.parse(localStorage.getItem(mockDbKey) || '[]');
    } catch(e) {}

    if (mockStudents.length === 0) {
      mockStudents = [
        { id: '1', username: 'student1', password: '123456', full_name: 'أحمد محمد علي', grade: 'الصف الأول الإعدادي', registered_device_id: null, is_active: true },
        { id: '2', username: 'student2', password: '123456', full_name: 'مريم جرجس حنا', grade: 'الصف الأول الإعدادي', registered_device_id: null, is_active: true },
        { id: '3', username: 'mena_demo', password: '123456', full_name: 'طالب تجريبي (مستر مينا)', grade: 'الصف الأول الإعدادي', registered_device_id: null, is_active: true },
        { id: '4', username: 'admin', password: 'admin', full_name: 'أ. مينا جرجس (المدير)', grade: 'الإدارة العامة', registered_device_id: null, is_active: true }
      ];
      localStorage.setItem(mockDbKey, JSON.stringify(mockStudents));
    } else if (!mockStudents.some(s => s.username.toLowerCase() === 'admin')) {
      mockStudents.push({ id: '4', username: 'admin', password: 'admin', full_name: 'أ. مينا جرجس (المدير)', grade: 'الإدارة العامة', registered_device_id: null, is_active: true });
      localStorage.setItem(mockDbKey, JSON.stringify(mockStudents));
    }

    const student = mockStudents.find(s => s.username.toLowerCase() === username.toLowerCase());
    if (!student) {
      return { success: false, message: 'اسم المستخدم غير مسجل، برجاء مراجعة مستر مينا.' };
    }

    // السماح لـ admin بالدخول بكلمة سر admin أو 123456
    const isAdminPass = student.username.toLowerCase() === 'admin' && (password === 'admin' || password === '123456');
    if (!isAdminPass && student.password !== password) {
      return { success: false, message: 'كلمة المرور غير صحيحة.' };
    }

    if (!student.registered_device_id) {
      student.registered_device_id = currentDeviceId;
      student.registered_device_name = currentDeviceName;
      student.registered_at = new Date().toISOString();
      student.last_login = new Date().toISOString();
      localStorage.setItem(mockDbKey, JSON.stringify(mockStudents));
      this.setSession(student);
      return { success: true, student, firstDevice: true };
    } else if (student.registered_device_id === currentDeviceId) {
      student.last_login = new Date().toISOString();
      localStorage.setItem(mockDbKey, JSON.stringify(mockStudents));
      this.setSession(student);
      return { success: true, student };
    } else {
      return {
        success: false,
        deviceLocked: true,
        message: `⚠️ تنبيه أمني مشدد: هذا الحساب مسجل ومربوط بالفعل بجهاز آخر (${student.registered_device_name || 'جهاز مسجل'}) ولا يمكن فتحه إلا على جهاز واحد فقط. برجاء التواصل مع مستر مينا لإعادة ضبط الجهاز.`
      };
    }
  },

  async logActivity(studentId, username, type, details) {
    const supabase = window.getSupabaseClient();
    if (supabase && window.MENA_SUPABASE_CONFIG?.isConfigured()) {
      try {
        await supabase.from('student_activity').insert({
          student_id: studentId,
          student_username: username,
          activity_type: type,
          details: details
        });
      } catch (e) {}
    }
  },

  // ── 4. واجهة تسجيل الدخول المنبثقة (Modal UI) ──
  init() {
    this.injectStyles();
    this.createModalDOM();
    this.updateHeaderUI();

    if (!this.isLoggedIn()) {
      this.showLoginModal();
    }
  },

  injectStyles() {
    if (document.getElementById('mena-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'mena-auth-styles';
    style.textContent = `
      .mena-auth-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.88);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.35s ease;
        font-family: 'Cairo', system-ui, sans-serif;
      }
      .mena-auth-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .mena-auth-card {
        background: linear-gradient(145deg, #0d1829, #070e1b);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 24px;
        width: 100%;
        max-width: 440px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(2, 132, 199, 0.25);
        padding: 28px 24px;
        direction: rtl;
        text-align: right;
        color: #f8fafc;
        transform: scale(0.94);
        transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .mena-auth-modal-overlay.active .mena-auth-card {
        transform: scale(1);
      }
      .mena-auth-header {
        text-align: center;
        margin-bottom: 22px;
      }
      .mena-auth-logo {
        width: 96px;
        height: 96px;
        margin: 0 auto 16px;
        border-radius: 50%;
        border: 2px solid rgba(56, 189, 248, 0.6);
        background: radial-gradient(circle, #0e3a63 0%, #070e1b 100%);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 25px rgba(2, 132, 199, 0.45);
      }
      .mena-auth-logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        display: block;
      }
      .mena-auth-title {
        font-size: 1.35rem;
        font-weight: 800;
        color: #f1f5f9;
        margin-bottom: 4px;
      }
      .mena-auth-sub {
        font-size: 0.88rem;
        color: #94a3b8;
      }
      .mena-auth-form-group {
        margin-bottom: 16px;
      }
      .mena-auth-label {
        display: block;
        font-size: 0.86rem;
        font-weight: 700;
        color: #cbd5e1;
        margin-bottom: 6px;
      }
      .mena-auth-input {
        width: 100%;
        padding: 12px 14px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid #334155;
        border-radius: 12px;
        color: #fff;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .mena-auth-input:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
      }
      .mena-auth-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #0284c7, #2563eb);
        border: none;
        border-radius: 14px;
        color: #fff;
        font-size: 1.05rem;
        font-weight: 800;
        font-family: inherit;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.2s;
        margin-top: 8px;
        box-shadow: 0 8px 24px rgba(2, 132, 199, 0.4);
      }
      .mena-auth-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(2, 132, 199, 0.6);
      }
      .mena-auth-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .mena-auth-error {
        margin-top: 14px;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.85rem;
        line-height: 1.5;
        display: none;
      }
      .mena-auth-error.active {
        display: block;
      }
      .mena-auth-error.normal {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid #ef4444;
        color: #fca5a5;
      }
      .mena-auth-error.locked {
        background: rgba(245, 158, 11, 0.18);
        border: 1px solid #f59e0b;
        color: #fde68a;
      }
      .mena-auth-footer-links {
        margin-top: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        color: #64748b;
      }
      .mena-auth-config-link {
        color: #38bdf8;
        cursor: pointer;
        text-decoration: underline;
      }
      /* Top Bar Student Info Badge */
      .mena-student-chip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(56, 189, 248, 0.45);
        padding: 7px 16px;
        border-radius: 24px;
        font-size: 0.85rem;
        color: #f8fafc;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(2, 132, 199, 0.2);
        pointer-events: auto !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        user-select: none;
        position: relative;
        z-index: 99999;
      }
      .mena-student-chip .student-name {
        font-weight: 800;
        color: #38bdf8;
      }
      .mena-student-chip .student-logout-btn {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.55);
        color: #fca5a5;
        padding: 4px 12px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.76rem;
        font-weight: 800;
        transition: all 0.2s ease;
        pointer-events: auto !important;
        outline: none;
      }
      .mena-student-chip .student-logout-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
        transform: scale(1.06);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      }
      .mena-student-chip .student-logout-btn:active {
        transform: scale(0.96);
      }
    `;
    document.head.appendChild(style);
  },

  createModalDOM() {
    if (document.getElementById('mena-auth-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'mena-auth-modal-overlay';
    overlay.id = 'mena-auth-overlay';
    overlay.innerHTML = `
      <div class="mena-auth-card">
        <div class="mena-auth-header">
          <div class="mena-auth-logo">
            <img src="assets/mena_avatar_centered.png" alt="مستر مينا جرجس" />
          </div>
          <div class="mena-auth-title">منصة الخيميائي في العلوم</div>
          <div class="mena-auth-sub">بإشراف: أ. مينا جرجس</div>
        </div>

        <form id="mena-auth-form" onsubmit="MenaAuth.handleSubmit(event)">
          <div class="mena-auth-form-group">
            <label class="mena-auth-label">اسم المستخدم (المسلم من مستر مينا)</label>
            <input type="text" id="mena-auth-user" class="mena-auth-input" placeholder="مثال: student1" required autofocus />
          </div>

          <div class="mena-auth-form-group">
            <label class="mena-auth-label">كلمة المرور</label>
            <input type="password" id="mena-auth-pass" class="mena-auth-input" placeholder="••••••••" required />
          </div>

          <button type="submit" id="mena-auth-submit-btn" class="mena-auth-btn">
            تسجيل الدخول للمنصة
          </button>

          <div id="mena-auth-error-box" class="mena-auth-error"></div>
        </form>

        <div class="mena-auth-footer-links" style="justify-content: center; text-align: center;">
          <span>نسيت بياناتك؟ راجع مستر مينا</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // اختصار لوحة المفاتيح لمستر مينا فقط (Ctrl + Shift + S) لضبط إعدادات Supabase بدون ظهور أي زر للطلاب
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        MenaAuth.showConfigModal();
      }
    });
  },

  showLoginModal() {
    const overlay = document.getElementById('mena-auth-overlay');
    if (overlay) {
      overlay.classList.add('active');
      const passInput = document.getElementById('mena-auth-pass');
      if (passInput) passInput.value = '';
      const userInput = document.getElementById('mena-auth-user');
      if (userInput) {
        userInput.value = '';
        setTimeout(() => userInput.focus(), 150);
      }
      const errBox = document.getElementById('mena-auth-error-box');
      if (errBox) {
        errBox.className = 'mena-auth-error';
        errBox.textContent = '';
      }
    }
  },

  hideLoginModal() {
    const overlay = document.getElementById('mena-auth-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  async handleSubmit(e) {
    e.preventDefault();
    const userEl = document.getElementById('mena-auth-user');
    const passEl = document.getElementById('mena-auth-pass');
    const btn = document.getElementById('mena-auth-submit-btn');
    const errBox = document.getElementById('mena-auth-error-box');

    const username = userEl?.value.trim();
    const password = passEl?.value.trim();

    if (!username || !password) return;

    btn.disabled = true;
    btn.textContent = 'جاري التحقق من الحساب والجهاز...';
    errBox.className = 'mena-auth-error';
    errBox.textContent = '';

    const res = await this.login(username, password);

    btn.disabled = false;
    btn.textContent = 'تسجيل الدخول للمنصة';

    if (res.success) {
      this.hideLoginModal();
      
      // الترحيب الصوتي لمستر مينا عند الدخول
      if (window.appController?.playWelcomeVoice) {
        setTimeout(() => window.appController.playWelcomeVoice(), 500);
      } else if (window.MobileApp?.playWelcomeAudio) {
        setTimeout(() => window.MobileApp.playWelcomeAudio(), 500);
      }

      const toast = document.createElement('div');
      toast.textContent = `مرحباً بك يا دكتور ${res.student.full_name || username}!`;
      toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#0f274a; color:#38bdf8; border:1px solid #0284c7; padding:12px 24px; border-radius:30px; font-weight:800; font-size:1rem; z-index:9999999; box-shadow:0 8px 30px rgba(0,0,0,0.6);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    } else {
      errBox.classList.add('active', res.deviceLocked ? 'locked' : 'normal');
      errBox.textContent = res.message;
    }
  },

  updateHeaderUI() {
    const student = this.getCurrentStudent();
    const isMobile = !!document.querySelector('.mobile-app-container') || (window.location && window.location.pathname.includes('mobile.html'));

    if (isMobile) {
      // 2. في نسخة الموبايل (mobile.html)
      let mobileContainer = document.getElementById('mobile-student-chip-container');
      if (!mobileContainer) {
        mobileContainer = document.createElement('div');
        mobileContainer.id = 'mobile-student-chip-container';
        document.body.appendChild(mobileContainer);
      } else if (mobileContainer.parentElement !== document.body) {
        document.body.appendChild(mobileContainer);
      }
      mobileContainer.style.cssText = 'position:fixed; top:12px; left:12px; z-index:99999; pointer-events:auto; display:flex; align-items:center;';

      if (student) {
        mobileContainer.innerHTML = `
          <div class="mena-student-chip" style="padding:4px 10px; font-size:0.75rem;">
            <span class="student-name">${(student.full_name || student.username).split(' ')[0]}</span>
            <button type="button" class="student-logout-btn" onclick="window.MenaAuth.logout()">خروج</button>
          </div>
        `;
      } else {
        mobileContainer.innerHTML = `
          <button type="button" onclick="window.MenaAuth.showLoginModal()" style="background:#0284c7; color:#fff; border:none; padding:5px 12px; border-radius:14px; font-weight:700; cursor:pointer; font-size:0.75rem; box-shadow:0 4px 12px rgba(2,132,199,0.4); pointer-events:auto;">
            دخول
          </button>
        `;
      }
    } else {
      // 1. في نسخة الديسكتوب (index.html)
      let deskContainer = document.getElementById('desktop-student-chip-container');
      if (!deskContainer) {
        deskContainer = document.createElement('div');
        deskContainer.id = 'desktop-student-chip-container';
        document.body.appendChild(deskContainer);
      } else if (deskContainer.parentElement !== document.body) {
        document.body.appendChild(deskContainer);
      }
      deskContainer.style.cssText = 'position:fixed; top:14px; left:24px; z-index:99999; pointer-events:auto; display:flex; align-items:center;';

      if (student) {
        deskContainer.innerHTML = `
          <div class="mena-student-chip">
            <span class="student-name">${student.full_name || student.username}</span>
            <span style="color:#94a3b8; font-size:0.75rem;">(${student.grade || '1ع'})</span>
            <button type="button" class="student-logout-btn" onclick="window.MenaAuth.logout()" title="تسجيل الخروج">خروج</button>
          </div>
        `;
      } else {
        deskContainer.innerHTML = `
          <button type="button" onclick="window.MenaAuth.showLoginModal()" style="background:linear-gradient(135deg, #0284c7, #2563eb); color:#fff; border:none; padding:8px 18px; border-radius:20px; font-weight:800; cursor:pointer; font-size:0.85rem; box-shadow:0 6px 18px rgba(2,132,199,0.45); pointer-events:auto; transition:transform 0.15s;">
            تسجيل دخول الطالب
          </button>
        `;
      }
    }
  },

  showConfigModal() {
    const currentUrl = window.MENA_SUPABASE_CONFIG?.getUrl() || '';
    const currentKey = window.MENA_SUPABASE_CONFIG?.getAnonKey() || '';

    const newUrl = prompt("أدخل رابط مشروع Supabase (Project URL):", currentUrl);
    if (newUrl === null) return;
    const newKey = prompt("أدخل المفتاح العام (Anon Public Key):", currentKey);
    if (newKey === null) return;

    if (newUrl.trim() && newKey.trim()) {
      window.MENA_SUPABASE_CONFIG.setConfig(newUrl, newKey);
      alert("✅ تم حفظ إعدادات Supabase بنجاح! سيتم إعادة تحميل الصفحة للتطبيق.");
      window.location.reload();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.MenaAuth.init();
});
