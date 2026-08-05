#!/usr/bin/env node
/**
 * Counter-test for the install-command check.
 *
 * Rule E3: a check is not trusted until it has been fed deliberate violations
 * and shown to fail on each, and shown to pass on the legitimate cases nearest
 * to them. The nearest legitimate case here matters more than usual — a block
 * that shows the command run from *inside* the method repository is correct and
 * must not be dragged into the comparison.
 *
 * Deliberately given no advertised case count. One more published number is one
 * more thing to keep true, and nothing would be checking it — the same reasoning
 * documented-counts.test.mjs is held to.
 *
 * Usage: node install-commands.test.mjs
 */

import { installFindings, fencedBlocks } from './lib/install-commands.mjs';

let failures = 0;
let ran = 0;

/**
 * Assert how many findings a set of documents produces, and what they say.
 *
 * @param label    what this case is testing
 * @param docs     array of `{ rel, text }`
 * @param expected number of findings required
 * @param says     optional pattern the joined findings must match
 */
function expect(label, docs, expected, says = null) {
  ran++;
  const findings = installFindings(docs);
  const problems = [];
  if (findings.length !== expected) {
    problems.push(`expected ${expected} finding(s), got ${findings.length}`);
  }
  if (says && !says.test(findings.join('\n'))) {
    problems.push(`expected a finding matching ${says}`);
  }
  if (problems.length) {
    failures++;
    console.log(`FAIL  ${label}`);
    for (const p of problems) console.log(`        ${p}`);
    for (const f of findings) console.log(`      | ${f}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

const URL = 'https://github.com/nanatsusaya/agent-project-rules';
const GOOD = `git clone ${URL} ../agent-project-rules`;
const block = (...lines) => '# Doc\n\nText.\n\n```bash\n' + lines.join('\n') + '\n```\n';

// --- the legitimate shape, in the arrangement the repository actually uses
expect(
  'the same command in three documents, cloning outside, passes',
  [
    { rel: 'README.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs . --lint') },
    { rel: 'plugins/README.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs <path>') },
    { rel: 'skills/adopt/SKILL.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs <path>') },
  ],
  0
);

// --- the defect this check exists for: the clone lands in the project
expect(
  'a clone with no destination fails',
  [{ rel: 'README.md', text: block(`git clone ${URL}`, 'node agent-project-rules/checks/check-method.mjs .') }],
  1,
  /gives no destination/
);
expect(
  'a clone to a destination inside the project fails',
  [{ rel: 'README.md', text: block(`git clone ${URL} vendor/method`, 'node vendor/method/checks/check-method.mjs .') }],
  1,
  /inside the project/
);

// --- the copies disagreeing, which is the other half of the job
expect(
  'two documents stating different clone commands fail',
  [
    { rel: 'README.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs .') },
    { rel: 'other.md', text: block(`git clone ${URL} ../adm`, 'node ../adm/checks/check-method.mjs .') },
  ],
  1,
  /states a different clone command/
);
expect(
  'a run line left pointing at the old path fails',
  [{ rel: 'README.md', text: block(GOOD, 'node agent-project-rules/checks/check-method.mjs .') }],
  1,
  /but the clone in the same block goes to/
);

// --- the nearest legitimate cases
expect(
  'a block running the check from inside the method repository is not compared',
  [
    { rel: 'README.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs .') },
    { rel: 'checks/README.md', text: block('node checks/check-method.mjs <project-path>') },
  ],
  0
);
expect(
  'the command named in prose rather than in a fence is not a claim about it',
  [
    { rel: 'README.md', text: block(GOOD, 'node ../agent-project-rules/checks/check-method.mjs .') },
    { rel: 'notes.md', text: '# Notes\n\nRun git clone https://example.invalid/x somewhere else.\n' },
  ],
  0
);

// --- deleting the command is not a way to make this pass
expect(
  'documents with no clone command at all fail',
  [{ rel: 'README.md', text: '# Doc\n\nJust prose.\n' }],
  1,
  /deleted rather than corrected/
);

// --- the extractor, since every case above depends on it
{
  ran++;
  const blocks = fencedBlocks('a\n\n```bash\none\ntwo\n```\n\nb\n\n~~~\nthree\n~~~\n');
  const shape = blocks.map((b) => [b.info, b.lines.map((l) => `${l.n}:${l.text}`)]);
  const want = JSON.stringify([
    ['bash', ['4:one', '5:two']],
    ['', ['11:three']],
  ]);
  if (JSON.stringify(shape) === want) {
    console.log('ok    fenced blocks are read with their line numbers');
  } else {
    failures++;
    console.log('FAIL  fenced blocks are read with their line numbers');
    console.log(`        got ${JSON.stringify(shape)}`);
  }
}

console.log('');
console.log(`${ran} cases, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
