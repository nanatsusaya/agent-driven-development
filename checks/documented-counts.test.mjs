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
import {
  compareInventory,
  compareNames,
  countFrom,
  namedCounterTests,
  tabulatedSubChecks,
} from './lib/documented-inventory.mjs';

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

// --- 4. the inventory half: the numbers read from the file system and source

const INVENTORY = {
  checks: ['a.mjs', 'b.mjs', 'c.mjs'],
  counterTests: ['a.test.mjs', 'b.test.mjs', 'c.test.mjs'],
  unfiguredTests: ['b.test.mjs', 'c.test.mjs'],
  subChecks: ['links', 'withdrawn'],
};

/** A checks/README.md stating the inventory above, correctly. */
const readmeDoc = ({
  total = 'Three',
  house = 'two',
  ignorable = 'two',
  sub = 'Two',
  further = 'Two',
  names = ['b.test.mjs', 'c.test.mjs'],
} = {}) =>
  `# Checks\n\n${total} of them, and only the first is meant for your project.\n` +
  `The other ${house} are [this repository's own house style](#x).\n\n` +
  `${sub} checks:\n\n| Check | Asks |\n|---|---|\n` +
  '| `links` | do they resolve |\n| `withdrawn` | is anything stale |\n\n' +
  '## Options\n\n| | |\n|---|---|\n| `--lint` | do not require a declaration |\n' +
  '| `--quiet` | omit the listing |\n\n' +
  `They enforce conventions, and an adopting project is free to ignore all ${ignorable}.\n\n` +
  `${further} further counter-tests — ${names.map((n) => `\`${n}\``).join(' and ')} — cover ` +
  'those checks in turn.\n';

const claudeDoc = (n = 'three') =>
  `# CLAUDE.md\n\n\`\`\`bash\nnpm test    # the counter-tests for all ${n} checks\n\`\`\`\n`;

const inv = (readme, claude = claudeDoc()) =>
  compareInventory({ 'checks/README.md': readme, 'CLAUDE.md': claude }, INVENTORY);

expect('a word is a count', countFrom('Seven'), 7);
expect('digits are a count too', countFrom('12'), 12);
expect('a word outside the list is not silently zero', countFrom('umpteen'), null);

expect('a document stating the truth produces no finding', inv(readmeDoc()), []);

// --- deliberate violations, one per claim
expect(
  'a wrong total fails, and the finding names what was counted',
  inv(readmeDoc({ total: 'Four' })),
  ['checks/README.md — states 4 check scripts in checks/; there are 3.']
);
expect(
  'a wrong house-style count fails',
  inv(readmeDoc({ house: 'four' })).length,
  1
);
expect('a wrong ignorable count fails', inv(readmeDoc({ ignorable: 'six' })).length, 1);
expect('a wrong sub-check count fails', inv(readmeDoc({ sub: 'Nine' })).length, 1);
expect('a wrong further-counter-test count fails', inv(readmeDoc({ further: 'Five' })).length, 1);
expect(
  'a wrong count in CLAUDE.md fails, and is attributed to CLAUDE.md',
  inv(readmeDoc(), claudeDoc('nine')),
  ['CLAUDE.md — states 9 counter-test files; there are 3.']
);

// Rewording a sentence takes it out of the scan, so its absence has to cost the
// same as a wrong number. Otherwise the cheapest way out of a failing run is to
// delete the claim.
expect(
  'a claim reworded out of the scan is a finding, not a pass',
  inv(readmeDoc().replace(/Three of them[^\n]*\n/, 'There are a few.\n')).length,
  1
);
// Asserted whole rather than counted: a number the scan cannot read must be
// reported *as unreadable*. Comparing null against 3 also produces one finding,
// and it sends the reader to recount something that was never the problem.
expect(
  'a number this scan cannot read says so, rather than reporting a mismatch',
  inv(readmeDoc({ total: 'Umpteen' })),
  [
    'checks/README.md — the number of check scripts in checks/ reads "Umpteen", ' +
      'which this scan cannot turn into a number. Add the word to WORDS, or use digits.',
  ]
);

// --- the legitimate cases nearest the violations
expect(
  'rewrapping a claim across a line break does not hide it',
  inv(readmeDoc().replace('and only the first is meant', 'and only the first\nis meant')),
  []
);
// The CLAUDE.md claim is the comment on an `npm test` line, so it lives in a
// fence on purpose. Blanking fences there would delete the claim and then report
// it missing — a false alarm about a document that is correct.
expect('a claim that legitimately lives in a fence is still read', inv(readmeDoc()), []);
// ...and the default stays the other way: a fenced example of a README claim is
// the document showing a claim, not making one.
expect(
  'a fenced copy of a README claim does not satisfy it',
  inv(
    readmeDoc().replace(
      /Three of them[^\n]*\n/,
      '```\nThree of them, and only the first is meant for your project.\n```\n'
    )
  ).length,
  1
);

// --- names, which is the stronger claim
expect(
  'the sub-check table is read, and the options table below it is not',
  tabulatedSubChecks(readmeDoc()),
  ['links', 'withdrawn']
);
expect('a document with no such table reports that rather than an empty list',
  tabulatedSubChecks('# Checks\n\nNothing here.\n'), null);
expect('the named counter-tests are read', namedCounterTests(readmeDoc()), [
  'b.test.mjs',
  'c.test.mjs',
]);
expect(
  'a reworded sentence yields null rather than an empty list',
  namedCounterTests('# Checks\n\nSome counter-tests exist.\n'),
  null
);
expect('two lists that agree produce no finding',
  compareNames(['b.test.mjs'], ['b.test.mjs'], 'tests', 'f.md'), []);
expect(
  'an omitted name is reported as omitted',
  compareNames(['b.test.mjs'], ['b.test.mjs', 'c.test.mjs'], 'tests', 'f.md'),
  ['f.md — the tests omit c.test.mjs.']
);
expect(
  'an invented name is reported separately from an omitted one',
  compareNames(['z.test.mjs'], ['b.test.mjs'], 'tests', 'f.md'),
  [
    'f.md — the tests omit b.test.mjs.',
    'f.md — the tests name z.test.mjs, which do not exist.',
  ]
);
expect(
  'a list that was removed entirely is a finding',
  compareNames(null, ['b.test.mjs'], 'tests', 'f.md').length,
  1
);

console.log(`\n${ran} cases, ${failures} failed`);
process.exit(failures ? 1 : 0);
