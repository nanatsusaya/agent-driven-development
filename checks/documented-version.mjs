#!/usr/bin/env node
/**
 * House-style check: do this repository's own example declarations show the
 * catalogue version this repository actually is?
 *
 * House style rather than method, the same way documented-counts.mjs is: it
 * knows this repository's own templates, and a project adopting the catalogue
 * has no use for it. It is not part of the coherence check and never runs
 * against somebody else's project — where a declaration pinned to an older
 * catalogue is a legitimate choice rather than a defect.
 *
 * Usage: node documented-version.mjs [project-path]
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listMarkdownFiles } from './lib/markdown.mjs';
import { compareDeclaredVersions } from './lib/documented-version.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] ?? join(HERE, '..');

/**
 * The `.json` files that carry a declaration. Named rather than discovered,
 * because the only one today is a template a person copies, and walking the
 * tree for JSON would reach node_modules in any project that has one.
 */
const JSON_FILES = ['agent-manual/method.json'];

const bar = '─'.repeat(72);
console.log(bar);
console.log('documented version');
console.log('  claim:  every example method.json shows the current catalogue');
console.log('  source: method/VERSION');
console.log(bar);

let catalogueVersion;
try {
  catalogueVersion = readFileSync(join(ROOT, 'method', 'VERSION'), 'utf8').trim();
} catch {
  console.log('');
  console.log(`  cannot read ${join('method', 'VERSION')} — nothing to compare against`);
  console.log(`\n${bar}`);
  console.log('FAIL · the catalogue states no version');
  console.log(bar);
  process.exit(1);
}

const files = [];
for (const rel of JSON_FILES) {
  try {
    files.push({ rel, text: readFileSync(join(ROOT, rel), 'utf8'), fenced: false });
  } catch {
    // A named file that is gone is reported by the zero-read finding below
    // rather than here, so one message covers "nothing was read" however it
    // came about.
  }
}
for (const abs of listMarkdownFiles(ROOT)) {
  files.push({
    rel: relative(ROOT, abs).split(sep).join('/'),
    text: readFileSync(abs, 'utf8'),
    fenced: true,
  });
}

const { findings, read } = compareDeclaredVersions(files, catalogueVersion);

if (findings.length) {
  console.log('');
  for (const f of findings) console.log(`  ${f}`);
  console.log(`\n${bar}`);
  console.log(`FAIL · ${findings.length} finding(s)`);
  console.log(bar);
  process.exit(1);
}

console.log('');
console.log(`  ${read} declaration(s) read, all stating ${catalogueVersion}`);
console.log(`\n${bar}`);
console.log(`OK · every documented declaration shows catalogue ${catalogueVersion}`);
console.log(bar);
