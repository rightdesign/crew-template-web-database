// There is nothing to compile: the server runs from src/. The build checks
// that every module parses and writes dist/version.txt, the commit this build
// is of, which the Dockerfile copies and /healthz reports.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

for (const file of readdirSync('src')) {
  if (file.endsWith('.mjs')) execFileSync(process.execPath, ['--check', `src/${file}`]);
}
let sha = process.env.GITHUB_SHA || '';
if (!sha) {
  try {
    sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    sha = 'unknown';
  }
}
mkdirSync('dist', { recursive: true });
writeFileSync('dist/version.txt', `${sha}\n`);
console.log(`build ok (${sha})`);
