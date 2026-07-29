/**
 * The counter-test case counts stated in checks/README.md.
 *
 * Those two figures are what make the counter-tests credible to somebody
 * deciding whether to trust the checks at all, and they are the one claim here
 * that goes wrong without ever failing: the coherence figure sat eighteen cases
 * behind, and nothing said so. Rule E1 holds that a claim a command can decide
 * should not be left to whoever remembers to recount.
 *
 * This module only reads what the document claims. The true count exists
 * nowhere but in a run, so the comparison needs one and belongs to the check.
 */

import { blankFences } from './markdown.mjs';

/**
 * The sentence, matched as one pattern rather than two. Splitting it would let
 * the document keep half a claim — a coherence figure with the line-width one
 * deleted — and still pass, which is deletion dressed up as agreement.
 *
 * Whitespace is `\s+` throughout so that rewrapping the paragraph to 80
 * columns, which this repository does routinely, cannot silently disable it.
 */
const CLAIM =
  /(\d+)\s+cases\s+for\s+the\s+coherence\s+check\s+and\s+(\d+)\s+for\s+the\s+line-width\s+check/;

/** How each count is named in a finding. Order is the order it is reported. */
const PARTS = [
  ['coherence', 'the coherence check'],
  ['lineWidth', 'the line-width check'],
];

/**
 * What the document claims, or null when the sentence is not there at all.
 *
 * Fenced regions are blanked first. A fenced copy of the sentence is an example
 * of the claim, not the document making it — and accepting one would hand
 * anybody a way to switch this check off by moving the real sentence into a
 * fence, which is the failure E3 warns about rather than a convenience.
 *
 * @param text whole document
 * @returns {{coherence: number, lineWidth: number}|null}
 */
export function claimedCounts(text) {
  const m = CLAIM.exec(blankFences(text));
  if (!m) return null;
  return { coherence: Number(m[1]), lineWidth: Number(m[2]) };
}

/**
 * Compare the document against the counts two runs actually reported.
 *
 * A missing sentence is a finding rather than a pass. Correcting a figure and
 * deleting it look identical to a check that only compares numbers it found,
 * and deleting it is the cheaper way out of a failing run.
 *
 * @param text whole document
 * @param actual {{coherence: number|null, lineWidth: number|null}}
 * @returns findings, empty when the document and the runs agree
 */
export function compareCounts(text, actual) {
  const claimed = claimedCounts(text);
  if (!claimed) {
    return [
      'no sentence stating the counter-test counts — removed rather than corrected',
    ];
  }
  const findings = [];
  for (const [key, label] of PARTS) {
    if (typeof actual[key] !== 'number') {
      findings.push(`${label}: its run printed no case count`);
    } else if (claimed[key] !== actual[key]) {
      findings.push(
        `${label}: stated ${claimed[key]}, the run reports ${actual[key]}`
      );
    }
  }
  return findings;
}

/**
 * The count a counter-test prints about itself, or null if it printed none.
 *
 * Both runners end with the same summary line, and that line is the only place
 * the real number exists — the cases are not statically countable, because some
 * are built in loops and the literal `expect(` count is wrong for both files.
 *
 * @param output whatever the runner wrote to stdout
 */
export function ranCount(output) {
  const m = /(\d+)\s+cases,\s+\d+\s+failed/.exec(output);
  return m ? Number(m[1]) : null;
}
