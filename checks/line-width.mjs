#!/usr/bin/env node
/**
 * Line width.
 *
 * This repository's operating rules say prose wraps at roughly 80 columns.
 * Until this existed, nothing enforced that, which made it a rule held by
 * whoever happened to remember it — the exact failure rule E1 describes, sitting
 * in a repository that argues for turning rules into checks.
 *
 * It is deliberately *not* part of check-method.mjs. That check is for projects
 * adopting the method, and line width is a house style rather than a rule in the
 * catalogue. A project that wants this can run it; nothing obliges it to.
 *
 * The check reports. It does not reformat. A reformatter run over this
 * repository once corrupted prose by splitting punctuation away from the links
 * it touched, and the damage was invisible line by line. Sixteen lines fixed by
 * hand cost less than trusting a script with the whole corpus.
 *
 * Four exemptions, all structural — none of them "this file is inconvenient":
 *
 *   - YAML frontmatter, whose fields are not prose and whose folded scalars
 *     have their own line semantics
 *   - fenced code blocks, where the width is the content's business
 *   - table rows, which cannot be wrapped without destroying the table
 *   - a line whose indent plus longest unbreakable token already exceeds the
 *     limit, usually a URL: it cannot be made to fit, so reporting it would be
 *     a finding nobody can act on
 *
 * Usage: node line-width.mjs [project-path] [--limit <n>]
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEFAULT_IGNORES, listMarkdownFiles, normaliseEol } from './lib/markdown.mjs';

const argv = process.argv.slice(2);
let projectArg = null;
let limit = 80;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--limit') {
    const value = argv[++i];
    if (value === undefined || !/^\d+$/.test(value)) {
      console.error('--limit needs a number.');
      process.exit(2);
    }
    limit = Number(value);
  } else if (a === '--help' || a === '-h') {
    console.log('Usage: line-width.mjs [project-path] [--limit <n>]');
    process.exit(0);
  } else if (!a.startsWith('-')) projectArg = a;
  else {
    console.error(`Unknown option: ${a}`);
    process.exit(2);
  }
}

const project = resolve(projectArg ?? process.cwd());

/**
 * Lines in one document that exceed the limit and could have been wrapped.
 *
 * @param text  whole document, already normalised
 * @param max   the column limit
 * @returns array of `{ n, length, text }`
 */
function overlongLines(text, max) {
  const lines = text.split('\n');
  const found = [];
  let inFence = false;
  let inFrontmatter = false;

  lines.forEach((line, i) => {
    // Frontmatter only counts at the very top of the file; a `---` later in the
    // document is a horizontal rule.
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      return;
    }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      return;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (line.length <= max) return;
    if (/^\s*\|/.test(line)) return;

    const indent = line.length - line.trimStart().length;
    const longest = Math.max(0, ...line.trim().split(/\s+/).map((t) => t.length));
    if (indent + longest > max) return;

    found.push({ n: i + 1, length: line.length, text: line });
  });

  return found;
}

const files = listMarkdownFiles(project, DEFAULT_IGNORES);
const findings = [];

for (const rel of files) {
  const text = normaliseEol(readFileSync(join(project, rel), 'utf8'));
  for (const f of overlongLines(text, limit)) {
    findings.push({ rel, ...f });
  }
}

const bar = '─'.repeat(72);
console.log(bar);
console.log('line width');
console.log(`  project: ${project}`);
console.log(`  limit:   ${limit} columns · ${files.length} markdown file(s)`);
console.log(bar);

if (findings.length) {
  console.log('');
  for (const f of findings) {
    console.log(`  ${f.rel}:${f.n} — ${f.length} columns`);
    console.log(`      ${f.text.trim().slice(0, 68)}…`);
  }
  console.log(`\n${bar}`);
  console.log(
    `FAIL · ${findings.length} line${findings.length === 1 ? '' : 's'} over ${limit} columns`
  );
  process.exit(1);
}

console.log(`\n${bar}`);
console.log(`OK · every wrappable line is within ${limit} columns`);
