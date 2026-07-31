#!/usr/bin/env node
/**
 * Mutation harness for the coherence check.
 *
 * The counter-test answers "does the check fire on a violation?". This answers
 * the question behind it: **would anything notice if the check stopped firing?**
 * Each mutation below breaks one protective mechanism on purpose and runs the
 * whole counter-test against the damaged copy. A mutation that survives is a
 * mechanism nobody is holding to account — the state E3 exists to prevent, and
 * the state a green suite is least able to reveal.
 *
 * The pattern worth knowing: survivors cluster in mechanisms whose *comment*
 * describes a bug that already happened, where the fix was made and no case was
 * added. `ROLE_RULES.state` was one of those, and it was wrong for a whole
 * catalogue version.
 *
 * No score is published anywhere, deliberately. A published score is a number
 * that goes stale without failing, which is the defect this repository already
 * met twice. Instead every mutation in the list **must** be caught: a survivor
 * exits 1. A mutation that cannot be caught belongs in `KNOWN_SURVIVORS` with the
 * reason, where it reads as a decision rather than an oversight.
 *
 * Not part of `npm run lint`. It runs the counter-test once per mutation, so it
 * costs what that suite costs multiplied by the number of mutations — minutes,
 * not seconds. Run it after changing the check.
 *
 * Usage: node mutate.mjs [--only <substring>] [--list]
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/**
 * One mutation: a file, an exact string in it, and what to put there instead.
 *
 * `from` must occur exactly once. A harness whose mutation lands somewhere other
 * than where its label claims reports a score about something nobody chose, so a
 * count other than one is an error rather than a warning.
 */
const MUTATIONS = [
  // --- the adaptation gate: which kinds switch a check off
  {
    label: 'narrowed switches its check off again',
    file: 'checks/check-method.mjs',
    from: "new Set(['dropped', 'replaced', 'deferred'])",
    to: "new Set(['dropped', 'replaced', 'deferred', 'narrowed'])",
  },
  {
    label: 'an incomplete adaptation switches its check off',
    file: 'checks/check-method.mjs',
    from: 'Boolean(a) && a.complete && SUSPENDS_CHECK.has(a.change)',
    to: 'Boolean(a) && SUSPENDS_CHECK.has(a.change)',
  },
  {
    label: 'the honesty figure counts any adaptation as a suspension',
    file: 'checks/check-method.mjs',
    from: "r.check === 'manual' && !suspends(adapted.get(r.id))",
    to: "r.check === 'manual' && !adapted.has(r.id)",
  },

  // --- the role-to-rule table, one mutation per entry
  {
    label: 'the operating-rules role is accounted for by the wrong rule',
    file: 'checks/check-method.mjs',
    from: "  'operating-rules': 'C3',",
    to: "  'operating-rules': 'L1',",
  },
  {
    label: 'the decisions role is accounted for by the wrong rule',
    file: 'checks/check-method.mjs',
    from: "  decisions: 'D1',",
    to: "  decisions: 'L1',",
  },
  {
    label: 'the state role is accounted for by the wrong rule',
    file: 'checks/check-method.mjs',
    from: "  state: 'S3',",
    to: "  state: 'L1',",
  },
  {
    label: 'the method-log role is accounted for by the wrong rule',
    file: 'checks/check-method.mjs',
    from: "  'method-log': 'M1',",
    to: "  'method-log': 'L1',",
  },

  // --- the declaration
  {
    label: 'a primitive declaration is accepted again',
    file: 'checks/check-method.mjs',
    from: "if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {",
    to: 'if (false) {',
  },
  {
    label: 'a byte-order mark is not stripped',
    file: 'checks/lib/markdown.mjs',
    from: "text.replace(/^\\uFEFF/, '')",
    to: 'text',
  },
  {
    label: 'a malformed language block is accepted',
    file: 'checks/check-method.mjs',
    from: "    Array.isArray(decl.language)\n  ) {",
    to: '    false\n  ) {',
  },
  {
    label: 'ignore given as a string is accepted',
    file: 'checks/check-method.mjs',
    from: 'if (Array.isArray(decl.ignore)) {',
    to: 'if (true) {',
  },

  // --- artefacts
  {
    label: 'an artefact outside the project root is accepted',
    file: 'checks/check-method.mjs',
    from: 'if (p !== project && !p.startsWith(project + sep)) {',
    to: 'if (false) {',
  },
  {
    label: 'a single-document role bound to a directory is accepted',
    file: 'checks/check-method.mjs',
    from: "if (ROLE_SHAPES[role] === 'file' && isDirectory(p)) {",
    to: 'if (false) {',
  },
  {
    label: 'an empty bound artefact is not reported',
    file: 'checks/check-method.mjs',
    from: 'if (fileSize(p) === 0) emptyArtefacts.push',
    to: 'if (false) emptyArtefacts.push',
  },

  // --- adaptations
  {
    label: 'the template placeholder adaptation is accepted',
    file: 'checks/check-method.mjs',
    from: "if (id === 'EXAMPLE') {",
    to: 'if (false) {',
  },
  {
    label: 'a throwaway reason is accepted',
    file: 'checks/check-method.mjs',
    from: 'a.reason.trim().length < 20',
    to: 'a.reason.trim().length < 0',
  },
  {
    label: 'an adaptation with no date is accepted',
    file: 'checks/check-method.mjs',
    from: "if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(a.decided ?? '')) {",
    to: 'if (false) {',
  },
  {
    label: 'a deferred rule needs no trigger',
    file: 'checks/check-method.mjs',
    from: "if (a.change === 'deferred' && !/trigger|until|once|when|after/i.test(a.reason ?? '')) {",
    to: 'if (false) {',
  },
  {
    label: 'the same rule may be adapted twice',
    file: 'checks/check-method.mjs',
    from: 'if (adapted.has(id)) {',
    to: 'if (false) {',
  },

  // --- links and anchors
  {
    label: 'only three URI schemes are external again',
    file: 'checks/lib/markdown.mjs',
    from: 'const URI_SCHEME = /^[a-z][a-z0-9+.\\-]*:/i;',
    to: 'const URI_SCHEME = /^(https?:|mailto:)/i;',
  },
  {
    label: 'reference definitions are not read',
    file: 'checks/lib/markdown.mjs',
    from: 'if (def) take(i + 1, def[2] ?? def[3] ?? ',
    to: 'if (false) take(i + 1, def?.[2] ?? def?.[3] ?? ',
  },
  {
    label: 'percent-encoded targets are not decoded',
    file: 'checks/check-method.mjs',
    from: 'const forms = (s) => [...new Set([s, decoded(s)])];',
    to: 'const forms = (s) => [s];',
  },
  {
    label: 'a heading that is a link keeps its destination in the slug',
    file: 'checks/lib/markdown.mjs',
    from: "      .replace(/\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1')",
    to: '      .replace(/$^/g, "")',
  },
  {
    label: 'the untrimmed slug variant is dropped',
    file: 'checks/lib/markdown.mjs',
    from: "      set.add(variant.replace(/[\\s\\p{Zs}]/gu, '-'));",
    to: '      void variant;',
  },
  {
    label: 'non-ASCII letters are stripped from slugs',
    file: 'checks/lib/markdown.mjs',
    from: 'title.replace(/[^\\p{L}\\p{N}\\p{Pc}\\p{Pd}\\p{Zs}\\s]/gu, ',
    to: 'title.replace(/[^\\w\\p{Pd}\\p{Zs}\\s]/gu, ',
  },

  // --- decisions
  {
    label: 'a Nygard status is not read',
    file: 'checks/check-method.mjs',
    from: '  if (inline) return inline[1];',
    to: '  return inline ? inline[1] : null;',
  },
  {
    label: 'two decision files may share a number',
    file: 'checks/check-method.mjs',
    from: 'if (numberedBy.has(num[1])) {',
    to: 'if (false) {',
  },
  {
    label: 'the index may claim one decision twice',
    file: 'checks/check-method.mjs',
    from: 'if (claimed.has(idm[1])) {',
    to: 'if (false) {',
  },
  {
    label: 'an index with no recognised status is accepted',
    file: 'checks/check-method.mjs',
    from: 'if (claimed.size === 0) {',
    to: 'if (false) {',
  },
  {
    label: 'an index row with no file behind it is accepted',
    file: 'checks/check-method.mjs',
    from: 'if (!numbered.has(num)) {',
    to: 'if (false) {',
  },
  {
    label: 'the number is read from the whole path again',
    file: 'checks/check-method.mjs',
    from: 'const num = basename(d.rel).match(/(\\d{4})/);',
    to: 'const num = d.rel.match(/(\\d{4})/);',
  },

  // --- what counts as an assertion
  {
    label: 'fenced examples are scanned as assertions',
    file: 'checks/lib/markdown.mjs',
    from: '  const lines = text.split(\'\\n\');\n  let inFence = false;',
    to: '  const lines = text.split(\'\\n\');\n  if (true) return text;\n  let inFence = false;',
  },
  {
    label: 'blockquotes are scanned as assertions',
    file: 'checks/lib/markdown.mjs',
    from: 'return /^\\s{0,3}>/.test(line);',
    to: 'return false;',
  },
  {
    label: 'code spans are scanned as assertions',
    file: 'checks/lib/markdown.mjs',
    from: "return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));",
    to: 'return line;',
  },
  {
    label: 'the withdrawn scan goes back to single lines',
    file: 'checks/check-method.mjs',
    from: 'for (const { n, text: line } of assertedParagraphs(text)) {',
    to: 'for (const { n, text: line } of assertedLines(text)) {',
  },

  // --- the catalogue itself
  {
    label: 'a duplicated rule identifier is kept rather than refused',
    file: 'checks/lib/catalogue.mjs',
    from: 'if (rules.has(headingId)) {',
    to: 'if (false) {',
  },
  {
    label: 'an empty catalogue is reported as success',
    file: 'checks/lib/catalogue.mjs',
    from: 'if (rules.size === 0) {',
    to: 'if (false) {',
  },
  {
    label: 'a nested quantifier is compiled rather than refused',
    file: 'checks/lib/catalogue.mjs',
    from: 'if (hasNestedQuantifier(pattern)) {',
    to: 'if (false) {',
  },
  {
    label: 'an entry missing a field is accepted',
    file: 'checks/lib/catalogue.mjs',
    from: '      if (!value) {',
    to: '      if (false) {',
  },

  // --- spelling
  {
    label: 'the -ize allow-list is emptied',
    file: 'checks/check-method.mjs',
    from: 'const IZE_ALLOWED = new Set(\n  [',
    to: 'const IZE_ALLOWED = new Set(\n  [].concat([',
  },
  {
    label: 'only verb endings count as -ize',
    file: 'checks/check-method.mjs',
    from: '/^[a-z]+iz(e|es|ed|ing|er|ers|able|ation|ations|ational)$/.test(w)',
    to: '/^[a-z]+iz(e|es|ed|ing)$/.test(w)',
  },
  {
    label: 'a declared word exemption is ignored',
    file: 'checks/check-method.mjs',
    from: 'if (allowed.has(w)) continue;',
    to: 'if (false) continue;',
  },

  // --- placeholders
  {
    label: 'the placeholder scan reads every document, not only bound ones',
    file: 'checks/check-method.mjs',
    from: "if (!boundPaths.some((b) => rel === b || rel.startsWith(b + '/'))) continue;",
    to: 'if (false) continue;',
  },

  // --- the command line and the terminal
  {
    label: 'a second project path wins in silence again',
    file: 'checks/check-method.mjs',
    from: '    if (projectArg !== null) {',
    to: '    if (false) {',
  },
  {
    label: 'an option that swallowed its value falls back to the default',
    file: 'checks/check-method.mjs',
    from: "if (value === undefined || value.startsWith('-')) {",
    to: 'if (false) {',
  },
  {
    label: 'control characters reach the terminal',
    file: 'checks/check-method.mjs',
    from: "return String(s).replace(/[\\x00-\\x08\\x0b-\\x1f\\x7f]/g, '\uFFFD');",
    to: 'return String(s);',
  },

  // --- the walk
  {
    label: 'an embedded copy of the method is scanned as the project',
    file: 'checks/check-method.mjs',
    from: 'const embedded = embeddedMethodRepos(project, DEFAULT_IGNORES);',
    to: 'const embedded = [];',
  },
  {
    label: 'a copy of the method is recognised by directory name',
    file: 'checks/lib/markdown.mjs',
    from: "        exists(join(child, 'method', 'rules.md')) &&\n        exists(join(child, 'checks', 'check-method.mjs'))",
    to: "        e.name === 'agent-driven-development'",
  },
];

/**
 * Mutations that cannot be caught, with the reason.
 *
 * Empty, and meant to stay that way. An entry here is a decision: it says the
 * mechanism is real but no case can distinguish it, and it says so where a
 * reader will find it rather than in a survivor list nobody keeps.
 */
const KNOWN_SURVIVORS = new Map();

const argv = process.argv.slice(2);
let only = null;
let listOnly = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--only') {
    only = argv[++i];
    if (only === undefined) {
      console.error('--only needs a substring.');
      process.exit(2);
    }
  } else if (argv[i] === '--list') listOnly = true;
  else {
    console.error(`Unknown option: ${argv[i]}`);
    process.exit(2);
  }
}

const selected = only
  ? MUTATIONS.filter((m) => m.label.includes(only) || m.file.includes(only))
  : MUTATIONS;

const bar = '─'.repeat(72);
console.log(bar);
console.log('mutation harness · would anything notice if a check stopped firing?');
console.log(`  mutations: ${selected.length}${only ? ` of ${MUTATIONS.length}` : ''}`);
console.log(`  suite:     checks/check-method.test.mjs, once per mutation`);
console.log(bar);

if (listOnly) {
  for (const m of selected) console.log(`  ${m.file} · ${m.label}`);
  process.exit(0);
}

const work = mkdtempSync(join(tmpdir(), 'adm-mutate-'));
cpSync(join(ROOT, 'checks'), join(work, 'checks'), { recursive: true });
cpSync(join(ROOT, 'method'), join(work, 'method'), { recursive: true });

/** The pristine text of every file a mutation touches, read once. */
const pristine = new Map();
for (const m of selected) {
  if (!pristine.has(m.file)) {
    pristine.set(m.file, readFileSync(join(work, m.file), 'utf8'));
  }
}

// A mutation that does not land where its label claims makes the whole run a
// report about something nobody chose. Checked before anything is run, so the
// harness cannot half-finish.
const malformed = [];
for (const m of selected) {
  const text = pristine.get(m.file);
  const count = text.split(m.from).length - 1;
  if (count !== 1) {
    malformed.push(`  ${m.label}: its "from" text occurs ${count} times in ${m.file}`);
  }
}
if (malformed.length) {
  console.log('');
  for (const line of malformed) console.log(line);
  console.log(`\n${bar}`);
  console.log('FAIL · the mutation list no longer matches the source');
  console.log(bar);
  rmSync(work, { recursive: true, force: true });
  process.exit(2);
}

const survivors = [];
let caught = 0;

for (const m of selected) {
  const path = join(work, m.file);
  const original = pristine.get(m.file);
  writeFileSync(path, original.replace(m.from, m.to), 'utf8');
  const run = spawnSync(process.execPath, [join(work, 'checks/check-method.test.mjs')], {
    encoding: 'utf8',
  });
  writeFileSync(path, original, 'utf8');

  // Any non-zero exit counts as caught, including a crash: a mutation that makes
  // the check throw is one the suite refuses to report success about, which is
  // the property being measured.
  if (run.status === 0) {
    survivors.push(m);
    console.log(`SURVIVED  ${m.label}`);
  } else {
    caught++;
    console.log(`caught    ${m.label}`);
  }
}

rmSync(work, { recursive: true, force: true });

const unexplained = survivors.filter((m) => !KNOWN_SURVIVORS.has(m.label));
for (const m of survivors) {
  const why = KNOWN_SURVIVORS.get(m.label);
  if (why) console.log(`\n  known survivor · ${m.label}\n      ${why}`);
}

console.log(`\n${bar}`);
if (unexplained.length) {
  console.log(
    `FAIL · ${unexplained.length} of ${selected.length} mutation(s) survived with nothing to say why`
  );
  console.log(
    '       Add a case that catches it, or record it in KNOWN_SURVIVORS with the reason.'
  );
  console.log(bar);
  process.exit(1);
}
console.log(`OK · all ${caught} mutation(s) were caught`);
console.log(bar);
