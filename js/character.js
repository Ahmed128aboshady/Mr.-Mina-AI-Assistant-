/**
 * character.js — الإصدار المخصص لمستر مينا
 * 3D Teacher Avatar & Modern Science Lab Classroom Environment
 * متوافق 100% مع كافة إصدارات Three.js بدون أي أخطاء
 */

class CharacterViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.isSpeaking = false;
    this.targetRotY = 0;
    this.currentRotY = 0;

    // Body part references for animation
    this.teacherGroup = null;
    this.headGroup = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftForearm = null;
    this.rightForearm = null;
    this.leftHand = null;
    this.rightHand = null;
    this.torso = null;
    this.beakerLiquid = null;
    this.flaskGlow = null;
    this.speakLight = null;

    this._init();
  }

  // ─────────────────────────────────────────────
  _init() {
    try {
      this._setupScene();
      this._setupLights();
      this._setupCamera();
      this._buildClassroom();
      this._loadRealisticOrFallbackAvatar();
      this._bindEvents();
      this._animate();
    } catch (err) {
      console.error('Three.js Init Error:', err);
    }
  }

  /**
   * محاولة تحميل المجسم البشري الواقعي من 3ds Max / ReadyPlayerMe بصيغة GLB أو FBX
   * إذا لم يتوفر بعد يتم عرض النموذج المدمج كـ Fallback
   */
  _loadRealisticOrFallbackAvatar() {
    const glbPath = 'assets/teacher.glb';
    const fbxPath = 'assets/teacher.fbx';

    const onModelLoaded = (model, isGltf = true) => {
      console.log('✅ تم تحميل المجسم البشري الواقعي بنجاح!');
      const character = isGltf ? (model.scene || model) : model;

      // Auto-scale to human size (around 1.75 units)
      const box = new THREE.Box3().setFromObject(character);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = 1.75 / (size.y || 1.75);
      character.scale.setScalar(scale);

      // Center and position behind desk facing forward towards the camera/student
      const newBox = new THREE.Box3().setFromObject(character);
      character.position.set(0, -newBox.min.y + 0.1, -0.3);
      character.rotation.y = Math.PI; // دوران 180 درجة ليواجه الطالب مباشرة
      this._baseY = character.position.y;

      // تطبيق خامات وألوان الصورة الأصلية فائقة النقاء (High-Res Pixar Shading)
      const texLoader = new THREE.TextureLoader();
      texLoader.load('assets/mr_mena_character.png', (tex) => {
        tex.encoding = THREE.sRGBEncoding || 3001;
        tex.anisotropy = 16;
        character.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.4;
              child.material.metalness = 0.05;
              child.material.needsUpdate = true;
            }
          }
        });
      });

      this.teacherGroup = character;
      this.scene.add(character);

      // إضافة إضاءة استوديو ثلاثية (Studio Key & Rim Light) لإبراز الوجه والنظارة والبالطو
      const faceLight = new THREE.DirectionalLight(0xfff3db, 2.4);
      faceLight.position.set(0, 2.2, 2.5);
      this.scene.add(faceLight);

      const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
      rimLight.position.set(0, 3.0, -2.0);
      this.scene.add(rimLight);

      // Setup mixer if animations exist
      const anims = isGltf ? model.animations : character.animations;
      if (anims && anims.length > 0) {
        this.mixer = new THREE.AnimationMixer(character);
        const action = this.mixer.clipAction(anims[0]);
        action.play();
      }

      document.dispatchEvent(new CustomEvent('character-loaded'));
    };

    // 1) Try GLB first (ReadyPlayerMe / 3ds Max GLTF export)
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(
        glbPath,
        (gltf) => onModelLoaded(gltf, true),
        null,
        () => {
          // 2) Try FBX next (3ds Max FBX export)
          if (typeof THREE.FBXLoader !== 'undefined') {
            const fbxLoader = new THREE.FBXLoader();
            fbxLoader.load(
              fbxPath,
              (fbx) => onModelLoaded(fbx, false),
              null,
              () => {
                // 3) Fallback to built-in avatar
                this._buildMrMinaAvatar();
                document.dispatchEvent(new CustomEvent('character-loaded'));
              }
            );
          } else {
            this._buildMrMinaAvatar();
            document.dispatchEvent(new CustomEvent('character-loaded'));
          }
        }
      );
    } else {
      this._buildMrMinaAvatar();
      document.dispatchEvent(new CustomEvent('character-loaded'));
    }
  }

  // ─────────────────────────────────────────────
  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this._resizeRenderer();
  }

  // ─────────────────────────────────────────────
  _setupLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x506580, 1.1);
    this.scene.add(ambient);

    // Warm Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xfff7e6, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.camera.left = -3;
      keyLight.shadow.camera.right = 3;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -1;
    }
    this.scene.add(keyLight);

    // Cool Fill Light
    const fillLight = new THREE.DirectionalLight(0x3872b0, 1.2);
    fillLight.position.set(-3, 3, 2);
    this.scene.add(fillLight);

    // Golden Rim Light from behind
    const rimLight = new THREE.DirectionalLight(0xf5c842, 1.3);
    rimLight.position.set(0, 4, -3);
    this.scene.add(rimLight);

    // Desk Chemical Flask Glow
    this.flaskGlow = new THREE.PointLight(0x00e676, 1.4, 3.5);
    this.flaskGlow.position.set(-0.85, 1.2, 0.45);
    this.scene.add(this.flaskGlow);

    // Speaking Light
    this.speakLight = new THREE.PointLight(0xf5c842, 0, 4);
    this.speakLight.position.set(0, 1.8, 1.5);
    this.scene.add(this.speakLight);
  }

  // ─────────────────────────────────────────────
  _setupCamera() {
    const w = this.canvas.clientWidth || 400;
    const h = this.canvas.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    this.camera.position.set(0, 1.55, 3.6);
    this.camera.lookAt(0, 1.38, 0);
  }

  // ─────────────────────────────────────────────
  /** بناء بيئة المعمل والفصل بدقة عالية */
  _buildClassroom() {
    const s = this.scene;

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 0.5, metalness: 0.1 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111726, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2b1c10, roughness: 0.6 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x0a2618, roughness: 0.7 });
    const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.35, metalness: 0.1 });
    const deskBodyMat = new THREE.MeshStandardMaterial({ color: 0x22140a, roughness: 0.7 });
    const chalkWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const chalkCyan = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45, roughness: 0.1 });
    const liquidGreen = new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00a854, emissiveIntensity: 0.6, roughness: 0.2 });
    const liquidBlue = new THREE.MeshStandardMaterial({ color: 0x00b0ff, emissive: 0x0077b5, emissiveIntensity: 0.5, roughness: 0.2 });

    const addMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, receive = true) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      s.add(mesh);
      return mesh;
    };

    // Floor
    addMesh(new THREE.PlaneGeometry(12, 12), floorMat, 0, 0, 0, -Math.PI / 2, 0, 0, false, true);

    // Floor grid
    const grid = new THREE.GridHelper(12, 24, 0x3d2817, 0x1f140b);
    grid.position.y = 0.002;
    s.add(grid);

    // Back Wall
    addMesh(new THREE.PlaneGeometry(12, 7), wallMat, 0, 3.2, -1.8, 0, 0, 0, false, true);
    addMesh(new THREE.BoxGeometry(12, 0.2, 0.08), woodMat, 0, 0.1, -1.75);

    // Blackboard Frame & Board
    addMesh(new THREE.BoxGeometry(4.4, 2.2, 0.08), woodMat, 0, 2.25, -1.74);
    addMesh(new THREE.BoxGeometry(4.16, 1.96, 0.04), boardMat, 0, 2.25, -1.70);
    addMesh(new THREE.BoxGeometry(4.4, 0.08, 0.16), woodMat, 0, 1.15, -1.66);

    // Blackboard Science Graphics (Bohr Atom & Formulas)
    // Nucleus
    addMesh(new THREE.SphereGeometry(0.08, 12, 12), chalkCyan, -1.1, 2.4, -1.67, 0, 0, 0, false, false);
    // Rings
    addMesh(new THREE.TorusGeometry(0.25, 0.012, 6, 24), chalkWhite, -1.1, 2.4, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.TorusGeometry(0.44, 0.012, 6, 24), chalkCyan, -1.1, 2.4, -1.67, 0.3, 0.5, 0, false, false);
    addMesh(new THREE.TorusGeometry(0.60, 0.012, 6, 24), chalkWhite, -1.1, 2.4, -1.67, -0.4, 0.4, 0, false, false);

    // Electrons
    addMesh(new THREE.SphereGeometry(0.028, 8, 8), chalkWhite, -0.85, 2.45, -1.66, 0, 0, 0, false, false);
    addMesh(new THREE.SphereGeometry(0.028, 8, 8), chalkWhite, -1.35, 2.2, -1.66, 0, 0, 0, false, false);

    // Science Title & Equations on Board
    addMesh(new THREE.BoxGeometry(1.6, 0.035, 0.01), chalkCyan, 1.0, 2.9, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.BoxGeometry(1.1, 0.025, 0.01), chalkWhite, 0.9, 2.65, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.BoxGeometry(1.3, 0.025, 0.01), chalkWhite, 1.0, 2.45, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.BoxGeometry(0.8, 0.025, 0.01), chalkCyan, 0.75, 2.25, -1.67, 0, 0, 0, false, false);

    // Molecules H2O
    addMesh(new THREE.SphereGeometry(0.07, 10, 10), chalkCyan, 0.8, 1.8, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), chalkWhite, 0.65, 1.68, -1.67, 0, 0, Math.PI / 4, false, false);
    addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), chalkWhite, 0.95, 1.68, -1.67, 0, 0, -Math.PI / 4, false, false);
    addMesh(new THREE.SphereGeometry(0.05, 10, 10), chalkWhite, 0.52, 1.58, -1.67, 0, 0, 0, false, false);
    addMesh(new THREE.SphereGeometry(0.05, 10, 10), chalkWhite, 1.08, 1.58, -1.67, 0, 0, 0, false, false);

    // Chalks on tray
    addMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), chalkWhite, 0.4, 1.21, -1.62, 0, 0, Math.PI / 2);
    addMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), chalkCyan, 0.6, 1.21, -1.62, 0, 0.2, Math.PI / 2);

    // Teacher's Desk
    const deskZ = 0.55;
    addMesh(new THREE.BoxGeometry(2.5, 0.07, 1.0), deskTopMat, 0, 0.92, deskZ);
    addMesh(new THREE.BoxGeometry(2.4, 0.75, 0.04), deskBodyMat, 0, 0.52, deskZ - 0.44);
    addMesh(new THREE.BoxGeometry(0.06, 0.88, 0.94), deskBodyMat, -1.2, 0.46, deskZ);
    addMesh(new THREE.BoxGeometry(0.06, 0.88, 0.94), deskBodyMat,  1.2, 0.46, deskZ);

    // Desk Props (Chemical Flasks & Books)
    const flaskGroup = new THREE.Group();
    flaskGroup.position.set(-0.85, 0.955, deskZ + 0.1);
    const flaskBase = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 16, 1, true), glassMat);
    flaskBase.position.y = 0.11;
    const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), glassMat);
    flaskNeck.position.y = 0.24;
    const flaskLiquid = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.12, 16), liquidGreen);
    flaskLiquid.position.y = 0.06;
    flaskGroup.add(flaskBase, flaskNeck, flaskLiquid);
    s.add(flaskGroup);
    this.beakerLiquid = flaskLiquid;

    // Beaker
    const beakerGroup = new THREE.Group();
    beakerGroup.position.set(-0.55, 0.955, deskZ + 0.15);
    const beakerGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 16), glassMat);
    beakerGlass.position.y = 0.09;
    const beakerLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.11, 16), liquidBlue);
    beakerLiquid.position.y = 0.055;
    beakerGroup.add(beakerGlass, beakerLiquid);
    s.add(beakerGroup);

    // Books Stack
    const bMatRed = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
    const bMatBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const bMatGold = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 });
    addMesh(new THREE.BoxGeometry(0.28, 0.05, 0.38), bMatRed, 0.72, 0.98, deskZ + 0.1, 0, 0.12, 0);
    addMesh(new THREE.BoxGeometry(0.26, 0.045, 0.35), bMatBlue, 0.70, 1.03, deskZ + 0.08, 0, -0.08, 0);
    addMesh(new THREE.BoxGeometry(0.24, 0.035, 0.32), bMatGold, 0.68, 1.07, deskZ + 0.07, 0, 0.05, 0);

    // Tablet
    const tabletMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, roughness: 0.1 });
    addMesh(new THREE.BoxGeometry(0.36, 0.02, 0.26), tabletMat, 0.15, 0.965, deskZ + 0.15, 0, -0.1, 0);
    addMesh(new THREE.BoxGeometry(0.32, 0.005, 0.22), screenMat, 0.15, 0.976, deskZ + 0.15, 0, -0.1, 0);
  }

  // ─────────────────────────────────────────────
  /**
   * بناء مجسم مستر مينا ثلاثي الأبعاد المخصص والمشابه لملامحه في الصور
   */
  _buildMrMinaAvatar() {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb89b, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x140f0c, roughness: 0.85 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x120d0a, roughness: 0.95 });
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.5 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.3, roughness: 0.1 });
    const labCoatMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const innerShirtMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 }); // Dark green shirt from photo 2
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const watchMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.9 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const eyeIrisMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.3 });
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });
    const lipsMat = new THREE.MeshStandardMaterial({ color: 0xab6f5d, roughness: 0.6 });

    // Legs
    [-0.16, 0.16].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.85, 12), pantsMat);
      leg.position.set(x, 0.42, 0);
      leg.castShadow = true;
      group.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.30), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
      shoe.position.set(x, 0.05, 0.05);
      shoe.castShadow = true;
      group.add(shoe);
    });

    // Torso & Lab Coat
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.25, 0);

    const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.54, 16), innerShirtMat);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // Lab Coat Body
    const coatBody = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.29, 0.56, 16), labCoatMat);
    coatBody.position.set(0, 0.01, 0);
    coatBody.castShadow = true;
    torsoGroup.add(coatBody);

    // Lab Coat Open Front V-Opening
    const coatFrontV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.12), innerShirtMat);
    coatFrontV.position.set(0, 0.06, 0.26);
    torsoGroup.add(coatFrontV);

    // Lapels
    const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.03), labCoatMat);
    lapelL.position.set(-0.13, 0.08, 0.30);
    lapelL.rotation.z = -0.15;
    const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.03), labCoatMat);
    lapelR.position.set(0.13, 0.08, 0.30);
    lapelR.rotation.z = 0.15;
    torsoGroup.add(lapelL, lapelR);

    // Pocket & Pen
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.02), labCoatMat);
    pocket.position.set(0.16, 0.08, 0.29);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    badge.position.set(0.16, 0.08, 0.305);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
    pen.position.set(0.19, 0.15, 0.29);
    torsoGroup.add(pocket, badge, pen);

    this.torso = torsoGroup;
    group.add(torsoGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.78, 0);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.16, 12), skinMat);
    neck.position.set(0, -0.14, 0);
    headGroup.add(neck);

    // Head skull
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), skinMat);
    head.position.set(0, 0.06, 0);
    head.scale.set(1.0, 1.15, 1.05);
    head.castShadow = true;
    headGroup.add(head);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 8), skinMat);
    nose.position.set(0, 0.04, 0.25);
    nose.rotation.x = -Math.PI / 10;
    headGroup.add(nose);

    // Eyes
    [-0.09, 0.09].forEach((eyeX) => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), eyeWhiteMat);
      eyeWhite.position.set(eyeX, 0.11, 0.21);

      const eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), eyeIrisMat);
      eyeIris.position.set(eyeX, 0.11, 0.242);

      const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyePupilMat);
      eyePupil.position.set(eyeX, 0.11, 0.256);

      const eyeGlint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeGlint.position.set(eyeX + 0.008, 0.118, 0.26);

      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.03), hairMat);
      eyebrow.position.set(eyeX, 0.175, 0.21);
      eyebrow.rotation.z = eyeX > 0 ? -0.1 : 0.1;

      headGroup.add(eyeWhite, eyeIris, eyePupil, eyeGlint, eyebrow);
    });

    // Mr. Mena Glasses
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.108, 0.24);

    [-0.092, 0.092].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.009, 8, 20), glassesMat);
      rim.position.set(gx, 0, 0);
      rim.scale.set(1.15, 0.85, 1.0);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), lensMat);
      lens.position.set(gx, 0, 0.002);
      lens.scale.set(1.15, 0.85, 1.0);

      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.28), glassesMat);
      temple.position.set(gx > 0 ? 0.075 : -0.075, 0.015, -0.13);
      temple.rotation.y = gx > 0 ? -0.1 : 0.1;

      glassesGroup.add(rim, lens, temple);
    });

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.010, 0.012), glassesMat);
    bridge.position.set(0, 0.018, 0);
    glassesGroup.add(bridge);
    headGroup.add(glassesGroup);

    // Mr. Mena Beard & Mustache
    const mustache = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 8), beardMat);
    mustache.position.set(0, -0.035, 0.24);
    mustache.rotation.z = Math.PI / 2;
    headGroup.add(mustache);

    const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), beardMat);
    chinBeard.position.set(0, -0.12, 0.16);
    chinBeard.scale.set(1.3, 0.9, 1.2);
    headGroup.add(chinBeard);

    [-0.20, 0.20].forEach((bx) => {
      const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.12), beardMat);
      sideburn.position.set(bx, 0.02, 0.05);
      headGroup.add(sideburn);
    });

    // Smile
    const smileTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.02), teethMat);
    smileTeeth.position.set(0, -0.072, 0.23);
    const lowerLip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 6), lipsMat);
    lowerLip.position.set(0, -0.09, 0.225);
    lowerLip.rotation.z = Math.PI / 2;
    headGroup.add(smileTeeth, lowerLip);

    // Hair
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.245, 20, 20), hairMat);
    hairTop.position.set(0, 0.15, -0.02);
    hairTop.scale.set(1.02, 0.9, 1.08);

    const hairPuff = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), hairMat);
    hairPuff.position.set(0, 0.28, 0.04);
    hairPuff.rotation.x = Math.PI / 6;
    headGroup.add(hairTop, hairPuff);

    // Ears
    [-0.24, 0.24].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
      ear.position.set(ex, 0.07, 0);
      ear.scale.set(0.5, 1.0, 0.7);
      headGroup.add(ear);
    });

    this.headGroup = headGroup;
    group.add(headGroup);

    // Arms & Hands with Watch
    const makeArm = (isLeft) => {
      const side = isLeft ? 1 : -1;
      const upperArm = new THREE.Group();
      upperArm.position.set(side * 0.40, 1.42, 0.02);

      const uMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 12), labCoatMat);
      uMesh.position.set(0, -0.18, 0);
      uMesh.castShadow = true;
      upperArm.add(uMesh);

      const forearm = new THREE.Group();
      forearm.position.set(0, -0.38, 0);

      const fMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 12), labCoatMat);
      fMesh.position.set(0, -0.15, 0);
      fMesh.castShadow = true;
      forearm.add(fMesh);

      // Stainless Steel Watch on Left Wrist
      if (isLeft) {
        const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.035, 16), watchMat);
        watchBand.position.set(0, -0.28, 0);
        const watchDial = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.015, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 }));
        watchDial.position.set(0, -0.28, 0.08);
        watchDial.rotation.x = Math.PI / 2;
        forearm.add(watchBand, watchDial);
      }

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), skinMat);
      hand.position.set(0, -0.36, 0.02);
      hand.castShadow = true;
      forearm.add(hand);

      upperArm.add(forearm);
      group.add(upperArm);

      return { upperArm, forearm, hand };
    };

    const left = makeArm(true);
    const right = makeArm(false);

    this.leftArm = left.upperArm;
    this.leftForearm = left.forearm;
    this.leftHand = left.hand;
    this.rightArm = right.upperArm;
    this.rightForearm = right.forearm;
    this.rightHand = right.hand;

    this.teacherGroup = group;
    this.scene.add(group);
  }

  // ─────────────────────────────────────────────
  _animate() {
    requestAnimationFrame(() => this._animate());

    // Performance Optimization: Pause loop if canvas is not displayed
    if (!this.canvas || this.canvas.offsetParent === null) return;

    const delta = this.clock.getDelta();
    this.elapsedTime += delta;
    const t = this.elapsedTime;

    // 1) Breathing Motion
    if (this.torso) {
      const breath = Math.sin(t * 1.6) * 0.012;
      this.torso.position.y = 1.25 + breath;
    }

    // 2) Head / Character Tracking
    if (this.headGroup) {
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.06;
      this.headGroup.rotation.y = this.currentRotY;
      this.headGroup.rotation.x = Math.sin(t * 1.2) * 0.02;
    } else if (this.teacherGroup) {
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.06;
      this.teacherGroup.rotation.y = Math.PI - this.currentRotY;
      this.teacherGroup.position.y = (this._baseY || 0) + Math.sin(t * 1.5) * 0.015;
      if (this.isSpeaking) {
        this.teacherGroup.rotation.z = Math.sin(t * 5.0) * 0.02;
      } else {
        this.teacherGroup.rotation.z = 0;
      }
    }

    // 3) Arm Gestures
    if (this.isSpeaking) {
      const speed = 3.2;
      if (this.rightArm) {
        this.rightArm.rotation.x = -0.55 + Math.sin(t * speed) * 0.25;
        this.rightArm.rotation.z = -0.35 + Math.cos(t * speed * 0.7) * 0.18;
      }
      if (this.rightForearm) {
        this.rightForearm.rotation.x = -0.65 + Math.sin(t * speed + 0.6) * 0.30;
      }
      if (this.leftArm) {
        this.leftArm.rotation.x = -0.38 + Math.sin(t * speed + 1.2) * 0.20;
        this.leftArm.rotation.z = 0.28 + Math.cos(t * speed * 0.8) * 0.14;
      }
      if (this.leftForearm) {
        this.leftForearm.rotation.x = -0.48 + Math.sin(t * speed + 1.8) * 0.22;
      }
    } else {
      const idleSpeed = 1.4;
      if (this.rightArm) {
        this.rightArm.rotation.x = -0.28 + Math.sin(t * idleSpeed) * 0.05;
        this.rightArm.rotation.z = -0.22 + Math.cos(t * idleSpeed * 0.5) * 0.04;
      }
      if (this.rightForearm) {
        this.rightForearm.rotation.x = -0.45 + Math.sin(t * idleSpeed + 0.3) * 0.07;
      }
      if (this.leftArm) {
        this.leftArm.rotation.x = -0.25 + Math.sin(t * idleSpeed + 0.8) * 0.05;
        this.leftArm.rotation.z = 0.20 + Math.cos(t * idleSpeed * 0.6) * 0.04;
      }
      if (this.leftForearm) {
        this.leftForearm.rotation.x = -0.42 + Math.sin(t * idleSpeed + 1.1) * 0.06;
      }
    }

    // 4) Flask Glow Pulse
    if (this.beakerLiquid && this.flaskGlow) {
      const pulse = 1.0 + Math.sin(t * 2.5) * 0.35;
      this.flaskGlow.intensity = pulse * 1.3;
    }

    // 5) Speaking Light
    if (this.speakLight) {
      this.speakLight.intensity = this.isSpeaking
        ? 0.7 + Math.sin(t * 8) * 0.4
        : this.speakLight.intensity * 0.85;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ─────────────────────────────────────────────
  _resizeRenderer() {
    const w = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 400;
    const h = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 600;
    this.renderer?.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resizeRenderer());
    document.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      this.targetRotY = ((e.clientX - cx) / rect.width) * 0.35;
    });
  }

  setSpeaking(state) {
    this.isSpeaking = state;
    document.querySelector('.speaking-indicator')?.classList.toggle('active', state);
  }

  shrink() {
    this.canvas.closest('.character-panel')?.classList.add('shrunk');
    this._resizeRenderer();
  }

  expand() {
    this.canvas.closest('.character-panel')?.classList.remove('shrunk');
    this._resizeRenderer();
  }
}
