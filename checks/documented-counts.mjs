#!/usr/bin/env node
/**
 * House-style check: do the case counts in checks/README.md match the
 * counter-tests they describe?
 *
 * House style rather than method, the same way line-width.mjs is: it knows one
 * sentence in one file of this repository, and a project adopting the catalogue
 * has no use for it. It is not part of the coherence check and never runs
 * against somebody else's project.
 *
 * It exists because that sentence is the argument for trusting every other
 * check here, and it drifted eighteen cases without failing anything. C4 makes
 * that a defect rather than untidiness.
 *
 * It runs both counter-tests to learn the real numbers, so it costs what they
 * cost. There is no cheaper source: the cases are not statically countable.
 *
 * Usage: node documented-counts.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { compareCounts, ranCount } from './lib/documented-counts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const README = join(HERE, 'README.md');

/** The two counter-tests, keyed the way the findings name them. */
const RUNNERS = [
  ['coherence', 'check-method.test.mjs'],
  ['lineWidth', 'line-width.test.mjs'],
];

const bar = '─'.repeat(72);
console.log(bar);
console.log('documented counts');
console.log('  claim:  checks/README.md · the counter-test case counts');
console.log(`  source: ${RUNNERS.map(([, f]) => f).join(' · ')}`);
console.log(bar);

const actual = {};
let broke = false;

for (const [key, file] of RUNNERS) {
  const run = spawnSync(process.execPath, [join(HERE, file)], {
    encoding: 'utf8',
  });
  // A counter-test that fails outright is reported here rather than compared.
  // Its count would still be readable, and comparing it would let this check
  // report agreement about a run that did not pass.
  if (run.status !== 0) {
    console.log('');
    console.log(`  ${file} exited ${run.status} — run npm test`);
    broke = true;
  }
  actual[key] = ranCount(run.stdout ?? '');
}

const findings = broke ? [] : compareCounts(readFileSync(README, 'utf8'), actual);

if (broke || findings.length) {
  if (findings.length) {
    console.log('');
    for (const f of findings) console.log(`  ${f}`);
  }
  console.log(`\n${bar}`);
  console.log(
    broke
      ? 'FAIL · a counter-test did not pass, so its count proves nothing'
      : `FAIL · ${findings.length} claim(s) in checks/README.md are out of date`
  );
  console.log(bar);
  process.exit(1);
}

console.log(`\n${bar}`);
console.log(
  `OK · checks/README.md states ${actual.coherence} and ${actual.lineWidth}, and so do the runs`
);
console.log(bar);
