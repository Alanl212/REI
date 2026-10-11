// Bundles src/ into dist/rea-world.js (+ dist/rea-world.css runtime styles, dist/rea-site.css page styles).
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const watch = process.argv.includes('--watch');
const common = { bundle: true, minify: !watch, sourcemap: watch ? 'inline' : false, logLevel: 'info', legalComments: 'none' };
const builds = [
  {
    ...common,
    entryPoints: ['src/main.js'],
    outfile: 'dist/rea-world.js',
    format: 'iife',
    target: ['es2020'],
    // three's DRACOLoader reads import.meta.url at load time; give it this script's URL instead
    banner: { js: 'var __reaScriptUrl = (document.currentScript && document.currentScript.src) || location.href;' },
    define: { 'import.meta.url': '__reaScriptUrl' },
  },
  { ...common, entryPoints: ['src/styles/runtime.css'], outfile: 'dist/rea-world.css', external: ['../assets/*'] },
  { ...common, entryPoints: ['src/styles/site.css'], outfile: 'dist/rea-site.css', external: ['../assets/*'] },
];

if (watch) {
  for (const b of builds) await (await esbuild.context(b)).watch();
  console.log('watching…');
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
  // public/ = exactly what a static host (Netlify, Cloudflare Pages, Vercel) should publish
  fs.rmSync('public', { recursive: true, force: true });
  for (const p of ['index.html', 'houses.html', '_headers', 'assets', 'dist']) fs.cpSync(p, `public/${p}`, { recursive: true });
  console.log('  public/ ready to deploy');
}
