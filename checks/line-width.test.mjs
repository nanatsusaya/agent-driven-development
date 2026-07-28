#!/usr/bin/env node
/**
 * Counter-test for the line-width check.
 *
 * Rule E3: a check is not trusted until it has been fed deliberate violations
 * and shown to fail on each, and shown to pass on the legitimate cases nearest
 * to them. For this check the nearest legitimate cases are the four exemptions,
 * and the case that matters most is the last one — the unbreakable-token
 * exemption must not become a general way out.
 *
 * Usage: node line-width.test.mjs
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, 'line-width.mjs');

const root = mkdtempSync(join(tmpdir(), 'adm-width-'));
let failures = 0;
let ran = 0;

/** A throwaway project holding one document. */
function project(name, content) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'doc.md'), content, 'utf8');
  return dir;
}

function expect(label, dir, expectPass, limit = 40) {
  ran++;
  const r = spawnSync(process.execPath, [CHECK, dir, '--limit', String(limit)], {
    encoding: 'utf8',
  });
  const passed = r.status === 0;
  if (passed === expectPass) {
    console.log(`ok    ${label}`);
    return;
  }
  failures++;
  console.log(`FAIL  ${label}`);
  console.log(`      expected ${expectPass ? 'pass' : 'fail'}, got ${passed ? 'pass' : 'fail'}`);
  console.log(((r.stdout ?? '') + (r.stderr ?? '')).split('\n').map((l) => `      ${l}`).join('\n'));
}

// A limit of 40 keeps the fixtures readable. `x` repeated is easier to count
// than prose.
const under = 'word word word word word';          // 24
const over = 'word word word word word word word word word'; // 44

expect('a prose line over the limit fails', project('over', `# T\n\n${over}\n`), false);
expect('a line under the limit passes', project('under', `# T\n\n${under}\n`), true);
{
  const exact = 'x'.repeat(40);
  expect('a line exactly at the limit passes', project('exact', `# T\n\n${exact}\n`), true);
}
{
  // 41 columns of short words: wrappable, so one column over is a finding.
  const one = `${'word '.repeat(8)}x`;
  expect('a line one column over fails', project('one-over', `# T\n\n${one}\n`), false);
}
{
  // The mirror, and the reason the case above had to be built from short
  // words: a single token longer than the limit cannot be wrapped at all, so
  // reporting it would be a finding nobody can act on. This is the check's own
  // exemption, asserted rather than assumed.
  const unbreakable = 'x'.repeat(41);
  expect(
    'a single token longer than the limit passes',
    project('unbreakable', `# T\n\n${unbreakable}\n`),
    true
  );
}

// --- the four exemptions
expect(
  'a long table row passes',
  project('table', `# T\n\n| a | b |\n|---|---|\n| ${over} | ${over} |\n`),
  true
);
expect(
  'a long line inside a fence passes',
  project('fence', `# T\n\n\`\`\`\n${over}\n\`\`\`\n`),
  true
);
expect(
  'a long line in YAML frontmatter passes',
  project('frontmatter', `---\ndescription: ${over}\n---\n\n# T\n\n${under}\n`),
  true
);
expect(
  'a line made long by one unbreakable URL passes',
  project('url', `# T\n\nSee https://example.com/${'a'.repeat(60)}\n`),
  true
);

// --- the exemptions must not become general escapes
expect(
  'a long line that merely contains a short URL still fails',
  project('short-url', `# T\n\nSee https://a.co and then ${over}\n`),
  false
);
expect(
  'a `---` below the top is a rule, not frontmatter, so what follows is checked',
  project('rule-not-frontmatter', `# T\n\n---\n\n${over}\n`),
  false
);
expect(
  'text after a closed fence is checked again',
  project('after-fence', `# T\n\n\`\`\`\ncode\n\`\`\`\n\n${over}\n`),
  false
);
expect(
  'an indented list item over the limit fails',
  project('indented', `# T\n\n- ${over}\n`),
  false
);

rmSync(root, { recursive: true, force: true });

console.log(`\n${ran} cases, ${failures} failed`);
process.exit(failures ? 1 : 0);
