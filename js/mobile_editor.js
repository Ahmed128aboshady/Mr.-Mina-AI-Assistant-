/**
 * 📱 mobile_editor.js — Odoo Studio Visual Builder for Mobile Version
 * Completely isolated from Desktop version.
 */

class MobileOdooBuilder {
  constructor() {
    this.isEditMode = false;
    this.currentTab = 'blocks';
    this.selectedLayerId = null;
    this.selectedCustomBlockId = null;

    this.defaultLayers = {
      avatar: { id: 'avatar', name: 'الأفاتار (مستر مينا)', icon: '👤', selector: '.mobile-avatar-stage', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 30, opacity: 1, visible: true, locked: false },
      logo: { id: 'logo', name: 'اللوجو واسم المنصة', icon: '🏷️', selector: '.mobile-header-top-right', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 50, opacity: 1, visible: true, locked: false },
      badges: { id: 'badges', name: 'أزرار الصفوف (1, 2, 3)', icon: '🔢', selector: '.mobile-grades-row', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 51, opacity: 1, visible: true, locked: false },
      leftCards: { id: 'leftCards', name: 'عمود الكروت الأربعة', icon: '📑', selector: '.mobile-left-cards-column', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 40, opacity: 1, visible: true, locked: false },
      stage1: { id: 'stage1', name: 'كارت المرحلة الأولى', icon: '📘', selector: '.mobile-stage-card:nth-child(1)', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 41, opacity: 1, visible: true, locked: false },
      stage2: { id: 'stage2', name: 'كارت المرحلة الثانية', icon: '📗', selector: '.mobile-stage-card:nth-child(2)', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 41, opacity: 1, visible: true, locked: false },
      stage3: { id: 'stage3', name: 'كارت المرحلة الثالثة', icon: '📙', selector: '.mobile-stage-card:nth-child(3)', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 41, opacity: 1, visible: true, locked: false },
      stage4: { id: 'stage4', name: 'كارت المرحلة الرابعة', icon: '📕', selector: '.mobile-stage-card:nth-child(4)', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 41, opacity: 1, visible: true, locked: false },
      chat: { id: 'chat', name: 'شريط الشات والمايك السفلي', icon: '💬', selector: '.mobile-bottom-chat-bar', x: 0, y: 0, scale: 1, rotY: 0, zIndex: 60, opacity: 1, visible: true, locked: false }
    };

    this.layers = JSON.parse(JSON.stringify(this.defaultLayers));

    this.snippets = {
      banner: {
        name: 'Announcement Banner',
        icon: '📢',
        html: `
          <div class="mobile-snippet-wrap" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; padding: 12px 16px; border-radius: 14px; margin: 8px 12px; box-shadow: 0 4px 14px rgba(2,132,199,0.3); direction: rtl;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.5rem;">📢</span>
              <div>
                <h4 contenteditable="true" style="margin: 0; font-size: 0.95rem; font-weight: 800;">تنبيه هام لطلاب الموبايل:</h4>
                <p contenteditable="true" style="margin: 2px 0 0; font-size: 0.8rem; opacity: 0.95;">حصة المراجعة الشاملة لعلوم أولى إعدادي يوم الجمعة 6 مساءً!</p>
              </div>
            </div>
          </div>
        `
      },
      social: {
        name: 'WhatsApp & Social',
        icon: '💬',
        html: `
          <div class="mobile-snippet-wrap" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 10px 14px; border-radius: 14px; margin: 8px 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem; color: #16a34a;">💬</span>
              <span contenteditable="true" style="font-weight: 700; color: #0f2b48; font-size: 0.82rem;">تواصل مع مستر مينا:</span>
            </div>
            <a href="https://wa.me/" target="_blank" style="background: #25d366; color: #fff; text-decoration: none; padding: 5px 12px; border-radius: 16px; font-weight: 700; font-size: 0.78rem;">
              واتساب 📱
            </a>
          </div>
        `
      },
      video: {
        name: 'YouTube Video',
        icon: '🎬',
        html: `
          <div class="mobile-snippet-wrap" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 12px; border-radius: 16px; margin: 8px 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); direction: rtl;">
            <h4 contenteditable="true" style="margin: 0 0 8px 0; font-size: 0.9rem; color: #0f2b48; font-weight: 800;">🎬 فيديو شرح تركيب المادة</h4>
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 10px; background: #000;">
              <iframe style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>
            </div>
          </div>
        `
      },
      features: {
        name: '3 Columns Features',
        icon: '📑',
        html: `
          <div class="mobile-snippet-wrap" style="display: flex; flex-direction: column; gap: 8px; margin: 8px 12px; direction: rtl;">
            <div style="background: #fff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 12px; text-align: center;">
              <div style="font-size: 1.5rem;">🔬</div>
              <h5 contenteditable="true" style="margin: 2px 0; color: #0284c7; font-weight: 800;">معمل تفاعلي 3D</h5>
              <p contenteditable="true" style="margin: 0; font-size: 0.75rem; color: #64748b;">تجارب ومجسمات ثلاثية الأبعاد لشرح المنهج</p>
            </div>
          </div>
        `
      },
      quote: {
        name: 'Science Tip / Quote',
        icon: '💡',
        html: `
          <div class="mobile-snippet-wrap" style="background: #fefce8; border: 1.5px solid #fef08a; padding: 12px 14px; border-radius: 14px; margin: 8px 12px; display: flex; align-items: center; gap: 10px; direction: rtl;">
            <span style="font-size: 1.5rem;">💡</span>
            <div>
              <h5 contenteditable="true" style="margin: 0; color: #854d0e; font-weight: 800; font-size: 0.85rem;">سر كيميائي من مستر مينا:</h5>
              <p contenteditable="true" style="margin: 2px 0 0; color: #713f12; font-size: 0.78rem;">الذرة متعادلة كهربياً لأن البروتونات الموجبة = الإلكترونات السالبة!</p>
            </div>
          </div>
        `
      },
      faq: {
        name: 'FAQ Accordion',
        icon: '❓',
        html: `
          <div class="mobile-snippet-wrap" style="background: #ffffff; border: 1.5px solid #e2e8f0; padding: 12px; border-radius: 14px; margin: 8px 12px; direction: rtl;">
            <h5 contenteditable="true" style="margin: 0 0 8px 0; font-size: 0.9rem; color: #0f2b48; font-weight: 800;">❓ الأسئلة الشائعة:</h5>
            <details style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 8px;">
              <summary contenteditable="true" style="font-weight: 700; color: #0284c7; font-size: 0.82rem; cursor: pointer;">كيف أشاهد المعمل الـ 3D؟</summary>
              <p contenteditable="true" style="margin: 4px 0 0; font-size: 0.75rem; color: #475569;">اضغط على أي مرحلة ثم اختر الدرس واستمتع بالتجربة!</p>
            </details>
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
    this.createSidebarUI();
    this.bindCanvasTouchEvents();
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

    el.style.transform = `translate3d(${tx}px, ${ty}px, 0px) scale(${scale}) rotate(${rot}deg)`;
    if (layer.zIndex !== undefined) el.style.zIndex = layer.zIndex;
    if (layer.opacity !== undefined) el.style.opacity = layer.opacity;
    el.style.transition = this.isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  createStudioDockBtn() {
    if (document.getElementById('mobile-studio-dock-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'mobile-studio-dock-btn';
    btn.innerHTML = `⚙️ <span>تعديل الموبايل (Odoo)</span>`;
    btn.onclick = () => this.toggleEditMode();
    document.body.appendChild(btn);
  }

  createSidebarUI() {
    if (document.getElementById('mobile-studio-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'mobile-studio-sidebar';

    sidebar.innerHTML = `
      <!-- TOP ACTION BAR -->
      <div class="mobile-sidebar-top-bar">
        <div class="sidebar-action-group">
          <button class="mobile-studio-btn btn-save" onclick="window.mobileBuilder.saveAndToast()">💾 حفظ</button>
          <button class="mobile-studio-btn btn-discard" onclick="window.mobileBuilder.discardChanges()">✖ إلغاء</button>
          <button class="mobile-studio-btn btn-copy" onclick="window.mobileBuilder.copyLayoutCode()">📋 نسخ الكود</button>
        </div>
        <button class="mobile-studio-btn btn-close" onclick="window.mobileBuilder.toggleEditMode(false)">✕</button>
      </div>

      <!-- TABS -->
      <div class="mobile-sidebar-tabs">
        <div class="mobile-sidebar-tab active" id="tab-btn-blocks" onclick="window.mobileBuilder.switchTab('blocks')">
          ▦ Blocks
        </div>
        <div class="mobile-sidebar-tab" id="tab-btn-style" onclick="window.mobileBuilder.switchTab('style')">
          🖌️ Style
        </div>
        <div class="mobile-sidebar-tab" id="tab-btn-theme" onclick="window.mobileBuilder.switchTab('theme')">
          ⚙️ Theme
        </div>
      </div>

      <!-- TAB CONTENT PANELS -->
      <div class="mobile-sidebar-content">
        
        <!-- ── TAB 1: BLOCKS ── -->
        <div class="mobile-tab-panel active" id="panel-blocks">
          
          <div class="studio-sec-title">🧩 DRAGGABLE BUILDING BLOCKS</div>
          <div class="mobile-snippets-grid">
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('banner')">
              <span class="snippet-icon">📢</span>
              <span class="snippet-name">Announcement</span>
              <span class="snippet-badge">Add +</span>
            </div>
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('social')">
              <span class="snippet-icon">💬</span>
              <span class="snippet-name">WhatsApp & Social</span>
              <span class="snippet-badge">Add +</span>
            </div>
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('video')">
              <span class="snippet-icon">🎬</span>
              <span class="snippet-name">YouTube Video</span>
              <span class="snippet-badge">Add +</span>
            </div>
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('features')">
              <span class="snippet-icon">📑</span>
              <span class="snippet-name">3 Columns</span>
              <span class="snippet-badge">Add +</span>
            </div>
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('quote')">
              <span class="snippet-icon">💡</span>
              <span class="snippet-name">Science Tip</span>
              <span class="snippet-badge">Add +</span>
            </div>
            <div class="mobile-snippet-card" onclick="window.mobileBuilder.insertSnippet('faq')">
              <span class="snippet-icon">❓</span>
              <span class="snippet-name">FAQ Accordion</span>
              <span class="snippet-badge">Add +</span>
            </div>
          </div>

          <div class="studio-sec-title">📁 LAYERS MANAGEMENT (طبقات الصفحة)</div>
          <div class="mobile-layers-list" id="mobile-layers-tree">
            <!-- Rendered Dynamically -->
          </div>

        </div>

        <!-- ── TAB 2: STYLE ── -->
        <div class="mobile-tab-panel" id="panel-style">
          <div id="style-controls-dynamic">
            <div style="text-align: center; color: #94a3b8; padding: 40px 10px;">
              👈 اضغط على أي عنصر في الصفحة أو اختره من قائمة الطبقات لتعديل أبعاده وموضعه!
            </div>
          </div>
        </div>

        <!-- ── TAB 3: THEME ── -->
        <div class="mobile-tab-panel" id="panel-theme">
          <div class="studio-sec-title">🎨 ثيم وخلفية الصفحة</div>
          
          <div class="studio-control-group">
            <div class="studio-control-label">لون شبكة الخلفية</div>
            <button class="mobile-studio-btn" style="width: 100%; margin-bottom: 8px;" onclick="document.body.style.background = '#f8fafc'">⚪ خلفية دفتر شبكي فاتح (الافتراضي)</button>
            <button class="mobile-studio-btn" style="width: 100%; margin-bottom: 8px;" onclick="document.body.style.background = '#0b132b'">🌙 خلفية ليلية Dark Mode</button>
            <button class="mobile-studio-btn" style="width: 100%;" onclick="document.body.style.background = '#f0fdf4'">🌿 خلفية خضراء علمية</button>
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

  toggleEditMode(forceState) {
    this.isEditMode = forceState !== undefined ? forceState : !this.isEditMode;
    const sidebar = document.getElementById('mobile-studio-sidebar');
    const dock = document.getElementById('mobile-studio-dock-btn');

    if (this.isEditMode) {
      document.body.classList.add('mobile-edit-mode');
      sidebar?.classList.add('open');
      if (dock) dock.innerHTML = `✖ <span>إغلاق الاستوديو</span>`;
      this.showToast('🎨 تم تفعيل وضع التعديل (Odoo Studio) للموبايل');
    } else {
      document.body.classList.remove('mobile-edit-mode');
      sidebar?.classList.remove('open');
      if (dock) dock.innerHTML = `⚙️ <span>تعديل الموبايل (Odoo)</span>`;
      this.deselectAll();
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
    }

    this.switchTab('style');
    this.renderStylePanel(key);
  }

  deselectAll() {
    this.selectedLayerId = null;
    document.querySelectorAll('.mobile-selected-highlight').forEach(el => el.classList.remove('mobile-selected-highlight'));
    this.renderLayersTree();
  }

  renderStylePanel(key) {
    const panel = document.getElementById('style-controls-dynamic');
    if (!panel) return;

    const layer = this.layers[key];
    if (!layer) return;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h4 style="margin: 0; color: #38bdf8; font-size: 0.95rem;">${layer.icon} ${layer.name}</h4>
        <button class="mobile-studio-btn btn-discard" onclick="window.mobileBuilder.resetLayer('${key}')">🔄 استعادة</button>
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
        <input type="range" class="studio-slider" min="0.3" max="2.2" step="0.05" value="${layer.scale || 1}"
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
      this.renderStylePanel(key);
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

  insertSnippet(type) {
    const snippet = this.snippets[type];
    if (!snippet) return;

    let container = document.getElementById('mobile-custom-blocks-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mobile-custom-blocks-container';
      const mainApp = document.querySelector('.mobile-app-container');
      if (mainApp) {
        mainApp.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = snippet.html.trim();
    const blockEl = wrapper.firstElementChild;
    container.appendChild(blockEl);

    this.showToast(`➕ تم إضافة بلوك: ${snippet.name}`);
  }

  saveAndToast() {
    this.autoSaveLayout();
    this.showToast('💾 تم حفظ التعديلات في الذاكرة بنجاح!');
  }

  discardChanges() {
    this.loadSavedLayout();
    this.applyAllLayers();
    if (this.selectedLayerId) this.renderStylePanel(this.selectedLayerId);
    this.showToast('✖ تم إلغاء التغييرات غير المحفوظة');
  }

  copyLayoutCode() {
    const jsonStr = JSON.stringify(this.layers, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.showToast('📋 تم نسخ كود التخطيط إلى الحافظة!');
    }).catch(() => {
      prompt('انسخ كود التخطيط:', jsonStr);
    });
  }

  bindCanvasTouchEvents() {
    const handleStart = (e) => {
      if (!this.isEditMode) return;
      const target = e.target.closest(
        '.mobile-header-top-right, .mobile-grades-row, .mobile-left-cards-column, .mobile-stage-card, .mobile-avatar-stage, .mobile-bottom-chat-bar'
      );
      if (!target) return;

      // Find which layer
      let matchedKey = null;
      for (const key of Object.keys(this.layers)) {
        if (target.matches(this.layers[key].selector)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey || this.layers[matchedKey].locked) return;

      this.dragCandidate = matchedKey;
      this.isDragging = true;
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
        padding: 10px 20px; border-radius: 30px; font-size: 0.85rem; font-weight: 700;
        z-index: 99999999; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
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
    }, 2800);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.mobileBuilder = new MobileOdooBuilder();
});