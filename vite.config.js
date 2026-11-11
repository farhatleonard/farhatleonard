import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT = resolve('src/content/site.json');
const RENDER = resolve('src/templates/render.js');
const PAGES = ['index.html', 'carte/index.html', 'agence/index.html', 'contact/index.html', 'mentions-legales/index.html'];

// Injecte le contenu de site.json dans chaque page HTML.
function contentPlugin() {
  return {
    name: 'site-content',
    async transformIndexHtml(html) {
      const page = html.match(/data-page="([^"]+)"/)[1];
      const content = JSON.parse(readFileSync(CONTENT, 'utf8'));
      const { createRenderer } = await import(pathToFileURL(RENDER).href + '?t=' + Date.now());
      const r = createRenderer(content).render(page);
      return html
        .replaceAll('%LANG%', r.lang)
        .replaceAll('%TITLE%', r.title)
        .replaceAll('%DESCRIPTION%', r.description)
        .replaceAll('%SITE_NAME%', r.nom)
        .replaceAll('%URL%', r.url)
        .replace('<!--@body-->', r.body);
    },
    handleHotUpdate({ file, server }) {
      if (file === CONTENT || file === RENDER) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  plugins: [contentPlugin()],
  build: {
    rollupOptions: { input: Object.fromEntries(PAGES.map((p) => [p.replace('/index.html', '').replace('.html', ''), resolve(p)])) },
  },
});
