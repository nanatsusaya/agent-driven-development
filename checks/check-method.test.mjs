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

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, 'check-method.mjs');
const REAL_CATALOGUE = join(HERE, '..', 'method');

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
      version: '0.1',
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
  // The placeholder shipped in templates/method.json. It used to name a real
  // rule with a valid reason and date, so a template copied unread passed the
  // check with decision immutability silently switched off.
  const d = baseline('placeholder-adaptation', {
    adaptations: [
      { rule: 'EXAMPLE', change: 'dropped', reason: 'Delete this entry, or replace EXAMPLE with a real rule identifier.', decided: '2026-01-01' },
    ],
  });
  expect('the template placeholder adaptation fails', d, false, ['adaptations']);
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
  const cat = catalogueWithWithdrawal('cat-withdrawn-4', 'mechanical changes may go straight');
  const d = baseline('withdrawn-across-a-wrap');
  put(d, 'CLAUDE.md',
    '# Rules\n\nThere is one exception worth stating: small\nmechanical changes may go straight\nto the trunk without review.\n');
  expect('a withdrawn phrase split across a line break still fails', d, false, ['withdrawn'], cat);
}
{
  const cat = catalogueWithWithdrawal('cat-withdrawn-5', 'mechanical changes may go straight');
  const d = baseline('withdrawn-quoted-across-a-wrap');
  put(d, 'docs/STATUS.md',
    '# Status\n\nPreviously:\n\n> There is one exception: small\n> mechanical changes may go straight\n> to the trunk.\n');
  expect('the same split phrase quoted in a blockquote passes', d, true, [], cat);
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
{
  const cat = join(root, 'cat-empty');
  mkdirSync(cat, { recursive: true });
  writeFileSync(join(cat, 'rules.md'), '# Nothing here\n', 'utf8');
  writeFileSync(join(cat, 'withdrawn.md'), '# Withdrawn\n', 'utf8');
  ran++;
  const r = spawnSync(
    process.execPath,
    [CHECK, baseline('vs-empty-catalogue'), '--catalogue', cat],
    { encoding: 'utf8' }
  );
  if (r.status === 2) {
    console.log('ok    an empty catalogue is refused rather than passed');
  } else {
    failures++;
    console.log(`FAIL  an empty catalogue is refused rather than passed`);
    console.log(`        expected exit 2, got ${r.status}`);
  }
}

rmSync(root, { recursive: true, force: true });

console.log('');
console.log(`${ran} cases, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
