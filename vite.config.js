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
const PAGES = ['index.html', 'carte/index.html', 'agence/index.html', 'contact/index.html', 'mentions-legales/index.html'];

// Injecte le contenu de site.json dans chaque page HTML.
function contentPlugin() {
  return {
    name: 'site-content',
    async transformIndexHtml(html) {
      const page = html.match(/data-page="([^"]+)"/)[1];
      const { createRenderer } = await import(pathToFileURL(RENDER).href + '?t=' + Date.now());
      const r = createRenderer(loadContent(), { relative: process.env.APERCU === '1' }).render(page);
      return html
        .replaceAll('%LANG%', r.lang)
        .replaceAll('%TITLE%', r.title)
        .replaceAll('%DESCRIPTION%', r.description)
        .replaceAll('%SITE_NAME%', r.nom)
        .replaceAll('%URL%', r.url)
        .replace('<!--@body-->', r.body);
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
