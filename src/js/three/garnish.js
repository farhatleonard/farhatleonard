// Garnitures en 3D, reconnues à partir du texte saisi dans le champ « Garniture ».
// Volontairement simples et stylisées : elles indiquent la garniture sans chercher le photoréalisme.
import * as THREE from 'three';

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, ...extra });

function pickColor(text, table, fallback) {
  for (const [re, c] of table) if (re.test(text)) return c;
  return fallback;
}

// Zeste d'agrume en spirale, accroché au bord du verre
function zest(text, p) {
  const color = pickColor(text, [[/citron vert/i, '#7da13a'], [/citron/i, '#e8c547'], [/pamplemousse/i, '#e9806a']], '#e07b2a');
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = t * Math.PI * 3.2;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.06, -t * 0.42, Math.sin(a) * 0.06));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.014, 6, false);
  geo.scale(1, 1, 2.2); // ruban aplati
  const m = new THREE.Mesh(geo, mat(color, { roughness: 0.45 }));
  m.position.set(p.rimR + 0.02, p.rimY + 0.04, 0);
  return m;
}

// Feuille posée sur le bord
function leaf(text, p) {
  const color = pickColor(text, [[/shiso|rouge/i, '#6e1a2c'], [/figuier|séch/i, '#6f6438'], [/menthe|basilic/i, '#3f7a3a']], '#4f6b35');
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.09, 0.06, 0.1, 0.2, 0, 0.3);
  s.bezierCurveTo(-0.1, 0.2, -0.09, 0.06, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 12);
  // légère courbure de la feuille
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.pow(pos.getX(i) * 6, 2) * 0.012);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(p.rimR * 0.85, p.rimY + 0.01, 0);
  m.rotation.set(-1.15, 0.35, -0.5);
  m.scale.setScalar(1.15);
  return m;
}

// Fleur qui flotte à la surface du liquide
function flower(text, p) {
  const color = pickColor(
    text,
    [[/tagète|orange/i, '#e8892b'], [/immortelle/i, '#e3b93c'], [/jasmin|blanche/i, '#f3eee3'], [/violette|lavande/i, '#8a6cb8'], [/rose/i, '#d98a9b']],
    '#f3eee3',
  );
  const g = new THREE.Group();
  const petal = new THREE.SphereGeometry(0.05, 12, 8);
  petal.scale(1, 0.25, 0.55);
  petal.translate(0.05, 0, 0);
  const pm = mat(color, { roughness: 0.7 });
  const n = /immortelle/i.test(text) ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(petal, pm);
    m.rotation.y = (i / n) * Math.PI * 2;
    m.rotation.z = 0.25;
    g.add(m);
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), mat(/jasmin|blanche/i.test(text) ? '#e8cf6a' : '#a2541c'));
  heart.position.y = 0.012;
  g.add(heart);
  g.userData.floats = true; // suit le niveau du liquide
  g.scale.setScalar(Math.min(1, p.radiusAt(p.fillY) * 2.4));
  return g;
}

// Brin (thym, romarin) qui sort du verre
function sprig(text, p) {
  const g = new THREE.Group();
  const stemMat = mat('#5b5a35');
  const leafMat = mat(/romarin/i.test(text) ? '#4b6b4a' : '#6b7d4a');
  const len = p.rimY - p.bottomY + 0.35;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, len, 5), stemMat);
  stem.position.y = len / 2;
  g.add(stem);
  const leafGeo = new THREE.SphereGeometry(0.018, 6, 4);
  leafGeo.scale(1, 0.35, 0.5);
  for (let i = 0; i < 18; i++) {
    const y = len * (0.45 + (i / 18) * 0.55);
    const m = new THREE.Mesh(leafGeo, leafMat);
    m.position.set((i % 2 ? 1 : -1) * 0.018, y, 0);
    m.rotation.z = (i % 2 ? -1 : 1) * 0.6;
    m.rotation.y = i * 0.9;
    g.add(m);
  }
  g.position.set(p.radiusAt(p.fillY) * 0.45, p.bottomY + 0.01, 0);
  g.rotation.z = -0.22;
  return g;
}

export function createGarnish(text = '', profile) {
  if (/zeste|écorce/i.test(text)) return zest(text, profile);
  if (/thym|romarin|lavande/i.test(text)) return sprig(text, profile);
  if (/feuille/i.test(text)) return leaf(text, profile);
  if (/fleur|tagète|immortelle|jasmin|pétale/i.test(text)) return flower(text, profile);
  return null;
}
