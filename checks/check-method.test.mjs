#!/usr/bin/env node
/**
 * Counter-test for the coherence check.
 *
 * Rule E3 says a check is not trusted until it has been fed deliberate
 * violations and shown to fail on each, and shown to pass on the legitimate
 * cases nearest to them. This file is that. It exists because the common
 * failure of a check is not a wrong verdict — it is a pattern that silently
 * matches nothing, reports success, and is believed.
 *
 * Each case builds a throwaway project in a temporary directory, runs the real
 * check against it as a subprocess, and asserts both the exit code and which
 * checks fired. Asserting the exit code alone would pass for a check that fails
 * for the wrong reason.
 *
 * Usage: node check-method.test.mjs
 */

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, 'check-method.mjs');
const REAL_CATALOGUE = join(HERE, '..', 'method');

/**
 * The catalogue's own version, read rather than written down here.
 *
 * It was written down, as `'0.2'`. The moment the catalogue moved to 0.3, every
 * case in this file began emitting the version note — which is precisely the
 * noise the one dedicated case exists to isolate, and it could no longer be told
 * apart from the rest. A reference baseline pinned to a version that has moved is
 * the same defect as any other stale copy; it just happens to live in the tests.
 */
const CATALOGUE_VERSION = readFileSync(join(REAL_CATALOGUE, 'VERSION'), 'utf8').trim();

const root = mkdtempSync(join(tmpdir(), 'adm-test-'));
let failures = 0;
let ran = 0;

/** Write a file, creating parent directories. */
function put(base, rel, content) {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
}

/** A project that satisfies every check, as the baseline every case mutates. */
function baseline(name, overrides = {}) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });

  put(dir, 'method.json', JSON.stringify(
    {
      method: 'agent-driven-development',
      version: CATALOGUE_VERSION,
      artefacts: {
        'operating-rules': 'CLAUDE.md',
        decisions: 'docs/adr/',
        state: 'docs/STATUS.md',
        'method-log': 'docs/method-log.md',
      },
      language: { spelling: 'british' },
      adaptations: [],
      ...overrides,
    },
    null,
    2
  ));

  put(dir, 'CLAUDE.md', '# Rules\n\nThe human merges every change.\n');
  put(dir, 'docs/STATUS.md', '# Status\n\nNothing yet.\n');
  put(dir, 'docs/method-log.md', '# Method log\n\nNo entries.\n');
  put(dir, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Accepted |\n');
  put(dir, 'docs/adr/0001-first.md',
    '# 0001 — First\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n');
  return dir;
}

/** A catalogue with one withdrawn rule, for the stale-rule cases. */
function catalogueWithWithdrawal(name, pattern) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  cpSync(join(REAL_CATALOGUE, 'rules.md'), join(dir, 'rules.md'));
  writeFileSync(
    join(dir, 'withdrawn.md'),
    '# Withdrawn rules\n\n## Entries\n\n' +
      '### W1 — the mechanical-change exception\n\n' +
      `- **Pattern:** \`${pattern}\`\n` +
      '- **Withdrawn:** 2026-07-27\n' +
      '- **Reason:** an exception whose boundary the agent decides is not a boundary\n' +
      '- **Instead:** every change reaches the trunk through review, without exception\n',
    'utf8'
  );
  return dir;
}

/**
 * Run the check and assert the outcome.
 *
 * @param label       what this case is testing
 * @param project     project directory
 * @param expectPass  whether the check should exit 0
 * @param expectFired check names that must appear in the output when failing
 * @param catalogue   catalogue directory, defaulting to the real one
 */
function expect(
  label,
  project,
  expectPass,
  expectFired = [],
  catalogue = REAL_CATALOGUE,
  extraArgs = []
) {
  ran++;
  const r = spawnSync(
    process.execPath,
    [CHECK, project, '--catalogue', catalogue, '--quiet', ...extraArgs],
    { encoding: 'utf8' }
  );
  const passed = r.status === 0;
  const out = (r.stdout ?? '') + (r.stderr ?? '');

  const problems = [];
  if (passed !== expectPass) {
    problems.push(`expected ${expectPass ? 'pass' : 'fail'}, got ${passed ? 'pass' : 'fail'}`);
  }
  for (const name of expectFired) {
    if (!new RegExp(`^${name} — \\d+ finding`, 'm').test(out)) {
      problems.push(`expected the "${name}" check to fire`);
    }
  }
  if (problems.length) {
    failures++;
    console.log(`FAIL  ${label}`);
    for (const p of problems) console.log(`        ${p}`);
    console.log(out.split('\n').map((l) => `      | ${l}`).join('\n'));
  } else {
    console.log(`ok    ${label}`);
  }
}

/**
 * Assert that the report *says* something, rather than that it exited a certain
 * way. Some of what this check owes its reader is not a verdict at all — it is
 * naming what went unchecked, and a verdict-only test cannot see that.
 *
 * @param label   what this case is testing
 * @param project project directory
 * @param pattern must appear in the output
 * @param args    extra arguments
 * @param quiet   whether to pass `--quiet`; the in-force listing needs it off
 */
function expectSays(label, project, pattern, args = [], quiet = true) {
  ran++;
  const r = spawnSync(
    process.execPath,
    [CHECK, project, '--catalogue', REAL_CATALOGUE, ...(quiet ? ['--quiet'] : []), ...args],
    { encoding: 'utf8' }
  );
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  if (pattern.test(out)) {
    console.log(`ok    ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}`);
    console.log(`        expected the report to match ${pattern}`);
    console.log(out.split('\n').map((l) => `      | ${l}`).join('\n'));
  }
}

/**
 * Assert a relationship between two runs rather than a verdict about one.
 *
 * The one number in the report that is neither a finding nor a verdict is how
 * many rules in force are marked `manual` — the figure a reader uses to judge
 * how much a green run is worth. What matters about it is relative: an
 * adaptation that leaves a rule in force must not change it, and one that takes
 * a rule out must. Pinning the absolute value instead would tie the suite to the
 * size of the catalogue, so that adding any manual rule broke a case about
 * adaptations.
 *
 * @param label    what this case is testing
 * @param actual   the value observed
 * @param expected the value required
 */
function expectEquals(label, actual, expected) {
  ran++;
  if (actual === expected) {
    console.log(`ok    ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}`);
    console.log(`        expected ${expected}, got ${actual}`);
  }
}

/** The manual-rule count a run prints about itself, or null. */
function manualCount(project) {
  const r = spawnSync(
    process.execPath,
    [CHECK, project, '--catalogue', REAL_CATALOGUE, '--quiet'],
    { encoding: 'utf8' }
  );
  const m = /(\d+) rule\(s\) in force are marked/.exec(
    (r.stdout ?? '') + (r.stderr ?? '')
  );
  return m ? Number(m[1]) : null;
}

// --- the legitimate baseline must pass, or every failure below is meaningless
expect('a complete, coherent project passes', baseline('good'), true);

// --- 1. the declaration
{
  const d = join(root, 'no-decl');
  mkdirSync(d, { recursive: true });
  put(d, 'README.md', '# Nothing\n');
  expect('a project with no method.json fails', d, false, ['declaration']);
}
{
  const d = baseline('bad-json');
  put(d, 'method.json', '{ not json ');
  expect('unparseable method.json fails', d, false, ['declaration']);
}
{
  // Every one of these is valid JSON, and every one used to decide the run on
  // its own. The four falsy ones skipped the declaration, artefact, authority,
  // adaptation and accounting checks together and printed "OK · the declaration
  // matches the project"; the two truthy primitives crashed with a raw
  // TypeError on `decl.artefacts = {}`. An array was the one shape already
  // handled, and it stays here as the nearest case that was right.
  const shapes = ['null', 'false', '0', '""', '5', '"x"', '[]'];
  for (const literal of shapes) {
    const d = baseline(`decl-primitive-${shapes.indexOf(literal)}`);
    put(d, 'method.json', literal);
    expect(`a method.json that parses as ${literal} fails`, d, false, ['declaration']);
  }
}
{
  // The crash was worse than the wrong verdict in one respect only: it is not
  // reportable. A stacktrace tells the reader where this check broke, not what
  // is wrong with their project.
  const d = baseline('decl-primitive-no-stacktrace');
  put(d, 'method.json', '5');
  expectSays(
    'a primitive declaration is reported, not thrown',
    d,
    /^(?![\s\S]*TypeError)[\s\S]*A declaration must be a JSON object/
  );
}
{
  // Several Windows editors write a byte-order mark by default, and JSON.parse
  // rejects one outright — so a valid-looking declaration failed as "not valid
  // JSON", sending the reader after a syntax error that was not there. Every
  // document already goes through the same normalisation on the way in.
  const d = baseline('bom-declaration');
  const decl = readFileSync(join(d, 'method.json'), 'utf8');
  // Written as an escape, never as the character itself: a literal BOM in a
  // source file is invisible, and the next person to touch this line would have
  // no way to see what makes the case a case.
  writeFileSync(join(d, 'method.json'), '\uFEFF' + decl, 'utf8');
  expect('a method.json with a byte-order mark still parses', d, true);
}

// --- 2. artefacts
{
  const d = baseline('missing-artefact');
  rmSync(join(d, 'docs/STATUS.md'));
  expect('a bound artefact that does not exist fails', d, false, ['artefacts']);
}
{
  const d = baseline('unknown-role', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/adr/',
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
      'invented-role': 'docs/other.md',
    },
  });
  expect('an invented role fails', d, false, ['artefacts']);
}
{
  // `join(project, value)` plus an existence test passed for a path outside the
  // project, so the check certified coherence for a project whose operating
  // rules were not in the repository. The file is deliberately created, so that
  // the case fails on containment rather than on absence.
  const d = baseline('artefact-escapes-root', {
    artefacts: {
      'operating-rules': '../outside-rules.md',
      decisions: 'docs/adr/',
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
  });
  writeFileSync(join(root, 'outside-rules.md'), '# Rules\n\nElsewhere.\n', 'utf8');
  expect('an artefact bound outside the project root fails', d, false, ['artefacts']);
}
{
  // The nearest legitimate case: deep is fine, outside is not. Without this the
  // containment test could be tightened into "no slashes" and nothing would say.
  const d = baseline('artefact-deep-inside', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/adr/',
      state: 'docs/deep/nested/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
  });
  put(d, 'docs/deep/nested/STATUS.md', '# Status\n\nNothing yet.\n');
  expect('a deeply nested artefact inside the project passes', d, true);
}
{
  const d = baseline('artefact-absolute-path', {
    artefacts: {
      'operating-rules': '/etc/hostname',
      decisions: 'docs/adr/',
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
  });
  expect('an artefact bound to an absolute path fails', d, false, ['artefacts']);
}
{
  // A role that names one document, bound to a directory. Existence alone said
  // yes, so the type error passed as coherence.
  const d = baseline('artefact-is-a-directory', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/adr/',
      state: 'docs/',
      'method-log': 'docs/method-log.md',
    },
  });
  expect('a single-document role bound to a directory fails', d, false, ['artefacts']);
}
{
  // The one role where both shapes are right: D1's Binding describes a directory
  // of records, and a project keeping them in one file follows the same rule.
  // What it cannot have is D2's index check, and the report has to say so by
  // name — a rule going unchecked with no rule named is a blind spot the reader
  // cannot look up.
  const d = baseline('decisions-as-one-file', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/decisions.md',
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
  });
  rmSync(join(d, 'docs/adr'), { recursive: true });
  put(d, 'docs/decisions.md', '# Decisions\n\nOne file, for now.\n');
  expect('the decisions role bound to a single file passes', d, true);
  expectSays(
    'a file-bound decisions role names the rule that went unchecked',
    d,
    /not verified here[\s\S]*bound to a file rather than a directory, so rule D2/
  );
}
{
  // Zero bytes is absence wearing a name. Worse than an unbound role, because an
  // unbound role has to be accounted for by an adaptation and this does not: the
  // declaration says the role is filled and the next session opens the file and
  // learns nothing.
  const d = baseline('artefact-is-empty');
  writeFileSync(join(d, 'docs/STATUS.md'), '', 'utf8');
  expect('a bound artefact with no content fails', d, false, ['artefacts']);
  expectSays(
    'the finding says which role is empty and what to do about it',
    d,
    /Role "state" is bound to "docs\/STATUS\.md", which is empty/
  );
}
{
  // The mirror, and the reason the test is by size rather than by looking like
  // content: a file with real content must pass however short it is. A check
  // that fired on ordinary artefacts would be the false alarm E3 is about, in
  // the check that decides whether a project has adopted anything at all.
  const d = baseline('artefact-is-short');
  writeFileSync(join(d, 'docs/STATUS.md'), 'x', 'utf8');
  expect('a one-byte artefact with content passes', d, true);
}
{
  // A directory is not empty in this sense and must not be tested for it —
  // `decisions` is legitimately a directory, and a directory reports no useful
  // size. The baseline binds it to docs/adr/, so this passes only if the size
  // test is skipped for directories rather than guessed at.
  const d = baseline('decisions-directory-not-size-tested');
  expect('a directory-bound role is not size-tested', d, true);
}

// --- 2b. external authorities
{
  // The block is optional, and the baseline proves it: a project that declares
  // nothing outside the repository must stay coherent. Making it mandatory
  // would be ceremony charged to every adopter for a need only some have (A3).
  const d = baseline('no-authorities');
  expect('a project declaring no external authorities passes', d, true);
}
{
  const d = baseline('authorities-ok', {
    authorities: {
      gate: 'https://example.invalid/org/repo/settings/branches',
      tasks: 'https://example.invalid/org/repo/issues',
      secrets: null,
    },
  });
  expect('declared authorities pass, and null is a legitimate value', d, true);
}
{
  // Same reasoning as an invented artefact role: a key no rule refers to would
  // be read by nothing, so accepting it would let a project believe it had
  // declared something.
  const d = baseline('authorities-unknown', {
    authorities: { deployment: 'https://example.invalid/deploys' },
  });
  expect('an invented authority fails', d, false, ['authorities']);
}
{
  const d = baseline('authorities-empty', { authorities: { gate: '   ' } });
  expect('an empty authority fails', d, false, ['authorities']);
}
{
  const d = baseline('authorities-not-object', { authorities: ['a board'] });
  expect('authorities given as an array fails', d, false, ['authorities']);
}
{
  // method.json is the one file the placeholder check never scans, and the one
  // most likely to be copied from a template and half filled in.
  const d = baseline('authorities-placeholder', {
    authorities: { tasks: '«where your tasks live»' },
  });
  expect('an authority left as a template placeholder fails', d, false, ['authorities']);
}
{
  // The point of declaring one: the blind-spot line stops saying "verify it
  // there" and says where. Asserted on the report, because this is not a
  // verdict — it is the check telling the reader what it could not decide.
  const d = baseline('authorities-named-in-report', {
    authorities: { gate: 'https://example.invalid/org/repo/settings/branches' },
  });
  expectSays(
    'a declared authority is named where the check admits its blind spot',
    d,
    /not verified here[\s\S]*G1 —[\s\S]*verify it at: https:\/\/example\.invalid\/org\/repo\/settings\/branches/
  );
}
{
  // The mirror: with nothing declared, the line must not invent a destination.
  const d = baseline('authorities-absent-in-report');
  expectSays(
    'with no authority declared the blind-spot line offers no destination',
    d,
    /^(?![\s\S]*verify it at:)[\s\S]*$/
  );
}

// --- 3. adaptations
{
  const d = baseline('unknown-rule', {
    adaptations: [
      { rule: 'Z9', change: 'dropped', reason: 'a reason long enough to pass the length bar', decided: '2026-01-01' },
    ],
  });
  expect('an adaptation naming a rule that does not exist fails', d, false, ['adaptations']);
}
{
  const d = baseline('thin-reason', {
    adaptations: [{ rule: 'D2', change: 'dropped', reason: 'no', decided: '2026-01-01' }],
  });
  expect('an adaptation with a throwaway reason fails', d, false, ['adaptations']);
}
{
  const d = baseline('no-date', {
    adaptations: [
      { rule: 'D2', change: 'dropped', reason: 'a reason long enough to pass the length bar' },
    ],
  });
  expect('an adaptation with no decided date fails', d, false, ['adaptations']);
}
{
  const d = baseline('deferred-no-trigger', {
    adaptations: [
      { rule: 'E1', change: 'deferred', reason: 'we do not have a build chain in place yet', decided: '2026-01-01' },
    ],
  });
  expect('a deferred rule with no trigger fails', d, false, ['adaptations']);
}
{
  const d = baseline('deferred-with-trigger', {
    adaptations: [
      { rule: 'E1', change: 'deferred', reason: 'no build chain yet; applies once CI runs on every change', decided: '2026-01-01' },
    ],
  });
  expect('a deferred rule with a named trigger passes', d, true);
}
{
  const d = baseline('duplicate', {
    adaptations: [
      { rule: 'D2', change: 'dropped', reason: 'a reason long enough to pass the length bar', decided: '2026-01-01' },
      { rule: 'D2', change: 'narrowed', reason: 'a different reason, also long enough to pass', decided: '2026-01-02' },
    ],
  });
  expect('the same rule adapted twice fails', d, false, ['adaptations']);
}
{
  // The placeholder shipped in agent-manual/method.json. It used to name a real
  // rule with a valid reason and date, so a template copied unread passed the
  // check with decision immutability silently switched off.
  const d = baseline('placeholder-adaptation', {
    adaptations: [
      { rule: 'EXAMPLE', change: 'dropped', reason: 'Delete this entry, or replace EXAMPLE with a real rule identifier.', decided: '2026-01-01' },
    ],
  });
  expect('the template placeholder adaptation fails', d, false, ['adaptations']);
  // The verdict alone does not test this branch: delete it and the entry falls
  // through to "rule EXAMPLE is not in the catalogue", which fails too. What the
  // branch is for is the sentence — it tells a reader that the file they copied
  // was a template, which "not in the catalogue" leaves them to work out.
  expectSays(
    'the placeholder adaptation is named as a template left unread',
    d,
    /placeholder entry from agent-manual\/method\.json/
  );
}
{
  // An unreadable change kind must not count as an adaptation. If it did, a
  // malformed line would switch a rule off — and the report would then crash
  // formatting it.
  const d = baseline('unknown-change', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: null,
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
    adaptations: [
      { rule: 'D1', change: null, reason: 'no decision records are kept in this project at all', decided: '2026-01-01' },
    ],
  });
  rmSync(join(d, 'docs/adr'), { recursive: true });
  expect('an unknown change kind fails and does not adapt the rule', d, false, [
    'adaptations',
    'accounting',
  ]);
}

// --- 4. links
{
  const d = baseline('dead-link');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the plan](../PLAN.md).\n');
  expect('a link to a file that does not exist fails', d, false, ['links']);
}
{
  const d = baseline('dead-anchor');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the log](method-log.md#nowhere).\n');
  expect('a link to an anchor that does not exist fails', d, false, ['links']);
}
{
  const d = baseline('live-anchor');
  put(d, 'docs/method-log.md', '# Method log\n\n<a id="here"></a>\n## An entry\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the log](method-log.md#here).\n');
  expect('a link to an explicit anchor that exists passes', d, true);
}
{
  const d = baseline('link-in-fence');
  put(d, 'docs/STATUS.md', '# Status\n\n```\nSee [the plan](../PLAN.md).\n```\n');
  expect('a dead link inside a fenced example is not a finding', d, true);
}
{
  // Regression: JavaScript's \w is ASCII-only, so an earlier slug
  // approximation dropped the umlaut and reported every link to a German
  // heading as broken. Any project not written in English met a check that was
  // wrong about all of it.
  const d = baseline('non-ascii-heading');
  put(d, 'docs/method-log.md', '# Log\n\n## Erwünschtes Verhalten\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the section](method-log.md#erwünschtes-verhalten).\n');
  expect('a link to a heading with non-ASCII letters passes', d, true);
}
{
  const d = baseline('cjk-heading');
  put(d, 'docs/method-log.md', '# Log\n\n## 設計の記録\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the section](method-log.md#設計の記録).\n');
  expect('a link to a heading in a non-Latin script passes', d, true);
}
{
  // Platforms disagree about whether an em dash survives slug generation, so
  // both plausible slugs are accepted rather than guessing one.
  const d = baseline('em-dash-heading-kept');
  put(d, 'docs/method-log.md', '# Log\n\n## G1 — The gate\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [it](method-log.md#g1---the-gate).\n');
  expect('an em-dash heading slug that keeps the dash passes', d, true);
}
{
  const d = baseline('em-dash-heading-dropped');
  put(d, 'docs/method-log.md', '# Log\n\n## G1 — The gate\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [it](method-log.md#g1--the-gate).\n');
  expect('an em-dash heading slug that drops the dash also passes', d, true);
}
{
  // Permissive must not mean toothless: a heading that simply is not there
  // still has to fail.
  const d = baseline('genuinely-absent-anchor');
  put(d, 'docs/method-log.md', '# Log\n\n## Erwünschtes Verhalten\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [it](method-log.md#unerwünschtes-verhalten).\n');
  expect('a link to a heading that really is absent still fails', d, false, ['links']);
}
{
  // The exclusion list named three schemes, so every other one was read as a
  // path relative to the document and reported as broken. `.obsidian` is in
  // DEFAULT_IGNORES, so an Obsidian vault is a target this check knows it will
  // meet, and `obsidian://` links are ordinary there.
  const d = baseline('link-uri-schemes');
  put(d, 'docs/STATUS.md',
    '# Status\n\nCall [us](tel:+49123456), read [the hosts file](file:///etc/hosts),\n' +
      'open [the vault](obsidian://open?vault=x), [the editor](vscode://file/x),\n' +
      '[the channel](slack://channel?id=1) or [the archive](ftp://example.invalid/x).\n');
  expect('a link with any URI scheme is not a relative path', d, true);
}
{
  // A path with a space is written percent-encoded, and the file system knows
  // nothing about that encoding. Testing the raw form alone reported the link as
  // broken while the file sat right there.
  const d = baseline('link-percent-encoded');
  put(d, 'docs/my notes/x.md', '# Notes\n\nHere.\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the notes](my%20notes/x.md).\n');
  expect('a percent-encoded target that exists passes', d, true);
}
{
  const d = baseline('link-percent-encoded-dead');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the notes](my%20notes/gone.md).\n');
  expect('a percent-encoded target that does not exist still fails', d, false, ['links']);
}
{
  // The form CommonMark provides for a destination containing spaces. The
  // brackets were read as part of the path, so the link failed against a file
  // that was there.
  const d = baseline('link-angle-brackets');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the rules](<../CLAUDE.md>).\n');
  expect('an angle-bracketed target that exists passes', d, true);
}
{
  const d = baseline('link-angle-brackets-dead');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the plan](<../PLAN.md>).\n');
  expect('an angle-bracketed target that does not exist still fails', d, false, ['links']);
}
{
  // A title after the destination made the whole link invisible to the scan —
  // a silent no-op rather than a false alarm, which is the failure E3 is about.
  const d = baseline('link-with-title');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the rules](../CLAUDE.md "the operating rules").\n');
  expect('a link carrying a title passes when its target exists', d, true);
}
{
  const d = baseline('link-with-title-dead');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the plan](../PLAN.md "the plan").\n');
  expect('a link carrying a title fails when its target does not', d, false, ['links']);
}
{
  // Reference definitions went unread entirely. A definition pointing nowhere is
  // a broken link however many places use it — including none.
  const d = baseline('link-reference-definition-dead');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the plan][1].\n\n[1]: ../PLAN.md\n');
  expect('a reference definition pointing nowhere fails', d, false, ['links']);
}
{
  const d = baseline('link-reference-definition-live');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the rules][1].\n\n[1]: ../CLAUDE.md\n');
  expect('a reference definition that resolves passes', d, true);
}
{
  // The nearest legitimate neighbour, and it is not a near miss but a different
  // syntax: a GFM footnote definition's body is prose. Reading one as a path
  // would report every footnote in a document as a broken link.
  const d = baseline('link-footnote-definition');
  put(d, 'docs/STATUS.md',
    '# Status\n\nThe gate is the human.[^1]\n\n[^1]: Decided long before this file existed.\n');
  expect('a footnote definition is not read as a path', d, true);
}
{
  // A heading that is itself a link contributes its text to the slug, not its
  // destination. The two used to be glued together, so every link to such a
  // heading failed.
  const d = baseline('anchor-heading-is-a-link');
  put(d, 'docs/method-log.md', '# Log\n\n## [The gate](STATUS.md)\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [it](method-log.md#the-gate).\n');
  expect('a link to a heading that is itself a link passes', d, true);
}
{
  // A heading opening with punctuation the slug strips leaves a space there, and
  // platforms disagree about whether the resulting slug keeps the edge hyphen.
  // Same trade as the dash variants: accept both rather than guess.
  const d = baseline('anchor-leading-hyphen');
  put(d, 'docs/method-log.md', '# Log\n\n## [!] Launch\n\ntext\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [it](method-log.md#-launch).\n');
  expect('a slug with a leading hyphen from stripped punctuation passes', d, true);
}
{
  // C5's Binding leaves the link syntax to the project: a wiki-style `[[doc]]`
  // costs a fraction of the characters, which decides whether a corpus of
  // hundreds of documents fits in an agent's context at all. Such a project is
  // following C5 and getting nothing from its automated part — so the number of
  // references read is printed, and zero is the number to look for. Without it
  // the scan reports success having decided nothing, which is the silent no-op
  // E3 is about arriving as a green result.
  const d = baseline('links-wiki-syntax');
  put(d, 'CLAUDE.md', '# Rules\n\nThe human merges every change.\n');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [[the-plan]] and [[another-thing]].\n');
  put(d, 'docs/method-log.md', '# Method log\n\nNo entries.\n');
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Accepted |\n');
  put(d, 'docs/adr/0001-first.md', '# 0001 — First\n\n- **Status:** Accepted\n');
  expect('wiki-style links are not read as broken links', d, true);
  expectSays(
    'a run that read no references says so instead of reporting success',
    d,
    /no references were read at all/
  );
}
{
  // The mirror: an ordinary link must be counted, or the number above is a
  // constant rather than a measurement.
  const d = baseline('links-counted');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the log](method-log.md).\n');
  expectSays(
    'the number of references read is reported',
    d,
    /1 reference\(s\) read and resolved/
  );
}
{
  // The link scan belongs to C5, so a project that declares C5 adapted is not
  // held to it. Without this case the gate could be removed and every other
  // link case would still pass.
  const d = baseline('links-adapted', {
    adaptations: [
      { rule: 'C5', change: 'dropped', reason: 'the documents are generated and the generator owns cross-references', decided: '2026-01-01' },
    ],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the plan](../PLAN.md).\n');
  expect('an adapted C5 stops the link scan', d, true);
}
{
  // The bug this closes, reproduced exactly: the gate asked only whether an
  // adaptation existed, so declaring a rule `narrowed` — a claim that it still
  // applies — switched its check off as completely as `dropped` would. A
  // project could tighten a rule on paper and stop verifying it entirely.
  const d = baseline('narrowed-keeps-the-check', {
    adaptations: [
      { rule: 'L1', change: 'narrowed', reason: 'British spelling is required in docs/ only; drafts elsewhere are free', decided: '2026-01-01' },
    ],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior and color of it.\n');
  expect('a narrowed rule keeps its check running', d, false, ['language']);
}
{
  // The nearest legitimate case to the one above: `replaced` means the concern
  // is met by a mechanism this check does not know, so its findings would not
  // be defects. It must still switch the check off.
  const d = baseline('replaced-stops-the-check', {
    adaptations: [
      { rule: 'L1', change: 'replaced', reason: 'a house style tool owns spelling and runs on every change', decided: '2026-01-01' },
    ],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior and color of it.\n');
  expect('a replaced rule stops its check', d, true);
}
{
  const d = baseline('deferred-stops-the-check', {
    adaptations: [
      { rule: 'L1', change: 'deferred', reason: 'drafting in mixed variants until the first release is cut', decided: '2026-01-01' },
    ],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior and color of it.\n');
  expect('a deferred rule stops its check', d, true);
}
{
  // A switched-off check used to be visible only in the listing --quiet
  // suppresses, so the quietest run was the one that hid the most. It belongs
  // in the blind-spot section, which is always printed.
  const d = baseline('suspended-is-named', {
    adaptations: [
      { rule: 'L1', change: 'dropped', reason: 'contributors write in several variants and that is fine here', decided: '2026-01-01' },
    ],
  });
  expectSays(
    'a check switched off by the declaration is named even under --quiet',
    d,
    /not verified here[\s\S]*L1 — dropped by this project's declaration/
  );
}
{
  // The mirror: a narrowed rule keeps its check, so it must *not* appear as a
  // blind spot. Reporting one that did run is the same defect in the other
  // direction — it teaches the reader to skim the section.
  const d = baseline('narrowed-is-not-named', {
    adaptations: [
      { rule: 'L1', change: 'narrowed', reason: 'British spelling is required in docs/ only; drafts elsewhere are free', decided: '2026-01-01' },
    ],
  });
  expectSays(
    'a narrowed rule is not listed among the checks that did not run',
    d,
    /^(?![\s\S]*L1 — narrowed by this project's declaration)[\s\S]*$/
  );
}

// --- 5. decisions
{
  const d = baseline('unlisted-decision');
  put(d, 'docs/adr/0002-second.md', '# 0002 — Second\n\n- **Status:** Proposed\n');
  expect('a decision missing from the index fails', d, false, ['decisions']);
}
{
  const d = baseline('status-disagreement');
  put(d, 'docs/adr/0001-first.md', '# 0001 — First\n\n- **Status:** Superseded\n');
  expect('a status that disagrees with the index fails', d, false, ['decisions']);
}
{
  const d = baseline('decisions-dropped', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: null,
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
    adaptations: [
      { rule: 'D1', change: 'dropped', reason: 'no formal records; the canon note carries dated changes', decided: '2026-01-01' },
    ],
  });
  rmSync(join(d, 'docs/adr'), { recursive: true });
  expect('an unbound decisions role with the owning rule adapted passes', d, true);
}
{
  // The hole this closes: accounting used to accept *any* adaptation for *any*
  // unbound role, so an unrelated one satisfied all four.
  const d = baseline('decisions-dropped-wrong-rule', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: null,
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
    adaptations: [
      { rule: 'L1', change: 'dropped', reason: 'contributors write in several variants and that is fine here', decided: '2026-01-01' },
    ],
  });
  rmSync(join(d, 'docs/adr'), { recursive: true });
  expect('an unbound role explained by an unrelated adaptation fails', d, false, [
    'accounting',
  ]);
}

// --- 5b. the role-to-rule table, one case per role
{
  // The table said `state` → D3 for the whole of catalogue 0.3, and nothing
  // noticed: the mutation `ROLE_RULES.state = 'L1'` passed all 73 cases there
  // were. A table that decides which adaptation counts is only as good as the
  // cases pinning it, so there is now one per role, and each fails if its own
  // entry moves.
  const OWNERS = [
    ['operating-rules', 'C3', 'the agent reads its instructions from a wiki this repository does not hold'],
    ['decisions', 'D1', 'no formal records; the canon note carries dated changes instead'],
    ['state', 'S3', 'the board is the state artefact and it lives in the tracker'],
    ['method-log', 'M1', 'the method is not written down separately in this project'],
  ];
  const unbind = (role) =>
    Object.fromEntries(
      OWNERS.map(([r]) => [
        r,
        r === role
          ? null
          : { 'operating-rules': 'CLAUDE.md', decisions: 'docs/adr/', state: 'docs/STATUS.md', 'method-log': 'docs/method-log.md' }[r],
      ])
    );
  for (const [role, owner, reason] of OWNERS) {
    const d = baseline(`role-owner-${role}`, {
      artefacts: unbind(role),
      adaptations: [{ rule: owner, change: 'dropped', reason, decided: '2026-01-01' }],
    });
    expect(`an unbound "${role}" is accounted for by ${owner}`, d, true);
  }
}
{
  // The bypass the stale table opened, kept as a case in its own right: D3
  // reads the state artefact, S3 is what requires it. Adapting the reader must
  // not switch off the check belonging to the rule that demands the thing.
  const d = baseline('state-unbound-wrong-rule', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/adr/',
      state: null,
      'method-log': 'docs/method-log.md',
    },
    adaptations: [
      { rule: 'D3', change: 'dropped', reason: 'the decided-versus-built gap is published in the tracker instead', decided: '2026-01-01' },
    ],
  });
  expect('an unbound "state" explained by D3 rather than S3 fails', d, false, [
    'accounting',
  ]);
  expectSays(
    'the accounting finding for an unbound "state" names S3',
    d,
    /Role "state" is unbound, but rule S3 is still in force/
  );
}
{
  // The Nygard record is the most widespread decision-record format there is,
  // and D1's own Binding points people at it. The status was read only from the
  // line carrying the label, so for a project using this format the one
  // automated check with any content to it decided nothing, on every record.
  const d = baseline('nygard-status-agrees');
  put(d, 'docs/adr/0001-first.md',
    '# 0001 — First\n\n## Status\n\nAccepted\n\n## Context\n\nSomething.\n');
  expect('a Nygard-format status matching the index passes', d, true);
}
{
  const d = baseline('nygard-status-disagrees');
  put(d, 'docs/adr/0001-first.md',
    '# 0001 — First\n\n## Status\n\nSuperseded\n\n## Context\n\nSomething.\n');
  expect('a Nygard-format status disagreeing with the index fails', d, false, [
    'decisions',
  ]);
}
{
  // Neither shape present. This must stay a note rather than become a finding —
  // a record whose status this parser cannot find is not thereby wrong — but the
  // reader has to be told which check went past without deciding anything.
  const d = baseline('status-in-neither-shape');
  put(d, 'docs/adr/0001-first.md', '# 0001 — First\n\nWe decided to do the thing.\n');
  expectSays(
    'a record with no readable status is named in the report',
    d,
    /not verified here[\s\S]*0001-first\.md: no status found/
  );
}
{
  // Two records wearing one number, both agreeing with the index: the run was
  // green and said nothing. "Decision 0001" then names two documents, and a
  // reference to it points at whichever the reader finds first — the same defect
  // as two rules sharing an identifier, which the catalogue parser refuses
  // outright.
  const d = baseline('duplicate-decision-number');
  put(d, 'docs/adr/0001-again.md', '# 0001 — Also first\n\n- **Status:** Accepted\n');
  expect('two decision files sharing a number fails', d, false, ['decisions']);
}
{
  // The same in the index: `Map.set` kept the last row, so whichever a reader
  // stopped at was the status they believed.
  const d = baseline('duplicate-index-row');
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n' +
      '| 0001 | First | Accepted |\n| 0001 | First, again | Accepted |\n');
  expect('the index claiming one decision twice fails', d, false, ['decisions']);
}
{
  // A row with a status nothing recognises used to be dropped, so the decision
  // looked *absent* from an index it was listed in and the finding named the
  // wrong cause.
  const d = baseline('index-invented-status');
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Agreed |\n');
  expect('a row with an unrecognised status fails', d, false, ['decisions']);
  expectSays(
    'the finding names the invented status rather than a missing row',
    d,
    /with status "Agreed", which is not one of/
  );
}
{
  // An index nothing can read, with no records to disagree with it. Every other
  // decision case reaches a finding through a *file*, so removing the guard on
  // an unreadable index left them all green — the one arrangement where the
  // index is the only thing there is, and D2 has nothing to compare.
  const d = baseline('index-with-no-readable-status');
  rmSync(join(d, 'docs/adr/0001-first.md'));
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Done |\n');
  expect('an index with no recognised status anywhere fails', d, false, ['decisions']);
}
{
  const d = baseline('index-row-without-file');
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Accepted |\n| 0002 | Second | Accepted |\n');
  expect('an index row whose decision file is missing fails', d, false, ['decisions']);
}
{
  const d = baseline('index-planned-row');
  put(d, 'docs/adr/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Accepted |\n| 0002 | Second | Planned |\n');
  expect('a Planned row with no file yet passes', d, true);
}
{
  // Regression: the number was read from the whole relative path, so a project
  // filing decisions under a year directory saw every one of them collapse
  // onto that year.
  const d = baseline('decisions-in-year-directory', {
    artefacts: {
      'operating-rules': 'CLAUDE.md',
      decisions: 'docs/2026/',
      state: 'docs/STATUS.md',
      'method-log': 'docs/method-log.md',
    },
  });
  rmSync(join(d, 'docs/adr'), { recursive: true });
  put(d, 'docs/2026/README.md',
    '# Decisions\n\n| # | Title | Status |\n|---|---|---|\n| 0001 | First | Accepted |\n');
  put(d, 'docs/2026/0001-first.md', '# 0001 — First\n\n- **Status:** Accepted\n');
  expect('a decision under a four-digit directory is read from its file name', d, true);
}

// --- 6. withdrawn rules
{
  const cat = catalogueWithWithdrawal('cat-withdrawn', 'mechanical changes may go straight');
  const d = baseline('teaches-withdrawn');
  put(d, 'CLAUDE.md', '# Rules\n\nSmall mechanical changes may go straight to the trunk.\n');
  expect('a document still asserting a withdrawn rule fails', d, false, ['withdrawn'], cat);
}
{
  const cat = catalogueWithWithdrawal('cat-withdrawn-2', 'mechanical changes may go straight');
  const d = baseline('quotes-withdrawn');
  put(d, 'docs/adr/0001-first.md',
    '# 0001 — First\n\n- **Status:** Accepted\n\n## Amendments\n\nPreviously read:\n\n' +
    '> Small mechanical changes may go straight to the trunk.\n\nWithdrawn on 2026-07-27.\n');
  expect('the same wording quoted in a blockquote passes', d, true, [], cat);
}
{
  const cat = catalogueWithWithdrawal('cat-withdrawn-3', 'mechanical changes may go straight');
  const d = baseline('fences-withdrawn');
  put(d, 'docs/STATUS.md',
    '# Status\n\nThe old rule was:\n\n```\nSmall mechanical changes may go straight to the trunk.\n```\n');
  expect('the same wording inside a fenced example passes', d, true, [], cat);
}
{
  // The scan used to test line by line, so a pattern that a hard wrap had split
  // across two lines could never fire — and prose wrapped at a fixed width
  // splits phrases constantly. This is the silent no-op E3 warns about, built
  // into the mechanism meant to prevent it.
  //
  // The wrap is placed *inside* the pattern on purpose. An earlier version of
  // this fixture broke the line between "small" and "mechanical", which left the
  // whole pattern sitting on one line — so the case passed line by line too and
  // proved nothing about paragraphs. A mutation swapping the paragraph scan back
  // for the line scan survived it.
  const cat = catalogueWithWithdrawal('cat-withdrawn-4', 'mechanical changes may go straight');
  const d = baseline('withdrawn-across-a-wrap');
  put(d, 'CLAUDE.md',
    '# Rules\n\nThere is one exception worth stating: small mechanical\nchanges may go straight to the trunk without review.\n');
  expect('a withdrawn phrase split across a line break still fails', d, false, ['withdrawn'], cat);
}
{
  const cat = catalogueWithWithdrawal('cat-withdrawn-5', 'mechanical changes may go straight');
  const d = baseline('withdrawn-quoted-across-a-wrap');
  put(d, 'docs/STATUS.md',
    '# Status\n\nPreviously:\n\n> There is one exception: small mechanical\n> changes may go straight to the trunk.\n');
  expect('the same split phrase quoted in a blockquote passes', d, true, [], cat);
}
{
  // A group repeating something already repeatable takes exponential time on
  // input that nearly matches, and this pattern runs against every paragraph of
  // every document. Measured before the fix: `(a+)+b` against 34 `a`s and a `c`
  // had not finished after 45 seconds — so the failure is a hang with nothing
  // saying which entry caused it. Refusing to compile it is the only outcome the
  // reader can act on, and the right moment is before the first entry exists.
  const cat = catalogueWithWithdrawal('cat-redos', '(mechanical +)+changes');
  expectRefused(
    'a withdrawn pattern with a nested quantifier is refused',
    cat,
    baseline('vs-redos-catalogue')
  );
}
{
  // The nearest legitimate case, and it is the example withdrawn.md itself
  // gives: `(ly)?` quantifies a group, but nothing inside the group repeats, so
  // there is nothing to divide. A detector that could not tell the two apart
  // would reject the document's own worked example.
  const cat = catalogueWithWithdrawal(
    'cat-quantified-group',
    'direct(ly)? (commit|push).{0,40}(status flip|mechanical)'
  );
  const d = baseline('withdrawn-quantified-group');
  put(d, 'CLAUDE.md', '# Rules\n\nYou may directly push a status flip.\n');
  expect('a quantified group with no inner repetition still works', d, false, [
    'withdrawn',
  ], cat);
}
{
  // The other side of the same line: an exact count is not ambiguous, so
  // `(ab{2})+` divides only one way and must be accepted. This pattern matches
  // nothing in the project, which is the point — it has to compile.
  const cat = catalogueWithWithdrawal('cat-exact-count', '(ab{2})+ is fine');
  expect(
    'a group repeating an exactly counted atom is accepted',
    baseline('withdrawn-exact-count'),
    true,
    [],
    cat
  );
}
{
  // The subtlest neighbour: escaped parentheses are literal text, so nothing
  // here is a group at all. A detector that read the pattern with a regular
  // expression instead of scanning it would see `(b+)+` and reject a pattern
  // about the characters "(" and ")". The backslash is built from its code point
  // rather than typed, so that no layer between here and the file can eat it.
  const B = String.fromCharCode(92);
  const cat = catalogueWithWithdrawal('cat-escaped-parens', `a${B}(b+${B})+c`);
  const d = baseline('withdrawn-escaped-parens');
  put(d, 'CLAUDE.md', '# Rules\n\nThe old wording was a(bbb)c and it is gone.\n');
  expect('escaped parentheses are literal, not a nested group', d, false, ['withdrawn'], cat);
}

// --- 7. language
{
  const d = baseline('americanism');
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('American spelling under a British regime fails', d, false, ['language']);
}
{
  const d = baseline('ize-ending');
  put(d, 'docs/STATUS.md', '# Status\n\nWe will organize the work into phases.\n');
  expect('an -ize ending under a British regime fails', d, false, ['language']);
}
{
  const d = baseline('allowed-ize');
  put(d, 'docs/STATUS.md', '# Status\n\nThe size of the repository is deliberate; we resize nothing.\n');
  expect('an -ize word that is correct everywhere passes', d, true);
}
{
  const d = baseline('americanism-in-code');
  put(d, 'docs/STATUS.md', '# Status\n\nThe token is named `--color` and set in the `analyze` step.\n');
  expect('American spelling inside code spans is not a finding', d, true);
}
{
  const d = baseline('americanism-in-url');
  put(d, 'docs/STATUS.md', '# Status\n\nSee [the guide](https://example.com/color/analyze).\n');
  expect('American spelling inside a link target is not a finding', d, true);
}
{
  const d = baseline('americanism-declared', { language: { spelling: 'american' } });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('American spelling under an American regime passes', d, true);
}
{
  const d = baseline('language-adapted', {
    adaptations: [
      { rule: 'L1', change: 'dropped', reason: 'contributors write in several variants and that is fine here', decided: '2026-01-01' },
    ],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('an adapted L1 stops the spelling scan', d, true);
}
{
  // The allow-list held base forms only, so every inflection of a word that is
  // correct everywhere fired. A false alarm in the check that enforces L1 is
  // the worst place for one.
  const d = baseline('ize-inflections');
  put(d, 'docs/STATUS.md',
    '# Status\n\nAfter downsizing the fixtures we prized the resizable output, and nothing capsized.\n');
  expect('inflections of always-correct -ize words pass', d, true);
}
{
  // The mirror: `-izer`, `-izable` and `-izational` slipped through, because
  // the pattern only knew the verb endings.
  const d = baseline('ize-derivations');
  put(d, 'docs/STATUS.md', '# Status\n\nThe organizer left an organizational note.\n');
  expect('-izer and -izational endings are caught', d, false, ['language']);
}
{
  // The scan compares against a word list, so a proper noun or a foreign word
  // that happens to be an American spelling of something fires. Until now the
  // only escape was `ignore`, which puts a whole document outside every scan to
  // spare one word.
  const d = baseline('language-allow', {
    language: { spelling: 'british', allow: ['Liter', 'Meter'] },
  });
  put(d, 'docs/STATUS.md', '# Status\n\nThe Liter and Meter units keep their German spelling.\n');
  expect('a declared word exemption passes', d, true);
  expectSays(
    'the exempt words are named in the report',
    d,
    /word\(s\) are exempt from the spelling scan by declaration: Liter, Meter/
  );
}
{
  // The neighbour that matters: the same document without the exemption fails,
  // so the case above is testing the exemption rather than a word the list never
  // knew.
  const d = baseline('language-allow-absent');
  put(d, 'docs/STATUS.md', '# Status\n\nThe Liter and Meter units keep their German spelling.\n');
  expect('the same words without an exemption still fail', d, false, ['language']);
}
{
  // An exemption is for the words named in it, not a way out of the rule.
  const d = baseline('language-allow-is-narrow', {
    language: { spelling: 'british', allow: ['Liter'] },
  });
  put(d, 'docs/STATUS.md', '# Status\n\nOne Liter of a different color.\n');
  expect('an exemption covers only the words it names', d, false, ['language']);
}
{
  const d = baseline('language-allow-not-a-list', {
    language: { spelling: 'british', allow: 'Liter' },
  });
  expect('"language.allow" given as a string fails', d, false, ['declaration']);
}
{
  // `language` was read as `decl?.language?.spelling` and never checked, so the
  // obvious mistake produced the note saying no regime was declared — and L1
  // went unverified with nothing saying the declaration had been misread rather
  // than left out.
  const d = baseline('language-not-an-object', { language: 'british' });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('"language" given as a string fails', d, false, ['declaration']);
}
{
  // An array is the shape a string case cannot stand in for: `typeof []` is
  // "object", so every test but the array test lets it through, and
  // `[].spelling` is undefined — the run would report that no regime was
  // declared about a declaration that plainly declares one.
  const d = baseline('language-as-an-array', { language: ['british'] });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('"language" given as an array fails', d, false, ['declaration']);
}
{
  // The operating-rules artefact was exempt as a whole file, on the reasoning
  // that a document stating L1 must contain the spellings it forbids. The
  // reasoning holds for the mention, not for the file — and the operating rules
  // are often a project's longest document, unscanned end to end.
  const d = baseline('operating-rules-scanned');
  put(d, 'CLAUDE.md', '# Rules\n\nWe analyze the behavior of every change.\n');
  expect('the operating-rules artefact is scanned like any other', d, false, ['language']);
}
{
  // The exemption that is actually needed, and it already existed: naming the
  // forbidden spelling in a code span. This is how the catalogue states L1
  // about itself, so a check that fired here would make the rule unstatable.
  const d = baseline('operating-rules-quoting');
  put(d, 'CLAUDE.md',
    '# Rules\n\nBritish spelling: write `colour`, never `color`.\n\n' +
      '> Legacy wording: analyze the behavior.\n');
  expect('a forbidden spelling named in a code span or blockquote passes', d, true);
}

// --- 7a2. the honesty figure, and what may move it
{
  // H2 is `manual`. The count was built from "has an adaptation at all", so
  // declaring the rule `narrowed` — a claim that it still applies — took it out
  // of the figure while the listing above went on saying the check still runs.
  // The number undermined by the one adaptation kind the project built to stop
  // exactly that.
  const reason = 'the confidence bar applies to code, not to exploratory notes';
  const plain = manualCount(baseline('manual-count-plain'));
  const narrowed = manualCount(
    baseline('manual-count-narrowed', {
      adaptations: [{ rule: 'H2', change: 'narrowed', reason, decided: '2026-01-01' }],
    })
  );
  const dropped = manualCount(
    baseline('manual-count-dropped', {
      adaptations: [{ rule: 'H2', change: 'dropped', reason, decided: '2026-01-01' }],
    })
  );
  expectEquals('a narrowed manual rule stays in the honesty figure', narrowed, plain);
  expectEquals('a dropped manual rule leaves it', dropped, plain - 1);
}
{
  // An adaptation the check has just reported as unreadable used to switch the
  // rule's check off on the way past — the strongest possible reading of a line
  // it could not read. The reason here is too thin to be one, so L1's scan must
  // still run and the Americanism must still be found.
  const d = baseline('incomplete-adaptation-keeps-the-check', {
    adaptations: [{ rule: 'L1', change: 'dropped', reason: 'no', decided: '2026-01-01' }],
  });
  put(d, 'docs/STATUS.md', '# Status\n\nWe will analyze the behavior of the system.\n');
  expect('an incomplete adaptation does not switch its check off', d, false, [
    'adaptations',
    'language',
  ]);
}
{
  // The mirror, and the reason the fix cannot simply reject the entry: an
  // adaptation that is complete does switch the check off, and the report has to
  // say which of the two happened.
  const d = baseline('incomplete-adaptation-is-marked', {
    adaptations: [{ rule: 'C5', change: 'dropped', reason: 'no', decided: '2026-01-01' }],
  });
  expectSays(
    'the listing marks an incomplete adaptation as not having taken effect',
    d,
    /C5 dropped[^\n]*check still runs — this adaptation is incomplete/,
    [],
    false
  );
}

// --- 7b. placeholders left in a bound artefact
{
  const d = baseline('placeholder-in-artefact');
  put(d, 'docs/STATUS.md', '# Status\n\nProgress is tracked in «state artefact».\n');
  expect('a bound artefact still carrying a placeholder fails', d, false, [
    'placeholders',
  ]);
}
{
  // A template is supposed to contain placeholders. Only bound artefacts are
  // scanned, which is what keeps this from firing on every templates directory.
  const d = baseline('placeholder-in-template');
  put(d, 'templates/status.md', '# «Project» status\n\nProgress is in «state artefact».\n');
  expect('a placeholder in an unbound file is not a finding', d, true);
}

// --- 7c. declaration hygiene
{
  const d = baseline('ignore-as-string', { ignore: 'docs' });
  expect('"ignore" given as a string fails', d, false, ['declaration']);
}
{
  // `ignore` names paths, not bare directory names: "docs/vendor" used to match
  // nothing at all.
  const d = baseline('ignore-as-path', { ignore: ['docs/vendor'] });
  put(d, 'docs/vendor/imported.md', '# Imported\n\nSee [nothing](../../gone.md).\n');
  expect('an ignored path is not scanned', d, true, [], REAL_CATALOGUE, []);
}
{
  const d = baseline('version-behind', { version: '0.0' });
  expect('a version behind the catalogue is reported, not failed', d, true);
  expectSays(
    'the note names both versions',
    d,
    new RegExp(`declared against catalogue version 0\\.0; this catalogue is ${CATALOGUE_VERSION.replace('.', '\\.')}`)
  );
}
{
  // The mirror, and the case that keeps the baseline honest: a declaration that
  // matches the catalogue must produce no note at all. Without this, the
  // reference baseline can drift a version behind and every case starts emitting
  // the note the case above exists to isolate.
  expectSays(
    'a declaration level with the catalogue produces no version note',
    baseline('version-current'),
    /^(?![\s\S]*declared against catalogue version)[\s\S]*$/
  );
}

// --- 7c1. what the walk did not look at
{
  // A run over a directory with nothing in it printed "OK · the documents scan
  // clean" — the most confident thing this tool says, about no evidence at all.
  const d = bare('nothing-to-scan', {});
  expectSays(
    'a run that read nothing says so rather than reporting clean',
    d,
    /scanned 0 markdown file\(s\)/,
    ['--lint']
  );
}
{
  // Nine directory names are skipped at any depth. For `.git` that is obviously
  // right; `vendor` and `.obsidian` can hold real documents, and skipping those
  // in silence is a blind spot in the check that insists on naming its blind
  // spots everywhere else.
  const d = baseline('default-ignores-named');
  put(d, 'vendor/imported.md', '# Imported\n\nSee [nothing](../gone.md).\n');
  put(d, '.obsidian/notes.md', '# Vault\n\nSee [nothing](../gone.md).\n');
  expect('a broken link in a skipped directory is still not a finding', d, true);
  expectSays(
    'the skipped directories are named, with a count',
    d,
    /skipped 2 directory\/ies never scanned by default: [\s\S]*vendor/
  );
}

// --- 7c2. a copy of the method repository inside the project
/**
 * Put a plausible clone of the method repository at `rel` inside `dir`.
 *
 * Only the two files the detection looks for, plus a document with a broken link
 * — which is what an adopter's first run used to report by the hundred.
 */
function embedClone(dir, rel) {
  put(dir, `${rel}/method/rules.md`, '# Rules\n\nNot the reader\'s.\n');
  put(dir, `${rel}/checks/check-method.mjs`, '// not run from here\n');
  put(dir, `${rel}/README.md`, '# The method\n\nSee [gone](nowhere-at-all.md).\n');
}
{
  // The documented command used to clone into the project being checked, and the
  // clone's directory name is in nobody's ignore list — so the first run an
  // adopter ever made reported findings about files that were not theirs. The
  // command is fixed; this is the half that holds when somebody clones anyway.
  const d = baseline('embedded-method-clone');
  embedClone(d, 'agent-driven-development');
  expect('a copy of the method inside the project is not scanned', d, true);
  expectSays(
    'the report names the copy it skipped',
    d,
    /not verified here[\s\S]*copy\/ies of the method repository[\s\S]*agent-driven-development/
  );
}
{
  // Recognised by content, not by name. A name test would break the moment
  // somebody renamed the directory, and it would break in silence.
  const d = baseline('embedded-method-clone-renamed');
  embedClone(d, 'tools/method-of-the-house');
  expect('the copy is recognised under any directory name', d, true);
}
{
  // The mirror, and the case that stops this from becoming a hole: a directory
  // holding only one of the two markers is an ordinary part of the project, and
  // its documents are the reader's.
  const d = baseline('half-a-method-clone');
  put(d, 'docs/method/rules.md', '# Our own rules\n\nSee [gone](nowhere-at-all.md).\n');
  expect('a directory with only one marker is scanned as the project', d, false, [
    'links',
  ]);
}

// --- 7d. what reaches the terminal, and the arguments
{
  // Declaration values were printed as they came, so a string carrying ANSI
  // sequences acted on the terminal — and because the authorities block prints
  // *after* the findings, a declaration could scroll real findings off the
  // screen. The exit code was never wrong; the person reading the run was the
  // target, and reading the run is what --lint is advertised for.
  // Both characters are built from code points rather than typed. An ESC in a
  // source file is invisible, and the next person to touch this line would have
  // no way to see what makes the case a case.
  const ESC = String.fromCharCode(27);
  const SHOWN = String.fromCharCode(0xfffd);
  const d = baseline('authority-control-characters', {
    authorities: { gate: ESC + '[2K' + ESC + '[1Anothing to see' },
  });
  expectSays(
    'a control character in a declaration value is shown, not obeyed',
    d,
    // The escape must be gone from the output, and the replacement must be
    // there. Either half alone would pass for a check that dropped the value.
    new RegExp('^(?![\\s\\S]*' + ESC + ')[\\s\\S]*gate\\s+' + SHOWN + '\\[2K'),
    [],
    false
  );
}
{
  // The nearest legitimate case, and the reason the filter is a control-character
  // class rather than an allow-list: a board name is prose, in whatever language
  // and punctuation the project uses.
  const d = baseline('authority-non-ascii', {
    authorities: { tasks: 'Vorhaben · Übersicht — Spalte „offen"' },
  });
  expectSays(
    'non-ASCII in a declaration value survives unchanged',
    d,
    /tasks\s+Vorhaben · Übersicht — Spalte „offen"/,
    [],
    false
  );
}

/** Assert that a command line is refused outright rather than half-honoured. */
function expectRejectsArgs(label, args) {
  ran++;
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: 'utf8' });
  if (r.status === 2) {
    console.log(`ok    ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}`);
    console.log(`        expected exit 2, got ${r.status}`);
  }
}

{
  // The last positional argument used to win, in silence: one project was
  // checked, nothing was said about the other, and a CI line with a stray path
  // in it reported green about somewhere nobody looked.
  const d = baseline('two-paths-a');
  const e = baseline('two-paths-b');
  expectRejectsArgs('two project paths are refused', [d, e, '--catalogue', REAL_CATALOGUE]);
  expectRejectsArgs('an option that swallowed its value is refused', [
    d,
    '--catalogue',
  ]);
  expectRejectsArgs('an unknown option is refused', [
    d,
    '--catalogue',
    REAL_CATALOGUE,
    '--strict',
  ]);
}

// --- 8. --lint: the document scans, without a declaration
function bare(name, files) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) put(dir, rel, content);
  return dir;
}
{
  const d = bare('lint-clean', {
    'README.md': '# A project\n\nSee [the notes](notes.md).\n',
    'notes.md': '# Notes\n\nNothing yet.\n',
  });
  expect('--lint passes on a project with no method.json', d, true, [], REAL_CATALOGUE, [
    '--lint',
  ]);
}
{
  // Lint mode must stay opt-in. If the absence of a declaration ever stopped
  // being a finding by default, this case is what notices.
  const d = bare('lint-not-default', { 'README.md': '# A project\n\nNothing yet.\n' });
  expect('the same project without --lint fails on the declaration', d, false, [
    'declaration',
  ]);
}
{
  const d = bare('lint-dead-link', {
    'README.md': '# A project\n\nSee [the notes](notes.md).\n',
  });
  expect('--lint still catches a dead link', d, false, ['links'], REAL_CATALOGUE, [
    '--lint',
  ]);
}
{
  const d = bare('lint-spelling', {
    'README.md': '# A project\n\nWe will analyze the behavior of the system.\n',
  });
  expect(
    '--lint with --spelling catches an Americanism',
    d,
    false,
    ['language'],
    REAL_CATALOGUE,
    ['--lint', '--spelling', 'british']
  );
}
{
  const d = bare('lint-no-spelling', {
    'README.md': '# A project\n\nWe will analyze the behavior of the system.\n',
  });
  expect(
    '--lint without --spelling leaves spelling alone',
    d,
    true,
    [],
    REAL_CATALOGUE,
    ['--lint']
  );
}

// --- 9. the check must refuse to report success on a broken catalogue

/**
 * Assert that a catalogue is refused outright, rather than read and believed.
 *
 * `mustSay` is not decoration. Exit 2 also happens when the parser crashes, so a
 * guard can be deleted and the exit code stay the same while the message turns
 * into a stack trace about a value being null. Where that is the difference
 * between a refusal and an accident, the case says which one it wants.
 *
 * @param label     what this case is testing
 * @param catalogue catalogue directory
 * @param project   project directory
 * @param mustSay   optional pattern the refusal message has to match
 */
function expectRefused(label, catalogue, project, mustSay = null) {
  ran++;
  const r = spawnSync(process.execPath, [CHECK, project, '--catalogue', catalogue], {
    encoding: 'utf8',
  });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const problems = [];
  if (r.status !== 2) problems.push(`expected exit 2, got ${r.status}`);
  if (mustSay && !mustSay.test(out)) problems.push(`expected the refusal to match ${mustSay}`);
  if (problems.length) {
    failures++;
    console.log(`FAIL  ${label}`);
    for (const p of problems) console.log(`        ${p}`);
    console.log(out.split('\n').map((l) => `      | ${l}`).join('\n'));
  } else {
    console.log(`ok    ${label}`);
  }
}

{
  const cat = join(root, 'cat-empty');
  mkdirSync(cat, { recursive: true });
  writeFileSync(join(cat, 'rules.md'), '# Nothing here\n', 'utf8');
  writeFileSync(join(cat, 'withdrawn.md'), '# Withdrawn\n', 'utf8');
  expectRefused(
    'an empty catalogue is refused rather than passed',
    cat,
    baseline('vs-empty-catalogue')
  );
}
{
  // Map.set kept the last definition silently, so a duplicated identifier gave
  // a reader one rule and every check another. Identifiers are permanent, which
  // is the whole reason a project may refer to one.
  const cat = join(root, 'cat-duplicate');
  mkdirSync(cat, { recursive: true });
  writeFileSync(
    join(cat, 'rules.md'),
    readFileSync(join(REAL_CATALOGUE, 'rules.md'), 'utf8') +
      '\n<a id="g1"></a>\n### G1 — A second rule wearing the same identifier\n\n' +
      '**Why.** It should never be read.\n\n**Check:** `manual`\n',
    'utf8'
  );
  cpSync(join(REAL_CATALOGUE, 'withdrawn.md'), join(cat, 'withdrawn.md'));
  expectRefused(
    'a duplicated rule identifier is refused rather than silently overwritten',
    cat,
    baseline('vs-duplicate-catalogue')
  );
}
{
  // The nearest legitimate case: the same anchor and heading inside a fenced
  // example, which is how the catalogue would show an adopter what a rule looks
  // like. Fenced content is not a definition, and a check that could not tell
  // the difference would make the catalogue unable to document its own format.
  const cat = join(root, 'cat-fenced-example');
  mkdirSync(cat, { recursive: true });
  writeFileSync(
    join(cat, 'rules.md'),
    readFileSync(join(REAL_CATALOGUE, 'rules.md'), 'utf8') +
      '\n## Format\n\n```markdown\n<a id="g1"></a>\n### G1 — The human is the gate\n\n' +
      '**Check:** `manual`\n```\n',
    'utf8'
  );
  cpSync(join(REAL_CATALOGUE, 'withdrawn.md'), join(cat, 'withdrawn.md'));
  expect(
    'the same identifier inside a fenced example is not a duplicate',
    baseline('vs-fenced-example-catalogue'),
    true,
    [],
    cat
  );
}
{
  // A withdrawal entry missing a field is a pattern that never fires, dressed as
  // one that does. Without the guard the missing `Pattern:` compiled to the
  // literal `/null/i` — a scan that runs on every paragraph of every document
  // and matches the word "null", which is worse than no scan because the report
  // says the stale-rule check ran.
  const cat = join(root, 'cat-incomplete-withdrawal');
  mkdirSync(cat, { recursive: true });
  cpSync(join(REAL_CATALOGUE, 'rules.md'), join(cat, 'rules.md'));
  writeFileSync(
    join(cat, 'withdrawn.md'),
    '# Withdrawn rules\n\n## Entries\n\n' +
      '### W1 — the mechanical-change exception\n\n' +
      '- **Withdrawn:** 2026-07-27\n' +
      '- **Reason:** an exception whose boundary the agent decides is not a boundary\n' +
      '- **Instead:** every change reaches the trunk through review, without exception\n',
    'utf8'
  );
  expectRefused(
    'a withdrawal entry missing its pattern is refused rather than compiled',
    cat,
    baseline('vs-incomplete-withdrawal'),
    /is missing the \*\*Pattern:\*\* field/
  );
}

rmSync(root, { recursive: true, force: true });

console.log('');
console.log(`${ran} cases, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
