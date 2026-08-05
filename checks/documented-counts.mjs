#!/usr/bin/env node
/**
 * House-style check: is every number this repository states about itself true?
 *
 * House style rather than method, the same way line-width.mjs is: it knows this
 * repository's own documents, and a project adopting the catalogue has no use
 * for it. It is not part of the coherence check and never runs against somebody
 * else's project.
 *
 * Two halves, with two different sources.
 *
 *   - The **case counts**, which exist nowhere but in a run, so it runs both
 *     counter-tests and costs what they cost.
 *   - The **inventory** — how many checks there are, how many sit inside
 *     check-method.mjs, how many counter-tests carry no published figure, and
 *     which files those are — read from the file system and from the source.
 *
 * Both halves exist for the same reason and it is not tidiness. The case figure
 * drifted eighteen cases without failing anything; the inventory was wrong in
 * four places at once, in the document whose whole job is to say what these
 * checks do. Each was a sentence somebody wrote once and nobody recounted, which
 * is E1 exactly: a claim a command could decide, left to whoever remembers.
 *
 * Names are compared as well as totals. A table that lost one row and gained
 * another keeps its count, and a list that omits a file reads as complete —
 * which is how documented-version.test.mjs went unnamed for two releases.
 *
 * Usage: node documented-counts.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { compareCounts, ranCount } from './lib/documented-counts.mjs';
import {
  compareInventory,
  compareNames,
  namedCounterTests,
  tabulatedSubChecks,
} from './lib/documented-inventory.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const README = join(HERE, 'README.md');

/** The two counter-tests, keyed the way the findings name them. */
const RUNNERS = [
  ['coherence', 'check-method.test.mjs'],
  ['lineWidth', 'line-width.test.mjs'],
];

/**
 * The counter-tests whose case counts checks/README.md publishes.
 *
 * Named here because it is the same decision RUNNERS encodes, seen from the
 * other side: every other counter-test is deliberately given no figure, and it
 * is that remainder the document counts and names.
 */
const FIGURED = new Set(RUNNERS.map(([, f]) => f));

const bar = '─'.repeat(72);
console.log(bar);
console.log('documented counts');
console.log('  claim:  checks/README.md · the case counts, the inventory it');
console.log('          states about itself, and the files it names');
console.log(`  source: ${RUNNERS.map(([, f]) => f).join(' · ')} · checks/ · check-method.mjs`);
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

const readme = readFileSync(README, 'utf8');
const findings = broke ? [] : compareCounts(readme, actual);

// The inventory half, which needs no run: these numbers come from the file
// system and from the source, and they are the ones that were wrong in four
// places at once with nothing failing. Checked even when a counter-test broke,
// because it does not depend on one.
const entries = readdirSync(join(ROOT, 'checks'));
const counterTests = entries.filter((f) => f.endsWith('.test.mjs')).sort();
const inventory = {
  // mutate.mjs is a harness rather than a check: it decides nothing about this
  // repository, it decides whether the checks decide anything.
  checks: entries
    .filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs') && f !== 'mutate.mjs')
    .sort(),
  counterTests,
  unfiguredTests: counterTests.filter((f) => !FIGURED.has(f)),
  subChecks: [
    ...new Set(
      [...readFileSync(join(HERE, 'check-method.mjs'), 'utf8').matchAll(/\bfail\(\s*'([a-z-]+)'/g)]
        .map((m) => m[1])
    ),
  ].sort(),
};

findings.push(
  ...compareInventory(
    {
      'checks/README.md': readme,
      'CLAUDE.md': readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8'),
    },
    inventory
  )
);

// Names, not just totals. A table that lost one row and gained another keeps its
// count, and a list that omits a file reads as complete — which is exactly how
// documented-version.test.mjs went unnamed for two releases.
findings.push(
  ...compareNames(
    tabulatedSubChecks(readme)?.sort() ?? null,
    inventory.subChecks,
    'checks listed in the sub-check table',
    'checks/README.md'
  )
);
findings.push(
  ...compareNames(
    namedCounterTests(readme)?.sort() ?? null,
    inventory.unfiguredTests,
    'counter-tests named as carrying no figure',
    'checks/README.md'
  )
);

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

console.log('');
console.log(`  ${actual.coherence} and ${actual.lineWidth} cases, as stated`);
console.log(
  `  ${inventory.checks.length} checks · ${inventory.subChecks.length} inside ` +
    `check-method.mjs · ${inventory.counterTests.length} counter-tests, ` +
    `${inventory.unfiguredTests.length} of them named without a figure`
);
console.log(`\n${bar}`);
console.log('OK · every number this repository states about itself is true');
console.log(bar);
