#!/usr/bin/env node
/**
 * Counter-test for the documented-counts check.
 *
 * Rule E3: a check is not trusted until it has been fed deliberate violations
 * and shown to fail on each, and shown to pass on the legitimate cases nearest
 * to them. Here the nearest legitimate cases are the two ways this check could
 * quietly stop working — a sentence rewrapped across a line break, and another
 * sentence in the same document that happens to contain a case count. Either
 * would make it report agreement about a claim it never read.
 *
 * The pure half is what is exercised. Reading a real run is the check's own
 * job and needs the runs; what matters here is that it cannot be fooled.
 *
 * Usage: node documented-counts.test.mjs
 */

import {
  claimedCounts,
  compareCounts,
  ranCount,
} from './lib/documented-counts.mjs';

let failures = 0;
let ran = 0;

/**
 * @param name what the case establishes
 * @param actual what the assertion produced
 * @param wanted what it should have produced
 */
function expect(name, actual, wanted) {
  ran += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`        wanted ${JSON.stringify(wanted)}`);
    console.log(`        got    ${JSON.stringify(actual)}`);
  }
}

/** A document whose claim says what it is given. */
const doc = (a, b) =>
  `# Checks\n\n## The counter-tests\n\n${a} cases for the coherence check and ` +
  `${b} for the line-width check, each building a throwaway project.\n`;

const TRUTH = { coherence: 73, lineWidth: 13 };

// --- 1. the claim is read at all
expect('a stated pair is read', claimedCounts(doc(73, 13)), TRUTH);
expect('a document with no claim reads as null', claimedCounts('# Checks\n'), null);

// --- 2. agreement
expect('counts that agree produce no finding', compareCounts(doc(73, 13), TRUTH), []);

// --- 3. deliberate violations
expect(
  'a stale coherence count fails, and says both numbers',
  compareCounts(doc(55, 13), TRUTH),
  ['the coherence check: stated 55, the run reports 73']
);
expect(
  'a stale line-width count fails',
  compareCounts(doc(73, 9), TRUTH),
  ['the line-width check: stated 9, the run reports 13']
);
expect(
  'both stale produces both findings',
  compareCounts(doc(55, 9), TRUTH),
  [
    'the coherence check: stated 55, the run reports 73',
    'the line-width check: stated 9, the run reports 13',
  ]
);

// Deleting the sentence is the cheapest way out of a failing run, so it has to
// cost the same as leaving it wrong.
expect(
  'a deleted claim fails rather than passing vacuously',
  compareCounts('# Checks\n\nNothing is claimed here.\n', TRUTH),
  ['no sentence stating the counter-test counts — removed rather than corrected']
);

// The check reads a run; a run that printed nothing readable must not be taken
// as agreement with whatever the document says.
expect(
  'a run that printed no count fails',
  compareCounts(doc(73, 13), { coherence: null, lineWidth: 13 }),
  ['the coherence check: its run printed no case count']
);

// --- 4. the legitimate cases nearest the violations
// This repository rewraps prose at 80 columns as a matter of routine. If a
// wrap could break the match, the check would switch itself off during
// ordinary editing and report agreement for ever after.
expect(
  'a claim rewrapped across a line break still reads',
  claimedCounts(
    '73 cases for the coherence check and 13 for the\nline-width check, each ' +
      'building a throwaway project.\n'
  ),
  TRUTH
);

// A count in a neighbouring sentence is not the claim. Matching one would make
// the check assert something nobody wrote.
expect(
  'an unrelated case count nearby is not mistaken for the claim',
  claimedCounts(
    'An earlier version ran 40 cases in total.\n\n' +
      '73 cases for the coherence check and 13 for the line-width check.\n'
  ),
  TRUTH
);

// A fenced copy is an example of the sentence, not the document making the
// claim. Accepting one would hand anybody a way to disable this check by
// moving the real sentence into a fence.
expect(
  'the claim only inside a fence does not count as claimed',
  claimedCounts(
    '# Checks\n\n```\n73 cases for the coherence check and 13 for the ' +
      'line-width check.\n```\n'
  ),
  null
);

// --- 5. reading a run
expect('a summary line yields its count', ranCount('\n73 cases, 0 failed\n'), 73);
expect('a failing run still yields its count', ranCount('73 cases, 4 failed'), 73);
expect('output with no summary yields null', ranCount('ok    something\n'), null);

console.log(`\n${ran} cases, ${failures} failed`);
process.exit(failures ? 1 : 0);
