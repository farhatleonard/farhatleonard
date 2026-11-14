// Matériau des photos de cocktails : la photo devient un objet vivant.
// - le liquide (zone du masque) penche, ondule et frémit selon le mouvement du plateau ;
// - un reflet de studio balaie le verre quand il pivote ;
// - des bulles montent dans les boissons pétillantes ;
// - les verres éloignés s'assombrissent (profondeur).
import * as THREE from 'three';

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying float vSide;
  void main() {
    vUv = uv;
    vSide = position.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D liquidMap;
  uniform float hasLiquid;
  uniform float opacity;
  uniform float dim;
  uniform float time;
  uniform float tilt;      // inclinaison de la surface (mouvement du plateau)
  uniform float energy;    // agitation du liquide (0 = calme)
  uniform float surfaceY;  // niveau du liquide dans l'image (0 = bas, 1 = haut)
  uniform float sparkling;
  uniform float sheen;     // position du reflet de studio (-1 … 1)
  uniform vec2 aspect;     // largeur / hauteur de la photo
  varying vec2 vUv;
  varying float vSide;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    float m = hasLiquid > 0.5 ? texture2D(liquidMap, vUv).r : 0.0;

    if (m > 0.001) {
      // proximité de la surface : 1 en surface, 0 au fond
      float nearSurf = clamp(1.0 - (surfaceY - uv.y) / 0.35, 0.0, 1.0);
      float x = uv.x - 0.5;
      // surface qui penche + vagues (deux fréquences) + léger frémissement permanent
      float waves = sin(uv.x * 13.0 + time * 4.6) * 0.006 + sin(uv.x * 27.0 - time * 6.3) * 0.003;
      float dy = (tilt * x * 0.55 + waves * energy) * (0.25 + 0.75 * nearSurf);
      // le contenu (glaçons, fleur) glisse un peu dans le sens du mouvement
      float dx = -tilt * 0.035 * (0.4 + 0.6 * nearSurf) + sin(time * 1.7 + uv.y * 11.0) * 0.0018 * (0.4 + energy);
      // ondulation de réfraction, très fine, toujours présente
      dx += sin(uv.y * 40.0 + time * 2.2) * 0.0009;
      uv += vec2(dx, dy) * m;
    }

    vec4 c = texture2D(map, uv);

    // bulles qui montent (boissons pétillantes), uniquement dans le liquide, sous la surface
    if (sparkling > 0.5 && m > 0.4) {
      vec2 g = vec2(vUv.x * 30.0 * aspect.x, vUv.y * 30.0 - time * 1.7);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash(id);
      vec2 o = vec2(h - 0.5, fract(h * 7.31) - 0.5) * 0.55;
      float r = 0.07 + 0.06 * fract(h * 3.7);
      float d = length(f - o);
      float bubble = smoothstep(r, r * 0.45, d) * step(0.62, h) * smoothstep(surfaceY, surfaceY - 0.04, vUv.y);
      c.rgb += bubble * 0.45 * m;
    }

    // reflet de studio : une bande claire verticale qui glisse quand le verre pivote
    float band = exp(-pow((vUv.x - (0.5 + sheen * 0.42)) / 0.05, 2.0));
    c.rgb += band * 0.16 * c.a;

    c.rgb *= dim;
    gl_FragColor = vec4(c.rgb, c.a * opacity);
    #include <colorspace_fragment>
  }
`;

export function createPhotoMaterial(tex, liquidTex, { surfaceY = 0.7, sparkling = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      liquidMap: { value: liquidTex },
      hasLiquid: { value: liquidTex ? 1 : 0 },
      opacity: { value: 1 },
      dim: { value: 1 },
      time: { value: 0 },
      tilt: { value: 0 },
      energy: { value: 0.2 },
      surfaceY: { value: surfaceY },
      sparkling: { value: sparkling ? 1 : 0 },
      sheen: { value: 0 },
      aspect: { value: new THREE.Vector2(tex.image.width / tex.image.height, 1) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
  });
}

// Surface bombée (comme la paroi d'un verre), centre vers la caméra, pied à y = 0
export function curvedPlane(arc = 1.5) {
  const geo = new THREE.PlaneGeometry(1, 1, 32, 1);
  const pos = geo.attributes.position;
  const r = 1 / arc;
  const halfW = Math.sin(arc / 2) * r;
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i) * arc;
    pos.setX(i, (Math.sin(a) * r) / (2 * halfW)); // largeur finale = 1
    pos.setZ(i, (Math.cos(a) - 1) * r * 0.5);
    pos.setY(i, pos.getY(i) + 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

// Niveau du liquide (haut de la zone du masque), lu une fois dans l'image du masque
export function liquidSurface(img) {
  const c = document.createElement('canvas');
  const h = 96;
  const w = Math.max(8, Math.round((img.width / img.height) * h));
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    let count = 0;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4] > 128) count++;
    if (count > w * 0.25) return 1 - y / h; // première ligne bien remplie, depuis le haut
  }
  return 0.7;
}
