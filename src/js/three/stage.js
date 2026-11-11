// Scène 3D : un seul verre, éclairé comme une nature morte, qui change de forme et de couleur
// d'une création à l'autre. Derrière lui, le nom de la création, que le verre déforme par réfraction.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PROFILES, mixProfiles } from './glasses.js';

const INK = new THREE.Color('#14110f');
const IVORY = '#f3ede2';
const FONT = '"Bodoni Moda Variable", "Bodoni Moda", Didot, serif';
const SEGMENTS = 96;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export async function createStage(container, { drinks, mode = 'carte', reducedMotion = false }) {
  if (!supportsWebGL()) return null;

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
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1.2;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.15, 7);
  camera.lookAt(0, 0, 0);

  // Lumière de découpe : un liseré lumineux sur le bord du verre, comme en photo de produit.
  const rim = new THREE.DirectionalLight('#fff4e0', 2.2);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const key = new THREE.DirectionalLight('#ffffff', 0.6);
  key.position.set(2, 3, 4);
  scene.add(key);

  // ---------- Fond : nom de la création + halo de couleur, dessinés sur un canvas ----------
  const bgCanvas = document.createElement('canvas');
  const bg = bgCanvas.getContext('2d');
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: bgTexture, toneMapped: false }),
  );
  backdrop.position.z = -2.6;
  scene.add(backdrop);

  await document.fonts.load(`400 100px ${FONT}`).catch(() => {});

  // ---------- Le verre et le liquide ----------
  const toV2 = (p) => p.map(([x, y]) => new THREE.Vector2(x, y));
  const glassGeo = new THREE.LatheGeometry(toV2(PROFILES.coupe.glass), SEGMENTS);
  const liquidGeo = new THREE.LatheGeometry(toV2(PROFILES.coupe.liquid), SEGMENTS);
  liquidGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(liquidGeo.attributes.position.count * 3), 3));

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.35,
    ior: 1.45,
    specularIntensity: 1,
    envMapIntensity: 1.9,
  });
  const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const liquidMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0,
    envMapIntensity: 0.12,
    clippingPlanes: [fillPlane],
  });

  const glass = new THREE.Mesh(glassGeo, glassMat);
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  const group = new THREE.Group();
  group.add(liquid, glass);
  scene.add(group);

  // Profils de travail (modifiés en place pendant les transitions)
  const work = {
    glass: PROFILES.coupe.glass.map((p) => [...p]),
    liquid: PROFILES.coupe.liquid.map((p) => [...p]),
  };

  function applyProfiles() {
    const g = new THREE.LatheGeometry(toV2(work.glass), SEGMENTS);
    glassGeo.attributes.position.array.set(g.attributes.position.array);
    glassGeo.attributes.normal.array.set(g.attributes.normal.array);
    glassGeo.attributes.position.needsUpdate = glassGeo.attributes.normal.needsUpdate = true;
    glassGeo.computeBoundingSphere();
    g.dispose();
    const l = new THREE.LatheGeometry(toV2(work.liquid), SEGMENTS);
    liquidGeo.attributes.position.array.set(l.attributes.position.array);
    liquidGeo.attributes.normal.array.set(l.attributes.normal.array);
    liquidGeo.attributes.position.needsUpdate = liquidGeo.attributes.normal.needsUpdate = true;
    liquidGeo.computeBoundingSphere();
    l.dispose();
  }

  // Dégradé du liquide : couleur claire en surface, profonde au fond (les deux couleurs de chaque création)
  const cTop = new THREE.Color();
  const cBottom = new THREE.Color();
  const tmp = new THREE.Color();
  function paintLiquid() {
    const pos = liquidGeo.attributes.position;
    const col = liquidGeo.attributes.color;
    liquidGeo.computeBoundingBox();
    const { min, max } = liquidGeo.boundingBox;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getY(i) - min.y) / Math.max(0.001, max.y - min.y);
      tmp.copy(cBottom).lerp(cTop, Math.pow(u, 0.8));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }

  // ---------- État ----------
  const state = {
    index: 0,
    from: 0,
    to: 0,
    t: 1,
    duration: reducedMotion ? 0.001 : 1.15,
    pointer: { x: 0, y: 0, sx: 0, sy: 0 },
    fill: reducedMotion ? 1 : 0, // 0 → 1 : le verre se remplit à l'ouverture
    fillStarted: false,
    visible: true,
    layout: { x: 0, y: 0, scale: 1 },
  };

  const colorOf = (d, k) => new THREE.Color(d[k]);
  const scaleFor = (glassName) => {
    const h = PROFILES[glassName].height;
    return THREE.MathUtils.lerp(1, 1.55 / h, 0.65);
  };

  // ---------- Dessin du fond ----------
  function drawName(name, color, alpha, cx, cy) {
    if (alpha <= 0.001) return;
    const W = bgCanvas.width;
    const H = bgCanvas.height;
    // Halo de couleur derrière le verre
    const R = Math.max(W, H) * 0.42;
    const glow = bg.createRadialGradient(cx, cy, 0, cx, cy, R);
    const c = color.clone().convertLinearToSRGB();
    glow.addColorStop(0, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${0.38 * alpha})`);
    glow.addColorStop(1, 'rgba(20,17,15,0)');
    bg.fillStyle = glow;
    bg.fillRect(0, 0, W, H);
    // Le nom, très grand, centré derrière le verre (page carte uniquement : sur l'accueil, la phrase prime)
    if (mode !== 'carte') return;
    let size = H * (mode === 'carte' ? 0.3 : 0.24);
    bg.font = `400 ${size}px ${FONT}`;
    const maxW = W * 0.92;
    const w = bg.measureText(name).width;
    if (w > maxW) {
      size *= maxW / w;
      bg.font = `400 ${size}px ${FONT}`;
    }
    bg.globalAlpha = alpha * 0.95;
    bg.fillStyle = IVORY;
    bg.textAlign = 'center';
    bg.textBaseline = 'middle';
    bg.fillText(name, W / 2, cy + size * 0.05);
    bg.globalAlpha = 1;
  }

  function drawBackdrop(k) {
    const W = bgCanvas.width;
    const H = bgCanvas.height;
    bg.fillStyle = '#14110f';
    bg.fillRect(0, 0, W, H);
    // Position du verre à l'écran, reportée sur le fond
    const near = visibleAt(camera.position.z);
    const cx = (0.5 + state.layout.x / near.w) * W;
    const cy = (0.5 - state.layout.y / near.h) * H;
    const a = drinks[state.from];
    const b = drinks[state.to];
    if (state.from === state.to) drawName(b.name, colorOf(b, 'c1'), 1, cx, cy);
    else {
      drawName(a.name, colorOf(a, 'c1'), 1 - k, cx, cy);
      drawName(b.name, colorOf(b, 'c1'), k, cx, cy);
    }
    bgTexture.needsUpdate = true;
  }

  function visibleAt(dist) {
    const h = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return { h, w: h * camera.aspect };
  }

  // ---------- Mise en page selon l'écran ----------
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const near = visibleAt(camera.position.z);
    const portrait = w / h < 0.9;
    if (mode === 'home') {
      state.layout = portrait ? { x: 0, y: near.h * 0.2, scale: 0.68 } : { x: near.w * 0.2, y: 0, scale: 1.25 };
    } else {
      state.layout = portrait ? { x: 0, y: near.h * 0.09, scale: 0.64 } : { x: 0, y: -near.h * 0.02, scale: 1.2 };
    }
    group.position.x = state.layout.x;
    const far = visibleAt(camera.position.z - backdrop.position.z);
    backdrop.scale.set(far.w * 1.08, far.h * 1.08, 1);
    const dpr = renderer.getPixelRatio();
    bgCanvas.width = Math.min(2048, Math.round(w * Math.min(dpr, 1.5)));
    bgCanvas.height = Math.round((bgCanvas.width * h) / w);
    drawBackdrop(state.t >= 1 ? 1 : easeInOut(state.t));
  }

  // ---------- Transition vers une autre création ----------
  function goTo(i) {
    i = (i + drinks.length) % drinks.length;
    if (i === state.to && state.t < 1) return;
    if (i === state.index && state.t >= 1) return;
    state.from = state.index;
    state.to = i;
    state.t = 0;
    snapshot.glass = work.glass.map((p) => [...p]);
    snapshot.liquid = work.liquid.map((p) => [...p]);
    snapshot.scale = group.scale.x;
    snapshot.top = cTop.clone();
    snapshot.bottom = cBottom.clone();
    state.index = i;
  }
  const snapshot = {};

  function setInstant(i) {
    const d = drinks[i];
    const p = PROFILES[d.glass] || PROFILES.coupe;
    work.glass = p.glass.map((q) => [...q]);
    work.liquid = p.liquid.map((q) => [...q]);
    cTop.set(d.c1);
    cBottom.set(d.c2);
    applyProfiles();
    paintLiquid();
    group.scale.setScalar(scaleFor(d.glass) * state.layout.scale);
    state.index = state.from = state.to = i;
    state.t = 1;
  }

  // ---------- Pointeur : le verre s'incline légèrement, la réfraction du nom bouge ----------
  if (!reducedMotion && !isTouch) {
    window.addEventListener('pointermove', (e) => {
      state.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      state.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  // ---------- Boucle de rendu ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  function frame() {
    const realDt = Math.min(clock.getDelta(), 0.25); // les transitions suivent l'horloge, même sur un appareil lent
    const dt = Math.min(realDt, 0.05);
    elapsed += dt;

    if (state.t < 1) {
      state.t = Math.min(1, state.t + realDt / state.duration);
      const k = easeInOut(state.t);
      const d = drinks[state.to];
      const target = PROFILES[d.glass] || PROFILES.coupe;
      mixProfiles(snapshot.glass, target.glass, k, work.glass);
      // Le liquide baisse puis remonte pendant le changement de verre
      mixProfiles(snapshot.liquid, target.liquid, k, work.liquid);
      applyProfiles();
      cTop.copy(snapshot.top).lerp(new THREE.Color(d.c1), k);
      cBottom.copy(snapshot.bottom).lerp(new THREE.Color(d.c2), k);
      paintLiquid();
      group.scale.setScalar(THREE.MathUtils.lerp(snapshot.scale, scaleFor(d.glass) * state.layout.scale, k));
      drawBackdrop(k);
      if (state.t >= 1) {
        state.from = state.to;
        drawBackdrop(1);
      }
    }

    // Remplissage à l'ouverture
    if (state.fillStarted && state.fill < 1) state.fill = Math.min(1, state.fill + realDt / 1.8);
    liquid.geometry.computeBoundingBox();
    const bb = liquid.geometry.boundingBox;
    const fillY = THREE.MathUtils.lerp(bb.min.y - 0.01, bb.max.y + 0.01, easeOut(state.fill));
    fillPlane.constant = state.fill >= 1 ? 100 : fillY * group.scale.y + group.position.y;

    // Flottement et inclinaison
    const p = state.pointer;
    p.sx += (p.x - p.sx) * 0.05;
    p.sy += (p.y - p.sy) * 0.05;
    const float = reducedMotion ? 0 : Math.sin(elapsed * 0.7) * 0.035;
    group.position.y = state.layout.y + float;
    group.rotation.z = -p.sx * 0.06;
    group.rotation.x = p.sy * 0.05;
    camera.position.x = p.sx * 0.12;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // Pause quand la scène n'est pas visible (économie de batterie)
  const loop = () => renderer.setAnimationLoop(state.visible && !document.hidden ? frame : null);
  new IntersectionObserver(([e]) => {
    state.visible = e.isIntersecting;
    loop();
  }).observe(container);
  document.addEventListener('visibilitychange', loop);

  window.addEventListener('resize', () => {
    resize();
    if (state.t >= 1) group.scale.setScalar(scaleFor(drinks[state.index].glass) * state.layout.scale);
  });

  resize();
  setInstant(0);
  drawBackdrop(1);
  loop();
  container.classList.add('is-ready');

  return {
    goTo,
    get index() {
      return state.index;
    },
    fillIn() {
      state.fillStarted = true;
    },
  };
}
