#!/usr/bin/env node
/**
 * House-style check: did the plugin's version keep up with the plugin?
 *
 * House style rather than method, like the other three: it knows this
 * repository's layout and a project adopting the catalogue has no use for it.
 *
 * It exists because the coupling it enforces was a good intention for exactly
 * one release. Commit 7cb309f changed two procedures and left both manifests at
 * `0.2.0`, so every existing installation kept running the old ones — silently,
 * because a cached copy looks exactly like a current one. E1 holds that a claim
 * a command can decide should not be left to whoever remembers.
 *
 * The git work is here; the decision is in lib/plugin-version.mjs, so the cases
 * can be written without building a repository per case.
 *
 * Usage: node plugin-version.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { versionFindings } from './lib/plugin-version.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const PLUGIN_MANIFEST = 'plugins/agent-method/.claude-plugin/plugin.json';
const MARKETPLACE = '.claude-plugin/marketplace.json';

/** Run git, returning trimmed stdout or null. Never throws. */
function git(...args) {
  const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return (r.stdout ?? '').trim();
}

/** Parse JSON, returning null rather than throwing. */
function readJson(rel) {
  try {
    return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  } catch {
    return null;
  }
}

const bar = '─'.repeat(72);
console.log(bar);
console.log('plugin version');
console.log('  claim:  the plugin version changed when the plugin did');
console.log(`  source: ${PLUGIN_MANIFEST} · ${MARKETPLACE} · git`);
console.log(bar);

const plugin = readJson(PLUGIN_MANIFEST);
const marketplace = readJson(MARKETPLACE);

if (!plugin || !marketplace) {
  console.log('');
  console.log(`  a manifest could not be read: ${PLUGIN_MANIFEST} · ${MARKETPLACE}`);
  console.log(`\n${bar}`);
  console.log('FAIL · the manifests this check compares are not both readable');
  console.log(bar);
  process.exit(1);
}

const entry = (marketplace.plugins ?? []).find((p) => p?.name === plugin.name);

// Every git question is allowed to come back empty. A shallow clone has no
// tags, and a source tarball has no repository at all — neither is a defect in
// this repository, and a check that failed on them would fail for the wrong
// reason in exactly the environments where it matters least.
const inGitRepo = git('rev-parse', '--git-dir') !== null;
const releaseTag = inGitRepo ? git('describe', '--tags', '--abbrev=0') : null;

let previousVersion;
let changedPaths = [];
if (releaseTag) {
  const raw = git('show', `${releaseTag}:${PLUGIN_MANIFEST}`);
  let previous = null;
  try {
    previous = raw === null ? null : JSON.parse(raw);
  } catch {
    previous = null;
  }
  previousVersion = previous?.version ?? null;
  // Against the working tree, not against HEAD. Comparing commits only would
  // mean the check first speaks after the offending commit exists, and the whole
  // point is to answer the question while it can still be answered by editing a
  // file. `git diff <tag> -- path` is the tag against what is on disk now.
  const diff = git('diff', '--name-only', releaseTag, '--', 'plugins/');
  // ...plus files git has never been told about. A new procedure arrives as an
  // untracked file, which no diff mentions, and that is precisely the change
  // most likely to need a version.
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'plugins/');
  changedPaths = [
    ...new Set([...(diff ?? '').split('\n'), ...(untracked ?? '').split('\n')]),
  ].filter(Boolean);
}

const { findings, notes } = versionFindings({
  pluginVersion: plugin.version ?? null,
  marketplaceVersion: entry?.version ?? null,
  previousVersion,
  releaseTag,
  changedPaths,
});

if (!inGitRepo) {
  notes.unshift('not a git repository, so nothing could be compared against a release');
} else if (!entry) {
  findings.unshift(
    `the marketplace lists no plugin named "${plugin.name}". One of the two ` +
      'manifests was renamed and the other was not.'
  );
}

if (findings.length) {
  console.log('');
  for (const f of findings) console.log(`  ${f}`);
}
if (notes.length) {
  console.log('');
  console.log('  not decided here');
  for (const n of notes) console.log(`    ${n}`);
}

console.log(`\n${bar}`);
if (findings.length) {
  console.log(`FAIL · ${findings.length} problem(s) with the plugin's version`);
  console.log(bar);
  process.exit(1);
}
console.log(
  releaseTag
    ? `OK · version ${plugin.version}, checked against ${releaseTag}`
    : `OK · version ${plugin.version}; no release to compare against`
);
console.log(bar);
