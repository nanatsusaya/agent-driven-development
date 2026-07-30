/**
 * The install command, stated in more than one document.
 *
 * Three documents carry a copyable `git clone` line and the command that runs
 * the check from the clone. C2 says every fact has one authority, and this is
 * the case where that cannot be arranged: a command has to be present where the
 * reader is, or they cannot copy it. So the copies stay and a command decides
 * whether they still agree — the same trade `documented-counts.mjs` makes for
 * the counter-test figures.
 *
 * It also decides one thing about the command's content, because the content was
 * wrong for as long as the command existed: the clone used to land *inside* the
 * project being checked, and the first run an adopter ever made scanned it. That
 * is not a formatting preference, so it is not left to whoever reviews the diff.
 */

/**
 * A `git clone` line, with an optional destination.
 *
 * Anchored, so a sentence mentioning the command in prose is not a claim about
 * it — only a line inside a fenced block, which is what a reader copies.
 */
const CLONE = /^git clone\s+(\S+)(?:\s+(\S+))?$/;

/** A line running the coherence check, with whatever path prefix it uses. */
const RUN = /^node\s+(\S*?)checks\/check-method\.mjs(?:\s|$)/;

/** A destination outside the project: relative upwards, absolute, or a home path. */
const OUTSIDE = /^(\.\.\/|\/|~|[A-Za-z]:[\\/])/;

/**
 * The fenced blocks of a document, contents included.
 *
 * `blankFences` in markdown.mjs answers the opposite question — what is *not*
 * inside a fence — so it cannot be reused here.
 *
 * @param text whole document
 * @returns array of `{ info, lines: [{ n, text }] }`, 1-based line numbers
 */
export function fencedBlocks(text) {
  const lines = text.split('\n');
  const out = [];
  let current = null;
  let marker = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(`{3,}|~{3,})\s*(\S*)/);
    if (m) {
      if (!current) {
        current = { info: m[2], lines: [] };
        marker = m[1][0];
        continue;
      }
      if (m[1][0] === marker) {
        out.push(current);
        current = null;
        continue;
      }
    }
    if (current) current.lines.push({ n: i + 1, text: lines[i] });
  }
  // An unterminated fence is not this check's business to report; the line-width
  // and link scans read the same documents and would meet it too.
  if (current) out.push(current);
  return out;
}

/**
 * Compare every stated install command against every other.
 *
 * @param docs array of `{ rel, text }`
 * @returns findings, empty when the documents agree and the command is sound
 */
export function installFindings(docs) {
  const findings = [];
  const clones = [];

  for (const { rel, text } of docs) {
    for (const block of fencedBlocks(text)) {
      const inBlock = block.lines
        .map((l) => ({ ...l, m: CLONE.exec(l.text.trim()) }))
        .filter((l) => l.m);
      for (const l of inBlock) {
        clones.push({ rel, n: l.n, line: l.text.trim(), dest: l.m[2] ?? null });
      }
      if (!inBlock.length) continue;
      // Only a block that clones is held to this. `checks/README.md` shows the
      // command as run from inside the method repository, which is a different
      // and correct thing to document.
      const dest = inBlock[0].m[2];
      if (!dest) continue;
      const expected = dest.replace(/\/+$/, '') + '/';
      for (const l of block.lines) {
        const r = RUN.exec(l.text.trim());
        if (r && r[1] !== expected) {
          findings.push(
            `${rel}:${l.n} runs the check from "${r[1] || './'}", but the clone ` +
              `in the same block goes to "${dest}". One of the two lines was ` +
              'changed and the other was not.'
          );
        }
      }
    }
  }

  if (!clones.length) {
    return [
      'no fenced block states the clone command — deleted rather than corrected',
    ];
  }

  const first = clones[0];
  for (const c of clones.slice(1)) {
    if (c.line !== first.line) {
      findings.push(
        `${c.rel}:${c.n} states a different clone command from ` +
          `${first.rel}:${first.n}:\n      ${c.line}\n      ${first.line}`
      );
    }
  }

  for (const c of clones) {
    if (!c.dest) {
      findings.push(
        `${c.rel}:${c.n} gives no destination, so git names the directory after ` +
          'the repository and puts it inside the project being checked. The ' +
          "first run then scans the method's own documents as if they were the " +
          "reader's."
      );
    } else if (!OUTSIDE.test(c.dest)) {
      findings.push(
        `${c.rel}:${c.n} clones to "${c.dest}", which is inside the project ` +
          'being checked. Clone it beside the project, not into it.'
      );
    }
  }

  return findings;
}
