/**
 * 📱 mobile_editor.js — Odoo Studio Visual Builder for Mobile Version
 * Direct Click-to-Edit, On-Canvas Floating Quick Toolbar, Non-covering Bottom Sheet,
 * and 1-Click Code Copy Modal for AI Assistant.
 */

class MobileOdooBuilder {
  constructor() {
    this.isEditMode = true; // Default: edit mode is active
    this.currentTab = 'style';
    this.selectedLayerId = null;

    this.defaultLayers = {
      avatar: { id: 'avatar', name: 'الأفاتار (مستر مينا)', icon: '👤', selector: '.mobile-avatar-stage', x: 106, y: 196, scale: 1.6, rotY: 0, zIndex: 25, opacity: 1, visible: true, locked: false },
      logo: { id: 'logo', name: 'اللوجو واسم المنصة', icon: '🏷️', selector: '.mobile-header-top-right', x: 5, y: 32, scale: 1, rotY: 0, zIndex: 40, opacity: 1, visible: true, locked: false },
      badges: { id: 'badges', name: 'أزرار الصفوف (1, 2, 3)', icon: '🔢', selector: '.mobile-grades-row', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 41, opacity: 1, visible: true, locked: false },
      leftCards: { id: 'leftCards', name: 'عمود الكروت الأربعة', icon: '📑', selector: '.mobile-left-cards-column', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 30, opacity: 1, visible: true, locked: false },
      stage1: { id: 'stage1', name: 'كارت المرحلة الأولى', icon: '📘', selector: '.mobile-stage-card:nth-child(1)', x: 0, y: 24, scale: 1, rotY: 0, zIndex: 31, opacity: 1, visible: true, locked: false },
      stage2: { id: 'stage2', name: 'كارت المرحلة الثانية', icon: '📗', selector: '.mobile-stage-card:nth-child(2)', x: 0, y: 30, scale: 1, rotY: 0, zIndex: 31, opacity: 1, visible: true, locked: false },
      stage3: { id: 'stage3', name: 'كارت المرحلة الثالثة', icon: '📙', selector: '.mobile-stage-card:nth-child(3)', x: 3, y: 46, scale: 1, rotY: 0, zIndex: 31, opacity: 1, visible: true, locked: false },
      stage4: { id: 'stage4', name: 'كارت المرحلة الرابعة', icon: '📕', selector: '.mobile-stage-card:nth-child(4)', x: 1, y: 53, scale: 1, rotY: 0, zIndex: 31, opacity: 1, visible: true, locked: false },
      chat: { id: 'chat', name: 'شريط الشات والمايك السفلي', icon: '💬', selector: '.mobile-bottom-chat-bar', x: -23, y: -17, scale: 1.25, rotY: 0, zIndex: 50, opacity: 1, visible: true, locked: false }
    };

    this.layers = JSON.parse(JSON.stringify(this.defaultLayers));

    this.dragCandidate = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialPos = { x: 0, y: 0 };
    this.hasMovedSignificantly = false;

    this.init();
  }

  loadSavedLayout() {
    try {
      const saved = localStorage.getItem('mena_mobile_layout');
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
      const data = {
        layers: this.layers,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('mena_mobile_layout', JSON.stringify(data));
    } catch (e) {}
  }

  init() {
    this.loadSavedLayout();
    this.applyAllLayers();
    this.createStudioDockBtn();
    this.createCopyTopBtn();
    this.createSidebarUI();
    this.createCanvasQuickToolbar();
    this.createCopyCodeModal();
    this.bindCanvasTouchEvents();

    const isInsideIframe = window.self !== window.top;
    const isDesktopMonitor = window.innerWidth >= 900;

    // Only auto-open sidebar when viewed directly full-screen on a large desktop monitor (outside iframe)
    if (isDesktopMonitor && !isInsideIframe) {
      document.body.classList.add('desktop-studio-view');
      const sidebar = document.getElementById('mobile-studio-sidebar');
      if (sidebar) sidebar.classList.add('open');
    }
  }

  applyAllLayers() {
    Object.keys(this.layers).forEach(key => this.applyLayerTransform(key));
  }

  applyLayerTransform(key) {
    const layer = this.layers[key];
    if (!layer) return;
    const el = document.querySelector(layer.selector);
    if (!el) return;

    if (layer.visible === false) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }

    const tx = layer.x || 0;
    const ty = layer.y || 0;
    const scale = layer.scale !== undefined ? layer.scale : 1;
    const rot = layer.rotY || 0;

    if (tx !== 0 || ty !== 0 || scale !== 1 || rot !== 0) {
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0px) scale(${scale}) rotate(${rot}deg)`;
    } else {
      el.style.transform = '';
    }

    if (layer.zIndex !== undefined && layer.zIndex !== null) el.style.zIndex = layer.zIndex;
    if (layer.opacity !== undefined && layer.opacity !== 1) el.style.opacity = layer.opacity;

    el.style.transition = this.isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  createStudioDockBtn() {
    if (document.getElementById('mobile-studio-dock-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'mobile-studio-dock-btn';
    btn.innerHTML = `⚙️ <span>استوديو التعديل</span>`;
    btn.onclick = () => this.toggleSidebar();
    document.body.appendChild(btn);
  }

  createCopyTopBtn() {
    if (document.getElementById('mobile-copy-top-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'mobile-copy-top-btn';
    btn.innerHTML = `📋 <span>نسخ الكود للشات</span>`;
    btn.title = "انسخ كود التعديلات لتقديمه في الشات للذكاء الاصطناعي";
    btn.onclick = () => this.copyLayoutCode();
    document.body.appendChild(btn);
  }

  createCanvasQuickToolbar() {
    if (document.getElementById('mobile-canvas-quick-toolbar')) return;
    const container = document.querySelector('.mobile-app-container') || document.body;
    const bar = document.createElement('div');
    bar.id = 'mobile-canvas-quick-toolbar';

    bar.innerHTML = `
      <span class="quick-tool-title" id="quick-toolbar-label">عنصر محدد</span>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.nudgeSelected(0, -6)" title="أعلى">⬆️</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.nudgeSelected(0, 6)" title="أسفل">⬇️</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.nudgeSelected(-6, 0)" title="يسار">⬅️</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.nudgeSelected(6, 0)" title="يمين">➡️</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.scaleSelected(0.05)" title="تكبير">➕</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.scaleSelected(-0.05)" title="تصغير">➖</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.resetLayer(window.mobileBuilder.selectedLayerId)" title="استعادة">🔄</button>
      <button class="quick-tool-btn btn-more-props" onclick="window.mobileBuilder.openSidebarForSelected()" title="تفاصيل وتحكم أكبر">⚙️ تفاصيل</button>
      <button class="quick-tool-btn btn-copy-quick" onclick="window.mobileBuilder.copyLayoutCode()" title="نسخ الكود لتقديمه في الشات">📋 نسخ الكود</button>
      <button class="quick-tool-btn btn-save-quick" onclick="window.mobileBuilder.saveAndToast()" title="حفظ">💾 حفظ</button>
      <button class="quick-tool-btn" onclick="window.mobileBuilder.deselectAll()" title="إلغاء التحديد">✕</button>
    `;

    container.appendChild(bar);
  }

  nudgeSelected(dx, dy) {
    if (!this.selectedLayerId || !this.layers[this.selectedLayerId]) return;
    const layer = this.layers[this.selectedLayerId];
    layer.x = (layer.x || 0) + dx;
    layer.y = (layer.y || 0) + dy;
    this.applyLayerTransform(this.selectedLayerId);
    if (this.currentTab === 'style') this.renderStylePanel(this.selectedLayerId);
    this.autoSaveLayout();
  }

  scaleSelected(dScale) {
    if (!this.selectedLayerId || !this.layers[this.selectedLayerId]) return;
    const layer = this.layers[this.selectedLayerId];
    layer.scale = Math.max(0.3, Math.min(2.5, Math.round(((layer.scale || 1) + dScale) * 100) / 100));
    this.applyLayerTransform(this.selectedLayerId);
    if (this.currentTab === 'style') this.renderStylePanel(this.selectedLayerId);
    this.autoSaveLayout();
  }

  createSidebarUI() {
    if (document.getElementById('mobile-studio-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'mobile-studio-sidebar';

    sidebar.innerHTML = `
      <!-- Drag Handle for Drawer -->
      <div class="sidebar-drag-handle" onclick="window.mobileBuilder.toggleSidebar(false)" title="تصغير / إغلاق"></div>

      <!-- TOP ACTION BAR -->
      <div class="mobile-sidebar-top-bar">
        <div class="sidebar-action-group">
          <button class="mobile-studio-btn btn-save" onclick="window.mobileBuilder.saveAndToast()">💾 حفظ</button>
          <button class="mobile-studio-btn btn-copy" onclick="window.mobileBuilder.copyLayoutCode()" title="نسخ كود التعديلات">📋 نسخ الكود</button>
          <button class="mobile-studio-btn btn-discard" onclick="window.mobileBuilder.discardChanges()">✖ إلغاء</button>
        </div>
        <button class="mobile-studio-btn btn-close" onclick="window.mobileBuilder.toggleSidebar(false)">✕ تصغير</button>
      </div>

      <!-- TABS -->
      <div class="mobile-sidebar-tabs">
        <div class="mobile-sidebar-tab active" id="tab-btn-style" onclick="window.mobileBuilder.switchTab('style')">
          🖌️ Style (التحكم)
        </div>
        <div class="mobile-sidebar-tab" id="tab-btn-blocks" onclick="window.mobileBuilder.switchTab('blocks')">
          ▦ Layers (الطبقات)
        </div>
        <div class="mobile-sidebar-tab" id="tab-btn-theme" onclick="window.mobileBuilder.switchTab('theme')">
          ⚙️ Theme
        </div>
      </div>

      <!-- TAB CONTENT PANELS -->
      <div class="mobile-sidebar-content">
        
        <!-- ── TAB 1: STYLE ── -->
        <div class="mobile-tab-panel active" id="panel-style">
          <div id="style-controls-dynamic">
            <div style="text-align: center; color: #94a3b8; padding: 20px 10px; font-size: 0.85rem;">
              👈 اضغط على أي عنصر في شاشة الموبايل (مستر مينا، الكروت، اللوجو) لتحريكه وتعديله فوراً!
            </div>
          </div>
        </div>

        <!-- ── TAB 2: BLOCKS & LAYERS ── -->
        <div class="mobile-tab-panel" id="panel-blocks">
          <div class="studio-sec-title">📁 LAYERS MANAGEMENT (طبقات الصفحة)</div>
          <div class="mobile-layers-list" id="mobile-layers-tree">
            <!-- Rendered Dynamically -->
          </div>
        </div>

        <!-- ── TAB 3: THEME ── -->
        <div class="mobile-tab-panel" id="panel-theme">
          <div class="studio-sec-title">🎨 ثيم وخلفية الصفحة</div>
          
          <div class="studio-control-group">
            <div class="studio-control-label">لون شبكة الخلفية</div>
            <button class="mobile-studio-btn" style="width: 100%; margin-bottom: 8px;" onclick="document.body.style.background = '#f8fafc'">⚪ خلفية دفتر شبكي فاتح (الافتراضي)</button>
            <button class="mobile-studio-btn" style="width: 100%; margin-bottom: 8px;" onclick="document.body.style.background = '#0b132b'">🌙 خلفية ليلية Dark Mode</button>
          </div>

          <div class="studio-control-group">
            <div class="studio-control-label">إعادة ضبط الصفحة بالكامل</div>
            <button class="mobile-studio-btn btn-discard" style="width: 100%;" onclick="window.mobileBuilder.resetAllLayers()">🔄 استعادة التوزيع الافتراضي الأصلي</button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(sidebar);
    this.renderLayersTree();
  }

  renderLayersTree() {
    const list = document.getElementById('mobile-layers-tree');
    if (!list) return;

    list.innerHTML = '';
    Object.keys(this.layers).forEach(key => {
      const layer = this.layers[key];
      const row = document.createElement('div');
      row.className = `mobile-layer-row ${this.selectedLayerId === key ? 'selected' : ''}`;
      row.onclick = () => this.selectLayer(key);

      row.innerHTML = `
        <div class="mobile-layer-info">
          <span>${layer.icon || '📦'}</span>
          <span>${layer.name}</span>
        </div>
        <div class="mobile-layer-actions">
          <button class="mobile-layer-btn" onclick="event.stopPropagation(); window.mobileBuilder.toggleLayerLock('${key}')" title="قفل / فتح">
            ${layer.locked ? '🔒' : '🔓'}
          </button>
          <button class="mobile-layer-btn" onclick="event.stopPropagation(); window.mobileBuilder.toggleLayerVisibility('${key}')" title="إظهار / إخفاء">
            ${layer.visible !== false ? '👁️' : '🕶️'}
          </button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  toggleSidebar(forceState) {
    const sidebar = document.getElementById('mobile-studio-sidebar');
    const isCurrentlyOpen = sidebar && sidebar.classList.contains('open');
    const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      sidebar?.classList.add('open');
      if (this.selectedLayerId) {
        this.switchTab('style');
      }
    } else {
      sidebar?.classList.remove('open');
    }
  }

  openSidebarForSelected() {
    this.toggleSidebar(true);
    this.switchTab('style');
    if (this.selectedLayerId) {
      this.renderStylePanel(this.selectedLayerId);
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.mobile-sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mobile-tab-panel').forEach(p => p.classList.remove('active'));

    document.getElementById(`tab-btn-${tabName}`)?.classList.add('active');
    document.getElementById(`panel-${tabName}`)?.classList.add('active');

    if (tabName === 'style' && this.selectedLayerId) {
      this.renderStylePanel(this.selectedLayerId);
    }
  }

  selectLayer(key) {
    this.selectedLayerId = key;
    this.renderLayersTree();

    // Highlight on screen
    document.querySelectorAll('.mobile-selected-highlight').forEach(el => el.classList.remove('mobile-selected-highlight'));
    const layer = this.layers[key];
    if (layer) {
      const el = document.querySelector(layer.selector);
      if (el) {
        el.classList.add('mobile-selected-highlight');
      }

      // Show quick toolbar
      const qBar = document.getElementById('mobile-canvas-quick-toolbar');
      const qLabel = document.getElementById('quick-toolbar-label');
      if (qBar && qLabel) {
        qLabel.textContent = `${layer.icon} ${layer.name}`;
        qBar.classList.add('active');
      }
    }

    this.renderStylePanel(key);
  }

  deselectAll() {
    this.selectedLayerId = null;
    document.querySelectorAll('.mobile-selected-highlight').forEach(el => el.classList.remove('mobile-selected-highlight'));
    const qBar = document.getElementById('mobile-canvas-quick-toolbar');
    if (qBar) qBar.classList.remove('active');
    this.renderLayersTree();
  }

  renderStylePanel(key) {
    const panel = document.getElementById('style-controls-dynamic');
    if (!panel) return;

    const layer = this.layers[key];
    if (!layer) return;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #38bdf8; font-size: 0.9rem;">${layer.icon} ${layer.name}</h4>
        <button class="mobile-studio-btn btn-discard" onclick="window.mobileBuilder.resetLayer('${key}')">🔄 استعادة</button>
      </div>

      <!-- Quick Nudge Arrow Pad -->
      <div class="studio-control-group" style="text-align: center; padding: 6px;">
        <div class="studio-control-label" style="justify-content: center; margin-bottom: 6px;">
          <span>🎯 تحريك دقيق بالأسهم</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <button class="mobile-studio-btn" onclick="window.mobileBuilder.nudgeSelected(0, -6)" style="padding: 4px 16px;">⬆️ أعلى</button>
          <div style="display: flex; gap: 8px;">
            <button class="mobile-studio-btn" onclick="window.mobileBuilder.nudgeSelected(-6, 0)" style="padding: 4px 12px;">⬅️ يسار</button>
            <button class="mobile-studio-btn" onclick="window.mobileBuilder.nudgeSelected(6, 0)" style="padding: 4px 12px;">➡️ يمين</button>
          </div>
          <button class="mobile-studio-btn" onclick="window.mobileBuilder.nudgeSelected(0, 6)" style="padding: 4px 16px;">⬇️ أسفل</button>
        </div>
      </div>

      <!-- X Position -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>الموضع الأفقي (X)</span>
          <span class="studio-control-value" id="val-x">${layer.x || 0}px</span>
        </div>
        <input type="range" class="studio-slider" min="-300" max="300" value="${layer.x || 0}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'x', parseInt(this.value)); document.getElementById('val-x').textContent = this.value + 'px'" />
      </div>

      <!-- Y Position -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>الموضع الرأسي (Y)</span>
          <span class="studio-control-value" id="val-y">${layer.y || 0}px</span>
        </div>
        <input type="range" class="studio-slider" min="-400" max="400" value="${layer.y || 0}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'y', parseInt(this.value)); document.getElementById('val-y').textContent = this.value + 'px'" />
      </div>

      <!-- Scale -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>الحجم والتكبير (Scale)</span>
          <span class="studio-control-value" id="val-scale">${layer.scale || 1}x</span>
        </div>
        <input type="range" class="studio-slider" min="0.3" max="2.4" step="0.05" value="${layer.scale || 1}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'scale', parseFloat(this.value)); document.getElementById('val-scale').textContent = this.value + 'x'" />
      </div>

      <!-- Rotation -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>الدوران (Rotation)</span>
          <span class="studio-control-value" id="val-rot">${layer.rotY || 0}°</span>
        </div>
        <input type="range" class="studio-slider" min="-180" max="180" value="${layer.rotY || 0}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'rotY', parseInt(this.value)); document.getElementById('val-rot').textContent = this.value + '°'" />
      </div>

      <!-- Opacity -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>الشفافية (Opacity)</span>
          <span class="studio-control-value" id="val-opacity">${layer.opacity !== undefined ? layer.opacity : 1}</span>
        </div>
        <input type="range" class="studio-slider" min="0.1" max="1" step="0.05" value="${layer.opacity !== undefined ? layer.opacity : 1}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'opacity', parseFloat(this.value)); document.getElementById('val-opacity').textContent = this.value" />
      </div>

      <!-- Z-Index -->
      <div class="studio-control-group">
        <div class="studio-control-label">
          <span>طبقة الارتفاع (Z-Index)</span>
          <span class="studio-control-value" id="val-z">${layer.zIndex || 10}</span>
        </div>
        <input type="range" class="studio-slider" min="1" max="100" value="${layer.zIndex || 10}"
          oninput="window.mobileBuilder.updateLayerProp('${key}', 'zIndex', parseInt(this.value)); document.getElementById('val-z').textContent = this.value" />
      </div>
    `;
  }

  updateLayerProp(key, prop, value) {
    if (!this.layers[key]) return;
    this.layers[key][prop] = value;
    this.applyLayerTransform(key);
    this.autoSaveLayout();
  }

  toggleLayerLock(key) {
    if (!this.layers[key]) return;
    this.layers[key].locked = !this.layers[key].locked;
    this.renderLayersTree();
    this.showToast(this.layers[key].locked ? `🔒 تم قفل ${this.layers[key].name}` : `🔓 تم فتح ${this.layers[key].name}`);
  }

  toggleLayerVisibility(key) {
    if (!this.layers[key]) return;
    this.layers[key].visible = this.layers[key].visible === false ? true : false;
    this.applyLayerTransform(key);
    this.renderLayersTree();
  }

  resetLayer(key) {
    if (this.defaultLayers[key]) {
      this.layers[key] = JSON.parse(JSON.stringify(this.defaultLayers[key]));
      this.applyLayerTransform(key);
      if (this.currentTab === 'style') this.renderStylePanel(key);
      this.autoSaveLayout();
      this.showToast(`🔄 تم استعادة ${this.layers[key].name}`);
    }
  }

  resetAllLayers() {
    if (confirm('هل أنت متأكد من استعادة التوزيع الافتراضي الأصلي لصفحة الموبايل؟')) {
      this.layers = JSON.parse(JSON.stringify(this.defaultLayers));
      this.applyAllLayers();
      this.renderLayersTree();
      if (this.selectedLayerId) this.renderStylePanel(this.selectedLayerId);
      this.autoSaveLayout();
      this.showToast('🔄 تم استعادة التوزيع الافتراضي بنجاح!');
    }
  }

  saveAndToast() {
    this.autoSaveLayout();
    this.showToast('💾 تم حفظ التعديلات بنجاح!');
  }

  discardChanges() {
    this.loadSavedLayout();
    this.applyAllLayers();
    if (this.selectedLayerId) this.renderStylePanel(this.selectedLayerId);
    this.showToast('✖ تم إلغاء التغييرات غير المحفوظة');
  }

  /* ── 4. POPUP CODE MODAL AND COPY METHODS ── */
  createCopyCodeModal() {
    if (document.getElementById('mobile-copy-code-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'mobile-copy-code-modal';
    modal.className = 'mobile-modal-overlay';
    modal.onclick = (e) => {
      if (e.target === modal) this.closeCopyModal();
    };

    modal.innerHTML = `
      <div class="mobile-modal-card" onclick="event.stopPropagation()">
        <div class="mobile-modal-header">
          <div class="mobile-modal-title">📋 كود التعديلات (جاهز للإرسال في الشات)</div>
          <button class="mobile-modal-close" onclick="window.mobileBuilder.closeCopyModal()">✕</button>
        </div>
        <div class="mobile-modal-body">
          <p class="mobile-modal-desc">
            اضغط على الزر الأخضر أدناه لنسخ الكود بالكامل، ثم الصقه في الشات للذكاء الاصطناعي ليتم تثبيته في كود المشروع نهائياً:
          </p>
          <textarea id="mobile-copy-code-textarea" class="mobile-modal-textarea" readonly></textarea>
          <div class="mobile-modal-actions">
            <button class="modal-action-btn btn-copy-now" id="btn-modal-copy-action" onclick="window.mobileBuilder.executeCopyFromModal()">
              📋 نسخ الكود بنقرة واحدة
            </button>
            <button class="modal-action-btn btn-close-modal" onclick="window.mobileBuilder.closeCopyModal()">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  generateExportCode() {
    const summary = {
      description: "Mena Mobile Version - Custom Layout Coordinates",
      timestamp: new Date().toLocaleString('ar-EG'),
      coordinates: {}
    };

    Object.keys(this.layers).forEach(key => {
      const l = this.layers[key];
      summary.coordinates[key] = {
        name: l.name,
        x: l.x || 0,
        y: l.y || 0,
        scale: l.scale !== undefined ? l.scale : 1,
        rotation: l.rotY || 0,
        zIndex: l.zIndex || 10,
        opacity: l.opacity !== undefined ? l.opacity : 1
      };
    });

    return JSON.stringify(summary, null, 2);
  }

  copyLayoutCode() {
    const code = this.generateExportCode();
    const modal = document.getElementById('mobile-copy-code-modal');
    const textarea = document.getElementById('mobile-copy-code-textarea');

    if (textarea) {
      textarea.value = code;
    }

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
      }, 100);
    }

    // Try automatic copy to clipboard
    try {
      navigator.clipboard.writeText(code).then(() => {
        this.showToast('📋 تم نسخ الكود للحافظة وفتح النافذة!');
      }).catch(() => {
        this.showToast('📋 تم فتح كود التخطيط للنسخ');
      });
    } catch (e) {
      this.showToast('📋 تم فتح كود التخطيط للنسخ');
    }
  }

  executeCopyFromModal() {
    const textarea = document.getElementById('mobile-copy-code-textarea');
    const btn = document.getElementById('btn-modal-copy-action');
    if (!textarea) return;

    textarea.focus();
    textarea.select();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textarea.value);
      } else {
        document.execCommand('copy');
      }
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ تم النسخ بنجاح!';
        btn.style.background = '#059669';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
        }, 2200);
      }
      this.showToast('✅ تم نسخ الكود إلى الحافظة بنجاح!');
    } catch (err) {
      prompt('حدد الكود وانسخه يدوياً:', textarea.value);
    }
  }

  closeCopyModal() {
    const modal = document.getElementById('mobile-copy-code-modal');
    if (modal) modal.classList.remove('active');
  }

  bindCanvasTouchEvents() {
    const handleStart = (e) => {
      // Don't intercept clicks inside drawers, toolbars, modals, or headers
      if (e.target.closest('#mobile-canvas-quick-toolbar, #mobile-studio-sidebar, #mobile-studio-dock-btn, #mobile-copy-top-btn, #mobile-copy-code-modal, .desktop-switch-banner')) {
        return;
      }

      // Check for specific stage card first
      const stageCard = e.target.closest('.mobile-stage-card');
      let matchedKey = null;

      if (stageCard) {
        const cards = Array.from(document.querySelectorAll('.mobile-stage-card'));
        const idx = cards.indexOf(stageCard) + 1;
        matchedKey = 'stage' + idx;
      } else {
        const target = e.target.closest(
          '.mobile-avatar-stage, .mobile-header-top-right, .mobile-grades-row, .mobile-left-cards-column, .mobile-bottom-chat-bar'
        );
        if (!target) return;

        for (const key of Object.keys(this.layers)) {
          if (target.matches(this.layers[key].selector)) {
            matchedKey = key;
            break;
          }
        }
      }

      if (!matchedKey || this.layers[matchedKey]?.locked) return;

      this.dragCandidate = matchedKey;
      this.isDragging = true;
      this.hasMovedSignificantly = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.dragStart = { x: clientX, y: clientY };
      this.initialPos = { x: this.layers[matchedKey].x || 0, y: this.layers[matchedKey].y || 0 };

      this.selectLayer(matchedKey);
    };

    const handleMove = (e) => {
      if (!this.isDragging || !this.dragCandidate) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - this.dragStart.x;
      const dy = clientY - this.dragStart.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMovedSignificantly = true;
      }

      const layer = this.layers[this.dragCandidate];
      layer.x = Math.round(this.initialPos.x + dx);
      layer.y = Math.round(this.initialPos.y + dy);

      this.applyLayerTransform(this.dragCandidate);
      
      const valX = document.getElementById('val-x');
      const valY = document.getElementById('val-y');
      if (valX) valX.textContent = `${layer.x}px`;
      if (valY) valY.textContent = `${layer.y}px`;
    };

    const handleEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragCandidate = null;
        this.autoSaveLayout();
      }
    };

    document.addEventListener('mousedown', handleStart, { passive: true });
    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseup', handleEnd, { passive: true });

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd, { passive: true });
  }

  showToast(msg) {
    let toast = document.getElementById('mobile-studio-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mobile-studio-toast';
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #0f274a; color: #fff; border: 1.5px solid #0284c7;
        padding: 8px 18px; border-radius: 30px; font-size: 0.82rem; font-weight: 700;
        z-index: 99999999; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        pointer-events: none; opacity: 0; transition: opacity 0.25s ease;
        font-family: 'Cairo', sans-serif; direction: rtl; text-align: center;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2400);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.mobileBuilder = new MobileOdooBuilder();
});