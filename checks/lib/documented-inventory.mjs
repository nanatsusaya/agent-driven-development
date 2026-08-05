/**
 * The inventory this repository states about itself, in prose.
 *
 * Sibling of documented-counts.mjs and separated from it for one reason: those
 * two figures exist nowhere but in a run, and these come from the file system
 * and from the source. Different sources, so different modules; the check runs
 * both because the claim a reader makes is the same one — **the numbers in
 * checks/README.md are true**.
 *
 * It exists because that document was wrong in four places at once and nothing
 * failed. It said five checks where there were six, "the other four" where there
 * were five, and named three counter-tests without published figures where there
 * were four. Each was a sentence somebody wrote once and nobody recounted, which
 * is the failure E1 describes: a claim a command could decide, left to whoever
 * remembers.
 *
 * The counts here are written as **words**, because that is how the prose reads.
 * A check that only understood digits would silently match nothing, which is the
 * no-op E3 warns about — so an unreadable number is a finding rather than a
 * skip.
 */

import { blankFences } from './markdown.mjs';

/** Words this repository actually uses for counts. Extend when prose needs it. */
const WORDS = new Map([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
]);

/**
 * A count written as a word or as digits, or null when it is neither.
 *
 * @param token the matched text
 */
export function countFrom(token) {
  if (token === undefined || token === null) return null;
  const t = String(token).trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return WORDS.has(t) ? WORDS.get(t) : null;
}

/**
 * Every claim this module knows how to check, as one table.
 *
 * `of` says what the number is a count of, so a finding can name the thing the
 * reader was misled about rather than quoting a regular expression at them.
 * Whitespace is `\s+` throughout: this repository rewraps prose at 80 columns
 * routinely, and a pattern a rewrap can break is a check that switches itself
 * off during ordinary editing.
 */
const CLAIMS = [
  {
    id: 'checks-total',
    file: 'checks/README.md',
    pattern: /(\w+)\s+of\s+them,\s+and\s+only\s+the\s+first\s+is\s+meant\s+for\s+your\s+project/,
    of: 'check scripts in checks/',
    actual: (a) => a.checks.length,
  },
  {
    id: 'checks-house-style',
    file: 'checks/README.md',
    pattern: /The\s+other\s+(\w+)\s+are\s+\[this\s+repository's\s+own\s+house\s+style\]/,
    of: 'house-style checks — every check but the coherence one',
    actual: (a) => a.checks.length - 1,
  },
  {
    id: 'checks-ignorable',
    file: 'checks/README.md',
    pattern: /an\s+adopting\s+project\s+is\s+free\s+to\s+ignore\s+all\s+(\w+)/,
    of: 'house-style checks an adopting project may ignore',
    actual: (a) => a.checks.length - 1,
  },
  {
    id: 'sub-checks',
    file: 'checks/README.md',
    pattern: /^(\w+)\s+checks:$/m,
    of: 'checks inside check-method.mjs',
    actual: (a) => a.subChecks.length,
  },
  {
    id: 'unfigured-counter-tests',
    file: 'checks/README.md',
    pattern: /(\w+)\s+further\s+counter-tests/,
    of: 'counter-tests carrying no published case count',
    actual: (a) => a.unfiguredTests.length,
  },
  {
    id: 'counter-tests',
    file: 'CLAUDE.md',
    pattern: /the\s+counter-tests\s+for\s+all\s+(\w+)\s+checks/,
    of: 'counter-test files',
    actual: (a) => a.counterTests.length,
    // This one lives inside a fence on purpose: it is the comment on the
    // `npm test` line, where a reader meets it. Blanking fences here would
    // delete the claim and then report it missing, so the raw text is read.
    // Everywhere else a fenced copy is an *example* of a claim rather than the
    // document making it, and blanking stays the right default.
    inFence: true,
  },
];

/**
 * Compare every stated number against what is actually there.
 *
 * A claim that is *missing* is a finding rather than a pass. Correcting a number
 * and deleting the sentence look identical to a check that only compares what it
 * found, and deleting is the cheaper way out of a failing run.
 *
 * @param docs   {{ 'checks/README.md': string, 'CLAUDE.md': string }}
 * @param actual {{ checks, counterTests, unfiguredTests, subChecks }} of arrays
 * @returns findings, empty when every stated number is true
 */
export function compareInventory(docs, actual) {
  const findings = [];
  for (const claim of CLAIMS) {
    const text = docs[claim.file];
    if (typeof text !== 'string') {
      findings.push(`${claim.file} could not be read, so its claims went unchecked.`);
      continue;
    }
    const m = claim.pattern.exec(claim.inFence ? text : blankFences(text));
    if (!m) {
      findings.push(
        `${claim.file} — no sentence stating the number of ${claim.of}. ` +
          'Rewording it takes it out of this scan, so its absence is the finding.'
      );
      continue;
    }
    const stated = countFrom(m[1]);
    if (stated === null) {
      findings.push(
        `${claim.file} — the number of ${claim.of} reads "${m[1]}", which this ` +
          'scan cannot turn into a number. Add the word to WORDS, or use digits.'
      );
      continue;
    }
    const real = claim.actual(actual);
    if (stated !== real) {
      findings.push(`${claim.file} — states ${stated} ${claim.of}; there are ${real}.`);
    }
  }
  return findings;
}

/**
 * The check names the sub-check table claims, in order.
 *
 * The first cell of every body row, backticked. Read from the table rather than
 * counted, because a name is a stronger claim than a total: a table that lost
 * one row and gained another would keep its count.
 *
 * @param text checks/README.md
 */
export function tabulatedSubChecks(text) {
  const body = blankFences(text);
  // Scoped to the table that follows the announcing line, and not to every
  // table in the document: the options table further down has backticked first
  // cells too, and reading `--lint` as a check would be a false alarm about a
  // row that is doing its job.
  const start = /^\w+\s+checks:$/m.exec(body);
  if (!start) return null;
  const names = [];
  for (const line of body.slice(start.index + start[0].length).split('\n')) {
    if (/^\s*$/.test(line) && names.length) break;
    if (!/^\|/.test(line)) continue;
    const cell = /^\|\s*`([a-z-]+)`\s*\|/.exec(line);
    if (cell) names.push(cell[1]);
  }
  return names;
}

/**
 * The counter-tests a sentence names, as file names.
 *
 * @param text checks/README.md
 */
export function namedCounterTests(text) {
  const body = blankFences(text);
  const sentence = /further\s+counter-tests\s+—([\s\S]*?)—\s+cover/.exec(body);
  if (!sentence) return null;
  return [...sentence[1].matchAll(/`([a-z-]+\.test\.mjs)`/g)].map((m) => m[1]);
}

/**
 * Compare two name lists as sets, reporting each direction separately.
 *
 * Separately because the two mean different things to a reader: a name the
 * document invented sends them looking for a file that is not there, and a name
 * it omitted leaves them believing the list is complete when it is not. That
 * second one is how documented-version.test.mjs went unlisted.
 *
 * @param claimed what the document names
 * @param real    what exists
 * @param label   what the list is of, for the finding
 * @param file    which document makes the claim
 */
export function compareNames(claimed, real, label, file) {
  if (claimed === null) {
    return [`${file} — no sentence naming the ${label}; it was reworded or removed.`];
  }
  const findings = [];
  const missing = real.filter((n) => !claimed.includes(n));
  const invented = claimed.filter((n) => !real.includes(n));
  if (missing.length) {
    findings.push(`${file} — the ${label} omit ${missing.join(', ')}.`);
  }
  if (invented.length) {
    findings.push(`${file} — the ${label} name ${invented.join(', ')}, which do not exist.`);
  }
  return findings;
}
