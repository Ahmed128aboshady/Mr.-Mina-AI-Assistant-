/**
 * layout_editor.js — Layer-Based Odoo Studio Website Builder
 * Features: PIN 4040 Protection, Chat Pill Auto-Centering, Safe Dragging, Canva-Lock, Layer Tree & Deletion
 */

class OdooWebsiteBuilder {
  constructor() {
    this.isEditMode = false;
    this.isSidebarCollapsed = false;
    this.currentTab = 'blocks';
    this.selectedLayerId = null;
    this.selectedCustomBlockId = null;
    this.ADMIN_PIN = "4040";

    // Independent Isolated Layers (Core Elements with User-Tuned Defaults)
    this.defaultLayers = {
      avatar: { id: 'avatar', name: 'الأفاتار (مستر مينا)', icon: '👤', selector: '#stage-center-avatar', x: -16, y: -531, scale: 0.96, rotY: 0, zIndex: 25, visible: true, locked: false },
      logo: { id: 'logo', name: 'اللوجو واسم المنصة', icon: '🏷️', selector: '.header-logo-wrap', x: -30, y: 104, scale: 1.34, rotY: 0, zIndex: 50, visible: true, locked: false },
      badges: { id: 'badges', name: 'أزرار الصفوف (1, 2, 3)', icon: '🔢', selector: '.grade-badges-col', x: 122, y: 77, scale: 0.82, rotY: 0, zIndex: 50, visible: true, locked: false },
      stage1: { id: 'stage1', name: 'كارت المرحلة الأولى', icon: '📘', selector: '#stage-card-1', x: 202, y: 8, scale: 1, rotY: 0, zIndex: 30, visible: true, locked: false },
      stage2: { id: 'stage2', name: 'كارت المرحلة الثانية', icon: '📗', selector: '#stage-card-2', x: 200, y: 16, scale: 1, rotY: 0, zIndex: 30, visible: true, locked: false },
      stage3: { id: 'stage3', name: 'كارت المرحلة الثالثة', icon: '📙', selector: '#stage-card-3', x: -210, y: 8, scale: 1, rotY: 0, zIndex: 30, visible: true, locked: false },
      stage4: { id: 'stage4', name: 'كارت المرحلة الرابعة', icon: '📕', selector: '#stage-card-4', x: -210, y: 21, scale: 1, rotY: 0, zIndex: 30, visible: true, locked: false },
      rightCol: { id: 'rightCol', name: 'عمود الكروت الأيمن (1 و 2)', icon: '📑', selector: '.stage-column-right', x: 105, y: 0, scale: 1, rotY: -17, zIndex: 20, visible: true, locked: false },
      leftCol: { id: 'leftCol', name: 'عمود الكروت الأيسر (3 و 4)', icon: '📑', selector: '.stage-column-left', x: 105, y: 0, scale: 1, rotY: 17, zIndex: 20, visible: true, locked: false },
      chat: { id: 'chat', name: 'شريط الشات والمايك السفلي', icon: '💬', selector: '#home-bottom-chat-pill', x: 0, y: 47, scale: 1.22, height: 68, rotY: 0, zIndex: 60, visible: true, locked: false },
      lessonAvatar: { id: 'lessonAvatar', name: 'أفاتار مستر مينا في الدرس', icon: '👨‍🏫', selector: '#lesson-character-stage', x: 0, y: 0, scale: 1, width: 320, rotY: 0, zIndex: 25, visible: true, locked: false },
      lessonBubble: { id: 'lessonBubble', name: 'كتابة وبوب اب الشرح (الدرس)', icon: '💬', selector: '#lesson-avatar-bubble', x: 0, y: 0, scale: 1, fontSize: 16, width: 340, zIndex: 26, visible: true, locked: false }
    };

    this.layers = JSON.parse(JSON.stringify(this.defaultLayers));

    // Snippets Library
    this.snippets = {
      banner: {
        name: 'Announcement Banner',
        icon: '📢',
        html: `
          <div class="odoo-block-wrap" data-block-type="banner" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag" title="اسحب">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)" title="أعلى">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)" title="أسفل">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)" title="تكرار">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)" title="حذف">🗑️</span>
            </div>
            <div class="snippet-inner" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; padding: 16px 24px; border-radius: 18px; box-shadow: 0 8px 24px rgba(2,132,199,0.25); display: flex; align-items: center; justify-content: space-between; gap: 16px; direction: rtl;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 2.2rem;">📢</span>
                <div>
                  <h3 contenteditable="true" style="margin: 0; font-size: 1.15rem; font-weight: 800;">تنبيه هام لطلاب مستر مينا:</h3>
                  <p contenteditable="true" style="margin: 4px 0 0; font-size: 0.95rem; opacity: 0.95;">حصة المراجعة الشاملة لعلوم أولى إعدادي واختبار تجريبي يوم الجمعة القادم الساعة 6 مساءً!</p>
                </div>
              </div>
              <button contenteditable="true" style="background: #ffffff; color: #0284c7; border: none; padding: 8px 20px; border-radius: 20px; font-weight: 800; font-family: inherit; cursor: pointer; flex-shrink: 0;">سجل حضورك الآن 👈</button>
            </div>
          </div>
        `
      },
      social: {
        name: 'WhatsApp & Social Bar',
        icon: '💬',
        html: `
          <div class="odoo-block-wrap" data-block-type="social" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)">🗑️</span>
            </div>
            <div class="snippet-inner" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 14px 22px; border-radius: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); direction: rtl;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem; color: #16a34a;">💬</span>
                <span contenteditable="true" style="font-weight: 800; color: #0f2b48; font-size: 0.95rem;">تواصل مع مستر مينا جرجس وفريق العمل عبر واتساب:</span>
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <a href="https://wa.me/" target="_blank" style="background: #25d366; color: #fff; text-decoration: none; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                  <span>واتساب مستر مينا 📱</span>
                </a>
                <a href="#" style="background: #1877f2; color: #fff; text-decoration: none; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.88rem;">
                  <span>صفحة الفيسبوك 👍</span>
                </a>
              </div>
            </div>
          </div>
        `
      },
      video: {
        name: 'YouTube Video & Stream',
        icon: '🎬',
        html: `
          <div class="odoo-block-wrap" data-block-type="video" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)">🗑️</span>
            </div>
            <div class="snippet-inner" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 18px; border-radius: 20px; box-shadow: 0 6px 24px rgba(0,0,0,0.06); direction: rtl;">
              <h3 contenteditable="true" style="margin: 0 0 12px 0; font-size: 1.1rem; color: #0f2b48; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                <span style="color: #ef4444;">🎬</span>
                <span>فيديو شرح مميز: حل أهم تكات كتاب الامتحان على تركيب الذرة</span>
              </h3>
              <div style="position: relative; padding-bottom: 38%; height: 0; overflow: hidden; border-radius: 12px; background: #0f172a;">
                <iframe style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>
              </div>
            </div>
          </div>
        `
      },
      features: {
        name: '3 Columns Features',
        icon: '📑',
        html: `
          <div class="odoo-block-wrap" data-block-type="features" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)">🗑️</span>
            </div>
            <div class="snippet-inner" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; direction: rtl;">
              <div style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 18px; border-radius: 16px; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">🔬</div>
                <h4 contenteditable="true" style="margin: 0 0 6px 0; color: #0284c7; font-weight: 800;">معمل تفاعلي 3D</h4>
                <p contenteditable="true" style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">مجسمات ثلاثية الأبعاد تفاعلية لكل درس تتيح للطالب استيعاب العلوم بالتجربة العملية.</p>
              </div>
              <div style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 18px; border-radius: 16px; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">🤖</div>
                <h4 contenteditable="true" style="margin: 0 0 6px 0; color: #0284c7; font-weight: 800;">شات ذكي صوتي</h4>
                <p contenteditable="true" style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">اسأل مستر مينا في أي وقت بصوتك أو كتابة ويرد عليك فوراً بصوته وشرحه الممتع.</p>
              </div>
              <div style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 18px; border-radius: 16px; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">🏆</div>
                <h4 contenteditable="true" style="margin: 0 0 6px 0; color: #0284c7; font-weight: 800;">امتحانات وجوائز</h4>
                <p contenteditable="true" style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">اختبارات دورية بعد كل درس مع لوحة شرف للأوائل وجوائز للطلاب المتميزين.</p>
              </div>
            </div>
          </div>
        `
      },
      quote: {
        name: 'Science Quote / Tip',
        icon: '💡',
        html: `
          <div class="odoo-block-wrap" data-block-type="quote" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)">🗑️</span>
            </div>
            <div class="snippet-inner" style="background: #fefce8; border: 1.5px solid #fef08a; padding: 16px 22px; border-radius: 18px; display: flex; align-items: center; gap: 14px; direction: rtl; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
              <span style="font-size: 2rem;">💡</span>
              <div>
                <h4 contenteditable="true" style="margin: 0; color: #854d0e; font-weight: 800; font-size: 0.95rem;">سر كيميائي من مستر مينا:</h4>
                <p contenteditable="true" style="margin: 4px 0 0; color: #713f12; font-size: 0.9rem; line-height: 1.5;">الذرة متعادلة كهربياً في حالتها العادية لأن عدد البروتونات الموجبة داخل النواة = عدد الإلكترونات السالبة التي تدور حولها!</p>
              </div>
            </div>
          </div>
        `
      },
      faq: {
        name: 'FAQ Accordion',
        icon: '❓',
        html: `
          <div class="odoo-block-wrap" data-block-type="faq" onclick="window.odooBuilder.onCustomBlockClick(event, this)">
            <div class="odoo-block-actions">
              <span class="action-btn btn-drag">⠿</span>
              <span class="action-btn btn-lock" onclick="window.odooBuilder.toggleBlockLockDirect(this)" title="قفل/فتح">🔓</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, -1)">⬆️</span>
              <span class="action-btn" onclick="window.odooBuilder.moveBlock(this, 1)">⬇️</span>
              <span class="action-btn" onclick="window.odooBuilder.cloneBlock(this)">📋</span>
              <span class="action-btn btn-delete" onclick="window.odooBuilder.deleteBlock(this)">🗑️</span>
            </div>
            <div class="snippet-inner" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 20px; border-radius: 20px; direction: rtl; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
              <h3 contenteditable="true" style="margin: 0 0 14px; font-size: 1.1rem; color: #0f2b48; font-weight: 800;">❓ الأسئلة الشائعة حول منهج العلوم:</h3>
              <details style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; margin-bottom: 8px;">
                <summary contenteditable="true" style="font-weight: 700; color: #0284c7; font-size: 0.95rem; cursor: pointer;">كيف أستفيد من المعمل التفاعلي 3D بأفضل طريقة؟</summary>
                <p contenteditable="true" style="margin: 8px 0 0; font-size: 0.88rem; color: #475569;">قم بفتح الدرس والضغط على زر استمع للشرح ثم قم بتحريك المجسم وتغيير العناصر لفهم تركيب الذرة والمادة عملياً.</p>
              </details>
              <details style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
                <summary contenteditable="true" style="font-weight: 700; color: #0284c7; font-size: 0.95rem; cursor: pointer;">هل يمكنني سؤال مستر مينا أسئلة خارج كتاب الوزارة؟</summary>
                <p contenteditable="true" style="margin: 8px 0 0; font-size: 0.88rem; color: #475569;">نعم بالتأكيد! الشات الذكي مدرب على جميع مناهج وأسئلة بنك المعرفة ومستويات التفكير العليا.</p>
              </details>
            </div>
          </div>
        `
      }
    };

    this.dragCandidate = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialPos = { x: 0, y: 0 };

    this.init();
  }

  loadSavedLayout() {
    try {
      const saved = localStorage.getItem('mena_admin_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layers) {
          this.layers = Object.assign({}, this.defaultLayers, parsed.layers);
        }
      }
    } catch (e) {}
  }

  autoSaveLayout() {
    try {
      const saved = localStorage.getItem('mena_admin_layout');
      let customBlocksHtml = '';
      if (saved) {
        try { customBlocksHtml = JSON.parse(saved).customHtml || ''; } catch(e){}
      }
      const data = {
        layers: this.layers,
        customHtml: customBlocksHtml
      };
      localStorage.setItem('mena_admin_layout', JSON.stringify(data));
    } catch(e) {}
  }

  copyLayoutCode() {
    const jsonStr = JSON.stringify(this.layers, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.showToast('📋 تم نسخ كود التخطيط للحافظة! الصقه هنا لتثبيته دائماً في الكود.');
    }).catch(() => {
      prompt('انسخ كود التخطيط:', jsonStr);
    });
  }

  init() {
    this.loadSavedLayout();
    this.applyAllLayers();
    this.renderLayersTree();
    this.bindCanvasEvents();
    this.createFloatingTextToolbar();
    this.createDockHandle();
    this.createPasswordModal();
  }

  applyAllLayers() {
    Object.keys(this.layers).forEach(key => this.applyLayerTransform(key));
  }

  // ── Password Authentication Modal (PIN 4040) ───────────
  createPasswordModal() {
    if (document.getElementById('odoo-pin-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'odoo-pin-modal';
    modal.style.cssText = `
      display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px);
      z-index: 999999999; justify-content: center; align-items: center;
      font-family: 'Cairo', 'Tajawal', sans-serif; direction: rtl;
    `;

    modal.innerHTML = `
      <div id="odoo-pin-box" style="
        background: #0f1e36; border: 2px solid #0284c7; border-radius: 24px;
        padding: 32px 28px; width: 90%; max-width: 400px; text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(2,132,199,0.3);
        animation: odooModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
                <h3 style="margin: 0 0 6px; font-size: 1.3rem; color: #f8fafc; font-weight: 800;">لوحة تحكم وتعديل المنصة</h3>
        <p style="margin: 0 0 20px; font-size: 0.9rem; color: #94a3b8;">أدخل الرقم السري للوصول إلى أدوات التصميم والإعدادات</p>

        <div style="position: relative; margin-bottom: 16px;">
          <input
            type="password"
            id="odoo-pin-input"
            maxlength="8"
            placeholder="••••"
            style="
              width: 100%; box-sizing: border-box; background: #07101f; border: 2px solid #334155;
              border-radius: 14px; padding: 14px 16px; font-size: 1.6rem; color: #38bdf8;
              text-align: center; letter-spacing: 8px; outline: none; font-weight: 900;
              transition: border-color 0.2s;
            "
            onfocus="this.style.borderColor='#0284c7'"
            onblur="this.style.borderColor='#334155'"
            onkeydown="if(event.key === 'Enter') window.odooBuilder.submitPin()"
          />
          <div id="odoo-pin-error" style="display: none; color: #ef4444; font-size: 0.85rem; font-weight: 700; margin-top: 8px;">
            الرقم السري غير صحيح، حاول مرة أخرى!
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button onclick="window.odooBuilder.submitPin()" style="
            flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff;
            border: none; border-radius: 12px; padding: 12px; font-size: 1rem;
            font-weight: 800; cursor: pointer; font-family: inherit;
            box-shadow: 0 4px 16px rgba(2,132,199,0.4);
          ">دخول</button>
          <button onclick="window.odooBuilder.closePasswordModal()" style="
            flex: 1; background: #1e293b; color: #94a3b8; border: 1px solid #334155;
            border-radius: 12px; padding: 12px; font-size: 0.95rem; font-weight: 700;
            cursor: pointer; font-family: inherit;
          ">إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  promptPassword() {
    this.createPasswordModal();
    const modal = document.getElementById('odoo-pin-modal');
    const input = document.getElementById('odoo-pin-input');
    const error = document.getElementById('odoo-pin-error');

    if (error) error.style.display = 'none';
    if (input) input.value = '';
    if (modal) modal.style.display = 'flex';
    setTimeout(() => input?.focus(), 100);
  }

  closePasswordModal() {
    const modal = document.getElementById('odoo-pin-modal');
    if (modal) modal.style.display = 'none';
  }

  submitPin() {
    const input = document.getElementById('odoo-pin-input');
    const error = document.getElementById('odoo-pin-error');
    const box = document.getElementById('odoo-pin-box');
    const val = input ? input.value.trim() : '';

    if (val === this.ADMIN_PIN) {
      sessionStorage.setItem('odoo_studio_auth', 'true');
      this.closePasswordModal();
      this.showToast('🔓 تم تسجيل الدخول بنجاح!');
      this.toggleEditMode(true);
    } else {
      if (error) error.style.display = 'block';
      if (input) {
        input.value = '';
        input.style.borderColor = '#ef4444';
        input.focus();
      }
      if (box) {
        box.style.animation = 'none';
        setTimeout(() => box.style.animation = 'odooShake 0.4s ease', 10);
      }
    }
  }

  logoutAdmin() {
    sessionStorage.removeItem('odoo_studio_auth');
    this.toggleEditMode(false);
    this.showToast('🔒 تم قفل لوحة التعديل وتسجيل الخروج.');
  }

  // ── Enter / Exit Edit Mode ─────────────────────────────
  toggleEditMode(force) {
    const targetState = (force !== undefined) ? force : !this.isEditMode;

    // Check PIN 4040 Authentication
    if (targetState && !sessionStorage.getItem('odoo_studio_auth')) {
      this.promptPassword();
      return;
    }

    this.isEditMode = targetState;
    const sidebar = document.getElementById('odoo-studio-sidebar');
    const trigger = document.getElementById('odoo-edit-trigger');

    document.body.classList.toggle('odoo-edit-mode', this.isEditMode);
    document.body.classList.toggle('odoo-studio-active', this.isEditMode);

    if (sidebar) {
      sidebar.style.display = this.isEditMode ? 'flex' : 'none';
      sidebar.classList.toggle('open', this.isEditMode);
      sidebar.classList.remove('odoo-docked-hidden');
    }
    this.isSidebarCollapsed = false;

    if (trigger) {
      trigger.style.background = this.isEditMode ? 'linear-gradient(135deg, #008784, #005f5d)' : 'linear-gradient(135deg, #0284c7, #0369a1)';
    }

    this.refreshDropZones();
    this.initInlineEditing();
    this.applyAllLayers();
    this.renderLayersTree();

    if (!this.isEditMode) {
      document.querySelectorAll('.admin-highlighted, .odoo-selected-block').forEach(el => {
        el.classList.remove('admin-highlighted', 'odoo-selected-block');
      });
      this.selectedLayerId = null;
      this.selectedCustomBlockId = null;
    }

    this.showToast(this.isEditMode ? '✏️ Odoo Studio Active' : '👁️ Preview Mode');
  }

  // ── Apply Transforms Safely with Fixed Center Alignment ─
  applyLayerTransform(key) {
    const l = this.layers[key];
    if (!l) return;
    const el = document.querySelector(l.selector);
    if (!el) return;

    let posX = Number(l.x) || 0;
    let posY = Number(l.y) || 0;
    let scaleVal = Number(l.scale) || 1;
    let rotVal = Number(l.rotY) || 0;

    el.style.display = (l.visible !== false) ? '' : 'none';
    if (l.zIndex) el.style.zIndex = l.zIndex;

    if (key === 'avatar') {
      el.style.position = 'absolute';
      el.style.bottom = posY + 'px';
      el.style.left = '50%';
      el.style.transform = `translateX(calc(-50% + ${posX}px)) scale(${scaleVal})`;
      el.style.display = (l.visible !== false) ? 'flex' : 'none';
    } else if (key === 'logo' || key === 'badges') {
      el.style.top = posY + 'px';
      el.style.left = '50%';
      el.style.transform = `translateX(calc(-50% + ${posX}px)) scale(${scaleVal})`;
    } else if (key === 'rightCol') {
      if (posX < -150 || posX > 400) posX = 90;
      el.style.left = `calc(50% + ${posX}px)`;
      el.style.top = '48%';
      el.style.transform = `translateY(calc(-50% + ${posY}px)) rotateY(${rotVal}deg) scale(${scaleVal})`;
    } else if (key === 'leftCol') {
      if (posX < -150 || posX > 400) posX = 90;
      el.style.right = `calc(50% + ${posX}px)`;
      el.style.top = '48%';
      el.style.transform = `translateY(calc(-50% + ${posY}px)) rotateY(${rotVal}deg) scale(${scaleVal})`;
    } else if (key === 'lessonAvatar') {
      el.style.setProperty('transform', `translate(${posX}px, ${posY}px) scale(${scaleVal}) rotateY(${rotVal}deg)`, 'important');
      if (l.width) {
        el.style.setProperty('width', l.width + 'px', 'important');
        el.style.setProperty('max-width', 'none', 'important');
        const img = el.querySelector('.lesson-mina-img');
        if (img) {
          img.style.setProperty('max-width', (l.width - 25) + 'px', 'important');
          img.style.setProperty('height', Math.round((l.width - 25) * 1.05) + 'px', 'important');
        }
      }
    } else if (key === 'lessonBubble') {
      el.style.setProperty('transform', `translate(${posX}px, ${posY}px) scale(${scaleVal})`, 'important');
      if (l.fontSize) {
        const textEl = el.querySelector('#bubble-text-content') || el;
        textEl.style.setProperty('font-size', l.fontSize + 'px', 'important');
      }
      if (l.width) {
        el.style.setProperty('width', l.width + 'px', 'important');
        el.style.setProperty('max-width', 'none', 'important');
      }
    } else if (key.startsWith('stage')) {
      el.style.transform = `translate(${posX}px, ${posY}px) scale(${scaleVal})`;
    } else if (key === 'chat') {
      // Keep Chat Centered at bottom
      el.style.position = 'fixed';
      el.style.bottom = (posY || 20) + 'px';
      el.style.left = '50%';
      el.style.transform = `translateX(calc(-50% + ${posX}px)) scale(${scaleVal})`;
      el.style.width = '88%';
      el.style.maxWidth = '820px';
      if (l.height) el.style.height = (Number(l.height) || 68) + 'px';
    }

    if (this.isEditMode) {
      this.autoSaveLayout();
    }
  }

  autoSaveLayout() {
    try {
      const saved = localStorage.getItem('mena_admin_layout');
      let customBlocksHtml = '';
      if (saved) {
        try { customBlocksHtml = JSON.parse(saved).customHtml || ''; } catch(e){}
      }
      const data = {
        layers: this.layers,
        customHtml: customBlocksHtml
      };
      localStorage.setItem('mena_admin_layout', JSON.stringify(data));
    } catch(e) {}
  }

  resetChatCenter() {
    if (this.layers.chat) {
      this.layers.chat.x = 0;
      this.layers.chat.y = 20;
      this.layers.chat.scale = 1;
      this.applyLayerTransform('chat');
      this.renderLayerInspector('chat');
      this.showToast('🎯 تم إعادة توسيط شريط الشات بالمنتصف!');
    }
  }

  // ── Canva-Style Block Lock / Unlock ────────────────────
  toggleBlockLockDirect(btn) {
    const block = btn.closest('.odoo-block-wrap');
    if (!block) return;
    const isLocked = block.classList.contains('canva-locked');

    if (!isLocked) {
      block.classList.add('canva-locked');
      btn.innerHTML = '🔒';
      btn.title = 'البلوك مقفول';
      this.showToast('🔒 تم قفل البلوك!');
    } else {
      block.classList.remove('canva-locked');
      btn.innerHTML = '🔓';
      btn.title = 'البلوك مفتوح';
      this.showToast('🔓 تم فتح قفل البلوك!');
    }

    this.renderLayersTree();
    this.renderCustomBlockInspector(block);
  }

  toggleBlockLockByIndex(index) {
    const customBlocks = document.querySelectorAll('#odoo-custom-blocks-layer .odoo-block-wrap');
    if (customBlocks[index]) {
      const block = customBlocks[index];
      const isLocked = block.classList.contains('canva-locked');
      const lockBtn = block.querySelector('.btn-lock');

      if (!isLocked) {
        block.classList.add('canva-locked');
        if (lockBtn) { lockBtn.innerHTML = '🔒'; lockBtn.title = 'البلوك مقفول'; }
        this.showToast('🔒 تم قفل البلوك!');
      } else {
        block.classList.remove('canva-locked');
        if (lockBtn) { lockBtn.innerHTML = '🔓'; lockBtn.title = 'البلوك مفتوح'; }
        this.showToast('🔓 تم فتح قفل البلوك!');
      }
      this.renderLayersTree();
    }
  }

  toggleLayerLock(key) {
    const l = this.layers[key];
    if (!l) return;
    l.locked = !l.locked;
    const el = document.querySelector(l.selector);
    if (el) {
      el.classList.toggle('canva-locked', l.locked);
    }
    this.renderLayersTree();
    this.showToast(l.locked ? `🔒 تم قفل ${l.name}` : `🔓 تم فتح ${l.name}`);
  }

  toggleLayerVisibility(key) {
    const l = this.layers[key];
    if (!l) return;
    l.visible = !l.visible;
    this.applyLayerTransform(key);
    this.renderLayersTree();
    this.showToast(l.visible ? `👁️ إظهار ${l.name}` : `🚫 إخفاء ${l.name}`);
  }

  // ── Sidebar Layers Tree ────────────────────────────────
  renderLayersTree() {
    const container = document.getElementById('odoo-layers-list');
    if (!container) return;

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">الطبقات الأساسية:</span>
        <button onclick="window.odooBuilder.logoutAdmin()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:6px; font-size:0.7rem; padding:2px 8px; cursor:pointer;" title="قفل وتسجيل الخروج">🔒 خروج</button>
      </div>
    `;
    html += Object.keys(this.layers).map(key => {
      const l = this.layers[key];
      const isSelected = (this.selectedLayerId === key);
      return `
        <div class="odoo-layer-item ${isSelected ? 'active' : ''} ${l.locked ? 'locked' : ''}" onclick="window.odooBuilder.selectLayer('${key}')">
          <div class="layer-item-main">
            <span class="layer-icon">${l.icon}</span>
            <span class="layer-name">${l.name}</span>
          </div>
          <div class="layer-item-actions">
            <button class="layer-action-btn ${l.locked ? 'btn-locked-gold' : ''}" onclick="event.stopPropagation(); window.odooBuilder.toggleLayerLock('${key}')" title="${l.locked ? 'إلغاء القفل' : 'قفل'}">
              ${l.locked ? '🔒' : '🔓'}
            </button>
            <button class="layer-action-btn" onclick="event.stopPropagation(); window.odooBuilder.toggleLayerVisibility('${key}')" title="${l.visible ? 'إخفاء' : 'إظهار'}">
              ${l.visible ? '👁️' : '🚫'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const customBlocks = document.querySelectorAll('#odoo-custom-blocks-layer .odoo-block-wrap');
    if (customBlocks.length > 0) {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; margin-bottom:4px;">
          <span style="font-size:0.75rem; font-weight:800; color:#38bdf8;">البلوكات المضافة (${customBlocks.length}):</span>
          <button onclick="window.odooBuilder.clearAllCustomBlocks()" class="clear-all-blocks-btn" title="حذف جميع البلوكات">🗑️ مسح الكل</button>
        </div>
      `;

      customBlocks.forEach((b, idx) => {
        const type = b.dataset.blockType || 'custom';
        const snip = this.snippets[type] || { name: 'Custom Block', icon: '📦' };
        const isSelected = b.classList.contains('odoo-selected-block');
        const isLocked = b.classList.contains('canva-locked');

        html += `
          <div class="odoo-layer-item custom-block-layer ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''}" onclick="window.odooBuilder.selectCustomBlockElement(document.querySelectorAll('#odoo-custom-blocks-layer .odoo-block-wrap')[${idx}])">
            <div class="layer-item-main">
              <span class="layer-icon">${snip.icon}</span>
              <span class="layer-name">${snip.name} (#${idx+1})</span>
            </div>
            <div class="layer-item-actions">
              <button class="layer-action-btn ${isLocked ? 'btn-locked-gold' : ''}" onclick="event.stopPropagation(); window.odooBuilder.toggleBlockLockByIndex(${idx})" title="${isLocked ? 'إلغاء قفل البلوك' : 'قفل البلوك'}">
                ${isLocked ? '🔒' : '🔓'}
              </button>
              <button class="layer-action-btn btn-trash-red" onclick="event.stopPropagation(); window.odooBuilder.deleteCustomBlockByIndex(${idx})" title="حذف هذا البلوك">
                🗑️
              </button>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  }

  // ── Custom Block Click & Selection ─────────────────────
  onCustomBlockClick(e, blockEl) {
    if (!this.isEditMode) return;
    if (blockEl.classList.contains('canva-locked')) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    this.selectCustomBlockElement(blockEl);
  }

  selectCustomBlockElement(blockEl) {
    document.querySelectorAll('.admin-highlighted, .odoo-selected-block').forEach(el => {
      el.classList.remove('admin-highlighted', 'odoo-selected-block');
    });

    blockEl.classList.add('odoo-selected-block');
    this.selectedLayerId = null;
    this.renderLayersTree();

    this.switchTab('style');
    this.renderCustomBlockInspector(blockEl);
  }

  renderCustomBlockInspector(blockEl) {
    const pane = document.getElementById('odoo-pane-style');
    if (!pane) return;

    const blockType = blockEl.dataset.blockType || 'custom';
    const isLocked = blockEl.classList.contains('canva-locked');

    pane.innerHTML = `
      <div class="odoo-inspector-header">
        <span class="odoo-label-dim">البلوك المحدد:</span>
        <div style="font-weight: 800; font-size: 1.05rem; color: #38bdf8;">${this.snippets[blockType]?.name || 'Custom Block'}</div>
      </div>

      <div class="odoo-control-group" style="background:#1e2436; border-color:#38bdf8;">
        <div class="odoo-group-title">🔒 قفل وتحكم البلوك (Canva Lock)</div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button onclick="window.odooBuilder.toggleBlockLockDirect(document.querySelector('.odoo-selected-block .btn-lock'))" class="canva-lock-btn ${isLocked ? 'locked' : ''}" style="flex:1;">
            <span>${isLocked ? '🔒 البلوك مقفول' : '🔓 قفل البلوك (Lock)'}</span>
          </button>
          <button onclick="window.odooBuilder.deleteSelectedBlockDirectly()" class="odoo-btn-danger" style="flex:1;">
            <span>🗑️ حذف البلوك</span>
          </button>
        </div>
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">🎨 لون خلفية البلوك</div>
        <div class="odoo-color-presets">
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('#ffffff', '#0f172a')" style="background:#ffffff; border:1px solid #cbd5e1;" title="أبيض"></button>
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('#f0f9ff', '#0369a1')" style="background:#f0f9ff;" title="سماوي"></button>
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('#fefce8', '#854d0e')" style="background:#fefce8;" title="أصفر"></button>
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('#f0fdf4', '#166534')" style="background:#f0fdf4;" title="أخضر"></button>
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('linear-gradient(135deg, #0284c7, #0369a1)', '#ffffff')" style="background:linear-gradient(135deg, #0284c7, #0369a1);" title="أزرق"></button>
          <button class="color-preset-btn" onclick="window.odooBuilder.setBlockBg('#1e293b', '#f8fafc')" style="background:#1e293b;" title="داكن"></button>
        </div>
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">📐 الهوامش الداخلية (Padding)</div>
        <div class="odoo-slider-row">
          <label>المسافة:</label>
          <input type="range" min="10" max="50" step="2" value="20" oninput="window.odooBuilder.setBlockPadding(this.value)">
          <span id="block-pad-val" class="slider-badge">20px</span>
        </div>
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">🔘 استدارة الحواف (Border Radius)</div>
        <div class="odoo-slider-row">
          <label>الاستدارة:</label>
          <input type="range" min="0" max="36" step="2" value="18" oninput="window.odooBuilder.setBlockRadius(this.value)">
          <span id="block-rad-val" class="slider-badge">18px</span>
        </div>
      </div>
    `;
  }

  // ── Core Layer Selection & Inspector ───────────────────
  selectLayer(key) {
    this.selectedLayerId = key;
    const l = this.layers[key];
    if (!l) return;

    document.querySelectorAll('.admin-highlighted, .odoo-selected-block').forEach(el => {
      el.classList.remove('admin-highlighted', 'odoo-selected-block');
    });

    const targetEl = document.querySelector(l.selector);
    if (targetEl) {
      targetEl.classList.add('admin-highlighted');
    }

    this.renderLayersTree();
    this.switchTab('style');
    this.renderLayerInspector(key);
  }

  renderLayerInspector(key) {
    const pane = document.getElementById('odoo-pane-style');
    if (!pane) return;
    const l = this.layers[key];

    pane.innerHTML = `
      <div class="odoo-inspector-header">
        <span class="odoo-label-dim">الطبقة المحددة:</span>
        <div style="font-weight: 800; font-size: 1.05rem; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
          <span>${l.icon}</span> <span>${l.name}</span>
        </div>
      </div>

      ${key === 'chat' ? `
      <div class="odoo-control-group" style="background:#0f2744; border-color:#0284c7;">
        <div class="odoo-group-title" style="color:#7dd3fc;">🎯 ضبط المحاذاة</div>
        <button onclick="window.odooBuilder.resetChatCenter()" class="odoo-pad-btn" style="width:100%; background:#0284c7; color:#fff; font-weight:800; padding:8px 12px; border-radius:8px;">
          <span>🎯 إعادة توسيط شريط الشات بالمنتصف</span>
        </button>
      </div>` : ''}

      ${key === 'lessonBubble' ? `
      <div class="odoo-control-group" style="background:#0f2744; border:1.5px solid #0284c7; border-radius:14px; padding:12px;">
        <div class="odoo-group-title" style="color:#7dd3fc; margin-bottom:8px;">✍️ حجم خط الشرح والكتابة (Font Size)</div>
        <div class="odoo-slider-row">
          <label>حجم الخط:</label>
          <input type="range" min="11" max="32" step="1" value="${l.fontSize||15}" oninput="window.odooBuilder.onLayerFontSizeChange(this.value)">
          <span id="odoo-fontsize-val" class="slider-badge" style="background:#0284c7; color:#fff;">${l.fontSize||15}px</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button onclick="window.odooBuilder.changeBubbleFontSize(1)" class="odoo-pad-btn" style="flex:1; background:linear-gradient(135deg, #0284c7, #0369a1); color:#fff; font-weight:800; padding:8px; border-radius:8px;">
            <span>➕ تكبير الخط (+1)</span>
          </button>
          <button onclick="window.odooBuilder.changeBubbleFontSize(-1)" class="odoo-pad-btn" style="flex:1; background:#1e293b; color:#cbd5e1; border:1px solid #334155; font-weight:700; padding:8px; border-radius:8px;">
            <span>➖ تصغير الخط (-1)</span>
          </button>
        </div>
      </div>
      ` : ''}

      <div class="odoo-control-group">
        <div class="odoo-group-title">📍 موضع الطبقة (Position & Offset)</div>
        <div class="odoo-nudge-pad">
          <button class="odoo-pad-btn" onclick="window.odooBuilder.nudgeLayer(0, 8)">⬆️ أعلى</button>
          <div class="odoo-pad-mid">
            <button class="odoo-pad-btn" onclick="window.odooBuilder.nudgeLayer(-8, 0)">⬅️ يسار</button>
            <span id="odoo-coords-disp" class="odoo-coords-tag">X: ${Math.round(l.x||0)} | Y: ${Math.round(l.y||0)}</span>
            <button class="odoo-pad-btn" onclick="window.odooBuilder.nudgeLayer(8, 0)">➡️ يمين</button>
          </div>
          <button class="odoo-pad-btn" onclick="window.odooBuilder.nudgeLayer(0, -8)">⬇️ أسفل</button>
        </div>
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">🔍 الحجم والسمك (Size & Scale)</div>
        <div class="odoo-slider-row">
          <label>تكبير/تصغير:</label>
          <input type="range" min="0.4" max="2.5" step="0.02" value="${l.scale||1}" oninput="window.odooBuilder.onLayerScaleChange(this.value)">
          <span id="odoo-scale-val" class="slider-badge">${Number(l.scale||1).toFixed(2)}x</span>
        </div>
        ${key === 'chat' ? `
        <div class="odoo-slider-row">
          <label>السمك والارتفاع:</label>
          <input type="range" min="45" max="140" step="2" value="${l.height||68}" oninput="window.odooBuilder.onLayerHeightChange(this.value)">
          <span id="odoo-height-val" class="slider-badge">${l.height||68}px</span>
        </div>` : ''}
        ${(key === 'lessonAvatar' || key === 'lessonBubble') ? `
        <div class="odoo-slider-row">
          <label>عرض العنصر (Width):</label>
          <input type="range" min="160" max="650" step="10" value="${l.width || (key === 'lessonAvatar' ? 310 : 320)}" oninput="window.odooBuilder.onLayerWidthChange(this.value)">
          <span id="odoo-width-val" class="slider-badge">${l.width || (key === 'lessonAvatar' ? 310 : 320)}px</span>
        </div>` : ''}
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">🔄 الميلان ثلاثي الأبعاد (3D Tilt)</div>
        <div class="odoo-slider-row">
          <label>زاوية الدوران:</label>
          <input type="range" min="-45" max="45" step="1" value="${l.rotY||0}" oninput="window.odooBuilder.onLayerTiltChange(this.value)">
          <span id="odoo-tilt-val" class="slider-badge orange">${l.rotY||0}°</span>
        </div>
      </div>

      <div class="odoo-control-group">
        <div class="odoo-group-title">🔒 قفل وتحكم الطبقة (Canva Lock)</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
          <span>إظهار الطبقة:</span>
          <input type="checkbox" ${l.visible!==false?'checked':''} onchange="window.odooBuilder.toggleLayerVisibility('${key}')" style="width:20px; height:20px; cursor:pointer; accent-color:#00d084;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>قفل الطبقة (Lock):</span>
          <input type="checkbox" ${l.locked?'checked':''} onchange="window.odooBuilder.toggleLayerLock('${key}')" style="width:20px; height:20px; cursor:pointer; accent-color:#f97316;">
        </div>
      </div>
    `;
  }

  nudgeLayer(dx, dy) {
    const l = this.layers[this.selectedLayerId];
    if (!l || l.locked) return;
    l.x = (Number(l.x) || 0) + dx;
    l.y = (Number(l.y) || 0) + dy;
    this.applyLayerTransform(this.selectedLayerId);
    const disp = document.getElementById('odoo-coords-disp');
    if (disp) disp.textContent = `X: ${Math.round(l.x)} | Y: ${Math.round(l.y)}`;
  }

  onLayerScaleChange(val) {
    const num = parseFloat(val);
    const l = this.layers[this.selectedLayerId];
    if (l) {
      l.scale = num;
      this.applyLayerTransform(this.selectedLayerId);
      const disp = document.getElementById('odoo-scale-val');
      if (disp) disp.textContent = num.toFixed(2) + 'x';
    }
  }

  onLayerFontSizeChange(val) {
    const num = parseInt(val);
    const l = this.layers[this.selectedLayerId];
    if (l) {
      l.fontSize = num;
      this.applyLayerTransform(this.selectedLayerId);
      const disp = document.getElementById('odoo-fontsize-val');
      if (disp) disp.textContent = num + 'px';
    }
  }

  changeBubbleFontSize(delta) {
    const l = this.layers.lessonBubble;
    if (!l) return;
    const current = Number(l.fontSize) || 15;
    const newSize = Math.max(11, Math.min(32, current + delta));
    l.fontSize = newSize;
    this.applyLayerTransform('lessonBubble');
    if (this.selectedLayerId === 'lessonBubble') {
      const slider = document.querySelector('input[oninput*="onLayerFontSizeChange"]');
      if (slider) slider.value = newSize;
      const disp = document.getElementById('odoo-fontsize-val');
      if (disp) disp.textContent = newSize + 'px';
    }
  }

  onLayerWidthChange(val) {
    const num = parseInt(val);
    const l = this.layers[this.selectedLayerId];
    if (l) {
      l.width = num;
      this.applyLayerTransform(this.selectedLayerId);
      const disp = document.getElementById('odoo-width-val');
      if (disp) disp.textContent = num + 'px';
    }
  }

  onLayerHeightChange(val) {
    const num = parseInt(val);
    const l = this.layers[this.selectedLayerId];
    if (l) {
      l.height = num;
      this.applyLayerTransform(this.selectedLayerId);
      const disp = document.getElementById('odoo-height-val');
      if (disp) disp.textContent = num + 'px';
    }
  }

  onLayerTiltChange(val) {
    const num = parseInt(val);
    const l = this.layers[this.selectedLayerId];
    if (l) {
      l.rotY = num;
      this.applyLayerTransform(this.selectedLayerId);
      const disp = document.getElementById('odoo-tilt-val');
      if (disp) disp.textContent = num + '°';
    }
  }

  setBlockBg(bg, textColor) {
    const el = document.querySelector('.odoo-selected-block');
    if (!el) return;
    const inner = el.querySelector('.snippet-inner') || el;
    inner.style.background = bg;
    if (textColor) inner.style.color = textColor;
  }

  setBlockPadding(val) {
    const el = document.querySelector('.odoo-selected-block');
    if (!el) return;
    const inner = el.querySelector('.snippet-inner') || el;
    inner.style.padding = val + 'px';
    const disp = document.getElementById('block-pad-val');
    if (disp) disp.textContent = val + 'px';
  }

  setBlockRadius(val) {
    const el = document.querySelector('.odoo-selected-block');
    if (!el) return;
    const inner = el.querySelector('.snippet-inner') || el;
    inner.style.borderRadius = val + 'px';
    const disp = document.getElementById('block-rad-val');
    if (disp) disp.textContent = val + 'px';
  }

  deleteBlock(btn) {
    const block = btn.closest('.odoo-block-wrap');
    if (!block) return;
    if (confirm('هل تريد حذف هذا البلوك؟')) {
      block.remove();
      this.refreshDropZones();
      this.renderLayersTree();
      this.switchTab('blocks');
      this.showToast('🗑️ تم حذف البلوك.');
    }
  }

  deleteSelectedBlockDirectly() {
    const block = document.querySelector('.odoo-selected-block');
    if (!block) return;
    if (confirm('هل تريد حذف هذا البلوك؟')) {
      block.remove();
      this.refreshDropZones();
      this.renderLayersTree();
      this.switchTab('blocks');
      this.showToast('🗑️ تم حذف البلوك.');
    }
  }

  deleteCustomBlockByIndex(index) {
    const customBlocks = document.querySelectorAll('#odoo-custom-blocks-layer .odoo-block-wrap');
    if (customBlocks[index]) {
      if (confirm('هل تريد حذف هذا البلوك؟')) {
        customBlocks[index].remove();
        this.refreshDropZones();
        this.renderLayersTree();
        this.switchTab('blocks');
        this.showToast('🗑️ تم حذف البلوك.');
      }
    }
  }

  clearAllCustomBlocks() {
    const container = document.getElementById('odoo-custom-blocks-layer');
    if (!container || container.children.length === 0) return;
    if (confirm('هل تريد مسح جميع البلوكات المضافة؟')) {
      container.innerHTML = '';
      document.body.classList.remove('has-custom-blocks');
      this.refreshDropZones();
      this.renderLayersTree();
      this.switchTab('blocks');
      this.showToast('🗑️ تم مسح جميع البلوكات المضافة.');
    }
  }

  // ── Escape Key Toggle Sidebar ──────────────────────────
  toggleSidebarCollapse() {
    if (!this.isEditMode) return;
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const sidebar = document.getElementById('odoo-studio-sidebar');
    const dockHandle = document.getElementById('odoo-dock-handle');

    if (sidebar) {
      sidebar.classList.toggle('odoo-docked-hidden', this.isSidebarCollapsed);
    }
    if (dockHandle) {
      dockHandle.style.display = this.isSidebarCollapsed ? 'flex' : 'none';
    }
    document.body.classList.toggle('odoo-canvas-expanded', this.isSidebarCollapsed);
    this.showToast(this.isSidebarCollapsed ? '🖥️ Full Screen View (اضغط Esc للعودة للقائمة)' : '📋 Sidebar Docked (Esc)');
  }

  createDockHandle() {
    let handle = document.getElementById('odoo-dock-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.id = 'odoo-dock-handle';
      handle.className = 'odoo-dock-handle';
      handle.innerHTML = '<span>◀ Odoo Studio (Esc)</span>';
      handle.onclick = () => this.toggleSidebarCollapse();
      document.body.appendChild(handle);
    }
  }

  // ── Canvas Events with Safe Targeting ──────────────────
  bindCanvasEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const pinModal = document.getElementById('odoo-pin-modal');
        if (pinModal && pinModal.style.display === 'flex') {
          this.closePasswordModal();
          return;
        }
        if (this.isEditMode) this.toggleSidebarCollapse();
      } else if (e.altKey && (e.key === 'e' || e.key === 'E' || e.key === 'ث')) {
        this.toggleEditMode();
      } else if ((e.key === 'Delete' || e.key === 'Del') && this.isEditMode) {
        const active = document.activeElement;
        if (!active || (active.getAttribute('contenteditable') !== 'true' && active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          if (document.querySelector('.odoo-selected-block')) {
            this.deleteSelectedBlockDirectly();
          }
        }
      }
    });

    const avatarImg = document.getElementById('center-mina-img');
    if (avatarImg) {
      avatarImg.addEventListener('mousedown', (e) => {
        if (!this.isEditMode) return;
        if (this.layers.avatar.locked) return;

        e.preventDefault();
        e.stopPropagation();

        this.selectLayer('avatar');
        this.dragCandidate = 'avatar';
        this.isDragging = false;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.initialPos = { x: Number(this.layers.avatar.x) || 0, y: Number(this.layers.avatar.y) || 0 };
      }, true);
    }

    // Global delegation for dynamic lesson avatar and bubble
    document.addEventListener('mousedown', (e) => {
      if (!this.isEditMode) return;
      const stage = e.target.closest('#lesson-character-stage');
      if (stage) {
        const bubble = e.target.closest('#lesson-avatar-bubble');
        const key = bubble ? 'lessonBubble' : 'lessonAvatar';
        if (this.layers[key]?.locked) return;

        e.preventDefault();
        e.stopPropagation();

        this.selectLayer(key);
        this.dragCandidate = key;
        this.isDragging = false;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.initialPos = { x: Number(this.layers[key].x) || 0, y: Number(this.layers[key].y) || 0 };
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (!this.isEditMode) return;
      const stage = e.target.closest('#lesson-character-stage');
      if (stage) {
        const bubble = e.target.closest('#lesson-avatar-bubble');
        const key = bubble ? 'lessonBubble' : 'lessonAvatar';
        if (this.layers[key]?.locked) return;

        e.preventDefault();
        e.stopPropagation();
        this.selectLayer(key);
      }
    }, true);

    // Bind cards specifically
    ['stage1', 'stage2', 'stage3', 'stage4', 'logo', 'badges'].forEach(key => {
      const el = document.querySelector(this.layers[key]?.selector);
      if (!el) return;

      el.addEventListener('mousedown', (e) => {
        if (!this.isEditMode) return;
        if (key === 'lessonAvatar' && e.target.closest('#lesson-avatar-bubble')) {
          this.selectLayer('lessonBubble');
          this.dragCandidate = 'lessonBubble';
          this.isDragging = false;
          this.dragStart = { x: e.clientX, y: e.clientY };
          this.initialPos = { x: Number(this.layers.lessonBubble.x) || 0, y: Number(this.layers.lessonBubble.y) || 0 };
          return;
        }
        if (this.layers[key]?.locked) return;

        e.preventDefault();
        e.stopPropagation();

        this.selectLayer(key);
        this.dragCandidate = key;
        this.isDragging = false;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.initialPos = { x: Number(this.layers[key].x) || 0, y: Number(this.layers[key].y) || 0 };
      }, true);

      el.addEventListener('click', (e) => {
        if (!this.isEditMode) return;
        if (key === 'lessonAvatar' && e.target.closest('#lesson-avatar-bubble')) {
          e.preventDefault();
          e.stopPropagation();
          this.selectLayer('lessonBubble');
          return;
        }
        if (this.layers[key]?.locked) return;
        e.preventDefault();
        e.stopPropagation();
        this.selectLayer(key);
      }, true);
    });

    // Chat pill drag: strictly keep x centered!
    const chatEl = document.querySelector(this.layers.chat?.selector);
    if (chatEl) {
      chatEl.addEventListener('mousedown', (e) => {
        if (!this.isEditMode) return;
        if (this.layers.chat.locked) return;

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

        e.preventDefault();
        e.stopPropagation();

        this.selectLayer('chat');
        this.dragCandidate = 'chat';
        this.isDragging = false;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.initialPos = { x: 0, y: Number(this.layers.chat.y) || 20 };
      }, true);
    }

    window.addEventListener('mousemove', (e) => {
      if (!this.isEditMode || !this.dragCandidate) return;

      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;

      if (!this.isDragging && Math.hypot(dx, dy) > 5) {
        this.isDragging = true;
      }

      if (!this.isDragging) return;

      const l = this.layers[this.dragCandidate];
      if (!l || l.locked) return;

      if (this.dragCandidate === 'avatar') {
        l.x = this.initialPos.x + dx;
        l.y = this.initialPos.y - dy;
      } else if (this.dragCandidate === 'chat') {
        l.x = 0;
        l.y = Math.max(10, Math.min(180, this.initialPos.y - dy));
      } else {
        l.x = this.initialPos.x + dx;
        l.y = this.initialPos.y + dy;
      }

      this.applyLayerTransform(this.dragCandidate);
      const disp = document.getElementById('odoo-coords-disp');
      if (disp) disp.textContent = `X: ${Math.round(l.x)} | Y: ${Math.round(l.y)}`;
    });

    window.addEventListener('mouseup', () => {
      this.dragCandidate = null;
      this.isDragging = false;
    });
  }

  // ── Custom Snippets System ─────────────────────────────
  startDragSnippet(e, snippetType) {
    e.dataTransfer.setData('text/plain', snippetType);
    e.dataTransfer.effectAllowed = 'copy';
    document.body.classList.add('odoo-is-dragging');
  }

  endDragSnippet() {
    document.body.classList.remove('odoo-is-dragging');
    document.querySelectorAll('.odoo-drop-zone').forEach(z => z.classList.remove('drag-over'));
  }

  handleDropOnZone(e, zoneEl) {
    e.preventDefault();
    e.stopPropagation();
    zoneEl.classList.remove('drag-over');

    const type = e.dataTransfer.getData('text/plain');
    if (!type || !this.snippets[type]) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.snippets[type].html.trim();
    const newBlock = tempDiv.firstElementChild;

    zoneEl.parentNode.insertBefore(newBlock, zoneEl.nextSibling);

    this.refreshDropZones();
    this.initInlineEditing();
    this.renderLayersTree();
    this.onCustomBlockClick(null, newBlock);
    this.showToast('✅ تم إضافة البلوك بنجاح!');
  }

  insertSnippetDirectly(type) {
    if (!this.snippets[type]) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.snippets[type].html.trim();
    const newBlock = tempDiv.firstElementChild;

    let container = document.getElementById('odoo-custom-blocks-layer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'odoo-custom-blocks-layer';
      container.className = 'odoo-custom-blocks-layer';
      const main = document.getElementById('home-hero-layout') || document.body;
      main.parentNode.insertBefore(container, main.nextSibling);
    }

    container.appendChild(newBlock);
    document.body.classList.add('has-custom-blocks');

    this.refreshDropZones();
    this.initInlineEditing();
    this.renderLayersTree();
    this.onCustomBlockClick(null, newBlock);
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.showToast('✅ تم إضافة البلوك إلى الصفحة!');
  }

  refreshDropZones() {
    document.querySelectorAll('.odoo-drop-zone').forEach(z => z.remove());
    if (!this.isEditMode) return;

    const container = document.getElementById('odoo-custom-blocks-layer');
    if (!container) return;

    const blocks = container.querySelectorAll('.odoo-block-wrap');
    const topZone = this.createDropZoneEl();
    container.insertBefore(topZone, container.firstChild);

    blocks.forEach(b => {
      const bottomZone = this.createDropZoneEl();
      b.parentNode.insertBefore(bottomZone, b.nextSibling);
    });
  }

  createDropZoneEl() {
    const zone = document.createElement('div');
    zone.className = 'odoo-drop-zone';
    zone.innerHTML = '<span>➕ إفلات البلوك هنا (Drop Snippet Here)</span>';

    zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
    zone.ondragleave = () => { zone.classList.remove('drag-over'); };
    zone.ondrop = (e) => this.handleDropOnZone(e, zone);

    return zone;
  }

  moveBlock(btn, direction) {
    const block = btn.closest('.odoo-block-wrap');
    if (!block) return;

    if (direction === -1) {
      let prev = block.previousElementSibling;
      while (prev && prev.classList.contains('odoo-drop-zone')) prev = prev.previousElementSibling;
      if (prev) block.parentNode.insertBefore(block, prev);
    } else {
      let next = block.nextElementSibling;
      while (next && next.classList.contains('odoo-drop-zone')) next = next.nextElementSibling;
      if (next) block.parentNode.insertBefore(next, block);
    }
    this.refreshDropZones();
    this.renderLayersTree();
  }

  cloneBlock(btn) {
    const block = btn.closest('.odoo-block-wrap');
    if (!block) return;
    const clone = block.cloneNode(true);
    block.parentNode.insertBefore(clone, block.nextSibling);
    this.refreshDropZones();
    this.initInlineEditing();
    this.renderLayersTree();
    this.onCustomBlockClick(null, clone);
    this.showToast('📋 تم تكرار البلوك!');
  }

  // ── Tab Switching ──────────────────────────────────────
  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.odoo-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.odoo-tab-pane').forEach(p => {
      p.style.display = (p.id === 'odoo-pane-' + tabName) ? 'block' : 'none';
      p.classList.toggle('active', p.id === 'odoo-pane-' + tabName);
    });
  }

  // ── Inline WYSIWYG & Toolbar ───────────────────────────
  initInlineEditing() {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.onfocus = () => el.classList.add('editing-active');
      el.onblur = () => el.classList.remove('editing-active');
    });
  }

  createFloatingTextToolbar() {
    const bar = document.createElement('div');
    bar.id = 'odoo-floating-toolbar';
    bar.innerHTML = `
      <button onclick="document.execCommand('bold', false, null)" title="Bold"><b>B</b></button>
      <button onclick="document.execCommand('italic', false, null)" title="Italic"><i>I</i></button>
      <button onclick="document.execCommand('underline', false, null)" title="Underline"><u>U</u></button>
      <button onclick="document.execCommand('justifyRight', false, null)" title="Right Align">➔</button>
      <button onclick="document.execCommand('justifyCenter', false, null)" title="Center Align">≡</button>
      <input type="color" onchange="document.execCommand('foreColor', false, this.value)" title="Text Color" style="width:24px; height:24px; border:none; cursor:pointer; background:none;">
    `;
    document.body.appendChild(bar);

    document.addEventListener('selectionchange', () => {
      if (!this.isEditMode) {
        bar.style.display = 'none';
        return;
      }
      const sel = window.getSelection();
      if (!sel.isCollapsed && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        bar.style.display = 'flex';
        bar.style.top = (rect.top - 46 + window.scrollY) + 'px';
        bar.style.left = (rect.left + rect.width / 2 - 110) + 'px';
      } else {
        bar.style.display = 'none';
      }
    });
  }

  // ── Load & Save ────────────────────────────────────────
  saveLayout() {
    try {
      document.querySelectorAll('.odoo-drop-zone').forEach(z => z.remove());
      const container = document.getElementById('odoo-custom-blocks-layer');
      const customBlocksHtml = container ? container.innerHTML : '';

      if (this.layers.chat) {
        this.layers.chat.x = 0;
      }

      const data = {
        layers: this.layers,
        customHtml: customBlocksHtml
      };

      localStorage.setItem('mena_admin_layout', JSON.stringify(data));
      this.toggleEditMode(false);
      this.applyAllLayers();
      this.showToast('💾 تم حفظ كافة الطبقات والبلوكات بنجاح!');
    } catch(e) {
      alert('Save error: ' + e);
    }
  }

  loadSavedLayout() {
    try {
      const saved = localStorage.getItem('mena_admin_layout');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.layers) {
          Object.keys(data.layers).forEach(key => {
            if (this.layers[key]) {
              this.layers[key] = Object.assign({}, this.layers[key], data.layers[key]);
            }
          });
        }
        if (this.layers.chat) {
          this.layers.chat.x = 0;
          if (this.layers.chat.y < 0 || this.layers.chat.y > 180) this.layers.chat.y = 20;
          this.layers.chat.scale = 1;
        }

        if (this.layers.rightCol && (this.layers.rightCol.x < -150 || this.layers.rightCol.x > 400)) this.layers.rightCol.x = 90;
        if (this.layers.leftCol && (this.layers.leftCol.x < -150 || this.layers.leftCol.x > 400)) this.layers.leftCol.x = 90;
        this.layers.rightCol.visible = true;
        this.layers.leftCol.visible = true;
        this.layers.avatar.visible = true;

        if (data.customHtml && data.customHtml.trim().length > 0) {
          let container = document.getElementById('odoo-custom-blocks-layer');
          if (!container) {
            container = document.createElement('div');
            container.id = 'odoo-custom-blocks-layer';
            container.className = 'odoo-custom-blocks-layer';
            const main = document.getElementById('home-hero-layout') || document.body;
            main.parentNode.insertBefore(container, main.nextSibling);
          }
          container.innerHTML = data.customHtml;
          document.body.classList.add('has-custom-blocks');
        }
      }
    } catch(e) {
      console.warn('Layout load error:', e);
    }
  }

  discardChanges() {
    if (confirm('هل تريد إلغاء التعديلات غير المحفوظة والعودة للنسخة الأصلية؟')) {
      localStorage.removeItem('mena_admin_layout');
      location.reload();
    }
  }

  factoryReset() {
    if (confirm('هل تريد استعادة ضبط المصنع لجميع الطبقات؟')) {
      localStorage.removeItem('mena_admin_layout');
      location.reload();
    }
  }

  showToast(msg) {
    if (window.appController && window.appController._showToast) {
      window.appController._showToast(msg, 'success');
    } else {
      console.log(msg);
    }
  }
}

// Global Instant Instances
window.odooBuilder = new OdooWebsiteBuilder();
window.layoutEditor = window.odooBuilder;

function toggleOdooStudio(forceState) {
  if (window.odooBuilder) {
    window.odooBuilder.toggleEditMode(forceState);
  }
}
