// Profils des verres, dessinés comme un souffleur de verre : une silhouette qu'on fait tourner (tour de potier).
// Chaque point = [rayon, hauteur]. Tous les profils sont rééchantillonnés au même nombre de points,
// ce qui permet de transformer un verre en un autre de façon fluide.

const SHAPES = {
  coupe: {
    outer: [[0, 0], [0.44, 0], [0.45, 0.025], [0.08, 0.07], [0.035, 0.14], [0.03, 0.86], [0.05, 0.95], [0.26, 1.03], [0.5, 1.15], [0.63, 1.29], [0.655, 1.36]],
    inner: [[0.63, 1.36], [0.605, 1.29], [0.48, 1.165], [0.25, 1.06], [0.06, 1.01], [0, 1.005]],
    fill: 1.31,
  },
  martini: {
    outer: [[0, 0], [0.42, 0], [0.43, 0.025], [0.08, 0.07], [0.035, 0.14], [0.03, 0.78], [0.07, 0.86], [0.4, 1.12], [0.7, 1.4]],
    inner: [[0.675, 1.4], [0.39, 1.14], [0.07, 0.885], [0.02, 0.87], [0, 0.868]],
    fill: 1.3,
  },
  flute: {
    outer: [[0, 0], [0.36, 0], [0.37, 0.025], [0.07, 0.07], [0.03, 0.14], [0.028, 0.7], [0.06, 0.8], [0.19, 0.98], [0.265, 1.35], [0.275, 1.8], [0.255, 2.1]],
    inner: [[0.232, 2.1], [0.252, 1.8], [0.243, 1.35], [0.17, 1.0], [0.05, 0.85], [0, 0.835]],
    fill: 1.82,
  },
  tumbler: {
    outer: [[0, 0], [0.5, 0], [0.525, 0.02], [0.54, 0.1], [0.58, 0.98]],
    inner: [[0.555, 0.98], [0.515, 0.17], [0.49, 0.14], [0.3, 0.135], [0, 0.135]],
    fill: 0.72,
  },
  highball: {
    outer: [[0, 0], [0.36, 0], [0.38, 0.02], [0.39, 0.1], [0.405, 1.62]],
    inner: [[0.38, 1.62], [0.368, 0.16], [0.345, 0.13], [0.2, 0.125], [0, 0.125]],
    fill: 1.36,
  },
};

const N_OUTER = 48;
const N_INNER = 36;
const N_LIQUID = 36;

function resample(points, n) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0, y0, x1, y1, len, start: total });
    total += len;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    const d = (k / (n - 1)) * total;
    const s = segs.find((sg) => d <= sg.start + sg.len) || segs[segs.length - 1];
    const u = s.len ? (d - s.start) / s.len : 0;
    out.push([s.x0 + (s.x1 - s.x0) * u, s.y0 + (s.y1 - s.y0) * u]);
  }
  return out;
}

// Liquide : la paroi intérieure, du fond jusqu'au niveau de remplissage, fermée par une surface plane.
function liquidProfile(inner, fill) {
  const up = [...inner].reverse(); // du centre du fond vers le bord
  const pts = [];
  for (let i = 0; i < up.length; i++) {
    const [r, y] = up[i];
    if (y <= fill) pts.push([Math.max(0, r - 0.006), y + 0.004]);
    else {
      const [r0, y0] = up[i - 1];
      const u = (fill - y0) / (y - y0);
      pts.push([Math.max(0, r0 + (r - r0) * u - 0.006), fill]);
      break;
    }
  }
  pts.push([0, fill]);
  return pts;
}

// Profils prêts à l'emploi. Le verre est posé sur y = 0.
// - glass : la paroi du verre (extérieur puis intérieur)
// - cavity : l'intérieur du verre, rempli presque jusqu'au bord. Le niveau réel du liquide
//   est donné par un plan de coupe (fillY), qui peut s'incliner quand le liquide bouge.
export const PROFILES = Object.fromEntries(
  Object.entries(SHAPES).map(([name, s]) => {
    const height = s.outer[s.outer.length - 1][1];
    const rim = s.inner[0];
    const bottom = s.inner[s.inner.length - 1][1];
    const cavity = resample(liquidProfile(s.inner, rim[1] - 0.015), N_LIQUID);
    const inner = [...s.inner].reverse(); // du fond vers le bord
    const radiusAt = (y) => {
      for (let i = 1; i < inner.length; i++) {
        if (y <= inner[i][1]) {
          const [r0, y0] = inner[i - 1];
          const [r1, y1] = inner[i];
          return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
        }
      }
      return rim[0];
    };
    return [
      name,
      {
        glass: [...resample(s.outer, N_OUTER), ...resample(s.inner, N_INNER)],
        cavity,
        height,
        fillY: s.fill,
        bottomY: bottom,
        rimY: rim[1],
        rimR: rim[0],
        footR: s.outer[1][0],
        radiusAt,
      },
    ];
  }),
);

export const mixProfiles = (a, b, t, out) => {
  for (let i = 0; i < a.length; i++) {
    out[i][0] = a[i][0] + (b[i][0] - a[i][0]) * t;
    out[i][1] = a[i][1] + (b[i][1] - a[i][1]) * t;
  }
  return out;
};
