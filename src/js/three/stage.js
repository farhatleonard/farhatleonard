// Scène 3D : les créations sont posées en cercle sur un plateau de service laqué.
// Le plateau tourne pour amener chaque création face à la caméra ; le liquide bouge dans les verres
// sous l'effet du mouvement, les boissons pétillantes ont des bulles, chaque verre porte sa garniture.
// Derrière, le nom de la création, que le verre au premier plan déforme par réfraction.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { PROFILES } from './glasses.js';
import { createGarnish } from './garnish.js';

const INK = new THREE.Color('#14110f');
const IVORY = '#f3ede2';
const FONT = '"Boska", Didot, serif';
const SEGMENTS = 72;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const mod = (a, n) => ((a % n) + n) % n;

function supportsWebGL() {
  try {
    return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

// Studio photo virtuel, utilisé uniquement pour les reflets : fond noir, deux longues boîtes à lumière
// verticales, une lumière douce au-dessus, un liseré chaud à l'arrière. C'est ce qui dessine
// les longs reflets nets sur le verre, comme dans une photo de produit.
function studioEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#050404');
  const box = (w, h, color, intensity, pos, rotY = 0, rotX = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(rotX, rotY, 0);
    studio.add(m);
  };
  box(0.7, 7, '#ffffff', 4.6, [-4.2, 1, 2.5], Math.PI / 2.6); // boîte verticale gauche
  box(0.45, 7, '#ffffff', 3, [4.4, 1, 1.8], -Math.PI / 2.4); // boîte verticale droite
  box(6, 3, '#fff6ea', 1.3, [0, 6, 0], 0, Math.PI / 2); // lumière douce au-dessus
  box(5, 1.2, '#ffcf96', 2.4, [0, 1.6, -6]); // liseré chaud à l'arrière
  box(9, 0.3, '#ffffff', 0.6, [0, -0.5, 5]); // reflet bas, très discret
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(studio, 0.015).texture;
  pmrem.dispose();
  return tex;
}

// Quand la lueur est active, l'image passe par la courbe ACES de Three.js, qui assombrit les noirs.
// On calcule ici la couleur de fond à dessiner pour retrouver exactement le noir de la page (#14110f).
const aces = (rgb, exposure) => {
  const m1 = [[0.59719, 0.35458, 0.04823], [0.076, 0.90834, 0.01566], [0.0284, 0.13383, 0.83777]];
  const m2 = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
  const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  return mul(m2, mul(m1, rgb.map((c) => (c * exposure) / 0.6)).map(fit)).map((c) => Math.min(1, Math.max(0, c)));
};
function compensatedHex(hex, exposure) {
  const target = new THREE.Color(hex); // linéaire
  const goal = [target.r, target.g, target.b];
  let x = [...goal];
  for (let i = 0; i < 60; i++) {
    const y = aces(x, exposure);
    x = x.map((v, k) => Math.max(0, v + (goal[k] - y[k]) * 0.8));
  }
  return '#' + new THREE.Color(x[0], x[1], x[2]).getHexString();
}

// Ombrage « en volume » : selon l'angle de vue, le centre d'un objet (vu de face) et ses bords
// (vus en rasant) ne reçoivent pas la même lumière. C'est ce qui donne de l'épaisseur au liquide
// et de la transparence à la glace, sans passer par une vraie réfraction (trop coûteuse ici).
function volumeShading(material, { centerGlow, edgeGlow, centerTint, edgeTint, edgeWhite = 0 }) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float fres = pow(1.0 - clamp(abs(dot(normalize(-vViewPosition), normal)), 0.0, 1.0), 1.6);
      diffuseColor.rgb *= mix(${centerTint.toFixed(2)}, ${edgeTint.toFixed(2)}, fres);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), fres * ${edgeWhite.toFixed(2)});
      totalEmissiveRadiance *= mix(${centerGlow.toFixed(2)}, ${edgeGlow.toFixed(2)}, fres);`,
    );
  };
  material.customProgramCacheKey = () => `volume-${centerGlow}-${edgeGlow}-${centerTint}-${edgeTint}-${edgeWhite}`;
  return material;
}

// Ombre douce sous chaque verre
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.75)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function createStage(container, { drinks, mode = 'carte', reducedMotion = false, onActive, onFirstFrame }) {
  if (!supportsWebGL() || !drinks.length) return null;

  const n = drinks.length;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.domElement.className = 'stage__canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = INK;
  scene.fog = new THREE.Fog(INK, 7, 14);
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const rim = new THREE.DirectionalLight('#fff4e0', 2.4);
  rim.position.set(-4, 4, -3);
  const key = new THREE.DirectionalLight('#ffffff', 0.7);
  key.position.set(3, 5, 6);
  scene.add(rim, key);

  // ---------- Le plateau ----------
  const R = Math.max(2.1, Math.min(3.4, n * 0.32)); // rayon du cercle de verres
  const RT = R + 0.85; // rayon du plateau
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(RT, RT * 0.985, 0.06, 160),
    new THREE.MeshLambertMaterial({ color: '#1c1814' }), // laque mate : pas de reflet gris sous la lumière de découpe
  );
  tray.position.y = -0.03;
  const trayRim = new THREE.Mesh(
    new THREE.TorusGeometry(RT, 0.02, 12, 240),
    new THREE.MeshStandardMaterial({ color: '#c2a06b', metalness: 1, roughness: 0.28 }), // le seul or de la scène
  );
  trayRim.rotation.x = Math.PI / 2;
  const ring = new THREE.Group();
  ring.add(tray, trayRim);
  scene.add(ring);

  // ---------- Fond : nom de la création + halo de couleur ----------
  const bgCanvas = document.createElement('canvas');
  const bg = bgCanvas.getContext('2d');
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: bgTexture, toneMapped: false, fog: false, depthWrite: false }),
  );
  backdrop.renderOrder = -1;
  scene.add(backdrop);
  await document.fonts.load(`300 100px ${FONT}`).catch(() => {});

  // ---------- Les verres ----------
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0,
    transmission: 1,
    thickness: 0.35,
    ior: 1.5,
    dispersion: 0.35, // franges colorées du cristal sur les arêtes
    attenuationColor: '#efe4cf', // très légère teinte dans l'épaisseur du verre
    attenuationDistance: 3.5,
    specularIntensity: 1,
    envMapIntensity: 1.9,
  });
  // Verre simplifié pour les créations éloignées : reflets seulement, pas de réfraction (beaucoup plus léger)
  const glassLiteMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.05,
    transparent: true,
    opacity: 0.22,
    envMapIntensity: 1.6,
    depthWrite: false,
  });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.7 });
  const bubbleGeo = new THREE.SphereGeometry(0.011, 6, 5);
  const iceGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.16);
  const dropGeo = new THREE.SphereGeometry(0.0058, 6, 4);
  // Gouttelettes : de minuscules points de lumière, presque transparents
  const dropMat = new THREE.MeshStandardMaterial({
    color: '#fbf6ec', roughness: 0, metalness: 0, envMapIntensity: 2.4,
    emissive: '#3b342b', transparent: true, opacity: 0.32, depthWrite: false,
  });
  const toV2 = (p) => p.map(([x, y]) => new THREE.Vector2(x, y));
  const geoCache = {};

  const step = (Math.PI * 2) / n;
  const items = drinks.map((d, i) => {
    const p = PROFILES[d.glass] || PROFILES.coupe;
    if (!geoCache[d.glass]) {
      geoCache[d.glass] = {
        glass: new THREE.LatheGeometry(toV2(p.glass), SEGMENTS),
        cavity: new THREE.LatheGeometry(toV2(p.cavity), SEGMENTS),
      };
    }
    const g = new THREE.Group();
    const phi = i * step;
    g.position.set(Math.sin(phi) * R, 0.002, Math.cos(phi) * R);
    g.rotation.y = phi + 0.6; // garniture visible de trois quarts

    // Le liquide : l'intérieur du verre, coupé par un plan (le niveau), dégradé de couleur clair → profond
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const cavity = geoCache[d.glass].cavity.clone();
    const colors = new Float32Array(cavity.attributes.position.count * 3);
    const top = new THREE.Color(d.c1);
    const deep = new THREE.Color(d.c2);
    const c = new THREE.Color();
    for (let k = 0; k < cavity.attributes.position.count; k++) {
      const u = THREE.MathUtils.clamp((cavity.attributes.position.getY(k) - p.bottomY) / (p.fillY - p.bottomY), 0, 1);
      c.copy(deep).lerp(top, Math.pow(u, 0.8));
      colors.set([c.r, c.g, c.b], k * 3);
    }
    cavity.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const liquidMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0,
      envMapIntensity: 0.35,
      emissive: top.clone().multiplyScalar(0.18), // lumière qui traverse le liquide

      side: THREE.DoubleSide, // la face intérieure, vue à travers la coupe, forme la surface du liquide
      clippingPlanes: [plane],
    });
    // Le centre du liquide s'illumine (lumière qui le traverse), les bords s'assombrissent (épaisseur)
    volumeShading(liquidMat, { centerGlow: 2.4, edgeGlow: 0.25, centerTint: 1.12, edgeTint: 0.55 });
    const liquid = new THREE.Mesh(cavity, liquidMat);
    const glass = new THREE.Mesh(geoCache[d.glass].glass, glassMat);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    shadow.scale.setScalar(p.footR * 3.2);
    g.add(shadow, liquid, glass);

    const garnish = createGarnish(d.garnish, p);
    if (garnish) g.add(garnish);

    // Glaçons dans les verres bas et hauts : teintés par la boisson, ils flottent au niveau du liquide
    let ice = null;
    if (d.glass === 'tumbler' || d.glass === 'highball') {
      ice = new THREE.Group();
      const iceMat = new THREE.MeshPhysicalMaterial({
        color: top.clone().lerp(new THREE.Color('#ffffff'), 0.14), // la glace prend la couleur de la boisson
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.4,
        emissive: top.clone().multiplyScalar(0.12),
      });
      volumeShading(iceMat, { centerGlow: 1.8, edgeGlow: 0.5, centerTint: 0.8, edgeTint: 1.0, edgeWhite: 0.45 });
      const r = p.radiusAt(p.fillY);
      const size = d.glass === 'tumbler' ? r * 0.56 : r * 0.72;
      const spots = d.glass === 'tumbler'
        ? [[-0.38, 0, 0.12], [0.34, -0.12, -0.2], [0.02, -0.55, 0.3]]
        : [[0.05, 0, 0.04], [-0.06, -1.05, -0.03], [0.04, -2.1, 0.05]];
      spots.forEach(([x, dy, z], k) => {
        const m = new THREE.Mesh(iceGeo, iceMat);
        m.scale.setScalar(size * (0.92 + k * 0.05));
        m.position.set(x * r, dy * size, z * r);
        m.rotation.set(0.3 + k * 0.7, k * 1.1, 0.2 - k * 0.4);
        ice.add(m);
      });
      ice.userData.offset = -size * 0.46; // le glaçon du dessus affleure à peine la surface
      g.add(ice);
    }

    // Buée : fines gouttelettes de condensation sur la paroi extérieure, là où le verre est froid (sous le liquide)
    {
      const count = d.glass === 'tumbler' || d.glass === 'highball' ? 140 : 80;
      const drops = new THREE.InstancedMesh(dropGeo, dropMat, count);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      for (let k = 0; k < count; k++) {
        // plus dense en bas, plus clairsemé vers le niveau du liquide
        const t = Math.pow(Math.random(), 1.6);
        const y = THREE.MathUtils.lerp(p.bottomY + 0.02, p.fillY - 0.02, 1 - t * 0.98);
        const a = Math.random() * Math.PI * 2;
        const r = p.radiusAt(y) + 0.027;
        const sc = 0.45 + Math.pow(Math.random(), 2) * 1.2; // surtout des petites, quelques plus grosses
        e.set(0, -a, 0);
        q.setFromEuler(e);
        m4.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), q, new THREE.Vector3(sc * 0.5, sc, sc));
        drops.setMatrixAt(k, m4);
      }
      g.add(drops);
    }

    // Bulles, collées à la paroi, qui montent
    let bubbles = null;
    if (d.sparkling) {
      const count = 42;
      bubbles = new THREE.InstancedMesh(
        bubbleGeo,
        new THREE.MeshStandardMaterial({ color: '#fff7df', roughness: 0.2, emissive: '#3a3020', clippingPlanes: [plane] }),
        count,
      );
      bubbles.userData.data = Array.from({ length: count }, () => ({
        y: THREE.MathUtils.lerp(p.bottomY + 0.03, p.fillY, Math.random()),
        a: Math.random() * Math.PI * 2,
        v: 0.05 + Math.random() * 0.09,
        s: 0.6 + Math.random() * 0.8,
      }));
      g.add(bubbles);
    }
    ring.add(g);
    return { d, p, g, glass, plane, liquid, garnish, bubbles, ice, phi };
  });

  // ---------- État ----------
  const state = {
    angle: 0, // position du plateau, en « nombre de créations »
    vel: 0,
    target: 0,
    slosh: 0,
    sloshVel: 0,
    fill: reducedMotion ? 1 : 0,
    fillStarted: false,
    active: 0,
    nameFrom: 0,
    nameTo: 0,
    nameT: 1,
    pointer: { x: 0, y: 0, sx: 0, sy: 0 },
    visible: true,
    base: { cam: new THREE.Vector3(), look: new THREE.Vector3() },
  };

  // ---------- Dessin du fond ----------
  const frontPoint = new THREE.Vector3();
  function drawName(i, alpha, cx, cy) {
    if (alpha <= 0.001) return;
    const W = bgCanvas.width;
    const H = bgCanvas.height;
    const col = new THREE.Color(drinks[i].c1).convertLinearToSRGB();
    const Rg = Math.max(W, H) * 0.45;
    const glow = bg.createRadialGradient(cx, cy, 0, cx, cy, Rg);
    glow.addColorStop(0, `rgba(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0},${0.36 * alpha})`);
    glow.addColorStop(1, 'rgba(20,17,15,0)');
    bg.fillStyle = glow;
    bg.fillRect(0, 0, W, H);
    if (mode !== 'carte') return; // sur l'accueil, la phrase prime : pas de nom en fond
    let size = H * 0.3;
    bg.font = `300 ${size}px ${FONT}`;
    const w = bg.measureText(drinks[i].name).width;
    if (w > W * 0.92) {
      size *= (W * 0.92) / w;
      bg.font = `300 ${size}px ${FONT}`;
    }
    bg.globalAlpha = alpha * 0.95;
    bg.fillStyle = IVORY;
    bg.textAlign = 'center';
    bg.textBaseline = 'middle';
    bg.fillText(drinks[i].name, W / 2, cy - H * 0.04);
    bg.globalAlpha = 1;
  }
  function drawBackdrop() {
    const W = bgCanvas.width;
    const H = bgCanvas.height;
    bg.fillStyle = composer ? inkForComposer : '#14110f';
    bg.fillRect(0, 0, W, H);
    // position à l'écran du verre au premier plan
    frontPoint.set(0, 1.05, R).project(baseCamera); // le nom flotte au niveau du haut des verres
    const cx = ((frontPoint.x + 1) / 2) * W;
    const cy = ((1 - frontPoint.y) / 2) * H;
    const k = easeOut(state.nameT);
    if (state.nameFrom !== state.nameTo) drawName(state.nameFrom, 1 - k, cx, cy);
    drawName(state.nameTo, state.nameFrom === state.nameTo ? 1 : k, cx, cy);
    bgTexture.needsUpdate = true;
  }

  // ---------- Lueur sur les reflets les plus forts (ordinateur seulement) ----------
  // Seuil élevé : seuls les reflets du studio et le filet d'or rayonnent, comme sur une photo de produit.
  let composer = null;
  let bloom = null;
  let bokeh = null;
  if (!isTouch && !reducedMotion) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    // Profondeur de champ : net sur le verre au premier plan, léger flou sur ceux de l'arrière-plan
    bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.0016, maxblur: 0.0055 });
    composer.addPass(bokeh);
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass()); // tonalité et conversion des couleurs, une seule fois, à la fin
  }
  const inkForComposer = compensatedHex('#14110f', renderer.toneMappingExposure);

  // ---------- Cadrage selon l'écran ----------
  const baseCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
    }
    const portrait = w / h < 0.9;
    for (const cam of [camera, baseCamera]) {
      cam.aspect = w / h;
      cam.fov = portrait ? 38 : 30;
      if (mode === 'home' && !portrait) cam.setViewOffset(w, h, -w * 0.31, -h * 0.03, w, h);
      else if (mode === 'home') cam.setViewOffset(w, h, 0, h * 0.2, w, h);
      else if (portrait) cam.setViewOffset(w, h, 0, h * 0.04, w, h);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
    const dist = mode === 'home' ? (portrait ? 8.4 : 7.2) : portrait ? 6.6 : 5.6;
    state.base.cam.set(0, mode === 'home' ? 2.1 : portrait ? 1.55 : 1.3, R + dist);
    state.base.look.set(0, 0.8, R - 0.3);
    baseCamera.position.copy(state.base.cam);
    baseCamera.lookAt(state.base.look);
    baseCamera.updateMatrixWorld();
    if (bokeh) bokeh.uniforms.focus.value = state.base.cam.distanceTo(new THREE.Vector3(0, 0.7, R));

    // Le fond couvre exactement le champ de la caméra, loin derrière le plateau
    const D = dist + R + 4.5;
    const dir = new THREE.Vector3().subVectors(state.base.look, state.base.cam).normalize();
    backdrop.position.copy(state.base.cam).addScaledVector(dir, D);
    backdrop.quaternion.copy(baseCamera.quaternion);
    const hh = 2 * D * Math.tan(THREE.MathUtils.degToRad(baseCamera.fov / 2));
    backdrop.scale.set(hh * baseCamera.aspect * 1.15, hh * 1.15, 1);
    const cw = Math.min(2048, Math.round(w * Math.min(renderer.getPixelRatio(), 1.5)));
    const ch = Math.round((cw * h) / w);
    if (cw !== bgCanvas.width || ch !== bgCanvas.height) {
      bgCanvas.width = cw;
      bgCanvas.height = ch;
      bgTexture.dispose(); // la texture est recréée à la bonne taille
    }
    drawBackdrop();
  }

  // ---------- Pointeur : la caméra glisse légèrement, la réfraction bouge ----------
  if (!reducedMotion && !isTouch) {
    window.addEventListener('pointermove', (e) => {
      state.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      state.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  // ---------- Boucle ----------
  const clock = new THREE.Clock();
  const up = new THREE.Vector3(0, 1, 0);
  const tmpN = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const tmpT = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  let elapsed = 0;

  // Qualité adaptative : si l'appareil peine, on baisse la résolution
  const perf = { frames: 0, time: 0, checks: 0 };
  function adapt(rawDt) {
    if (perf.checks > 3) return;
    perf.frames++;
    perf.time += rawDt;
    if (perf.frames < 45) return;
    const avg = perf.time / perf.frames;
    perf.frames = perf.time = 0;
    perf.checks++;
    const pr = renderer.getPixelRatio();
    if (avg > 1 / 40 && composer) {
      composer = null; // d'abord, on renonce à la lueur
      drawBackdrop();
      return;
    }
    if (avg > 1 / 40 && pr > 0.75) {
      renderer.setPixelRatio(Math.max(0.75, pr * 0.75));
      resize();
    }
  }

  function frame() {
    const rawDt = clock.getDelta();
    adapt(rawDt);
    const realDt = Math.min(rawDt, 0.1);
    const dt = Math.min(realDt, 1 / 30);
    elapsed += realDt;

    // Rotation du plateau : ressort amorti vers la cible
    const prevVel = state.vel;
    if (reducedMotion) {
      state.angle = state.target;
      state.vel = 0;
    } else {
      state.vel += ((state.target - state.angle) * 38 - state.vel * 11.5) * dt;
      state.angle += state.vel * dt;
    }
    ring.rotation.y = -state.angle * step;

    // Le liquide réagit à l'accélération (il « prend du retard » puis se balance)
    if (!reducedMotion) {
      const acc = (state.vel - prevVel) / Math.max(dt, 1e-3);
      const drive = THREE.MathUtils.clamp(-acc * step * R * 0.018, -0.16, 0.16);
      state.sloshVel += ((drive - state.slosh) * 70 - state.sloshVel * 3.2) * dt;
      state.slosh += state.sloshVel * dt;
    }

    // Création au premier plan
    const active = mod(Math.round(state.angle), n);
    if (active !== state.active) {
      state.active = active;
      state.nameFrom = state.nameT >= 1 ? state.nameTo : state.nameFrom;
      state.nameTo = active;
      state.nameT = reducedMotion ? 1 : 0;
      onActive?.(active);
    }
    if (state.nameT < 1) {
      state.nameT = Math.min(1, state.nameT + realDt / 0.6);
      if (state.nameT >= 1) state.nameFrom = state.nameTo;
      drawBackdrop();
    }

    // Remplissage à l'ouverture
    if (state.fillStarted && state.fill < 1) state.fill = Math.min(1, state.fill + realDt / 1.8);
    const fillK = easeOut(state.fill);

    for (const it of items) {
      const { p, g, plane } = it;
      // tangente au cercle, dans le sens de rotation du plateau
      const psi = it.phi - state.angle * step;
      const facing = Math.cos(psi); // 1 = face à la caméra, -1 = derrière
      g.visible = facing > -0.55; // les verres cachés à l'arrière ne sont pas dessinés
      if (!g.visible) continue;
      it.glass.material = facing > 0.9 ? glassMat : glassLiteMat; // réfraction réelle : verre au premier plan seulement
      g.getWorldPosition(tmpP);
      tmpT.set(-Math.cos(psi), 0, Math.sin(psi));
      const wobble = reducedMotion ? 0 : Math.sin(elapsed * 1.7 + it.phi * 3) * 0.012;
      tmpN.copy(up).addScaledVector(tmpT, state.slosh + wobble).normalize();
      const level = THREE.MathUtils.lerp(p.bottomY - 0.02, p.fillY, fillK);
      tmpP.y += level;
      plane.setFromNormalAndCoplanarPoint(tmpN.negate(), tmpP);

      if (it.ice) {
        it.ice.visible = fillK > 0.85;
        it.ice.position.y = level + it.ice.userData.offset;
        it.ice.rotation.z = -(state.slosh + wobble) * 0.6; // les glaçons suivent le mouvement du liquide
      }
      if (it.garnish?.userData.floats) {
        it.garnish.visible = fillK > 0.9;
        it.garnish.position.y = level + 0.004;
      }
      if (it.bubbles) {
        const data = it.bubbles.userData.data;
        for (let k = 0; k < data.length; k++) {
          const b = data[k];
          if (!reducedMotion) {
            b.y += b.v * realDt;
            if (b.y > level - 0.01) b.y = p.bottomY + 0.03;
          }
          const r = p.radiusAt(b.y) - 0.004;
          dummy.position.set(Math.cos(b.a) * r, b.y, Math.sin(b.a) * r);
          dummy.scale.setScalar(b.s * (0.6 + 0.4 * (b.y / p.fillY)));
          dummy.updateMatrix();
          it.bubbles.setMatrixAt(k, dummy.matrix);
        }
        it.bubbles.instanceMatrix.needsUpdate = true;
      }
    }

    // Caméra : léger glissement avec le pointeur
    const pt = state.pointer;
    pt.sx += (pt.x - pt.sx) * 0.05;
    pt.sy += (pt.y - pt.sy) * 0.05;
    camera.position.copy(state.base.cam).add(tmpP.set(pt.sx * 0.45, -pt.sy * 0.22, 0));
    camera.lookAt(state.base.look);

    if (composer) composer.render(realDt);
    else renderer.render(scene, camera);
    if (onFirstFrame) {
      const cb = onFirstFrame;
      onFirstFrame = null;
      requestAnimationFrame(cb);
    }
  }

  const loop = () => renderer.setAnimationLoop(state.visible && !document.hidden ? frame : null);
  new IntersectionObserver(([e]) => {
    state.visible = e.isIntersecting;
    loop();
  }).observe(container);
  document.addEventListener('visibilitychange', loop);
  window.addEventListener('resize', resize);

  resize();
  loop();
  container.classList.add('is-ready');

  return {
    // Amène la création i face à la caméra (i peut dépasser n : le plateau continue de tourner)
    goTo(i) {
      state.target = i;
    },
    // Position continue, utilisée par le défilement de la page carte
    setTarget(f) {
      state.target = f;
    },
    get target() {
      return state.target;
    },
    fillIn() {
      state.fillStarted = true;
    },
  };
}
