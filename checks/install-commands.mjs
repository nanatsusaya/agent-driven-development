#!/usr/bin/env node
/**
 * House-style check: do the documents that state the install command agree, and
 * does the command put the clone outside the project it checks?
 *
 * House style rather than method, the same way line-width.mjs and
 * documented-counts.mjs are: it knows one command in one repository's documents,
 * and an adopting project has no use for it.
 *
 * It exists because the command was wrong in three places at once for as long as
 * it existed. The clone landed inside the project being checked, so an adopter's
 * first run produced 115 findings about files that were not theirs — at the one
 * moment the tool has to be worth trusting. Three copies of a command are three
 * things to remember; E1 says a claim a command can decide should not be left to
 * whoever remembers to check it.
 *
 * Usage: node install-commands.mjs [project-path]
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_IGNORES, listMarkdownFiles, normaliseEol } from './lib/markdown.mjs';
import { installFindings } from './lib/install-commands.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(HERE, '..'));

const docs = listMarkdownFiles(root, DEFAULT_IGNORES).map((rel) => ({
  rel,
  text: normaliseEol(readFileSync(join(root, rel), 'utf8')),
}));

const findings = installFindings(docs);

const bar = '─'.repeat(72);
console.log(bar);
console.log('install commands');
console.log(`  claim:  every fenced "git clone" line, in ${docs.length} document(s)`);
console.log('  source: the lines themselves, compared against each other');
console.log(bar);

if (findings.length) {
  console.log('');
  for (const f of findings) console.log(`  ${f}`);
  console.log(`\n${bar}`);
  console.log(`FAIL · ${findings.length} finding(s)`);
  console.log(bar);
  process.exit(1);
}

console.log(`\n${bar}`);
console.log('OK · every stated install command is the same one, and clones outside');
console.log(bar);
