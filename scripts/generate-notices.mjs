import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const lock = JSON.parse(await read('package-lock.json'));
const sections = [
  'Octave Garden — licences and third-party notices',
  await read('LICENSE'),
  await read('public/samples/ATTRIBUTION.md'),
];

// Include the full licences of every locked production dependency, including
// transitive dependencies. Build output serves this file alongside the app.
for (const [path, metadata] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!path || metadata.dev) continue;
  const files = (await readdir(resolve(root, path))).filter(name => /^(licen[cs]e|copying)(\.[\w-]+)?$/i.test(name));
  if (!files.length) throw new Error(`Missing licence text for ${path}; review before distribution.`);
  sections.push(`${path.replace(/^node_modules\//, '')} ${metadata.version} (${metadata.license ?? 'see licence'})`);
  for (const name of files.sort()) sections.push(await read(`${path}/${name}`));
}

await writeFile(resolve(root, 'public/THIRD_PARTY_NOTICES.txt'), sections.join('\n\n' + '='.repeat(72) + '\n\n') + '\n');
console.log('Generated public/THIRD_PARTY_NOTICES.txt from locked production dependencies.');
