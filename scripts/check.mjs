// Same checks as openchamber-guest-check, runnable with the local Node:
// manifest parse, every declared page and built script, the service bundle.
import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseManifestJson } from '@openchamber/sdk/schemas';

const root = resolve(process.argv[2] || '.');
const problems = [];
const exists = (path) => access(path).then(() => true, () => false);

const manifestPath = join(root, 'package.json');
const document = await readFile(manifestPath, 'utf8');
const parsed = parseManifestJson(document);
if (!parsed.ok) {
  console.error(`package.json: ${parsed.code}: ${parsed.message}`);
  process.exit(1);
}

if (JSON.parse(document).type === 'module') {
  problems.push('package.json must not set "type": "module"; the service bundle is CommonJS.');
}

const pages = [...new Set([...document.matchAll(/"([^"]+\.html)"/g)].map((match) => match[1]))];
for (const page of pages) {
  const path = join(root, page);
  if (!(await exists(path))) {
    problems.push(`${page} is missing.`);
    continue;
  }
  const html = await readFile(path, 'utf8');
  for (const [, source] of html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)) {
    if (!source || /^[a-z]+:/i.test(source)) continue;
    const script = join(dirname(path), source);
    if (source.endsWith('.ts')) problems.push(`${page} loads ${source}; load the bundled .js file.`);
    else if (!(await exists(script))) problems.push(`${page} loads ${source}, which is not built yet.`);
  }
}

const serviceEntry = parsed.manifest.contributes.service?.entry;
if (serviceEntry) {
  const path = join(root, serviceEntry);
  if (!(await exists(path))) {
    problems.push(`${serviceEntry} is missing. Bundle it with scripts/build.mjs.`);
  } else {
    const code = await readFile(path, 'utf8');
    if (/from\s+["']@openchamber\/sdk/.test(code)) problems.push(`${serviceEntry} still imports @openchamber/sdk.`);
    if (!code.includes('OPENCHAMBER_SERVICE_PORT')) problems.push(`${serviceEntry} never reads OPENCHAMBER_SERVICE_PORT.`);
  }
}

for (const entry of ['mcp/main.js']) {
  if (!(await exists(join(root, entry)))) problems.push(`${entry} is missing.`);
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log('Package is ready to add in Settings → Extensions.');
