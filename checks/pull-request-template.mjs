#!/usr/bin/env node
/**
 * House-style check: does the pull-request template GitHub reads still say what
 * the handbook says?
 *
 * House style rather than method, like the other five: it knows this
 * repository's own two paths, and an adopting project has no use for it — there
 * the handbook copy is *meant* to diverge, which is what agent-manual/README.md
 * says and what method.json is for.
 *
 * It exists because the shape has to live in two places at once and neither
 * copy can be dropped. agent-manual/pull-request.md is what projects take; only
 * .github/PULL_REQUEST_TEMPLATE.md is read by GitHub. C2 wants one authority
 * for a fact, so the handbook is it and a command decides whether the copy
 * still agrees — the same trade install-commands.mjs makes for the three
 * copyable install commands.
 *
 * Usage: node pull-request-template.mjs [project-path]
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { templateFindings } from './lib/pull-request-template.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] ?? join(HERE, '..');

const HANDBOOK = 'agent-manual/pull-request.md';
const COPY = '.github/PULL_REQUEST_TEMPLATE.md';

const bar = '─'.repeat(72);
console.log(bar);
console.log('pull-request template');
console.log('  claim:  the template GitHub reads carries the handbook shape,');
console.log('          and that shape is still the core section set');
console.log(`  source: ${HANDBOOK}`);
console.log(bar);

/** Read a file, returning null rather than throwing. */
function read(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

const handbook = read(HANDBOOK);
const copy = read(COPY);

// A file that is gone must not read as a file that agrees. Deleting the copy is
// the cheapest way to make a same-content check pass, so it is the case the
// check has to be loudest about.
const findings = [];
if (handbook === null) findings.push(`${HANDBOOK} could not be read.`);
if (copy === null) findings.push(`${COPY} could not be read, so GitHub offers no shape at all.`);

if (handbook !== null && copy !== null) {
  findings.push(...templateFindings(handbook, copy, HANDBOOK, COPY));
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
console.log(`  ${COPY} agrees with ${HANDBOOK} from the first heading down`);
console.log(`\n${bar}`);
console.log('OK · the template GitHub reads is the handbook shape');
console.log(bar);
