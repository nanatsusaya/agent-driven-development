#!/usr/bin/env node
/**
 * House-style check: do the templates GitHub reads still say what the handbook
 * says?
 *
 * House style rather than method, like the other five: it knows this
 * repository's own paths, and an adopting project has no use for it — there the
 * handbook copy is *meant* to diverge, which is what agent-manual/README.md says
 * and what method.json is for.
 *
 * It exists because each shape has to live in two places at once and neither
 * copy can be dropped. agent-manual/ holds what projects take; only the files
 * under .github/ are read by GitHub. C2 wants one authority for a fact, so the
 * handbook is it and a command decides whether the copy still agrees — the same
 * trade install-commands.mjs makes for the three copyable install commands.
 *
 * Usage: node copied-templates.mjs [project-path]
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAIRS, templateFindings } from './lib/copied-templates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] ?? join(HERE, '..');

const bar = '─'.repeat(72);
console.log(bar);
console.log('copied templates');
console.log('  claim:  each template GitHub reads carries its handbook shape,');
console.log('          and that shape is still the section set decided on');
console.log(`  source: ${PAIRS.map((p) => p.handbook).join(' · ')}`);
console.log(bar);

/** Read a file, returning null rather than throwing. */
function read(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

const findings = [];
const agreed = [];

for (const pair of PAIRS) {
  const handbook = read(pair.handbook);
  const copy = read(pair.copy);

  // A file that is gone must not read as a file that agrees. Deleting the copy
  // is the cheapest way to make a same-content check pass, so it is the case
  // the check has to be loudest about.
  if (handbook === null) findings.push(`${pair.handbook} could not be read.`);
  if (copy === null) {
    findings.push(`${pair.copy} could not be read, so GitHub offers no shape at all.`);
  }
  if (handbook === null || copy === null) continue;

  const found = templateFindings(handbook, copy, pair.handbook, pair.copy, pair.sections);
  if (found.length) findings.push(...found);
  else agreed.push(pair);
}

// A run that compared nothing prints no findings and exits 0, which reads
// exactly like agreement. Emptying the pair list is the one way that happens,
// so it costs the same as a disagreement.
if (!PAIRS.length) {
  findings.push('no template pairs are declared, so this check compared nothing.');
}

if (findings.length) {
  console.log('');
  for (const f of findings) console.log(`  ${f}`);
  console.log(`\n${bar}`);
  console.log(`FAIL · ${findings.length} finding(s)`);
  console.log(bar);
  process.exit(1);
}

console.log('');
for (const pair of agreed) {
  console.log(`  ${pair.copy} agrees with ${pair.handbook}`);
}
console.log(`\n${bar}`);
console.log(`OK · ${agreed.length} copied template(s) carry their handbook shape`);
console.log(bar);
