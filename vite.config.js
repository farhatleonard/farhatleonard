import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT_DIR = resolve('src/content');

// Lit tous les fichiers de contenu : réglages + un fichier par page dans src/content/<langue>/
function loadContent() {
  const reglages = JSON.parse(readFileSync(resolve(CONTENT_DIR, 'reglages.json'), 'utf8'));
  const dir = resolve(CONTENT_DIR, reglages.langue || 'fr');
  const pages = Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(resolve(dir, f), 'utf8'))]),
  );
  return { reglages, pages };
}
const RENDER = resolve('src/templates/render.js');
const PAGES = ['index.html', 'carte/index.html', 'agence/index.html', 'contact/index.html', 'mentions-legales/index.html', '404.html'];

// Précharge les deux polices droites (titres et texte) : pas de changement de police visible au chargement.
function preloadFonts(ctx, base) {
  if (!ctx.bundle || base !== '/') return '';
  return Object.keys(ctx.bundle)
    .filter((f) => /(Boska|Switzer)-Variable-[^/]*\.woff2$/.test(f))
    .map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>\n`)
    .join('');
}

// Injecte le contenu de site.json dans chaque page HTML.
function contentPlugin() {
  let base = '/';
  return {
    name: 'site-content',
    configResolved(config) {
      base = config.base;
    },
    async transformIndexHtml(html, ctx) {
      const page = html.match(/data-page="([^"]+)"/)[1];
      const { createRenderer } = await import(pathToFileURL(RENDER).href + '?t=' + Date.now());
      const r = createRenderer(loadContent(), { relative: process.env.APERCU === '1' }).render(page);
      return html
        .replaceAll('%LANG%', r.lang)
        .replaceAll('%TITLE%', r.title)
        .replaceAll('%DESCRIPTION%', r.description)
        .replaceAll('%SITE_NAME%', r.nom)
        .replaceAll('%URL%', r.url)
        .replaceAll('%ROOT%', r.root)
        .replace('<!--@body-->', r.body)
        .replace('</head>', `${preloadFonts(ctx, base)}</head>`)
        // Tant que l'adresse du site n'est pas renseignée, on retire les balises qui en dépendent
        .replace(/\s*<(?:link rel="canonical"|meta property="og:(?:url|image)")[^>]*\[[^>]*>/g, '');
    },
    // robots.txt et sitemap.xml générés à partir de l'adresse du site (réglages)
    generateBundle() {
      const { reglages } = loadContent();
      const url = String(reglages.url || '').replace(/\/$/, '');
      const valid = /^https:\/\/[^[\]\s]+$/.test(url);
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin/'];
      if (valid) robots.push('', `Sitemap: ${url}/sitemap.xml`);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' });
      if (valid) {
        const locs = ['/', '/carte/', '/agence/', '/contact/'].map((p) => `  <url><loc>${url}${p}</loc></url>`).join('\n');
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs}\n</urlset>\n` });
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(CONTENT_DIR) || file === RENDER) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  plugins: [contentPlugin()],
  build: {
    rollupOptions: { input: Object.fromEntries(PAGES.map((p) => [p.replace('/index.html', '').replace('.html', ''), resolve(p)])) },
  },
});
