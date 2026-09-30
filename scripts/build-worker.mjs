import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const files = {};

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) {
      const route = '/' + relative('out', path).split(sep).join('/');
      const buffer = await readFile(path);
      files[route] = [types[extname(path)] ?? 'application/octet-stream', buffer.toString('base64')];
    }
  }
}

await collect('out');
await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', `const bundledAssets = ${JSON.stringify(files)};\n` +
  await readFile('worker/index.js', 'utf8'));
