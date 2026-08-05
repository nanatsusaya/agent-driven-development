#!/usr/bin/env node
/**
 * Counter-test for the documented-version check.
 *
 * Rule E3: a check is not trusted until it has been fed deliberate violations
 * and shown to fail on each, and shown to pass on the legitimate cases nearest
 * to them. Here the nearest legitimate cases are the version strings this
 * repository is full of and which must **not** be reported — package.json, the
 * two plugin manifests — plus a version quoted in prose rather than declared.
 * Reporting any of them would be a false alarm, which E3 calls the half that
 * teaches people to distrust the checks that are right.
 *
 * Usage: node documented-version.test.mjs
 */

import {
  compareDeclaredVersions,
  declaredVersions,
  fencedBlocks,
} from './lib/documented-version.mjs';

let failures = 0;
let ran = 0;

/**
 * @param name what the case establishes
 * @param actual what the assertion produced
 * @param wanted what it should have produced
 */
function expect(name, actual, wanted) {
  ran += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`        wanted ${JSON.stringify(wanted)}`);
    console.log(`        got    ${JSON.stringify(actual)}`);
  }
}

/** A fenced declaration, the shape all three markdown copies have. */
const fenced = (version) =>
  '# Doc\n\nProse above.\n\n```json\n{\n  "method": "agent-project-rules",\n' +
  `  "version": "${version}",\n  "artefacts": {}\n}\n` +
  '```\n\nProse below.\n';

/** The same declaration as a whole `.json` file. */
const bare = (version) =>
  `{\n  "method": "agent-project-rules",\n  "version": "${version}"\n}\n`;

const files = (text, fencedFlag = true) => [
  { rel: 'doc.md', text, fenced: fencedFlag },
];

// --- 1. the declaration is read at all
expect('a fenced declaration is read', declaredVersions(fenced('0.5'), true), [
  { version: '0.5', line: 8 },
]);
expect('a bare json declaration is read', declaredVersions(bare('0.5'), false), [
  { version: '0.5', line: 3 },
]);

// --- 2. agreement
expect(
  'a version matching the catalogue produces no finding',
  compareDeclaredVersions(files(fenced('0.5')), '0.5').findings,
  []
);

// --- 3. deliberate violations
expect(
  'a stale version fails, and says both numbers',
  compareDeclaredVersions(files(fenced('0.4')), '0.5').findings,
  ['doc.md:8 — declares "0.4"; method/VERSION is "0.5"']
);
expect(
  'a version ahead of the catalogue fails too',
  compareDeclaredVersions(files(fenced('0.6')), '0.5').findings,
  ['doc.md:8 — declares "0.6"; method/VERSION is "0.5"']
);
expect(
  'an empty version is a finding rather than a match',
  compareDeclaredVersions(files(fenced('')), '0.5').findings,
  ['doc.md:8 — declares ""; method/VERSION is "0.5"']
);
expect(
  'every stale copy is named, not just the first',
  compareDeclaredVersions(
    [
      { rel: 'a.md', text: fenced('0.4'), fenced: true },
      { rel: 'b.md', text: fenced('0.3'), fenced: true },
    ],
    '0.5'
  ).findings,
  [
    'a.md:8 — declares "0.4"; method/VERSION is "0.5"',
    'b.md:8 — declares "0.3"; method/VERSION is "0.5"',
  ]
);

// Deleting the version, or a rename moving the method's name out from under the
// pattern, both arrive as a clean run otherwise — the silent no-op E3 exists
// for. It has to cost the same as leaving a version wrong.
expect(
  'a declaration that states no version at all fails',
  compareDeclaredVersions(
    files('```json\n{\n  "method": "agent-project-rules"\n}\n```\n'),
    '0.5'
  ).findings,
  [
    'no documented declaration states a version — the scan understood nothing ' +
      'it read, which is not the same as agreement',
  ]
);
expect(
  'a repository with no declaration anywhere fails',
  compareDeclaredVersions(files('# Doc\n\nNothing declared.\n'), '0.5').findings,
  [
    'no documented declaration states a version — the scan understood nothing ' +
      'it read, which is not the same as agreement',
  ]
);

// --- 4. the legitimate cases nearest the violations
// This repository is full of version strings that are nobody's business here.
// Reporting one would be the false alarm that teaches people to ignore the
// check when it is right.
expect(
  'package.json is not a method declaration',
  declaredVersions('{\n  "name": "agent-project-rules",\n  "version": "0.4.0"\n}\n', false),
  []
);
expect(
  'a plugin manifest is not a method declaration',
  declaredVersions(
    '{\n  "name": "agent-method",\n  "version": "0.5.0",\n  "homepage": "x"\n}\n',
    false
  ),
  []
);
expect(
  'a fenced block with a version but no method name is ignored',
  declaredVersions('```json\n{\n  "version": "1.2.3"\n}\n```\n', true),
  []
);

// A version named in prose is a sentence, not a declaration. The three markdown
// copies all sit in fences, and prose about them is how they get explained.
expect(
  'a version discussed in prose is not read as a declaration',
  declaredVersions(
    'The template still shows `"version": "0.4"`, and\n' +
      '`"method": "agent-project-rules"` above it.\n',
    true
  ),
  []
);

// A JSON formatter is free to move whitespace, and a check a reformatter can
// switch off is not a check.
expect(
  'whitespace around the colon does not hide a declaration',
  declaredVersions(
    '```json\n{"method":"agent-project-rules","version":"0.4"}\n```\n',
    true
  ),
  [{ version: '0.4', line: 2 }]
);

// CRLF is what a Windows editor writes, and this repository is written on one.
expect(
  'a CRLF document reads the same as an LF one',
  declaredVersions(fenced('0.5').replace(/\n/g, '\r\n'), true),
  [{ version: '0.5', line: 8 }]
);

// --- 5. fence handling, which decides what counts as one block
expect(
  'a tilde fence is a fence',
  declaredVersions(
    '~~~json\n{\n  "method": "agent-project-rules",\n  "version": "0.4"\n}\n~~~\n',
    true
  ),
  [{ version: '0.4', line: 4 }]
);
expect(
  'two fenced blocks are separate blocks',
  declaredVersions(
    '```json\n{"version": "9.9"}\n```\n\n```json\n' +
      '{"method": "agent-project-rules", "version": "0.5"}\n```\n',
    true
  ),
  [{ version: '0.5', line: 6 }]
);
// A stray fence above a declaration must not remove it from the scan.
expect(
  'an unclosed fence still yields its block',
  declaredVersions(
    '```json\n{\n  "method": "agent-project-rules",\n  "version": "0.4"\n}\n',
    true
  ),
  [{ version: '0.4', line: 4 }]
);
expect('a document with no fences yields no blocks', fencedBlocks('# Doc\n'), []);

console.log(`\n${ran} cases, ${failures} failed`);
process.exit(failures ? 1 : 0);
