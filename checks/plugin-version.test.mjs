#!/usr/bin/env node
/**
 * Counter-test for the plugin-version check.
 *
 * Rule E3: deliberate violations, and the nearest legitimate case beside each.
 * The nearest legitimate case matters unusually much here, because the obvious
 * implementation — "anything under plugins/ changed, so bump" — fires on a typo
 * in a README, and a version discipline people work around is worse than none.
 *
 * Deliberately given no advertised case count, for the reason
 * install-commands.test.mjs is held to: one more published number is one more
 * thing to keep true, with nothing checking it.
 *
 * Usage: node plugin-version.test.mjs
 */

import { versionFindings, shipsToUsers } from './lib/plugin-version.mjs';

let failures = 0;
let ran = 0;

/** A release where everything is in order, as the baseline each case mutates. */
const base = {
  pluginVersion: '0.4.0',
  marketplaceVersion: '0.4.0',
  previousVersion: '0.3.0',
  releaseTag: 'v0.3',
  changedPaths: [],
};

/**
 * @param label    what this case is testing
 * @param state    overrides on the baseline
 * @param expected number of findings required
 * @param says     optional pattern the joined findings must match
 */
function expect(label, state, expected, says = null) {
  ran++;
  const { findings } = versionFindings({ ...base, ...state });
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

/** Assert on the notes instead, for what the check declines to decide. */
function expectNote(label, state, says) {
  ran++;
  const { notes } = versionFindings({ ...base, ...state });
  if (says.test(notes.join('\n'))) {
    console.log(`ok    ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}`);
    console.log(`        expected a note matching ${says}`);
    for (const n of notes) console.log(`      | ${n}`);
  }
}

const SKILL = 'plugins/agent-method/skills/session-start/SKILL.md';
const MANIFEST = 'plugins/agent-method/.claude-plugin/plugin.json';

// --- the baseline, or every case below means nothing
expect('a bumped version with nothing changed passes', {}, 0);
expect('a bumped version with procedures changed passes', { changedPaths: [SKILL] }, 0);

// --- the failure this check exists for
expect(
  'a changed procedure with an unchanged version fails',
  { pluginVersion: '0.3.0', marketplaceVersion: '0.3.0', changedPaths: [SKILL] },
  1,
  /still 0\.3\.0/
);
expect(
  'the finding names the files that changed',
  { pluginVersion: '0.3.0', marketplaceVersion: '0.3.0', changedPaths: [SKILL] },
  1,
  /session-start\/SKILL\.md/
);

// --- the nearest legitimate case: prose that ships to nobody
expect(
  'a README under plugins/ changed with no version bump passes',
  {
    pluginVersion: '0.3.0',
    marketplaceVersion: '0.3.0',
    changedPaths: ['plugins/agent-method/README.md'],
  },
  0
);
expect(
  'a README beside a real change does not excuse the real change',
  {
    pluginVersion: '0.3.0',
    marketplaceVersion: '0.3.0',
    changedPaths: ['plugins/agent-method/README.md', SKILL],
  },
  1
);

// --- the two manifests
expect(
  'the manifests disagreeing fails',
  { marketplaceVersion: '0.3.0' },
  1,
  /plugin\.json wins at resolution time/
);
expect(
  'a missing plugin version fails',
  { pluginVersion: null, marketplaceVersion: null },
  1,
  /declares no "version"/
);
expect(
  'a version present in only the marketplace entry fails twice',
  { pluginVersion: null },
  2
);

// --- the shape of the version
expect('a two-part version fails', { pluginVersion: '0.4', marketplaceVersion: '0.4' }, 1, /MAJOR\.MINOR\.PATCH/);
expect('a whitespace version fails', { pluginVersion: '   ', marketplaceVersion: '   ' }, 1);
expect(
  'a three-part version with large parts passes',
  { pluginVersion: '10.20.30', marketplaceVersion: '10.20.30' },
  0
);

// --- what the check declines to decide, said rather than passed over
expectNote(
  'with no release tag the check says it decided nothing',
  { releaseTag: null },
  /no release tag to compare against/
);
expectNote(
  'a release that declared no version is named as uncomparable',
  { previousVersion: null, changedPaths: [SKILL] },
  /declared no plugin version[\s\S]*next release this check has teeth/
);
expect(
  'that arrangement is a note and not a finding',
  { previousVersion: null, changedPaths: [SKILL] },
  0
);
expectNote(
  'an untouched plugin is reported as untouched',
  { changedPaths: ['plugins/agent-method/README.md'] },
  /nothing under plugins\/ has changed since v0\.3/
);

// --- the path rule on its own, since two cases above depend on it
{
  ran++;
  const cases = [
    [SKILL, true],
    [MANIFEST, true],
    ['plugins/agent-method/README.md', false],
    ['plugins/README.md', false],
    ['checks/check-method.mjs', false],
    ['README.md', false],
    ['method/rules.md', false],
  ];
  const wrong = cases.filter(([p, want]) => shipsToUsers(p) !== want);
  if (wrong.length) {
    failures++;
    console.log('FAIL  shipsToUsers decides each path correctly');
    for (const [p, want] of wrong) console.log(`        ${p}: expected ${want}`);
  } else {
    console.log('ok    shipsToUsers decides each path correctly');
  }
}

console.log('');
console.log(`${ran} cases, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
