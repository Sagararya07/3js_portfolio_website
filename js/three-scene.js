/**
 * Ahana Aura Virtual Headquarters - Studio 3D Architectural Scene Engine
 * Exact Kriss.ai Craftsmanship & Studio Dollhouse Architecture
 *
 * Features:
 * - Studio clay lighting with ACES Filmic tone mapping & soft PCF contact shadows
 * - Post-Processing Pipeline: Custom Film Grain & Studio Vignette Shader (Kriss.ai secret sauce)
 * - Sculpted cantilevered architectural slabs with rounded corners, organic cutaways & bevels
 * - Slender cylindrical pillars & two-story exterior support column
 * - 4 Themed Rooms matching ahanaaura.com identity:
 *   1. Reception // Executive Concierge (blush floor, curved desk, receptionist, marshmallow lounge, water cooler, fig tree)
 *   2. About Me // Strategy Sanctum (honey floor, porthole window, walnut desk, 14+ yrs plaque, holographic client globe, Ahana figure)
 *   3. Services // AI Command Lab (mint floor, 3 detailed server racks, hexagonal holo table, AI architect, workstation)
 *   4. Portfolio Projects // Impact Observatory (sky blue floor, curved periwinkle partition, oscillating 3D ROI charts, analyst figure)
 * - Autonomous AI Patrol Drone with twin spinning rotors and scanning spotlight
 * - Outdoor turquoise kidney/capsule pool ring with ripples
 * - Floating central staircase connecting double-height lobby
 * - Smooth camera arc choreography, mouse-wheel room cycling & 360° turntable orbit
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { soundEngine } from './audio.js';

/* ---------------- KRISS.AI CUSTOM STUDIO POST-PROCESSING SHADER ---------------- */
const StudioPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrainIntensity: { value: 0.020 },
    uVignetteDarkness: { value: 0.94 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainIntensity;
    uniform float uVignetteDarkness;
    varying vec2 vUv;

    // Kriss.ai highp hash generator
    highp float random(vec2 co) {
      highp float a = 12.9898;
      highp float b = 78.233;
      highp float c = 43758.5453;
      highp float dt = dot(co.xy, vec2(a, b));
      highp float sn = mod(dt, 3.14159);
      return fract(sin(sn) * c);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // 1. Subtle randomized micro film grain (eliminates digital banding)
      float noise = (random(vUv + fract(uTime * 0.05)) - 0.5) * uGrainIntensity;
      color.rgb += noise;

      // 2. Soft studio vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(0.85, 0.25, dist);
      color.rgb = mix(color.rgb * uVignetteDarkness, color.rgb, vignette);

      gl_FragColor = color;
    }
  `
};

export class AhanaHQScene {
  constructor() {
    this.container = document.getElementById('canvas-container');
    if (!this.container) return;

    // Precision Studio Camera Waypoints (30° FOV Architectural Isometric Angle)
    this.waypoints = [
      // 0: Overview (Classic Isometric Dollhouse Angle, Perfectly Centered)
      { pos: new THREE.Vector3(23.5, 16.2, 25.5), target: new THREE.Vector3(0, 5.5, 0) },
      // 1: Reception (Level 1, Center/Right)
      { pos: new THREE.Vector3(5.2, 3.2, 8.2), target: new THREE.Vector3(4.8, 2.4, -0.4) },
      // 2: About Me / Strategy Sanctum (Level 1, Left)
      { pos: new THREE.Vector3(-5.2, 3.2, 8.2), target: new THREE.Vector3(-4.8, 2.4, -0.4) },
      // 3: Services / AI Systems Lab (Level 2, Left)
      { pos: new THREE.Vector3(-5.2, 8.8, 8.2), target: new THREE.Vector3(-4.8, 8.0, -0.4) },
      // 4: Portfolio Projects / Impact Observatory (Level 2, Right)
      { pos: new THREE.Vector3(5.2, 8.8, 8.2), target: new THREE.Vector3(4.8, 8.0, -0.4) }
    ];

    this.currentWaypointIndex = 0;
    this.targetCameraPos = this.waypoints[0].pos.clone();
    this.targetCameraLookAt = this.waypoints[0].target.clone();
    this.currentCameraLookAt = this.waypoints[0].target.clone();

    // Smooth transition state
    this.isTransitioning = false;
    this.transitionStartPos = new THREE.Vector3();
    this.transitionStartLookAt = new THREE.Vector3();
    this.transitionProgress = 1.0;
    this.transitionDuration = 1.25;

    // Themes: 'day' (default kriss.ai studio clay), 'sunset', 'night'
    this.currentTheme = 'day';

    // 3D Anchors for projected HTML hotspots (Positions inside the 4 rooms)
    this.roomAnchors = [
      new THREE.Vector3(4.8, 2.8, 1.4),  // Room 1: Reception
      new THREE.Vector3(-4.8, 2.8, 1.4), // Room 2: About Me
      new THREE.Vector3(-4.8, 8.4, 1.4), // Room 3: Services
      new THREE.Vector3(4.8, 8.4, 1.4)   // Room 4: Portfolio
    ];

    // Interactive 360 Turntable Drag
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.turntableRotationY = 0;
    this.targetTurntableRotationY = 0;

    // Animated objects registry
    this.serverLeds = [];
    this.receptionHolo = null;
    this.receptionRings = [];
    this.receptionFigure = null;
    this.receptionVisitor = null;
    this.aboutGlobe = null;
    this.aboutFigureAhana = null;
    this.aboutFigureClient = null;
    this.aboutHoloCore = null;
    this.aboutHoloRings = [];
    this.aboutHoloBadges = [];
    this.aboutHoloGroup = null;

    // Room 3: Services AI Systems Command Lab
    this.servicesArchitect = null;
    this.servicesHoloCore = null;
    this.servicesHoloInner = null;
    this.servicesHoloRings = [];
    this.servicesSatellites = [];
    this.servicesScreenCanvasA = null;
    this.servicesScreenCtxA = null;
    this.servicesScreenTextureA = null;
    this.servicesScreenCanvasB = null;
    this.servicesScreenCtxB = null;
    this.servicesScreenTextureB = null;
    this.servicesCurrentPillar = 'strategy';
    this.servicesHoloLight = null;
    this.servicesConduitPhotons = [];
    this.servicesConduitCurve = null;
    this.servicesBeam = null;
    this.servicesPillarColors = {
      strategy: 0x38bdf8,
      automation: 0x10b981,
      caio: 0xf59e0b,
      revenue: 0x8b5cf6
    };

    // Room 4: Portfolio Projects Observatory
    this.portfolioAnalyst = null;
    this.portfolioCharts = [];
    this.portfolioScreenCanvasL = null;
    this.portfolioScreenCtxL = null;
    this.portfolioScreenTextureL = null;
    this.portfolioScreenCanvasR = null;
    this.portfolioScreenCtxR = null;
    this.portfolioScreenTextureR = null;
    this.activePortfolioProject = 'fintech';
    this.portfolioProjectBars = {
      fintech: [1.8, 1.1, 2.2, 2.7],
      ecommerce: [1.4, 2.4, 1.9, 2.1],
      health: [2.1, 1.6, 2.6, 1.8],
      saas: [2.5, 2.0, 1.5, 2.4]
    };

    this.pendantLights = [];
    this.poolWater = null;

    // Autonomous AI Patrol Drone
    this.drone = null;
    this.droneRotors = [];
    this.droneSpotlight = null;
    this.droneInRoom4 = false;

    // Mouse parallax
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    // 1. Scene with Kriss.ai Signature Warm Studio Background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#ede4dc');
    this.scene.fog = new THREE.Fog('#ede4dc', 50, 140); // Crystal clear foreground: 0 fog on building!

    // 2. Camera with 31° Architectural FOV (Isometric feel, minimal distortion)
    this.camera = new THREE.PerspectiveCamera(
      31,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.waypoints[0].pos);
    this.camera.lookAt(this.waypoints[0].target);

    // 3. WebGL Renderer with ACES Filmic Tone Mapping & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.00; // Balanced exposure: zero blown-out whites!
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Post-Processing Pipeline (Kriss.ai Grain & Studio Vignette)
    this.setupPostProcessing();

    // 5. Building Master Group
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    // 6. Studio Clay Lighting
    this.setupStudioLighting();

    // 7. Sculpted Architectural Dollhouse Structure
    this.buildArchitecturalDollhouse();

    // 7b. Dynamic Screen Canvases (Services Lab & Portfolio Observatory)
    this.initServicesScreens();
    this.initPortfolioScreens();

    // 8. 4 Richly Themed Rooms
    this.buildRoom1Reception();
    this.buildRoom2AboutMe();
    this.buildRoom3Services();
    this.buildRoom4Portfolio();

    // 9. Exterior Accents & Autonomous AI Patrol Drone
    this.buildExteriorFeatures();
    this.buildAIDrone();

    // 10. Event Listeners
    this.setupEventListeners();

    // 11. Start Animation Loop
    this.animate();
  }

  /* ---------------- POST-PROCESSING COMPOSER ---------------- */
  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    // 1. Render Scene Pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. Studio Film Grain & Vignette Pass
    this.postPass = new ShaderPass(StudioPostShader);
    this.composer.addPass(this.postPass);

    // 3. Output Tone Mapping Pass
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /* ---------------- STUDIO CLAY LIGHTING (KRISS.AI STYLE) ---------------- */
  setupStudioLighting() {
    // 1. Soft Ambient Fill (Balanced to preserve rich architectural shadow depth)
    this.ambientLight = new THREE.AmbientLight(0xfff8f2, 0.38);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light (Pure sky bounce + warm clay ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0c0b0, 0.75);
    this.scene.add(this.hemiLight);

    // 3. Directional Studio Sun (Warm, crisp, casting razor-sharp soft shadows)
    this.sunLight = new THREE.DirectionalLight(0xfffaf0, 2.20);
    this.sunLight.position.set(22, 32, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -18;
    this.sunLight.shadow.camera.right = 18;
    this.sunLight.shadow.camera.top = 18;
    this.sunLight.shadow.camera.bottom = -18;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.radius = 1.6;
    this.scene.add(this.sunLight);

    // 4. Subtle Studio Cool Fill (Opposite side to prevent pitch black crevices)
    this.fillLight = new THREE.DirectionalLight(0xdde8f5, 0.40);
    this.fillLight.position.set(-20, 16, -10);
    this.scene.add(this.fillLight);

    // 5. Four Cozy Interior Pendant Lights (Warm Dollhouse Glow)
    const roomPendants = [
      { x: 4.8, y: 5.0, z: 0.6, color: 0xffd89e, intensity: 4.0 },  // Room 1: Reception
      { x: -4.8, y: 5.0, z: 0.6, color: 0xffdcab, intensity: 3.8 }, // Room 2: About Me
      { x: -4.8, y: 10.6, z: 0.6, color: 0xc8f0ff, intensity: 4.2 }, // Room 3: Services
      { x: 4.8, y: 10.6, z: 0.6, color: 0xffdf96, intensity: 4.0 }  // Room 4: Portfolio
    ];

    roomPendants.forEach((r) => {
      const pl = new THREE.PointLight(r.color, r.intensity, 15, 1.2);
      pl.position.set(r.x, r.y, r.z);
      this.buildingGroup.add(pl);
      this.pendantLights.push(pl);
    });
  }

  /* ---------------- ROUNDED SLAB GENERATOR ---------------- */
  createRoundedSlab(width, depth, radius, thickness, material) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const z = -depth / 2;
    const w = width;
    const d = depth;
    const r = Math.min(radius, w / 2, d / 2);

    shape.moveTo(x + r, z);
    shape.lineTo(x + w - r, z);
    shape.quadraticCurveTo(x + w, z, x + w, z + r);
    shape.lineTo(x + w, z + d - r);
    shape.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
    shape.lineTo(x + r, z + d);
    shape.quadraticCurveTo(x, z + d, x, z + d - r);
    shape.lineTo(x, z + r);
    shape.quadraticCurveTo(x, z, x + r, z);

    const extrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelOffset: 0,
      bevelSegments: 4
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(Math.PI / 2);
    geo.center();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* ---------------- ARCHITECTURAL DOLLHOUSE (OPEN CUTAWAY) ---------------- */
  buildArchitecturalDollhouse() {
    // Signature Materials (Warm Architectural Studio Plaster & Travertine)
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xf2ece4, // Warm architectural clay matte
      roughness: 0.55,
      metalness: 0.04
    });
    const wallBackMat = new THREE.MeshStandardMaterial({
      color: 0xebe0d4, // Soft warm studio travertine (rich depth)
      roughness: 0.70
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xf8f4ee, // Clean ivory alabaster
      roughness: 0.40
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xd6c6b5,
      roughness: 0.80
    });

    // 1. Large Infinity Ground Plane (Catches soft contact shadows)
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xede4dc,
      roughness: 0.95
    });
    const groundPlane = new THREE.Mesh(floorGeo, floorMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.05;
    groundPlane.receiveShadow = true;
    this.scene.add(groundPlane);

    // 2. Sculpted Architectural Base Pedestal Island
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(15.5, 13.5, 1.2, 48),
      pedestalMat
    );
    pedestal.position.set(0, -0.6, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    this.buildingGroup.add(pedestal);

    // 3. Ground Floor Slab (Level 1) with Organic Rounded Edges
    const groundSlab = this.createRoundedSlab(21.4, 12.0, 2.2, 0.55, slabMat);
    groundSlab.position.set(0, 0.3, -0.2);
    this.buildingGroup.add(groundSlab);

    // 4. Mid-Floor Slab (Level 2) with Cantilever & Central Mezzanine Cutaway
    const midSlab = this.createRoundedSlab(21.0, 11.6, 2.0, 0.5, slabMat);
    midSlab.position.set(0, 5.9, -0.2);
    this.buildingGroup.add(midSlab);

    // 5. Roof Canopy Slab with Sweeping Cantilever (Cut back slightly on front to allow sunlight into upper floor)
    const roofSlab = this.createRoundedSlab(22.2, 10.6, 2.2, 0.52, slabMat);
    roofSlab.position.set(0, 11.5, -1.0);
    this.buildingGroup.add(roofSlab);

    // 6. Slender Cylindrical Architectural Columns (kriss.ai signature)
    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.24, 5.0, 24);

    // Level 1 Columns
    const colL1 = new THREE.Mesh(pillarGeo, pillarMat);
    colL1.position.set(-9.6, 3.1, 4.6);
    colL1.castShadow = true;
    this.buildingGroup.add(colL1);

    const colCenterL1 = new THREE.Mesh(pillarGeo, pillarMat);
    colCenterL1.position.set(0.0, 3.1, 4.6);
    colCenterL1.castShadow = true;
    this.buildingGroup.add(colCenterL1);

    // Level 2 Column
    const colL2 = new THREE.Mesh(pillarGeo, pillarMat);
    colL2.position.set(-9.6, 8.7, 4.6);
    colL2.castShadow = true;
    this.buildingGroup.add(colL2);

    // Two-Story Tall Slender Column on the Far Right (like Kriss.ai!)
    const tallColGeo = new THREE.CylinderGeometry(0.26, 0.26, 10.6, 24);
    const tallCol = new THREE.Mesh(tallColGeo, pillarMat);
    tallCol.position.set(9.8, 5.9, 4.6);
    tallCol.castShadow = true;
    this.buildingGroup.add(tallCol);

    // 7. Architectural Back Wall (Recessed, with porthole cutout)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(20.4, 10.8, 0.4),
      wallBackMat
    );
    backWall.position.set(0, 5.9, -5.6);
    backWall.receiveShadow = true;
    this.buildingGroup.add(backWall);

    // 8. Slender Left Wall (Far left, does NOT block camera view)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 10.8, 11.2),
      wallBackMat
    );
    leftWall.position.set(-10.2, 5.9, -0.2);
    leftWall.receiveShadow = true;
    this.buildingGroup.add(leftWall);

    // 9. Central Recessed Interior Partition Wall (Dividing Left & Right wings)
    const centerWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 10.8, 6.8),
      wallBackMat
    );
    centerWall.position.set(0, 5.9, -2.2);
    centerWall.receiveShadow = true;
    this.buildingGroup.add(centerWall);

    // 10. Architectural Floating Staircase connecting Level 1 & Level 2 in Lobby
    const stairsGroup = new THREE.Group();
    stairsGroup.position.set(0, 0.55, 0);
    const stepCount = 11;
    const stepMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const stepGlowMat = new THREE.MeshBasicMaterial({ color: 0xc9a14a });

    for (let s = 0; s < stepCount; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.45), stepMat);
      step.position.set(0, s * 0.48, -1.8 + s * 0.28);
      step.castShadow = true;
      stairsGroup.add(step);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.03), stepGlowMat);
      glow.position.set(0, s * 0.48 - 0.06, -1.8 + s * 0.28 + 0.23);
      stairsGroup.add(glow);
    }
    this.buildingGroup.add(stairsGroup);
  }

  /* ---------------- STYLIZED FIGURE GENERATOR (KRISS.AI CHARACTERS) ---------------- */
  createStylizedFigure({ shirtColor, pantsColor, hairColor = 0x2d1a10, skinColor = 0xf5cfb3, isSitting = false }) {
    const figure = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });

    // Head Group for smooth combined rotation of head, eyes, and hair
    const headGroup = new THREE.Group();
    headGroup.position.y = isSitting ? 1.45 : 1.75;

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Stylized eyes (facing +Z toward viewer)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b18 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
    eyeL.position.set(-0.07, 0.01, 0.22);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
    eyeR.position.set(0.07, 0.01, 0.22);
    headGroup.add(eyeR);

    // Hair Cap (parted hair)
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
      hairMat
    );
    hair.position.y = 0.03;
    headGroup.add(hair);

    figure.add(headGroup);
    figure.headGroup = headGroup;

    // Torso / Shirt
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.65, 16), shirtMat);
    torso.position.y = isSitting ? 0.95 : 1.25;
    torso.castShadow = true;
    figure.add(torso);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.5, 12);
    const armL = new THREE.Mesh(armGeo, shirtMat);
    const armR = new THREE.Mesh(armGeo, shirtMat);

    // Stylized hands
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), skinMat);
    handL.position.y = -0.27;
    armL.add(handL);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), skinMat);
    handR.position.y = -0.27;
    armR.add(handR);

    if (isSitting) {
      armL.position.set(-0.28, 0.95, 0.18);
      armL.rotation.x = Math.PI / 3;
      armR.position.set(0.28, 0.95, 0.18);
      armR.rotation.x = Math.PI / 3;
    } else {
      armL.position.set(-0.3, 1.15, 0);
      armR.position.set(0.3, 1.15, 0);
    }
    figure.add(armL);
    figure.add(armR);
    figure.armL = armL;
    figure.armR = armR;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.65, 12);
    if (isSitting) {
      // Thighs (horizontal)
      const thighL = new THREE.Mesh(legGeo, pantsMat);
      thighL.rotation.x = Math.PI / 2;
      thighL.position.set(-0.14, 0.6, 0.3);
      figure.add(thighL);

      const thighR = new THREE.Mesh(legGeo, pantsMat);
      thighR.rotation.x = Math.PI / 2;
      thighR.position.set(0.14, 0.6, 0.3);
      figure.add(thighR);

      // Calves (vertical down)
      const calfL = new THREE.Mesh(legGeo, pantsMat);
      calfL.position.set(-0.14, 0.28, 0.6);
      figure.add(calfL);

      const calfR = new THREE.Mesh(legGeo, pantsMat);
      calfR.position.set(0.14, 0.28, 0.6);
      figure.add(calfR);
    } else {
      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.14, 0.55, 0);
      legL.castShadow = true;
      figure.add(legL);

      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.14, 0.55, 0);
      legR.castShadow = true;
      figure.add(legR);
    }

    // Shoes
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), shoeMat);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), shoeMat);
    if (isSitting) {
      shoeL.position.set(-0.14, 0.05, 0.66);
      shoeR.position.set(0.14, 0.05, 0.66);
    } else {
      shoeL.position.set(-0.14, 0.05, 0.04);
      shoeR.position.set(0.14, 0.05, 0.04);
    }
    figure.add(shoeL);
    figure.add(shoeR);

    return figure;
  }

  /* ---------------- POTTED FIDDLE LEAF FIG TREE ---------------- */
  createStylizedPlant() {
    const group = new THREE.Group();

    // Ceramic pot
    const potMat = new THREE.MeshStandardMaterial({ color: 0xdfd3c4, roughness: 0.6 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.7, 24), potMat);
    pot.position.y = 0.35;
    pot.castShadow = true;
    group.add(pot);

    // Soil
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
    soil.position.y = 0.68;
    group.add(soil);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4128, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 12), trunkMat);
    trunk.position.y = 1.35;
    group.add(trunk);

    // Leaves
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.45 });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), leafMat);
      leaf.scale.set(1.4, 0.25, 0.85);
      const angle = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.35, 1.1 + i * 0.14, Math.sin(angle) * 0.35);
      leaf.rotation.y = angle;
      leaf.rotation.z = 0.35;
      group.add(leaf);
    }

    return group;
  }

  /* ---------------- ROOM 1: RECEPTION // EXECUTIVE LOBBY (LEVEL 1, RIGHT) ---------------- */
  buildRoom1Reception() {
    const group = new THREE.Group();
    group.position.set(4.8, 0.55, -0.4);
    this.buildingGroup.add(group);

    // Soft warm blush floor (Signature kriss.ai pastel tint)
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.04, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xf2cfc2, roughness: 0.65 })
    );
    floorMesh.position.set(0, 0.02, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 1. Curved Architectural Glass Bay Window Partition (Fluted Glass)
    const curvedGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 5.0, 32, 1, true, 0, Math.PI * 0.52),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.88,
        opacity: 0.85,
        transparent: true,
        roughness: 0.15,
        ior: 1.5,
        side: THREE.DoubleSide
      })
    );
    curvedGlass.position.set(0.6, 2.5, -0.8);
    curvedGlass.rotation.y = Math.PI * 0.72;
    group.add(curvedGlass);

    // 2. Solid Curved Architectural Reception Desk (Fluted Marble & Gold Accent)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f3, roughness: 0.35 });
    const deskGold = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.85, roughness: 0.25 });
    const slatMat = new THREE.MeshStandardMaterial({ color: 0xe6dcce, roughness: 0.6 });

    const deskGroup = new THREE.Group();
    deskGroup.position.set(0.0, 0.0, -1.4);

    // Fluted marble front curved wall (arcs forward toward visitor & camera)
    const frontArc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.35, 1.15, 36, 1, false, 0, Math.PI),
      deskMat
    );
    frontArc.position.y = 0.575;
    frontArc.rotation.y = -Math.PI / 2;
    frontArc.castShadow = true;
    deskGroup.add(frontArc);

    // Fluted tambour slats on the front curved face
    for (let sl = 0; sl < 22; sl++) {
      const a = -Math.PI / 2 + (sl / 21) * Math.PI;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.12, 0.03), slatMat);
      slat.position.set(Math.cos(a) * 2.37, 0.575, Math.sin(a) * 2.37);
      slat.rotation.y = -a;
      deskGroup.add(slat);
    }

    // Countertop: Polished Calacatta Marble with Brass Trim
    const counterTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.45, 2.45, 0.08, 36, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
    );
    counterTop.position.y = 1.18;
    counterTop.rotation.y = -Math.PI / 2;
    counterTop.castShadow = true;
    deskGroup.add(counterTop);

    const counterGoldRim = new THREE.Mesh(
      new THREE.CylinderGeometry(2.47, 2.47, 0.03, 36, 1, false, 0, Math.PI),
      deskGold
    );
    counterGoldRim.position.y = 1.13;
    counterGoldRim.rotation.y = -Math.PI / 2;
    deskGroup.add(counterGoldRim);

    // Gold base kick-plate with warm floor LED reveal
    const baseKick = new THREE.Mesh(
      new THREE.CylinderGeometry(2.38, 2.38, 0.08, 36, 1, false, 0, Math.PI),
      deskGold
    );
    baseKick.position.y = 0.04;
    baseKick.rotation.y = -Math.PI / 2;
    deskGroup.add(baseKick);

    // Inner desk surface for computer & work
    const innerDesk = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.06, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.5 })
    );
    innerDesk.position.set(0.0, 0.88, -0.35);
    deskGroup.add(innerDesk);

    // Receptionist Executive All-in-One Studio Display & Workstation
    const aluMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 });

    // Aluminum Stand on Marble Counter
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.18), aluMat);
    standBase.position.set(0.0, 1.185, 0.25);
    deskGroup.add(standBase);

    const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.03), aluMat);
    standNeck.position.set(0.0, 1.31, 0.25);
    standNeck.rotation.x = -0.1;
    deskGroup.add(standNeck);

    // Ultra-thin aluminum display chassis
    const displayChassis = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.02), aluMat);
    displayChassis.position.set(0.0, 1.50, 0.23);
    deskGroup.add(displayChassis);

    // Front screen face (facing receptionist at -Z)
    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenFace.position.set(0.0, 1.50, 0.218);
    screenFace.rotation.y = Math.PI;
    deskGroup.add(screenFace);

    // Back golden emblem on display chassis (facing visitor & camera at +Z)
    const emblem = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.15 })
    );
    emblem.position.set(0.0, 1.50, 0.241);
    deskGroup.add(emblem);

    // Slim Wireless Magic Keyboard & Trackpad in front of screen
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.14), aluMat);
    keyboard.position.set(0.0, 1.185, -0.02);
    deskGroup.add(keyboard);

    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.12), aluMat);
    trackpad.position.set(0.28, 1.185, -0.02);
    deskGroup.add(trackpad);

    // Guest iPad Digital Check-in Kiosk (facing incoming visitor)
    const ipadGroup = new THREE.Group();
    ipadGroup.position.set(-0.95, 1.18, 0.42);
    ipadGroup.rotation.y = Math.PI * 0.22;

    const ipadStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16), deskGold);
    ipadStand.position.y = 0.075;
    ipadGroup.add(ipadStand);

    const ipadBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.015), aluMat);
    ipadBody.position.set(0, 0.24, 0);
    ipadBody.rotation.x = -Math.PI * 0.22;
    ipadGroup.add(ipadBody);

    const ipadScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    ipadScreen.position.set(0, 0.24, 0.009);
    ipadScreen.rotation.x = -Math.PI * 0.22;
    ipadGroup.add(ipadScreen);

    const ipadGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.20, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xc9a14a })
    );
    ipadGlow.position.set(0, 0.24, 0.011);
    ipadGlow.rotation.x = -Math.PI * 0.22;
    ipadGroup.add(ipadGlow);

    deskGroup.add(ipadGroup);

    // Minimalist Ikebana Floral Brass Vase on the counter
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.35, 16), deskGold);
    vase.position.set(1.4, 1.38, 0.2);
    deskGroup.add(vase);

    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 })
    );
    flower.position.set(1.4, 1.62, 0.2);
    deskGroup.add(flower);

    group.add(deskGroup);

    // 3. Receptionist Ergonomic Executive Swivel Chair
    const recepChair = this.createExecutiveChair();
    recepChair.position.set(0.0, 0, -2.15);
    group.add(recepChair);

    // 4. Receptionist Figure (Sitting comfortably in chair behind counter)
    const receptionist = this.createStylizedFigure({
      shirtColor: 0x3b82f6, // Crisp executive blue
      pantsColor: 0x1e293b,
      hairColor: 0x451a03,
      isSitting: true
    });
    receptionist.position.set(0.0, 0.58, -2.15);
    group.add(receptionist);
    this.receptionFigure = receptionist;

    // 4. Waiting Lounge Marshmallow Club Chairs (Soft White)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    const chair1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.52, 24), chairMat);
    chair1.position.set(2.8, 0.26, 0.8);
    chair1.castShadow = true;
    group.add(chair1);

    const chairBack1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.48, 24, 1, false, 0, Math.PI),
      chairMat
    );
    chairBack1.position.set(2.8, 0.65, 0.8);
    chairBack1.rotation.y = -Math.PI / 4;
    group.add(chairBack1);

    // Lounge Coffee Table (Brushed brass cylinder)
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.38, 24), deskGold);
    table.position.set(2.1, 0.19, 1.8);
    table.castShadow = true;
    group.add(table);

    // Soft Pink Cylindrical Pouf Ottoman (like Kriss.ai)
    const pouf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.85 })
    );
    pouf.position.set(3.4, 0.16, 2.4);
    pouf.castShadow = true;
    group.add(pouf);

    // 5. Classic Water Cooler Dispenser (Signature kriss.ai detail)
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const coolerBottleMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.9,
      transparent: true,
      opacity: 0.85
    });

    const coolerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.25, 20), coolerMat);
    coolerBody.position.set(-3.2, 0.62, 2.2);
    coolerBody.castShadow = true;
    group.add(coolerBody);

    const coolerBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 20), coolerBottleMat);
    coolerBottle.position.set(-3.2, 1.5, 2.2);
    group.add(coolerBottle);

    // 6. Standing Visitor Figure (Consulting client in coral shirt)
    const visitor = this.createStylizedFigure({
      shirtColor: 0xef4444, // Warm coral/red shirt
      pantsColor: 0x334155,
      hairColor: 0x1f2937,
      isSitting: false
    });
    visitor.position.set(-0.75, 0.0, 1.85);
    visitor.rotation.y = -Math.PI * 0.28;
    group.add(visitor);
    this.receptionVisitor = visitor;

    // 7. Lush Potted Fiddle Leaf Fig Tree
    const plant = this.createStylizedPlant();
    plant.position.set(3.6, 0.0, -1.8);
    group.add(plant);

    // 8. Floating Holographic "AA" Monogram Crystal with Golden Ring
    const holoGroup = new THREE.Group();
    holoGroup.position.set(0.2, 2.8, -1.4);
    group.add(holoGroup);
    this.receptionHolo = holoGroup;

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffe29a,
        metalness: 0.2,
        emissive: 0xd4a034,
        emissiveIntensity: 0.9,
        flatShading: true
      })
    );
    holoGroup.add(crystal);

    const halo1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.02, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe29a })
    );
    halo1.rotation.x = Math.PI / 3;
    holoGroup.add(halo1);
    this.receptionRings.push(halo1);
  }

  /* ---------------- AHANA'S ERGONOMIC EXECUTIVE SWIVEL CHAIR ---------------- */
  createExecutiveChair() {
    const chair = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.45 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.85, roughness: 0.25 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });

    // 1. 5-Star Swivel Base with Casters
    const centerPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 16), brassMat);
    centerPiston.position.y = 0.25;
    chair.add(centerPiston);

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.38), brassMat);
      leg.position.set(Math.sin(angle) * 0.18, 0.08, Math.cos(angle) * 0.18);
      leg.rotation.y = angle;
      chair.add(leg);

      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), darkMetal);
      wheel.position.set(Math.sin(angle) * 0.35, 0.03, Math.cos(angle) * 0.35);
      chair.add(wheel);
    }

    // 2. Contoured Executive Leather Seat
    const seatGeo = new THREE.BoxGeometry(0.72, 0.1, 0.65);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.y = 0.52;
    seat.castShadow = true;
    chair.add(seat);

    // 3. High-Back Ergonomic Leather Backrest with Brass Spine
    const backGeo = new THREE.BoxGeometry(0.66, 0.9, 0.08);
    const back = new THREE.Mesh(backGeo, leatherMat);
    back.position.set(0, 1.0, -0.28);
    back.rotation.x = 0.08;
    back.castShadow = true;
    chair.add(back);

    // Brass back support bracket
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.03), brassMat);
    spine.position.set(0, 0.9, -0.34);
    spine.rotation.x = 0.08;
    chair.add(spine);

    // 4. Cantilevered Padded Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.45), leatherMat);
    armL.position.set(-0.38, 0.76, -0.05);
    chair.add(armL);
    const armLSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24), brassMat);
    armLSupport.position.set(-0.38, 0.64, -0.05);
    chair.add(armLSupport);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.45), leatherMat);
    armR.position.set(0.38, 0.76, -0.05);
    chair.add(armR);
    const armRSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24), brassMat);
    armRSupport.position.set(0.38, 0.64, -0.05);
    chair.add(armRSupport);

    return chair;
  }

  /* ---------------- CLIENT'S DESIGNER BOUCLÉ TUB ARMCHAIR ---------------- */
  createGuestArmchair() {
    const chair = new THREE.Group();
    const boucleMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f3, roughness: 0.85 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.85, roughness: 0.25 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.6 });

    // 1. 4 Angled Flared Brass/Walnut Spindle Legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.52, 12);
    const legOffsets = [
      { x: -0.35, z: -0.3, rotZ: 0.15, rotX: -0.15 },
      { x: 0.35, z: -0.3, rotZ: -0.15, rotX: -0.15 },
      { x: -0.35, z: 0.3, rotZ: 0.15, rotX: 0.15 },
      { x: 0.35, z: 0.3, rotZ: -0.15, rotX: 0.15 }
    ];

    legOffsets.forEach((cfg) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(cfg.x, 0.24, cfg.z);
      leg.rotation.z = cfg.rotZ;
      leg.rotation.x = cfg.rotX;
      leg.castShadow = true;
      chair.add(leg);

      // Gold ferrule tip
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.015, 0.08, 12), brassMat);
      ferrule.position.set(cfg.x * 1.15, 0.04, cfg.z * 1.15);
      chair.add(ferrule);
    });

    // 2. Thick Round Bouclé Seat Cushion
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.48, 0.2, 28), boucleMat);
    seat.position.y = 0.5;
    seat.castShadow = true;
    chair.add(seat);

    // 3. Curved Horseshoe Wraparound Tub Backrest
    const tubGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.58, 28, 1, true, 0, Math.PI * 1.25);
    const tub = new THREE.Mesh(tubGeo, boucleMat);
    tub.position.y = 0.72;
    tub.rotation.y = Math.PI * 0.38;
    tub.castShadow = true;
    chair.add(tub);

    // Soft rounded rim on tub backrest
    const rimGeo = new THREE.TorusGeometry(0.52, 0.045, 12, 32, Math.PI * 1.25);
    const rim = new THREE.Mesh(rimGeo, boucleMat);
    rim.position.y = 1.01;
    rim.rotation.x = Math.PI / 2;
    rim.rotation.z = Math.PI * 0.38;
    chair.add(rim);

    return chair;
  }

  /* ---------------- RACETRACK CALACATTA MARBLE EXECUTIVE DESK ---------------- */
  createExecutiveDesk() {
    const deskGroup = new THREE.Group();

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xfcfbfa,
      roughness: 0.25,
      metalness: 0.05
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc9a14a,
      metalness: 0.9,
      roughness: 0.2
    });
    const flutedPedestalMat = new THREE.MeshStandardMaterial({
      color: 0xe8dfd5,
      roughness: 0.6
    });

    // 1. Racetrack Rounded Desk Top (Beveled with Brass Rim)
    const topSlab = this.createRoundedSlab(3.8, 1.8, 0.5, 0.12, marbleMat);
    topSlab.position.set(0, 1.06, 0);
    topSlab.castShadow = true;
    deskGroup.add(topSlab);

    // Brushed Brass Trim perimeter ring under marble
    const trim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.03, 1.72), brassMat);
    trim.position.set(0, 0.99, 0);
    deskGroup.add(trim);

    // 2. Dual Fluted Architectural Tambour Pedestals
    [-1.3, 1.3].forEach((posX) => {
      const pedestalGroup = new THREE.Group();
      pedestalGroup.position.set(posX, 0.48, 0);

      // Fluted core
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.96, 24), flutedPedestalMat);
      core.castShadow = true;
      pedestalGroup.add(core);

      // Top and bottom gold brass collar rings
      const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 12, 24), brassMat);
      ringTop.position.y = 0.46;
      ringTop.rotation.x = Math.PI / 2;
      pedestalGroup.add(ringTop);

      const ringBottom = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.025, 12, 24), brassMat);
      ringBottom.position.y = -0.46;
      ringBottom.rotation.x = Math.PI / 2;
      pedestalGroup.add(ringBottom);

      deskGroup.add(pedestalGroup);
    });

    // 3. Desk Accessories: Black Leather Desk Blotter
    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.015, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 })
    );
    blotter.position.set(-0.2, 1.13, -0.05);
    deskGroup.add(blotter);

    // 4. Apple Space Black MacBook Pro (Open with illuminated analytics)
    const macbookGroup = new THREE.Group();
    macbookGroup.position.set(-0.2, 1.14, -0.05);

    const macMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.8, roughness: 0.25 });
    const macBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 0.36), macMat);
    macbookGroup.add(macBase);

    // Trackpad & keyboard recess
    const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), new THREE.MeshBasicMaterial({ color: 0x111317 }));
    keyboard.rotation.x = -Math.PI / 2;
    keyboard.position.set(0, 0.012, -0.05);
    macbookGroup.add(keyboard);

    // Retina Display (Opened at 105 degrees)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.01, -0.17);
    lidGroup.rotation.x = -0.25;

    const lidBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.35, 0.015), macMat);
    lidBack.position.y = 0.175;
    lidGroup.add(lidBack);

    // Glowing Retina display showing AI metrics dashboard
    const retinaScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.31),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    retinaScreen.position.set(0, 0.175, 0.01);
    lidGroup.add(retinaScreen);

    macbookGroup.add(lidGroup);
    deskGroup.add(macbookGroup);

    // 5. Ceramic Coffee Cup on Brass Saucer
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.02, 16), brassMat);
    saucer.position.set(0.65, 1.13, -0.15);
    deskGroup.add(saucer);

    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.06, 0.11, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    cup.position.set(0.65, 1.19, -0.15);
    deskGroup.add(cup);

    return deskGroup;
  }

  /* ---------------- HUD BADGE CANVAS TEXTURE GENERATOR ---------------- */
  createHoloBadgeTexture(title, subtitle) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Rounded pill background with frosted glass tint
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(201, 161, 74, 0.9)';
    ctx.lineWidth = 5;

    const r = 28;
    ctx.beginPath();
    ctx.moveTo(r, 4);
    ctx.lineTo(512 - r, 4);
    ctx.quadraticCurveTo(512 - 4, 4, 512 - 4, r);
    ctx.lineTo(512 - 4, 160 - r);
    ctx.quadraticCurveTo(512 - 4, 160 - 4, 512 - r, 160 - 4);
    ctx.lineTo(r, 160 - 4);
    ctx.quadraticCurveTo(4, 160 - 4, 4, 160 - r);
    ctx.lineTo(4, r);
    ctx.quadraticCurveTo(4, 4, r, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle neon cyan top accent stripe
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.95)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(30, 8, 452, 4);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 62);

    // Subtitle
    ctx.fillStyle = '#c9a14a';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(subtitle.toUpperCase(), 256, 114);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /* ---------------- HOLOGRAPHIC AI TRANSFORMATION MATRIX ---------------- */
  createAITransformationMatrixHologram() {
    const holoGroup = new THREE.Group();
    holoGroup.position.set(-1.45, 0.0, -0.2);

    const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });

    // 1. Sleek Titanium Pedestal Base
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 1.35, 24), titaniumMat);
    pedestal.position.y = 0.675;
    pedestal.castShadow = true;
    holoGroup.add(pedestal);

    // Glowing emitter ring collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.03, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    collar.position.y = 1.34;
    collar.rotation.x = Math.PI / 2;
    holoGroup.add(collar);

    // Upward Conical Holographic Projection Beam
    const beamGeo = new THREE.CylinderGeometry(0.85, 0.28, 1.2, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.95;
    holoGroup.add(beam);

    // 2. Center Crystal AI Core (Floating at y = 2.45)
    const coreGeo = new THREE.IcosahedronGeometry(0.36, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.2,
      flatShading: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 2.45;
    holoGroup.add(coreMesh);
    this.aboutHoloCore = coreMesh;

    // Outer wireframe cage
    const wireCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.44, 1),
      new THREE.MeshBasicMaterial({ color: 0xc9a14a, wireframe: true, transparent: true, opacity: 0.75 })
    );
    coreMesh.add(wireCage);

    // 3. Gyroscopic Orbital Rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.016, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe29a })
    );
    ring1.position.y = 2.45;
    ring1.rotation.x = Math.PI / 4;
    holoGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.014, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring2.position.y = 2.45;
    ring2.rotation.z = Math.PI / 3;
    holoGroup.add(ring2);

    this.aboutHoloRings = [ring1, ring2];

    // 4. 3 Orbiting Metric HUD Badges (Canvas Textures)
    const badgesData = [
      { title: '₹3Cr+ Value', sub: 'Revenue Engine' },
      { title: '14+ Yrs', sub: 'Advisory Track' },
      { title: '19K+ Scale', sub: 'Users Impacted' }
    ];

    this.aboutHoloBadges = [];
    badgesData.forEach((d) => {
      const tex = this.createHoloBadgeTexture(d.title, d.sub);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide
      });
      const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.28), badgeMat);
      holoGroup.add(badgeMesh);
      this.aboutHoloBadges.push(badgeMesh);
    });

    this.aboutHoloGroup = holoGroup;
    return holoGroup;
  }

  /* ---------------- OAK SLATS, FLOATING CREDENZA & CURATED ART WALL ---------------- */
  createArchitecturalWallCredenza() {
    const wallGroup = new THREE.Group();

    const oakMat = new THREE.MeshStandardMaterial({ color: 0xd8c8b4, roughness: 0.65 });
    const walnutMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.45 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.85, roughness: 0.25 });

    // 1. Vertical White Oak Acoustic Slats along Back Accent Zone
    const slatGeo = new THREE.BoxGeometry(0.06, 5.2, 0.04);
    for (let s = 0; s < 22; s++) {
      const slat = new THREE.Mesh(slatGeo, oakMat);
      slat.position.set(-4.2 + s * 0.16, 2.9, -5.18);
      slat.castShadow = true;
      slat.receiveShadow = true;
      wallGroup.add(slat);
    }

    // 2. Arched French Window with Fluted Glass & Sunlight Glow
    const archFrame = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.09, 16, 48), brassMat);
    archFrame.position.set(-0.2, 3.4, -5.16);
    wallGroup.add(archFrame);

    const archGlass = new THREE.Mesh(
      new THREE.CircleGeometry(1.58, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff8ee, transparent: true, opacity: 0.85 })
    );
    archGlass.position.set(-0.2, 3.4, -5.14);
    wallGroup.add(archGlass);

    // Warm sunbeam halo
    const sunGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.6),
      new THREE.MeshBasicMaterial({
        color: 0xffeed1,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
      })
    );
    sunGlow.position.set(-0.2, 3.4, -5.12);
    wallGroup.add(sunGlow);

    // 3. Floating Walnut Credenza / Console Cabinet
    const credenza = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.65), walnutMat);
    credenza.position.set(2.4, 1.05, -4.95);
    credenza.castShadow = true;
    wallGroup.add(credenza);

    // 4 Cabinet doors with brass reveal lines
    for (let d = 0; d < 4; d++) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.02), brassMat);
      handle.position.set(1.05 + d * 0.82, 1.05, -4.6);
      wallGroup.add(handle);
    }

    // Warm indirect under-glow beneath credenza
    const underGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffe29a, transparent: true, opacity: 0.6 })
    );
    underGlow.position.set(2.4, 0.55, -4.9);
    wallGroup.add(underGlow);

    // 4. Floating Walnut Display Shelf above Credenza
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.45), walnutMat);
    shelf.position.set(2.4, 2.5, -4.95);
    shelf.castShadow = true;
    wallGroup.add(shelf);

    // 5. Framed Portrait of Ahana Aura (from assets/ahana-portrait.jpeg)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/ahana-portrait.jpeg', (portraitTex) => {
      portraitTex.colorSpace = THREE.SRGBColorSpace;
      const portraitMat = new THREE.MeshStandardMaterial({
        map: portraitTex,
        roughness: 0.35
      });

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.05), brassMat);
      frame.position.set(1.5, 1.95, -4.8);
      frame.rotation.y = -0.08;
      wallGroup.add(frame);

      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.38), portraitMat);
      canvasMesh.position.set(1.5, 1.95, -4.77);
      canvasMesh.rotation.y = -0.08;
      wallGroup.add(canvasMesh);
    });

    // 6. Curated Books Collection (Realistic Luxury Hardcover Volumes)
    const bookColors = [0x1e242d, 0xd4af37, 0xfafafa, 0x1e3a8a, 0x166534, 0x991b1b];
    // Vertical row on shelf
    for (let b = 0; b < 10; b++) {
      const h = 0.48 + (b % 3) * 0.07;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, h, 0.32),
        new THREE.MeshStandardMaterial({ color: bookColors[b % bookColors.length], roughness: 0.5 })
      );
      book.position.set(2.4 + b * 0.09, 2.54 + h / 2, -4.95);
      book.castShadow = true;
      wallGroup.add(book);
    }

    // Horizontal stack on credenza
    for (let h = 0; h < 3; h++) {
      const bookH = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.07, 0.38),
        new THREE.MeshStandardMaterial({ color: bookColors[(h * 2 + 1) % bookColors.length], roughness: 0.5 })
      );
      bookH.position.set(3.4, 1.56 + h * 0.075, -4.9);
      bookH.castShadow = true;
      wallGroup.add(bookH);
    }

    // Modern Geometric Brass Sculpture on Credenza
    const sculptureBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    sculptureBase.position.set(2.6, 1.56, -4.85);
    wallGroup.add(sculptureBase);

    const sculptureRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.02, 12, 24),
      brassMat
    );
    sculptureRing.position.set(2.6, 1.76, -4.85);
    sculptureRing.rotation.x = Math.PI / 4;
    wallGroup.add(sculptureRing);

    return wallGroup;
  }

  /* ---------------- ROOM 2: ABOUT ME // STRATEGY SANCTUM (LEVEL 1, LEFT) ---------------- */
  buildRoom2AboutMe() {
    const group = new THREE.Group();
    group.position.set(-4.8, 0.55, -0.4);
    this.buildingGroup.add(group);

    // 1. Soft Warm Honey Pastel Floor (kriss.ai signature)
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.04, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xf7e5b5, roughness: 0.65 })
    );
    floorMesh.position.set(0, 0.02, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Luxury Ivory Bouclé Area Rug
    const rugMat = new THREE.MeshStandardMaterial({ color: 0xf5eee6, roughness: 0.95 });
    const rug = this.createRoundedSlab(6.2, 5.2, 0.8, 0.02, rugMat);
    rug.position.set(0.2, 0.05, -0.9);
    rug.receiveShadow = true;
    group.add(rug);

    // 3. Architectural Oak Slat Wall, Arched French Window & Floating Credenza
    const wallCredenza = this.createArchitecturalWallCredenza();
    group.add(wallCredenza);

    // 4. Executive Racetrack Calacatta Marble Desk
    const desk = this.createExecutiveDesk();
    desk.position.set(0, 0, -1.0);
    group.add(desk);

    // 5. Ahana's Executive Leather Swivel Chair
    const ahanaChair = this.createExecutiveChair();
    ahanaChair.position.set(-0.2, 0, -1.8);
    group.add(ahanaChair);

    // 6. Ahana Aura Stylized Figure (Seated comfortably behind desk in Emerald Blazer)
    const ahanaFigure = this.createStylizedFigure({
      shirtColor: 0x0f766e, // Deep emerald green leadership blazer
      pantsColor: 0x1e293b,
      hairColor: 0x1c1917,
      skinColor: 0xf6cfb2,
      isSitting: true
    });
    ahanaFigure.position.set(-0.2, 0.58, -1.8);
    group.add(ahanaFigure);
    this.aboutFigureAhana = ahanaFigure;

    // 7. Client's Designer Ivory Bouclé Tub Armchair
    const clientChair = this.createGuestArmchair();
    clientChair.position.set(1.9, 0, -0.9);
    clientChair.rotation.y = -Math.PI * 0.55;
    group.add(clientChair);

    // 8. Seated Client Figure (Consulting client in amber sweater, resting naturally inside the tub armchair)
    const clientFigure = this.createStylizedFigure({
      shirtColor: 0xf59e0b, // Amber cashmere sweater
      pantsColor: 0x334155, // Slate charcoal trousers
      hairColor: 0x374151,
      skinColor: 0xf7d5bc,
      isSitting: true
    });
    clientFigure.position.set(1.9, 0.58, -0.9);
    clientFigure.rotation.y = -Math.PI * 0.55;
    group.add(clientFigure);
    this.aboutFigureClient = clientFigure;

    // 9. Holographic AI Transformation Matrix with Orbiting HUD Badges
    const holoMatrix = this.createAITransformationMatrixHologram();
    group.add(holoMatrix);

    // 10. Modern Arc Floor Lamp
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.2 });
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 12), goldMat);
    lampStem.position.set(-3.4, 1.6, -1.8);
    group.add(lampStem);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.52, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.35 })
    );
    lampShade.position.set(-3.4, 3.1, -1.8);
    group.add(lampShade);
  }

    /* ---------------- DYNAMIC SCREEN CANVASES: SERVICES & PORTFOLIO ---------------- */
  initServicesScreens() {
    this.servicesScreenCanvasA = document.createElement('canvas');
    this.servicesScreenCanvasA.width = 512;
    this.servicesScreenCanvasA.height = 320;
    this.servicesScreenCtxA = this.servicesScreenCanvasA.getContext('2d');
    this.servicesScreenTextureA = new THREE.CanvasTexture(this.servicesScreenCanvasA);
    this.servicesScreenTextureA.minFilter = THREE.LinearFilter;
    this.servicesScreenTextureA.magFilter = THREE.LinearFilter;

    this.servicesScreenCanvasB = document.createElement('canvas');
    this.servicesScreenCanvasB.width = 512;
    this.servicesScreenCanvasB.height = 320;
    this.servicesScreenCtxB = this.servicesScreenCanvasB.getContext('2d');
    this.servicesScreenTextureB = new THREE.CanvasTexture(this.servicesScreenCanvasB);
    this.servicesScreenTextureB.minFilter = THREE.LinearFilter;
    this.servicesScreenTextureB.magFilter = THREE.LinearFilter;
  }

  updateServicesScreenA(t) {
    const ctx = this.servicesScreenCtxA;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    // Background
    ctx.fillStyle = '#060d19';
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top Bar
    ctx.fillStyle = '#0b162c';
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 39, w, 1);

    // Online status pulse
    const pulseAlpha = 0.5 + Math.sin(t * 4) * 0.5;
    ctx.fillStyle = `rgba(16, 185, 129, ${pulseAlpha})`;
    ctx.beginPath();
    ctx.arc(20, 20, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('NEURAL TOPOLOGY // AGENT ORCHESTRATOR', 34, 24);

    const pillarTitles = {
      strategy: 'MODE: STRATEGY_ROADMAP',
      automation: 'MODE: MULTI_AGENT_SWARM',
      caio: 'MODE: FRACTIONAL_CAIO',
      revenue: 'MODE: DEMAND_REVENUE'
    };
    const pTitle = pillarTitles[this.servicesCurrentPillar] || 'MODE: ACTIVE';
    ctx.fillStyle = '#c9a14a';
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(pTitle, w - 16, 24);
    ctx.textAlign = 'left';

    // 6 Connected Neural Architecture Nodes
    const nodes = [
      { id: 'INPUT', label: 'ENTERPRISE DATA', x: 65, y: 145 },
      { id: 'R1', label: 'LLM REASONER', x: 190, y: 95 },
      { id: 'R2', label: 'AGENT SWARM', x: 190, y: 195 },
      { id: 'R3', label: 'TOOL CALLS', x: 330, y: 95 },
      { id: 'R4', label: 'GOVERNANCE', x: 330, y: 195 },
      { id: 'OUT', label: 'DETERMINISTIC ROI', x: 445, y: 145 }
    ];

    const edges = [
      [0, 1], [0, 2],
      [1, 3], [1, 4],
      [2, 3], [2, 4],
      [3, 5], [4, 5]
    ];

    // Draw Edges with Flowing Light Photons
    edges.forEach(([fromIdx, toIdx], edgeIndex) => {
      const n1 = nodes[fromIdx];
      const n2 = nodes[toIdx];

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();

      // Flowing photon
      const progress = (t * 1.8 + edgeIndex * 0.28) % 1.0;
      const px = n1.x + (n2.x - n1.x) * progress;
      const py = n1.y + (n2.y - n1.y) * progress;

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Nodes
    nodes.forEach((n, i) => {
      const nodePulse = 1.0 + Math.sin(t * 3.5 + i) * 0.12;
      ctx.fillStyle = '#0f224a';
      ctx.strokeStyle = (i === 0 || i === 5) ? '#c9a14a' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14 * nodePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.id, n.x, n.y + 3);

      ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
      ctx.font = '8px "Inter", sans-serif';
      ctx.fillText(n.label, n.x, n.y + 24);
    });
    ctx.textAlign = 'left';

    // Bottom Waveform / Inference Sine Signal
    ctx.fillStyle = '#0b162c';
    ctx.fillRect(0, h - 45, w, 45);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(0, h - 45, w, 1);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const y = h - 22 + Math.sin(x * 0.04 + t * 6) * 10 + Math.cos(x * 0.09 - t * 4) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('INFERENCE: 12ms | ATTN HEADS: 64 | THROUGHPUT: 4.8K REQ/S', 16, h - 8);

    this.servicesScreenTextureA.needsUpdate = true;
  }

  updateServicesScreenB(t) {
    const ctx = this.servicesScreenCtxB;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    // Background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, w, h);

    // Top Header
    ctx.fillStyle = '#0c172e';
    ctx.fillRect(0, 0, w, 38);
    ctx.fillStyle = '#c9a14a';
    ctx.fillRect(0, 37, w, 1.5);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('ENTERPRISE COMMAND // AUTOMATION HUD', 16, 24);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SLA: 99.99% • ENCRYPTION: AES-256', w - 16, 24);
    ctx.textAlign = 'left';

    // Left Column: Key Performance Gauges
    const gauges = [
      { label: 'WORKFLOW VELOCITY', val: 0.94 + Math.sin(t * 2) * 0.03, text: '+3.4x SPEED', col: '#38bdf8' },
      { label: 'OPERATIONAL DRAG', val: 0.70 + Math.cos(t * 1.5) * 0.02, text: '-70% OVERHEAD', col: '#10b981' },
      { label: 'ENTERPRISE MARGIN', val: 0.86 + Math.sin(t * 2.5) * 0.04, text: '+42% NET MARGIN', col: '#c9a14a' }
    ];

    gauges.forEach((g, idx) => {
      const gy = 55 + idx * 36;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(g.label, 16, gy);

      ctx.fillStyle = g.col;
      ctx.textAlign = 'right';
      ctx.fillText(g.text, 230, gy);
      ctx.textAlign = 'left';

      // Bar track
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, gy + 5, 214, 8);

      // Bar fill
      ctx.fillStyle = g.col;
      ctx.shadowColor = g.col;
      ctx.shadowBlur = 4;
      ctx.fillRect(16, gy + 5, Math.max(10, 214 * g.val), 8);
      ctx.shadowBlur = 0;
    });

    // Right Column: Spinning Cyber Radar Target
    const cx = 380;
    const cy = 105;
    const r = 48;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Radar sweep
    const sweepAngle = t * 2.8;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sweepAngle - 0.4, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fill();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET VERIFICATION', cx, cy + r + 14);
    ctx.textAlign = 'left';

    // Bottom Terminal Log Stream
    const logY = 175;
    const logH = 135;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.9)';
    ctx.fillRect(16, logY, w - 32, logH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeRect(16, logY, w - 32, logH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('LIVE EXECUTION STREAM // TERMINAL', 26, logY + 16);

    const logs = [
      '[09:42:11] Swarm agent orchestrator: Initialized 8 sub-workers',
      '[09:42:12] Context window compressed: 98.4% semantic fidelity',
      '[09:42:13] Tool call executed: ERP inventory reconciliation [OK]',
      '[09:42:14] Strategic KPI verified: Operational drag reduced -70%',
      '[09:42:15] Deterministic sanity check: Zero regressions detected',
      `[09:42:16] Active state: High-margin automation running${Math.floor(t * 2) % 2 === 0 ? ' _' : ''}`
    ];

    ctx.font = '9px "JetBrains Mono", monospace';
    logs.forEach((log, lIdx) => {
      ctx.fillStyle = lIdx === logs.length - 1 ? '#c9a14a' : 'rgba(203, 213, 225, 0.85)';
      ctx.fillText(`> ${log}`, 26, logY + 36 + lIdx * 16);
    });

    this.servicesScreenTextureB.needsUpdate = true;
  }

  /* ---------------- DYNAMIC SCREEN CANVASES: PORTFOLIO ---------------- */
  initPortfolioScreens() {
    this.portfolioScreenCanvasL = document.createElement('canvas');
    this.portfolioScreenCanvasL.width = 512;
    this.portfolioScreenCanvasL.height = 320;
    this.portfolioScreenCtxL = this.portfolioScreenCanvasL.getContext('2d');
    this.portfolioScreenTextureL = new THREE.CanvasTexture(this.portfolioScreenCanvasL);
    this.portfolioScreenTextureL.minFilter = THREE.LinearFilter;
    this.portfolioScreenTextureL.magFilter = THREE.LinearFilter;

    this.portfolioScreenCanvasR = document.createElement('canvas');
    this.portfolioScreenCanvasR.width = 512;
    this.portfolioScreenCanvasR.height = 320;
    this.portfolioScreenCtxR = this.portfolioScreenCanvasR.getContext('2d');
    this.portfolioScreenTextureR = new THREE.CanvasTexture(this.portfolioScreenCanvasR);
    this.portfolioScreenTextureR.minFilter = THREE.LinearFilter;
    this.portfolioScreenTextureR.magFilter = THREE.LinearFilter;
  }

  updatePortfolioScreenL(t) {
    const ctx = this.portfolioScreenCtxL;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    // Background (Warm Architectural Espresso)
    ctx.fillStyle = '#161412';
    ctx.fillRect(0, 0, w, h);

    // Top Header
    ctx.fillStyle = '#221e1a';
    ctx.fillRect(0, 0, w, 38);
    ctx.fillStyle = '#c9a14a';
    ctx.fillRect(0, 37, w, 1.5);

    ctx.fillStyle = '#fdfbf7';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('FINANCIAL ROI ENGINE // VERIFIED METRICS', 16, 24);

    ctx.fillStyle = '#c9a14a';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MULTIPLIER: 4.8x VALUE', w - 16, 24);
    ctx.textAlign = 'left';

    // Coordinate Grid & Exponential Growth Curve (Warm Sand & Gold)
    ctx.strokeStyle = 'rgba(201, 161, 74, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 60; x <= 460; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, 240);
      ctx.stroke();
    }
    for (let y = 60; y <= 240; y += 45) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(460, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 50);
    ctx.lineTo(60, 240);
    ctx.lineTo(460, 240);
    ctx.stroke();

    // Exponential Curve Fill & Stroke
    ctx.beginPath();
    ctx.moveTo(60, 230);
    for (let px = 60; px <= 460; px += 8) {
      const norm = (px - 60) / 400;
      const py = 230 - Math.pow(norm, 1.8) * 165 - Math.sin(norm * Math.PI * 4 + t * 4) * 3;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(460, 240);
    ctx.lineTo(60, 240);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fill();

    // Curve Line
    ctx.beginPath();
    ctx.moveTo(60, 230);
    for (let px = 60; px <= 460; px += 8) {
      const norm = (px - 60) / 400;
      const py = 230 - Math.pow(norm, 1.8) * 165 - Math.sin(norm * Math.PI * 4 + t * 4) * 3;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Moving Data Point on Curve
    const trailPos = (t * 0.4) % 1.0;
    const curX = 60 + trailPos * 400;
    const curY = 230 - Math.pow(trailPos, 1.8) * 165;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Peak Metric Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#c9a14a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(360, 65, 95, 34);
    ctx.strokeRect(360, 65, 95, 34);
    ctx.fillStyle = '#c9a14a';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+250% REVENUE', 407, 86);
    ctx.textAlign = 'left';

    // Bottom Stats
    ctx.fillStyle = '#0b1528';
    ctx.fillRect(0, h - 45, w, 45);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(0, h - 45, w, 1);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('CAPITAL EFFICIENCY: 98.4% | CAC DRAG: -65% | NET MARGIN: +42%', 16, h - 16);

    this.portfolioScreenTextureL.needsUpdate = true;
  }

  updatePortfolioScreenR(t) {
    const ctx = this.portfolioScreenCtxR;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    // Background (Warm Architectural Espresso)
    ctx.fillStyle = '#161412';
    ctx.fillRect(0, 0, w, h);

    // Top Header
    ctx.fillStyle = '#221e1a';
    ctx.fillRect(0, 0, w, 38);
    ctx.fillStyle = '#c9a14a';
    ctx.fillRect(0, 37, w, 1.5);

    ctx.fillStyle = '#fdfbf7';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('EXECUTIVE CASE DOSSIER // REAL-TIME', 16, 24);

    const projTags = {
      fintech: 'CASE: FINTECH UNDERWRITING SCALE',
      ecommerce: 'CASE: GLOBAL SUPPLY & PRICING',
      health: 'CASE: CLINICAL PATIENT RETENTION',
      saas: 'CASE: ENTERPRISE SUPPORT COPILOT'
    };
    ctx.fillStyle = '#c9a14a';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(projTags[this.activePortfolioProject] || 'CASE: ENTERPRISE', w - 16, 24);
    ctx.textAlign = 'left';

    // Gauges
    const gauges = [
      { label: 'DELIVERABLE CONFIDENCE', val: 0.98, col: '#10b981', txt: '99.8% SLA' },
      { label: 'EXECUTION SPEED', val: 0.88 + Math.sin(t * 2) * 0.04, col: '#38bdf8', txt: '< 800ms' },
      { label: 'ENTERPRISE RETENTION', val: 0.92, col: '#c9a14a', txt: '85% NRR' }
    ];

    gauges.forEach((g, idx) => {
      const gy = 55 + idx * 36;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(g.label, 16, gy);

      ctx.fillStyle = g.col;
      ctx.textAlign = 'right';
      ctx.fillText(g.txt, 240, gy);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, gy + 5, 224, 8);

      ctx.fillStyle = g.col;
      ctx.fillRect(16, gy + 5, 224 * g.val, 8);
    });

    // Circular Target Telemetry
    const cx = 390;
    const cy = 105;
    const r = 45;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    const rot = t * 2.5;
    ctx.arc(cx, cy, r, rot, rot + Math.PI * 0.6);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEPLOYED', cx, cy + 4);
    ctx.textAlign = 'left';

    // Terminal Case Study Log
    const logY = 175;
    const logH = 135;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.9)';
    ctx.fillRect(16, logY, w - 32, logH);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.strokeRect(16, logY, w - 32, logH);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('VERIFIED CASE STUDY TELEMETRY', 26, logY + 16);

    const logs = [
      '[OK] Audit trail verified: SOC2 compliant data isolation',
      '[OK] Model drift zero over 12 months continuous operation',
      '[OK] Multi-agent routing: 99.4% precision on live traffic',
      '[OK] Executive Dossier: Presentation deck ready for review',
      `[STATUS] AI Patrol Drone recon lock established${Math.floor(t * 2) % 2 === 0 ? ' _' : ''}`
    ];

    ctx.font = '9px "JetBrains Mono", monospace';
    logs.forEach((log, lIdx) => {
      ctx.fillStyle = lIdx === logs.length - 1 ? '#38bdf8' : 'rgba(203, 213, 225, 0.85)';
      ctx.fillText(`> ${log}`, 26, logY + 36 + lIdx * 18);
    });

    this.portfolioScreenTextureR.needsUpdate = true;
  }

  /* ---------------- ROOM 3: SERVICES // AI SYSTEMS COMMAND LAB (LEVEL 2, LEFT) ---------------- */
  buildRoom3Services() {
    const group = new THREE.Group();
    group.position.set(-4.8, 6.15, -0.4);
    this.buildingGroup.add(group);

    // Soft sage / mint green floor (kriss.ai pastel)
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.04, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xc4e5d2, roughness: 0.65 })
    );
    floorMesh.position.set(0, 0.02, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 1. Bank of 3 Deep Enterprise AI Compute Server Racks
    const rackMat = new THREE.MeshStandardMaterial({ color: 0xede8e1, roughness: 0.45 });
    const innerRackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

    for (let r = 0; r < 3; r++) {
      const rackGroup = new THREE.Group();
      rackGroup.position.set(-3.3 + r * 1.35, 1.8, -4.0);

      // Outer Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.20, 3.6, 1.1), rackMat);
      frame.castShadow = true;
      rackGroup.add(frame);

      // Inner Bay Cutout
      const innerBay = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.4, 0.1), innerRackMat);
      innerBay.position.z = 0.52;
      rackGroup.add(innerBay);

      // Server Blade Slots with Multi-Colored High-Activity LEDs
      for (let s = 0; s < 7; s++) {
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.38, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
        );
        slot.position.set(0, 1.3 - s * 0.45, 0.54);
        rackGroup.add(slot);

        const ledColors = [0x10b981, 0x38bdf8, 0xf59e0b, 0xffffff];
        for (let l = 0; l < 4; l++) {
          const led = new THREE.Mesh(
            new THREE.CircleGeometry(0.035, 8),
            new THREE.MeshBasicMaterial({ color: ledColors[l % ledColors.length] })
          );
          led.position.set(-0.35 + l * 0.22, 1.3 - s * 0.45, 0.58);
          rackGroup.add(led);
          this.serverLeds.push(led);
        }
      }
      group.add(rackGroup);
    }

    // Overhead Glowing Fiber Data Conduit (from server rack to central hologram emitter)
    const conduitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6, 3.4, -3.8),
      new THREE.Vector3(-0.6, 3.2, -1.5),
      new THREE.Vector3(-0.45, 2.6, 0.55),
      new THREE.Vector3(-0.45, 1.2, 0.55)
    ]);
    const conduitGeo = new THREE.TubeGeometry(conduitCurve, 32, 0.03, 8, false);
    const conduitMesh = new THREE.Mesh(
      conduitGeo,
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.65 })
    );
    group.add(conduitMesh);

    // Flowing Photons along Conduit
    this.servicesConduitPhotons = [];
    this.servicesConduitCurve = conduitCurve;
    for (let p = 0; p < 3; p++) {
      const photon = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      group.add(photon);
      this.servicesConduitPhotons.push(photon);
    }

    // 2. Central 3D Holographic AI Architecture Emitter
    const holoEmitterGroup = new THREE.Group();
    holoEmitterGroup.position.set(-0.45, 0.45, 0.55);
    group.add(holoEmitterGroup);

    // Tiered Base Pedestal
    const basePed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.05, 0.65, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    basePed.castShadow = true;
    holoEmitterGroup.add(basePed);

    // Glowing Cyan Neon Base Ring
    const baseNeonRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.025, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    baseNeonRing.rotation.x = Math.PI / 2;
    baseNeonRing.position.y = 0.32;
    holoEmitterGroup.add(baseNeonRing);

    // Vertical Holographic Light Beam (Tapered Cone)
    const beamGeo = new THREE.CylinderGeometry(0.55, 0.25, 2.2, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 1.45;
    holoEmitterGroup.add(beamMesh);
    this.servicesBeam = beamMesh;

    // Floating Hologram Core Group
    const holoCoreGroup = new THREE.Group();
    holoCoreGroup.position.set(0, 1.85, 0);
    holoEmitterGroup.add(holoCoreGroup);
    this.servicesHoloCore = holoCoreGroup;

    // Outer Icosahedron Wireframe
    const outerCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.48, 0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    );
    holoCoreGroup.add(outerCage);

    // Inner Glowing Octahedron Crystal
    const innerCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.30, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.95,
        roughness: 0.2
      })
    );
    holoCoreGroup.add(innerCrystal);
    this.servicesHoloInner = innerCrystal;

    // Point light radiating active color
    const holoLight = new THREE.PointLight(0x38bdf8, 2.5, 4.0);
    holoCoreGroup.add(holoLight);
    this.servicesHoloLight = holoLight;

    // 3 Gyroscopic Floating Orbital Rings
    this.servicesHoloRings = [];
    const ringSpecs = [
      { r: 0.88, t: 0.018, tiltX: Math.PI / 4, tiltZ: 0 },
      { r: 0.72, t: 0.015, tiltX: 0, tiltZ: Math.PI / 3 },
      { r: 0.58, t: 0.012, tiltX: Math.PI / 6, tiltZ: Math.PI / 4 }
    ];

    ringSpecs.forEach((spec) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(spec.r, spec.t, 16, 48),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      ring.rotation.x = spec.tiltX;
      ring.rotation.z = spec.tiltZ;
      holoCoreGroup.add(ring);
      this.servicesHoloRings.push(ring);
    });

    // 4 Orbiting Data Satellites
    this.servicesSatellites = [];
    for (let s = 0; s < 4; s++) {
      const sat = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.065, 0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      holoEmitterGroup.add(sat);
      this.servicesSatellites.push(sat);
    }

    // 3. Ergonomic Command Desk & Dual Displays (Facing FRONT +Z towards camera!)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(1.15, 1.35, 0.35);
    deskGroup.rotation.y = -0.18; // Angled toward camera!
    group.add(deskGroup);

    // Architectural White Desk Slab
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.1, 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28 })
    );
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    // Brushed Metal Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.6 });
    for (let lx = -1.1; lx <= 1.1; lx += 2.2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 16), legMat);
      leg.position.set(lx, -0.675, 0);
      leg.castShadow = true;
      deskGroup.add(leg);
    }

    // Monitor Left (Screen A: Neural Topology)
    const monLGroup = new THREE.Group();
    monLGroup.position.set(-0.58, 0.62, 0.12);
    monLGroup.rotation.y = 0.12; // Curved inward
    deskGroup.add(monLGroup);

    const monLCase = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.64, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    monLCase.castShadow = true;
    monLGroup.add(monLCase);

    const screenAPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.58),
      new THREE.MeshBasicMaterial({ map: this.servicesScreenTextureA, side: THREE.DoubleSide })
    );
    screenAPlane.position.set(0, 0, 0.024);
    monLGroup.add(screenAPlane);

    const monLStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12), legMat);
    monLStand.position.set(0, -0.42, 0);
    monLGroup.add(monLStand);

    // Monitor Right (Screen B: Enterprise Telemetry HUD)
    const monRGroup = new THREE.Group();
    monRGroup.position.set(0.58, 0.62, 0.0);
    monRGroup.rotation.y = -0.24; // Curved inward
    deskGroup.add(monRGroup);

    const monRCase = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.64, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    monRCase.castShadow = true;
    monRGroup.add(monRCase);

    const screenBPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.58),
      new THREE.MeshBasicMaterial({ map: this.servicesScreenTextureB, side: THREE.DoubleSide })
    );
    screenBPlane.position.set(0, 0, 0.024);
    monRGroup.add(screenBPlane);

    const monRStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12), legMat);
    monRStand.position.set(0, -0.42, 0);
    monRGroup.add(monRStand);

    // Holographic Cyber Keyboard / Touch Strip on desk
    const keyb = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.012, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, emissive: 0x0284c7, emissiveIntensity: 0.25 })
    );
    keyb.position.set(0, 0.055, 0.28);
    deskGroup.add(keyb);

    // 4. Stylized AI Systems Architect Figure (Living Character)
    const architect = this.createStylizedFigure({
      shirtColor: 0x4338ca, // Tech Indigo
      pantsColor: 0x1e293b,
      hairColor: 0x3e1f0e,
      isSitting: false
    });
    architect.position.set(2.35, 0.0, 0.75);
    architect.rotation.y = -2.4; // Facing console and hologram, 3/4 view to camera!
    group.add(architect);
    this.servicesArchitect = architect;

    // Natural initial pose
    if (architect.armR) {
      architect.armR.rotation.x = 0.95;
    }
    if (architect.armL) {
      architect.armL.rotation.x = 0.85;
      architect.armL.rotation.z = -0.25;
    }
  }

  /* ---------------- ROOM 4: PORTFOLIO PROJECTS // IMPACT OBSERVATORY (LEVEL 2, RIGHT) ---------------- */
  buildRoom4Portfolio() {
    const group = new THREE.Group();
    group.position.set(4.8, 6.15, -0.4);
    this.buildingGroup.add(group);

    // Soft sky blue floor (kriss.ai signature pastel)
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.04, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xc2def2, roughness: 0.65 })
    );
    floorMesh.position.set(0, 0.02, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 1. Curved Architectural Periwinkle Partition Wall
    const curvedWall = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 4.5, 32, 1, true, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: 0xc8d7e6, roughness: 0.7, side: THREE.DoubleSide })
    );
    curvedWall.position.set(1.2, 2.25, -1.8);
    curvedWall.rotation.y = Math.PI * 0.85;
    group.add(curvedWall);

    // 2. Executive Analytics Desk with Dual Glowing High-DPI Displays
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.5), deskMat);
    desk.position.set(-0.4, 1.1, -1.2);
    desk.castShadow = true;
    group.add(desk);

    // Dual Monitors
    const monL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.04), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    monL.position.set(-0.9, 1.55, -1.2);
    monL.rotation.y = 0.2;
    group.add(monL);

    const monR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.04), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    monR.position.set(0.1, 1.55, -1.2);
    monR.rotation.y = -0.2;
    group.add(monR);

    // Dynamic High-Resolution Canvas Screens (Facing +Z directly towards user)
    const screenL = new THREE.Mesh(
      new THREE.PlaneGeometry(0.80, 0.47),
      new THREE.MeshBasicMaterial({ map: this.portfolioScreenTextureL, side: THREE.DoubleSide })
    );
    screenL.position.set(-0.9, 1.55, -1.17);
    screenL.rotation.y = 0.2;
    group.add(screenL);

    const screenR = new THREE.Mesh(
      new THREE.PlaneGeometry(0.80, 0.47),
      new THREE.MeshBasicMaterial({ map: this.portfolioScreenTextureR, side: THREE.DoubleSide })
    );
    screenR.position.set(0.1, 1.55, -1.17);
    screenR.rotation.y = -0.2;
    group.add(screenR);

    // 3. Dynamic 3D Cylindrical ROI Bar Charts
    const chartBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xe8dfd3, roughness: 0.45 })
    );
    chartBase.position.set(2.4, 0.18, 1.2);
    chartBase.castShadow = true;
    group.add(chartBase);

    this.portfolioCharts = [];
    const barColors = [0xc9a14a, 0x926127, 0xdfd3c3, 0x2d2823]; // Executive Gold, Bronze, Sandstone Ivory, Obsidian
    const initialHeights = this.portfolioProjectBars.fintech;

    for (let c = 0; c < 4; c++) {
      const height = initialHeights[c];
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, height, 16),
        new THREE.MeshStandardMaterial({
          color: barColors[c],
          emissive: barColors[c],
          emissiveIntensity: 0.35,
          roughness: 0.3
        })
      );
      bar.position.set(1.9 + c * 0.35, 0.35 + height / 2, 1.2);
      bar.castShadow = true;
      group.add(bar);
      this.portfolioCharts.push({ mesh: bar, baseHeight: height, speed: 1.8 + c * 0.4 });
    }

    // 4. Stylized Data Analytics Lead Figure (Living Character)
    const analyst = this.createStylizedFigure({
      shirtColor: 0xeab308, // Warm sunshine yellow
      pantsColor: 0x1e293b,
      hairColor: 0x1f2937,
      isSitting: true
    });
    analyst.position.set(-0.4, 0.58, -2.1);
    group.add(analyst);
    this.portfolioAnalyst = analyst;
  }

  /* ---------------- PILLAR & PROJECT SWITCHING APIs ---------------- */
  setServicesPillar(pillarKey) {
    if (!this.servicesPillarColors || !this.servicesPillarColors[pillarKey]) return;
    this.servicesCurrentPillar = pillarKey;
    const colHex = this.servicesPillarColors[pillarKey];

    if (this.servicesHoloCore) {
      this.servicesHoloCore.children.forEach((child) => {
        if (child.material) {
          if (child.material.color) child.material.color.set(colHex);
          if (child.material.emissive) child.material.emissive.set(colHex);
        }
      });
    }

    if (this.servicesHoloRings) {
      this.servicesHoloRings.forEach((ring) => {
        if (ring.material && ring.material.color) {
          ring.material.color.set(colHex);
        }
      });
    }

    if (this.servicesSatellites) {
      this.servicesSatellites.forEach((sat) => {
        if (sat.material && sat.material.color) {
          sat.material.color.set(colHex);
        }
      });
    }

    if (this.servicesHoloLight) {
      this.servicesHoloLight.color.set(colHex);
    }

    if (this.servicesBeam && this.servicesBeam.material) {
      this.servicesBeam.material.color.set(colHex);
    }
  }

  setPortfolioProject(projectKey) {
    if (!this.portfolioProjectBars[projectKey]) return;
    this.activePortfolioProject = projectKey;
    const heights = this.portfolioProjectBars[projectKey];
    this.portfolioCharts.forEach((item, i) => {
      if (heights[i] !== undefined) {
        item.baseHeight = heights[i];
      }
    });
  }

  
  /* ---------------- EXTERIOR ACCENTS (TURQUOISE POOL & GROUNDS) ---------------- */
  buildExteriorFeatures() {
    // 1. Executive Ground Terrace Plaza (Warm Travertine Stone with Gold Rim)
    const plazaRing = new THREE.Mesh(
      new THREE.RingGeometry(7.8, 8.4, 48),
      new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.3, metalness: 0.7 })
    );
    plazaRing.rotation.x = -Math.PI / 2;
    plazaRing.position.set(-5.5, 0.01, 1.5);
    this.buildingGroup.add(plazaRing);

    // Travertine Terrace Base
    const terraceBase = new THREE.Mesh(
      new THREE.CircleGeometry(7.75, 48),
      new THREE.MeshStandardMaterial({ color: 0xe5dacd, roughness: 0.85 })
    );
    terraceBase.rotation.x = -Math.PI / 2;
    terraceBase.position.set(-5.5, 0.005, 1.5);
    this.buildingGroup.add(terraceBase);

    // Crystal Reflection Pool
    const poolWater = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 48),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.75
      })
    );
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(-5.5, 0.02, 1.5);
    this.buildingGroup.add(poolWater);
    this.poolWater = poolWater;

    // Architectural Travertine Step Stones to Reception
    for (let s = 0; s < 4; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.05, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xf5eee4, roughness: 0.6 })
      );
      step.position.set(0.5 + s * 1.0, 0.025, 3.8 + s * 0.4);
      step.rotation.y = -0.2;
      this.buildingGroup.add(step);
    }
  }

  /* ---------------- AUTONOMOUS AI PATROL DRONE ---------------- */
  buildAIDrone() {
    const droneGroup = new THREE.Group();
    droneGroup.position.set(0, 7.2, 3.6);
    this.scene.add(droneGroup);
    this.drone = droneGroup;

    const droneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.2 });

    // Chassis
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), droneMat);
    body.scale.set(1.2, 0.5, 0.9);
    body.castShadow = true;
    droneGroup.add(body);

    // Glowing Sensor Eye
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    eye.position.set(0, -0.05, 0.38);
    droneGroup.add(eye);

    // Rotor Booms
    const boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
    const boom1 = new THREE.Mesh(boomGeo, goldMat);
    boom1.rotation.z = Math.PI / 4;
    droneGroup.add(boom1);

    const boom2 = new THREE.Mesh(boomGeo, goldMat);
    boom2.rotation.z = -Math.PI / 4;
    droneGroup.add(boom2);

    // 4 Spinning Rotors
    const rotorGeo = new THREE.BoxGeometry(0.65, 0.02, 0.08);
    const rotorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    const rotorPositions = [
      { x: -0.5, y: 0.15, z: 0 },
      { x: 0.5, y: 0.15, z: 0 },
      { x: 0, y: 0.15, z: -0.5 },
      { x: 0, y: 0.15, z: 0.5 }
    ];

    rotorPositions.forEach((pos) => {
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.set(pos.x, pos.y, pos.z);
      droneGroup.add(rotor);
      this.droneRotors.push(rotor);
    });

    // Scanning Downlight Spotlight
    const spot = new THREE.SpotLight(0x38bdf8, 3.5, 14, Math.PI / 6, 0.4, 1.5);
    spot.position.set(0, 0, 0);
    spot.target.position.set(0, -5, 0);
    droneGroup.add(spot);
    droneGroup.add(spot.target);
    this.droneSpotlight = spot;
  }

  /* ---------------- INTERACTION & CONTROLS ---------------- */
  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Mouse movement for parallax & turntable drag
    window.addEventListener('mousemove', (e) => {
      this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isDragging && this.currentWaypointIndex === 0) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        this.targetTurntableRotationY += deltaX * 0.005;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#canvas-container') && this.currentWaypointIndex === 0) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support for drag
    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0 && this.currentWaypointIndex === 0) {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        this.targetTurntableRotationY += deltaX * 0.006;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0 && this.currentWaypointIndex === 0) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  /* ---------------- CAMERA TRANSITION CHOREOGRAPHY ---------------- */
  navigateToRoom(roomIndex) {
    if (roomIndex < 0 || roomIndex >= this.waypoints.length) return;
    if (this.currentWaypointIndex === roomIndex && !this.isTransitioning) return;

    try {
      if (typeof soundEngine?.playSwoosh === 'function') {
        soundEngine.playSwoosh();
      } else if (typeof soundEngine?.playTransition === 'function') {
        soundEngine.playTransition();
      }
    } catch (e) {}

    this.currentWaypointIndex = roomIndex;
    const wp = this.waypoints[roomIndex];

    this.transitionStartPos.copy(this.camera.position);
    this.transitionStartLookAt.copy(this.currentCameraLookAt);
    this.targetCameraPos.copy(wp.pos);
    this.targetCameraLookAt.copy(wp.target);

    this.transitionProgress = 0.0;
    this.isTransitioning = true;

    // Reset turntable rotation when zooming into a room
    if (roomIndex !== 0) {
      this.targetTurntableRotationY = 0;
    }

    // Toggle Drone Focus on Portfolio Room
    this.droneInRoom4 = (roomIndex === 4);
  }

  /* ---------------- LIGHTING THEMES (DAY, SUNSET, NIGHT) ---------------- */
  setTheme(theme) {
    this.currentTheme = theme;
    document.body.className = `theme-${theme} text-[#1e1b18] antialiased overflow-hidden h-full w-full`;

    if (theme === 'day') {
      this.scene.background.set('#ede4dc');
      this.scene.fog.color.set('#ede4dc');
      this.ambientLight.color.set(0xfff8f2);
      this.ambientLight.intensity = 0.38;
      this.hemiLight.color.set(0xffffff);
      this.hemiLight.groundColor.set(0xd0c0b0);
      this.sunLight.color.set(0xfffaf0);
      this.sunLight.intensity = 2.20;
      this.renderer.toneMappingExposure = 1.00; // Balanced exposure: zero blown-out whites!
    } else if (theme === 'sunset') {
      this.scene.background.set('#e8cfb8');
      this.scene.fog.color.set('#e8cfb8');
      this.ambientLight.color.set(0xffddbe);
      this.ambientLight.intensity = 0.65;
      this.hemiLight.color.set(0xffa07a);
      this.hemiLight.groundColor.set(0x7c2d12);
      this.sunLight.color.set(0xf97316);
      this.sunLight.intensity = 2.1;
      this.renderer.toneMappingExposure = 1.25;
    } else if (theme === 'night') {
      this.scene.background.set('#0b0f19');
      this.scene.fog.color.set('#0b0f19');
      this.ambientLight.color.set(0x1e293b);
      this.ambientLight.intensity = 0.35;
      this.hemiLight.color.set(0x38bdf8);
      this.hemiLight.groundColor.set(0x020617);
      this.sunLight.color.set(0x60a5fa);
      this.sunLight.intensity = 0.65;
      this.renderer.toneMappingExposure = 1.35;
    }
  }

  /* ---------------- 3D TO SCREEN PROJECTION FOR HOTSPOTS ---------------- */
  getProjectedHotspots() {
    return this.projectHotspots();
  }

  projectHotspots() {
    return this.roomAnchors.map((anchor) => {
      const v = anchor.clone();
      // Apply building turntable rotation
      v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.buildingGroup.rotation.y);
      v.project(this.camera);

      const isVis = v.z < 1.0 && this.currentWaypointIndex === 0;
      return {
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-(v.y * 0.5) + 0.5) * window.innerHeight,
        visible: isVis,
        isVisible: isVis
      };
    });
  }

  /* ---------------- ANIMATION LOOP ---------------- */
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update Post-Processing time uniform
    if (this.postPass && this.postPass.uniforms) {
      this.postPass.uniforms.uTime.value = elapsedTime;
    }

    // 1. Smooth Camera Transition (Cubic Ease-Out)
    if (this.isTransitioning) {
      this.transitionProgress += delta / this.transitionDuration;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.isTransitioning = false;
        try {
          soundEngine?.playChime?.();
        } catch (e) {}
      }

      // Smooth easeInOutCubic curve
      const t = this.transitionProgress;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.transitionStartPos, this.targetCameraPos, ease);
      this.currentCameraLookAt.lerpVectors(this.transitionStartLookAt, this.targetCameraLookAt, ease);
      this.camera.lookAt(this.currentCameraLookAt);
    }

    // 2. Turntable Rotation Smooth Dampening & Idle Breathing Float (In Overview)
    if (this.currentWaypointIndex === 0) {
      // Gentle, majestic architectural micro-sway (+/- 2 deg) when idle
      const idleSway = Math.sin(elapsedTime * 0.22) * 0.038;
      this.turntableRotationY += (this.targetTurntableRotationY + idleSway - this.turntableRotationY) * 0.08;
      this.buildingGroup.rotation.y = this.turntableRotationY;
    } else {
      this.buildingGroup.rotation.y += (0 - this.buildingGroup.rotation.y) * 0.1;
    }

    // 3. Subtle Parallax Sway
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * 0.05;
    if (!this.isTransitioning && this.currentWaypointIndex === 0) {
      this.camera.position.x = this.waypoints[0].pos.x + this.mouse.x * 0.8;
      this.camera.position.y = this.waypoints[0].pos.y + this.mouse.y * 0.4;
      this.camera.lookAt(this.currentCameraLookAt);
    }

    // 4. Autonomous AI Patrol Drone Dynamics (Cinematic Sector Patrol)
    if (this.drone) {
      if (this.droneInRoom4) {
        // Hover in Room 4 Impact Observatory
        const targetX = 3.6 + Math.sin(elapsedTime * 1.2) * 0.35;
        const targetY = 8.6 + Math.sin(elapsedTime * 2.5) * 0.18;
        const targetZ = 3.2 + Math.cos(elapsedTime * 1.0) * 0.25;
        this.drone.position.x += (targetX - this.drone.position.x) * 0.06;
        this.drone.position.y += (targetY - this.drone.position.y) * 0.06;
        this.drone.position.z += (targetZ - this.drone.position.z) * 0.06;
        this.drone.rotation.z = Math.sin(elapsedTime * 1.2) * -0.10;
        if (this.droneSpotlight) {
          this.droneSpotlight.target.position.set(2.4, -2.5, 1.2);
        }
      } else {
        // Cinematic figure-8 patrol trajectory surveying all 4 sectors
        const pSpeed = elapsedTime * 0.40;
        const patrolX = Math.sin(pSpeed) * 7.5;
        const patrolY = 7.4 + Math.sin(pSpeed * 2.0) * 1.0 + Math.sin(elapsedTime * 2.5) * 0.15;
        const patrolZ = 6.2 + Math.cos(pSpeed) * 2.2;

        this.drone.position.x += (patrolX - this.drone.position.x) * 0.08;
        this.drone.position.y += (patrolY - this.drone.position.y) * 0.08;
        this.drone.position.z += (patrolZ - this.drone.position.z) * 0.08;

        // Realistic aerodynamic banking & forward pitch
        const velX = Math.cos(pSpeed) * 7.5 * 0.40;
        this.drone.rotation.z = -velX * 0.07;
        this.drone.rotation.x = 0.08 + Math.sin(elapsedTime * 1.5) * 0.03;
        this.drone.rotation.y = Math.PI + Math.atan2(velX, 2.5);

        if (this.droneSpotlight) {
          this.droneSpotlight.target.position.set(this.drone.position.x * 0.6, 1.5, this.drone.position.z - 3.5);
        }
      }

      // High-speed rotor spin
      this.droneRotors.forEach((rotor, i) => {
        rotor.rotation.y += (i % 2 === 0 ? 1 : -1) * 0.60;
      });
    }

    // 5. Realistic Server Blade LEDs Bursting Activity
    this.serverLeds.forEach((led, i) => {
      // Simulate packet burst compute patterns
      const burst = Math.sin(elapsedTime * 8.0 + i * 2.1) * Math.cos(elapsedTime * 3.2 + i);
      led.visible = burst > -0.1;
    });

    // 6. Hologram Rotations (Reception Room 1)
    if (this.receptionHolo) {
      this.receptionHolo.rotation.y = elapsedTime * 0.8;
      this.receptionHolo.position.y = 2.8 + Math.sin(elapsedTime * 2.0) * 0.12;
    }
    this.receptionRings.forEach((ring) => {
      ring.rotation.z = elapsedTime * 1.2;
    });

    // 6a. Reception Living Concierge & Visitor Micro-Animations
    if (this.receptionFigure) {
      this.receptionFigure.position.y = 0.58 + Math.sin(elapsedTime * 2.0) * 0.010;
      if (this.receptionFigure.headGroup) {
        this.receptionFigure.headGroup.rotation.y = Math.sin(elapsedTime * 0.8) * 0.12;
        this.receptionFigure.headGroup.rotation.x = Math.sin(elapsedTime * 1.3) * 0.03;
      }
      if (this.receptionFigure.armL && this.receptionFigure.armR) {
        this.receptionFigure.armL.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 5.5) * 0.05;
        this.receptionFigure.armR.rotation.x = Math.PI / 3 + Math.cos(elapsedTime * 5.5) * 0.05;
      }
    }

    if (this.receptionVisitor) {
      this.receptionVisitor.position.y = 0.0 + Math.sin(elapsedTime * 1.6) * 0.008;
      if (this.receptionVisitor.headGroup) {
        this.receptionVisitor.headGroup.rotation.y = -Math.PI * 0.38 + Math.sin(elapsedTime * 0.7) * 0.06;
      }
      if (this.receptionVisitor.armR) {
        this.receptionVisitor.armR.rotation.x = -0.25 + Math.sin(elapsedTime * 1.8) * 0.12;
      }
    }

    // 6b. About Me Strategy Sanctum: Living Characters & Holographic Transformation Matrix
    if (this.aboutFigureAhana) {
      this.aboutFigureAhana.position.y = 0.58 + Math.sin(elapsedTime * 1.8) * 0.012;
      if (this.aboutFigureAhana.headGroup) {
        this.aboutFigureAhana.headGroup.rotation.y = Math.sin(elapsedTime * 1.1) * 0.08;
        this.aboutFigureAhana.headGroup.rotation.x = Math.sin(elapsedTime * 1.5) * 0.02;
      }
      if (this.aboutFigureAhana.armL && this.aboutFigureAhana.armR) {
        this.aboutFigureAhana.armL.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 4.2) * 0.04;
        this.aboutFigureAhana.armR.rotation.x = Math.PI / 3 + Math.cos(elapsedTime * 3.8) * 0.05;
      }
    }

    if (this.aboutFigureClient) {
      this.aboutFigureClient.position.y = 0.58 + Math.sin(elapsedTime * 1.6 + 1.2) * 0.010;
      if (this.aboutFigureClient.headGroup) {
        this.aboutFigureClient.headGroup.rotation.x = Math.sin(elapsedTime * 1.2) * 0.04;
        this.aboutFigureClient.headGroup.rotation.y = -Math.PI * 0.55 + Math.sin(elapsedTime * 0.8) * 0.06;
      }
      if (this.aboutFigureClient.armR) {
        this.aboutFigureClient.armR.rotation.x = -0.22 + Math.sin(elapsedTime * 2.0) * 0.10;
      }
    }

    if (this.aboutHoloCore) {
      this.aboutHoloCore.rotation.y = elapsedTime * 0.7;
      this.aboutHoloCore.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2;
      const pulse = 1.0 + Math.sin(elapsedTime * 2.8) * 0.06;
      this.aboutHoloCore.scale.set(pulse, pulse, pulse);
    }

    this.aboutHoloRings.forEach((ring, i) => {
      if (i === 0) {
        ring.rotation.z = elapsedTime * 1.1;
        ring.rotation.x = Math.PI / 4 + Math.sin(elapsedTime * 0.6) * 0.2;
      } else {
        ring.rotation.y = -elapsedTime * 0.85;
        ring.rotation.z = Math.PI / 3 + Math.cos(elapsedTime * 0.5) * 0.2;
      }
    });

    this.aboutHoloBadges.forEach((badge, i) => {
      const angle = elapsedTime * 0.55 + i * ((Math.PI * 2) / 3);
      const radius = 1.22;
      badge.position.x = Math.cos(angle) * radius;
      badge.position.z = Math.sin(angle) * radius;
      badge.position.y = 2.45 + Math.sin(elapsedTime * 1.8 + i) * 0.08;
      badge.quaternion.copy(this.camera.quaternion);
    });

    // 6c. Room 3: Services AI Systems Command Lab Live Animation
    // Dynamic Screens Canvas Updates
    if (this.servicesScreenCanvasA && this.servicesScreenCanvasB) {
      this.updateServicesScreenA(elapsedTime);
      this.updateServicesScreenB(elapsedTime);
    }

    // AI Systems Architect Living Character
    if (this.servicesArchitect) {
      this.servicesArchitect.position.y = 0.0 + Math.sin(elapsedTime * 2.0) * 0.008;
      if (this.servicesArchitect.headGroup) {
        this.servicesArchitect.headGroup.rotation.y = -0.22 + Math.sin(elapsedTime * 1.1) * 0.12;
        this.servicesArchitect.headGroup.rotation.x = 0.04 + Math.sin(elapsedTime * 1.6) * 0.03;
      }
      if (this.servicesArchitect.armR) {
        this.servicesArchitect.armR.rotation.x = 0.95 + Math.sin(elapsedTime * 4.5) * 0.04;
      }
      if (this.servicesArchitect.armL) {
        this.servicesArchitect.armL.rotation.x = 0.85 + Math.cos(elapsedTime * 2.2) * 0.06;
        this.servicesArchitect.armL.rotation.z = -0.25 + Math.sin(elapsedTime * 1.8) * 0.03;
      }
    }

    // Central 3D Holographic AI Architecture Core
    if (this.servicesHoloCore) {
      this.servicesHoloCore.rotation.y = elapsedTime * 0.8;
      this.servicesHoloCore.position.y = 1.85 + Math.sin(elapsedTime * 2.2) * 0.08;
      const p = 1.0 + Math.sin(elapsedTime * 3.0) * 0.05;
      this.servicesHoloCore.scale.set(p, p, p);
    }

    this.servicesHoloRings.forEach((ring, i) => {
      if (i === 0) {
        ring.rotation.z = elapsedTime * 1.4;
        ring.rotation.x = Math.PI / 4 + Math.sin(elapsedTime * 0.7) * 0.15;
      } else if (i === 1) {
        ring.rotation.y = -elapsedTime * 1.1;
        ring.rotation.z = Math.PI / 3 + Math.cos(elapsedTime * 0.8) * 0.18;
      } else {
        ring.rotation.x = elapsedTime * 0.9;
        ring.rotation.y = Math.PI / 6 + Math.sin(elapsedTime * 0.6) * 0.2;
      }
    });

    if (this.servicesSatellites && this.servicesSatellites.length > 0) {
      this.servicesSatellites.forEach((sat, i) => {
        const a = elapsedTime * (0.8 + i * 0.35) + i * 1.57;
        const r = 0.72 + (i % 2) * 0.22;
        sat.position.set(
          Math.cos(a) * r,
          1.85 + Math.sin(a * 2.2) * 0.12,
          Math.sin(a) * r
        );
        sat.rotation.y += 0.03;
      });
    }

    // Flowing Conduit Photons (Server Rack -> Hologram Emitter)
    if (this.servicesConduitCurve && this.servicesConduitPhotons.length > 0) {
      this.servicesConduitPhotons.forEach((photon, i) => {
        const t = (elapsedTime * 0.35 + i * 0.333) % 1.0;
        const pt = this.servicesConduitCurve.getPointAt(t);
        if (pt) photon.position.copy(pt);
      });
    }

    // 6d. Room 4: Portfolio Projects Observatory Live Animation
    // Dynamic Portfolio Screens Canvas Updates
    if (this.portfolioScreenCanvasL && this.portfolioScreenCanvasR) {
      this.updatePortfolioScreenL(elapsedTime);
      this.updatePortfolioScreenR(elapsedTime);
    }

    // Data Analytics Lead Living Character
    if (this.portfolioAnalyst) {
      this.portfolioAnalyst.position.y = 0.58 + Math.sin(elapsedTime * 1.9) * 0.010;
      if (this.portfolioAnalyst.headGroup) {
        this.portfolioAnalyst.headGroup.rotation.y = Math.sin(elapsedTime * 0.9) * 0.10;
      }
      if (this.portfolioAnalyst.armL && this.portfolioAnalyst.armR) {
        this.portfolioAnalyst.armL.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 5.0) * 0.05;
        this.portfolioAnalyst.armR.rotation.x = Math.PI / 3 + Math.cos(elapsedTime * 4.6) * 0.05;
      }
    }

    // 7. Dynamic Portfolio Bar Chart Oscillations
    this.portfolioCharts.forEach((item) => {
      const scale = 1.0 + Math.sin(elapsedTime * item.speed) * 0.15;
      item.mesh.scale.y = scale;
      item.mesh.position.y = 0.35 + (item.baseHeight * scale) / 2;
    });


    // 8. Render using Effect Composer (with studio film grain & vignette pass)
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
