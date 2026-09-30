import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const args = process.argv.slice(2).flatMap((arg) => {
  if (arg === '--host') return ['--hostname'];
  if (arg === '--strictPort') return [];
  return [arg];
});
const child = spawn(process.execPath, [next, 'dev', '--turbopack', ...args], {
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
