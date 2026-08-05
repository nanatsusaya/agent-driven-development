/**
 * The decision half of the pull-request-template check.
 *
 * Split from the CLI the way lib/documented-version.mjs is, so the cases can be
 * written as strings rather than as a repository per case.
 *
 * Two claims live here, and they are different claims:
 *
 *   1. the two files agree from their first heading down — the copy GitHub
 *      reads still says what the handbook says;
 *   2. the heading set is the core set, in order — so the two agreeing on a
 *      shape that has quietly grown a sixth section is still a finding.
 *
 * Without the second, drift is only caught while it is one-sided. An agent
 * editing both files in one change would satisfy a same-content check
 * perfectly, which is the failure mode a same-content check is least able to
 * see.
 */

/**
 * The five headings every copy of this shape carries, in order.
 *
 * A project adopting the handbook may add exactly one section of its own; this
 * repository declares that it adds none, which is why the set is exact here
 * rather than a prefix. An adopting project does not run this check — it is
 * house style, and it knows this repository's own two paths.
 */
export const CORE_SECTIONS = ['What', 'Why', 'Verified', 'Open questions', 'Follow-ups'];

/** Line endings normalised, and the trailing blank tail dropped. */
function lines(text) {
  return text.replace(/\r\n?/g, '\n').replace(/\s+$/, '').split('\n');
}

const HEADING = /^#{1,6}\s+\S/;

/**
 * Which lines are outside an HTML comment.
 *
 * Both files are mostly guidance written inside `<!-- -->`, and a line there is
 * free to begin with a `#` — "# 1. do this" is ordinary prose. Reading it as a
 * heading would report a section nobody wrote, and a false alarm is the finding
 * that teaches people to stop believing the check (E3).
 *
 * The opening and closing lines count as inside. A heading sharing a line with
 * `-->` is not handled, and neither file has one; adding the case without the
 * need would be an untestable branch.
 *
 * @param ls  lines of the document
 * @returns array of booleans, one per line
 */
function outsideComments(ls) {
  let open = false;
  return ls.map((line) => {
    const started = open;
    const opens = line.includes('<!--');
    const closes = line.includes('-->');
    if (opens && !closes) open = true;
    else if (closes) open = false;
    return !started && !opens;
  });
}

/**
 * Every ATX heading, in document order, without its hashes.
 *
 * Fenced blocks are not excluded, and deliberately: neither of these two files
 * contains a fence, and an exemption written for a case that does not exist is
 * an exemption nobody can test.
 *
 * @param text  whole document
 * @returns array of heading texts
 */
export function headings(text) {
  const ls = lines(text);
  const outside = outsideComments(ls);
  return ls
    .filter((l, i) => outside[i] && HEADING.test(l))
    .map((l) => l.replace(/^#{1,6}\s+/, '').trim());
}

/**
 * The part the two files share: everything from the first heading down.
 *
 * What sits *above* the first heading is each file's own opening instruction
 * comment, and the two must differ there — the handbook tells a reader to copy
 * the file, and repeating that in the copy would tell every contributor here to
 * copy it again. Excluding the comment is therefore the check's one exemption,
 * and it is the reason a change to the guidance under a heading is still
 * compared: that guidance is the shape.
 *
 * @param text  whole document
 * @returns `{ body, offset }`, or null when the document has no heading at all
 */
export function shape(text) {
  const ls = lines(text);
  const outside = outsideComments(ls);
  const first = ls.findIndex((l, i) => outside[i] && HEADING.test(l));
  if (first === -1) return null;
  return { body: ls.slice(first).join('\n'), offset: first };
}

/**
 * Compare the handbook shape against the copy GitHub reads.
 *
 * @param handbook      text of agent-manual/pull-request.md
 * @param copy          text of .github/PULL_REQUEST_TEMPLATE.md
 * @param handbookName  path to name in findings
 * @param copyName      path to name in findings
 * @returns array of finding strings, empty when the two agree
 */
export function templateFindings(handbook, copy, handbookName, copyName) {
  const findings = [];
  const a = shape(handbook);
  const b = shape(copy);

  // A document with no heading is the silent no-op E3 exists for: the
  // comparison would succeed against nothing. It has to cost the same as a
  // disagreement.
  if (a === null) {
    findings.push(`${handbookName} carries no heading, so there is no shape to hold a copy to.`);
  }
  if (b === null) {
    findings.push(`${copyName} carries no heading, so nothing was compared.`);
  }
  if (a === null || b === null) return findings;

  for (const [name, text] of [
    [handbookName, handbook],
    [copyName, copy],
  ]) {
    const got = headings(text);
    // Joined on a newline rather than a space: a heading may contain spaces, so
    // a space separator would let ["Open", "questions"] equal ["Open questions"].
    if (got.join('\n') !== CORE_SECTIONS.join('\n')) {
      findings.push(
        `${name} — sections are ${got.length ? got.join(' · ') : '(none)'}; ` +
          `the core set is ${CORE_SECTIONS.join(' · ')}`
      );
    }
  }

  if (a.body !== b.body) {
    const al = a.body.split('\n');
    const bl = b.body.split('\n');
    let i = 0;
    while (i < al.length && i < bl.length && al[i] === bl[i]) i += 1;
    const show = (l) => (l === undefined ? '(end of file)' : `"${l.trim().slice(0, 56)}"`);
    findings.push(
      `${copyName}:${b.offset + i + 1} has ${show(bl[i])}, where ` +
        `${handbookName}:${a.offset + i + 1} has ${show(al[i])}. ` +
        'Edit the handbook and copy it down; the handbook is the shape.'
    );
  }

  return findings;
}
