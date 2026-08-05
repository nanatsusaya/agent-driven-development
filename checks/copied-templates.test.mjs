#!/usr/bin/env node
/**
 * Counter-test for the copied-templates check.
 *
 * Rule E3: a check is not trusted until it has been fed deliberate violations
 * and shown to fail on each, and shown to pass on the legitimate cases nearest
 * to them. Here the nearest legitimate cases are the ways the two files differ
 * *on purpose* — the opening comment, which must differ, and the line endings,
 * because this repository is written on Windows and read on Linux. Reporting
 * either would be a false alarm.
 *
 * The case that carries the most weight is neither: it is the one where both
 * files grow a section together. A check that only compared the two documents
 * would pass it, and the shape would have changed with nothing saying so.
 *
 * Usage: node copied-templates.test.mjs
 */

import { PAIRS, headings, shape, templateFindings } from './lib/copied-templates.mjs';

/**
 * The core set, written out rather than imported from the check.
 *
 * Importing `CORE_SECTIONS` would make the cases agree with whatever the check
 * currently says, so a section added to the constant would move the test with
 * it and be caught by nothing. The set is a decision; a decision is what a
 * counter-test is supposed to hold.
 */
const WANTED = ['What', 'Why', 'Verified', 'Open questions', 'Follow-ups'];

let failures = 0;
let ran = 0;

/**
 * @param name    what the case establishes
 * @param actual  what the assertion produced
 * @param wanted  what it should have produced
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

/**
 * For the one finding whose text carries line numbers and truncated content.
 * Asserting it whole would make every wording change a test edit, and a case
 * nobody dares touch stops being read.
 */
function expectContains(name, actual, ...wanted) {
  ran += 1;
  const joined = actual.join('\n');
  const ok = wanted.every((w) => joined.includes(w));
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`        wanted all of ${JSON.stringify(wanted)}`);
    console.log(`        got    ${JSON.stringify(actual)}`);
  }
}

// --- fixtures. Two opening comments that differ by design, over one shape.

const HANDBOOK_COMMENT = ['<!--', 'Copy to .github/PULL_REQUEST_TEMPLATE.md.', '-->', ''].join('\n');
const COPY_COMMENT = ['<!--', 'This is a copy. Edit the handbook.', '-->', ''].join('\n');

const section = (name, guidance) => ['', `## ${name}`, '', `<!-- ${guidance} -->`].join('\n');

const BODY =
  section('What', 'What this change does, concretely.') +
  section('Why', 'The problem it solves.') +
  section('Verified', 'How you know it works. Name the commands.') +
  section('Open questions', 'Numbered O1..On. Do not answer them yourself.') +
  section('Follow-ups', 'What this leaves undone.') +
  '\n';

const HANDBOOK = HANDBOOK_COMMENT + BODY;
const COPY = COPY_COMMENT + BODY;

const check = (handbook, copy) =>
  templateFindings(handbook, copy, 'handbook.md', 'copy.md', WANTED);

const sectionsFinding = (file, got) =>
  `${file} — sections are ${got}; the set for this pair is ${WANTED.join(' · ')}`;

// --- 1. the shape is read at all
expect('the five headings are read', headings(HANDBOOK), WANTED);
expect('the shape starts at the first heading', shape(HANDBOOK).body.split('\n')[0], '## What');
expect(
  'the offset is the line the shape starts on',
  shape(HANDBOOK).offset,
  HANDBOOK.replace(/\s+$/, '').split('\n').indexOf('## What')
);

// --- 2. agreement
expect('two copies of one shape produce no finding', check(HANDBOOK, COPY), []);

// --- 3. deliberate violations
expect(
  'a changed guidance line is a finding',
  check(HANDBOOK, COPY.replace('The problem it solves.', 'Why you felt like it.')).length,
  1
);
expectContains(
  'the finding names both files, both line numbers, and the text',
  check(HANDBOOK, COPY.replace('The problem it solves.', 'Why you felt like it.')),
  'copy.md:',
  'handbook.md:',
  'Why you felt like it.'
);
expect(
  'a missing section is a finding about the set and about the body',
  check(HANDBOOK, COPY.replace(section('Verified', 'How you know it works. Name the commands.'), '')),
  [
    sectionsFinding('copy.md', 'What · Why · Open questions · Follow-ups'),
    'copy.md:11 has "## Open questions", where handbook.md:11 has "## Verified". ' +
      'Edit the handbook and copy it down; the handbook is the shape.',
  ]
);
expect(
  'a section the copy invented is a finding',
  check(HANDBOOK, COPY + '\n## Watched\n').filter((f) => f.startsWith('copy.md —')),
  [sectionsFinding('copy.md', 'What · Why · Verified · Open questions · Follow-ups · Watched')]
);
expect(
  'reordering the set is a finding even though every heading is present',
  check(
    HANDBOOK,
    COPY_COMMENT +
      section('Why', 'The problem it solves.') +
      section('What', 'What this change does, concretely.') +
      section('Verified', 'How you know it works. Name the commands.') +
      section('Open questions', 'Numbered O1..On. Do not answer them yourself.') +
      section('Follow-ups', 'What this leaves undone.') +
      '\n'
  ).filter((f) => f.startsWith('copy.md —')),
  [sectionsFinding('copy.md', 'Why · What · Verified · Open questions · Follow-ups')]
);

// The case a same-content check cannot see. One change edits both files, the
// two agree perfectly, and the shape has grown a section nobody decided on.
const grown = (comment) => comment + BODY.trimEnd() + section('Watched', 'What to keep an eye on.') + '\n';
expect(
  'a section added to BOTH files is still a finding',
  check(grown(HANDBOOK_COMMENT), grown(COPY_COMMENT)),
  [
    sectionsFinding('handbook.md', 'What · Why · Verified · Open questions · Follow-ups · Watched'),
    sectionsFinding('copy.md', 'What · Why · Verified · Open questions · Follow-ups · Watched'),
  ]
);

// A document with no heading would make the comparison succeed against nothing.
expect(
  'a handbook with no heading fails rather than passing',
  check('<!-- just a comment -->\n', COPY),
  ['handbook.md carries no heading, so there is no shape to hold a copy to.']
);
expect(
  'a copy with no heading fails rather than passing',
  check(HANDBOOK, '<!-- just a comment -->\n'),
  ['copy.md carries no heading, so nothing was compared.']
);
expect(
  'an empty copy fails',
  check(HANDBOOK, ''),
  ['copy.md carries no heading, so nothing was compared.']
);
expect('shape() reports the absence rather than an empty body', shape('no heading here\n'), null);

// --- 4. the legitimate cases nearest the violations

// The opening comments MUST differ: the handbook tells a reader to copy the
// file, and a copy repeating that would tell every contributor to copy it
// again. This is the check's one exemption, so it is the case that has to hold.
expect(
  'the two opening comments differing is not a finding',
  check(HANDBOOK, COPY.replace('This is a copy. Edit the handbook.', 'Something else entirely.')),
  []
);
expect(
  'a heading-shaped line inside the opening comment is not a section',
  headings('<!--\n# 1. do this\n## 2. then this\n-->\n\n## What\n'),
  ['What']
);
expect(
  'that line does not become the start of the shape either',
  shape('<!--\n# 1. do this\n-->\n\n## What\n\nbody\n').body,
  '## What\n\nbody'
);

// Written on Windows, read on Linux. A check a line ending can trip is a check
// that fails for the wrong reason on somebody else's machine.
expect('a CRLF copy agrees with an LF handbook', check(HANDBOOK, COPY.replace(/\n/g, '\r\n')), []);
expect('a trailing blank line is not a difference', check(HANDBOOK, `${COPY}\n\n`), []);

// --- 5. the pair list, which is what makes this one check rather than two

// Written out rather than derived, for the same reason WANTED is: a pair
// dropped from the constant would take its expectation with it, and the run
// would go green having compared one fewer thing.
expect(
  'both copied templates are declared, with their paths and section sets',
  PAIRS,
  [
    {
      handbook: 'agent-manual/pull-request.md',
      copy: '.github/PULL_REQUEST_TEMPLATE.md',
      sections: ['What', 'Why', 'Verified', 'Open questions', 'Follow-ups'],
    },
    {
      handbook: 'agent-manual/issue-templates/task.md',
      copy: '.github/ISSUE_TEMPLATE/task.md',
      sections: ['Context', 'Scope', 'Constraints', 'Related'],
    },
  ]
);

const ISSUE_SECTIONS = ['Context', 'Scope', 'Constraints', 'Related'];
const ISSUE_BODY =
  section('Context', 'The problem or goal, and why it exists.') +
  section('Scope', 'Testable acceptance criteria, one per line.') +
  section('Constraints', 'Anything that limits the solution.') +
  section('Related', 'Parent epic, related decisions and tickets.') +
  '\n';

// The second pair's copy carries YAML frontmatter its handbook has no use for —
// that is how GitHub is told what to call the template. It sits above the first
// heading, so the exemption covering the differing opening comment covers it
// too. Without that, the pair could never agree and the check would be
// unusable for exactly the case it was generalised for.
expect(
  'frontmatter on the copy only is not a difference',
  templateFindings(
    `<!--\nCopy to .github/ISSUE_TEMPLATE/task.md.\n-->${ISSUE_BODY}`,
    `---\nname: Task\nabout: A unit of work\n---\n\n<!--\nA copy.\n-->${ISSUE_BODY}`,
    'handbook.md',
    'copy.md',
    ISSUE_SECTIONS
  ),
  []
);
expect(
  'the issue shape agrees with itself under its own set',
  templateFindings(
    `<!--\na\n-->${ISSUE_BODY}`,
    `<!--\nb\n-->${ISSUE_BODY}`,
    'handbook.md',
    'copy.md',
    ISSUE_SECTIONS
  ),
  []
);
// Each pair is held to its own set. Judged against the other pair's set, two
// files that agree with each other perfectly are still both findings — which is
// what stops one set quietly becoming the set for everything.
expect(
  'a pair is held to its own section set, not another pair’s',
  templateFindings(
    `<!--\na\n-->${ISSUE_BODY}`,
    `<!--\nb\n-->${ISSUE_BODY}`,
    'handbook.md',
    'copy.md',
    WANTED
  ).length,
  2
);

console.log(`\n${ran} cases, ${failures} failed`);
process.exit(failures ? 1 : 0);
