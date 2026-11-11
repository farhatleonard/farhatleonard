import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT = resolve('src/content/site.json');
const RENDER = resolve('src/templates/render.js');

// Injecte le contenu de site.json dans index.html et mentions-legales.html.
function contentPlugin() {
  return {
    name: 'site-content',
    async transformIndexHtml(html, ctx) {
      const content = JSON.parse(readFileSync(CONTENT, 'utf8'));
      const { createRenderer } = await import(pathToFileURL(RENDER).href + '?t=' + Date.now());
      const r = createRenderer(content);
      const isLegal = ctx.filename.endsWith('mentions-legales.html');
      return html
        .replaceAll('%LANG%', r.lang)
        .replaceAll('%TITLE%', isLegal ? r.legalTitle : r.title)
        .replaceAll('%DESCRIPTION%', r.description)
        .replaceAll('%SITE_NAME%', r.nom)
        .replaceAll('%URL%', r.url)
        .replace('<!--@body-->', isLegal ? r.legal() : r.home());
    },
    handleHotUpdate({ file, server }) {
      if (file === CONTENT || file === RENDER) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  plugins: [contentPlugin()],
  build: {
    rollupOptions: {
      input: { main: resolve('index.html'), legal: resolve('mentions-legales.html') },
    },
  },
});
