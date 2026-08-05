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

/** The suite a mutation is answered by, when it is not the coherence one. */
const SUITES = {
  coherence: 'checks/check-method.test.mjs',
  install: 'checks/install-commands.test.mjs',
  plugin: 'checks/plugin-version.test.mjs',
  version: 'checks/documented-version.test.mjs',
  template: 'checks/pull-request-template.test.mjs',
};

/**
 * One mutation: a file, an exact string in it, and what to put there instead.
 *
 * `from` must occur exactly once. A harness whose mutation lands somewhere other
 * than where its label claims reports a score about something nobody chose, so a
 * count other than one is an error rather than a warning.
 *
 * `suite` names which counter-test has to notice, defaulting to the coherence
 * one. Without it the harness could only ever measure a single suite, and the
 * two checks with their own counter-tests would sit outside the one mechanism
 * that says whether a counter-test holds anything.
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
    // The constant is compared against the baseline on every run, so a wrong
    // value was always caught. Removing the comparison was not, and that is
    // the mutation the rename to agent-project-rules made worth having: a
    // project could then declare any method at all, including one that has
    // never existed.
    label: 'any declared method name is accepted',
    file: 'checks/check-method.mjs',
    from: "if (decl.method !== 'agent-project-rules') {",
    to: 'if (false) {',
  },
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
    label: 'an empty bound artefact is accepted',
    file: 'checks/check-method.mjs',
    from: 'if (fileSize(p) === 0) {',
    to: 'if (false) {',
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
    to: "        e.name === 'agent-project-rules'",
  },

  // --- the plugin's version against what changed under it
  {
    label: 'a changed procedure with an unchanged version is accepted',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: '} else if (pluginVersion === previousVersion) {',
    to: '} else if (false) {',
  },
  {
    label: 'the two manifests may disagree about the version',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: 'if ((pluginVersion ?? null) !== (marketplaceVersion ?? null)) {',
    to: 'if (false) {',
  },
  {
    label: 'an absent plugin version is accepted',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: "if (typeof pluginVersion !== 'string' || !pluginVersion.trim()) {",
    to: 'if (false) {',
  },
  {
    label: 'a version that is not semver is accepted',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: 'const SEMVER = /^\\d+\\.\\d+\\.\\d+$/;',
    to: 'const SEMVER = /^.*$/;',
  },
  {
    label: 'a README under plugins/ counts as shipping to users',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: 'return !/(^|\\/)README\\.md$/i.test(path);',
    to: 'return true;',
  },
  {
    label: 'nothing under plugins/ counts as shipping to users',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: "if (!path.startsWith('plugins/')) return false;",
    to: 'return false;',
  },
  {
    label: 'a release with no version to compare is passed over in silence',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: '  if (previousVersion === null || previousVersion === undefined) {',
    to: '  if (false) {',
  },

  // --- the install command, stated in more than one document
  {
    label: 'the stated install commands may disagree',
    suite: 'install',
    file: 'checks/lib/install-commands.mjs',
    from: 'if (c.line !== first.line) {',
    to: 'if (false) {',
  },
  {
    label: 'a clone into the project being checked is accepted',
    suite: 'install',
    file: 'checks/lib/install-commands.mjs',
    from: 'const OUTSIDE = /^(\\.\\.\\/|\\/|~|[A-Za-z]:[\\\\/])/;',
    to: 'const OUTSIDE = /^.*$/;',
  },
  {
    label: 'a clone with no destination at all is accepted',
    suite: 'install',
    file: 'checks/lib/install-commands.mjs',
    from: '    if (!c.dest) {',
    to: '    if (false) {',
  },
  {
    label: 'the command is no longer required to be stated anywhere',
    suite: 'install',
    file: 'checks/lib/install-commands.mjs',
    from: 'if (!clones.length) {',
    to: 'if (false) {',
  },

  // --- the catalogue version this repository's own templates show
  {
    // Block scoping is the whole precision of that check. Without it every
    // version string in the repository is compared against the catalogue, and
    // package.json alone would produce a finding on every run — a false alarm,
    // which E3 calls the half that teaches people to ignore a check when it is
    // right.
    label: 'every version string is compared, not only declarations',
    suite: 'version',
    file: 'checks/lib/documented-version.mjs',
    from: 'if (!DECLARES_METHOD.test(block.body)) continue;',
    to: 'if (false) continue;',
  },
  {
    // The failure this one protects against is the check reporting success
    // about documents it understood nothing in — after a rename moves the
    // method's name, or after a template stops declaring a version at all.
    label: 'a scan that read nothing reports agreement',
    suite: 'version',
    file: 'checks/lib/documented-version.mjs',
    from: '  if (read === 0) {',
    to: '  if (false) {',
  },

  // --- what the report claims about itself under --lint
  {
    // This is the state the check shipped in. `--lint` only ever suppressed the
    // missing-declaration finding, so on an adopted project every declaration
    // check ran and the report then said none had. Both directions of a false
    // claim cost the reader the same thing, and this one is the harder to spot:
    // nothing fails, and the run quietly looks less thorough than it was.
    label: 'the report says the declaration went unchecked when it did not',
    file: 'checks/check-method.mjs',
    from: '  if (lint && !decl) {',
    to: '  if (lint) {',
  },
  {
    // The verdict line, keyed on the flag rather than on what was read. An
    // adopted project run with --lint then ends on the weaker of the two claims
    // while having earned the stronger one.
    label: 'the verdict is decided by the flag rather than by what was read',
    file: 'checks/check-method.mjs',
    from: "console.log(decl ? 'OK · the declaration matches the project' : 'OK · the documents scan clean');",
    to: "console.log(lint ? 'OK · the documents scan clean' : 'OK · the declaration matches the project');",
  },

  // --- the README's restatement of the plugin version
  {
    // The silent half. A README that no longer states the version at all would
    // agree with anything, so rewording the sentence would switch the check off
    // without failing — the same no-op the catalogue-version check guards
    // against by treating "read nothing" as a finding.
    label: 'a README that states no version agrees with the manifests',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: '  const stated = statedVersion(text);',
    to: '  const stated = statedVersion(text) ?? { version: pluginVersion, line: 0 };',
  },
  {
    label: 'the README and the manifests may disagree',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: '  if (stated.version !== pluginVersion) {',
    to: '  if (false) {',
  },
  {
    // The loud half, and the reason the pattern is a phrase rather than "every
    // version-shaped string": this widening reports the true sentence about both
    // manifests having sat at 0.2.0, which could only be silenced by falsifying
    // the record.
    label: 'every backticked version in the README is treated as the claim',
    suite: 'plugin',
    file: 'checks/lib/plugin-version.mjs',
    from: 'const STATED_VERSION = /manifests currently declare `([^`\\n]*)`/;',
    to: 'const STATED_VERSION = /`(\\d+\\.\\d+\\.\\d+)`/;',
  },

  // --- how the decision index is found. The check used to look only for
  // README.md, which is stricter than D1 and D2, neither of which names a file.
  {
    label: 'the index is no longer found by its directory name',
    file: 'checks/check-method.mjs',
    from: '      indexDoc = byBase(`${dirName}.md`);',
    to: '      indexDoc = null;',
  },
  {
    label: 'a lone status table is no longer recognised as the index',
    file: 'checks/check-method.mjs',
    from: '      if (candidates.length === 1) {',
    to: '      if (false) {',
  },
  {
    // Two candidates and no name to choose between them. Silently picking one
    // makes every finding after it a statement about a document nobody chose.
    label: 'an ambiguous index is picked rather than reported',
    file: 'checks/check-method.mjs',
    from: '      } else if (candidates.length > 1) {',
    to: '      } else if (false) {',
  },
  {
    // The half that keeps the widening honest: an index the check *guessed* at
    // has to be a fact the reader can disagree with.
    label: 'a guessed index is used without saying so',
    file: 'checks/check-method.mjs',
    from: '      if (howFound) {',
    to: '      if (false) {',
  },
  {
    label: 'README.md loses its precedence over the other two routes',
    file: 'checks/check-method.mjs',
    from: "    let indexDoc = byBase('README.md');",
    to: '    let indexDoc = null;',
  },

  // --- the pull-request shape, which has to exist in two files at once
  {
    // The mutation that says why the check is not only a diff. With the set
    // unheld, one change editing both files grows the shape and the two still
    // agree perfectly — the failure a same-content check is least able to see.
    label: 'the heading set is no longer held to the core sections',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: "if (got.join('\\n') !== CORE_SECTIONS.join('\\n')) {",
    to: 'if (false) {',
  },
  {
    // And the constant itself, which is why the counter-test writes the five
    // out rather than importing them: an imported expectation moves with the
    // thing it is supposed to hold.
    label: 'the core set may grow a section',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: "export const CORE_SECTIONS = ['What', 'Why', 'Verified', 'Open questions', 'Follow-ups'];",
    to: "export const CORE_SECTIONS = ['What', 'Why', 'Verified', 'Open questions', 'Follow-ups', 'Watched'];",
  },
  {
    label: 'the two files may disagree below the first heading',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: 'if (a.body !== b.body) {',
    to: 'if (false) {',
  },
  {
    label: 'a handbook with no shape is compared against anyway',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: '  if (a === null) {',
    to: '  if (false) {',
  },
  {
    // Deleting the copy is the cheapest way to make a same-content check pass,
    // so "there is nothing there" must not arrive as agreement.
    label: 'a copy with no shape reads as a copy that agrees',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: '  if (b === null) {',
    to: '  if (false) {',
  },
  {
    // The false-alarm half. Both files are mostly guidance inside `<!-- -->`,
    // where a line may begin with a `#`; reading one as a heading reports a
    // section nobody wrote.
    label: 'a hash inside an HTML comment counts as a heading',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: '    return !started && !opens;',
    to: '    return true;',
  },
  {
    label: 'line endings are not normalised before comparing',
    suite: 'template',
    file: 'checks/lib/pull-request-template.mjs',
    from: "text.replace(/\\r\\n?/g, '\\n').replace(/\\s+$/, '')",
    to: 'text',
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
console.log(
  `  suites:    ${[...new Set(selected.map((m) => SUITES[m.suite ?? 'coherence']))].join(', ')}`
);
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
  const run = spawnSync(
    process.execPath,
    [join(work, SUITES[m.suite ?? 'coherence'])],
    { encoding: 'utf8' }
  );
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
