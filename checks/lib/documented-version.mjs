/**
 * The catalogue version this repository's own example declarations show.
 *
 * House style rather than method, and that distinction is the whole reason this
 * file can exist. A project pinning its `method.json` to an older catalogue is
 * doing something legitimate — check-method.mjs reports the difference under
 * *not verified here* and deliberately does not fail on it. What is not
 * legitimate is *this* repository shipping a template pinned to a version it no
 * longer is: whoever copies it starts on a pin they never chose, and the first
 * thing their first run tells them is that they are already behind.
 *
 * It went wrong exactly that way. Catalogue 0.5 moved and four documented
 * declarations stayed at 0.4 — including agent-manual/method.json, which the
 * README offers as the thing to start from. An adopting project found it by
 * comparing two copies, which is the only thing that ever would have.
 *
 * The scan is **block-scoped**: a version has to match only when it sits in the
 * same JSON object as this method's own name. That is what keeps package.json,
 * the two plugin manifests and every other version string in the repository out
 * of it — without an exemption list naming them, which would go stale the first
 * time somebody added a manifest.
 */

import { normaliseEol } from './markdown.mjs';

/**
 * A declaration is recognised by the method's own name, which is also the value
 * check-method.mjs requires. Whitespace is loose because a JSON formatter is
 * free to move it and a check that a reformatter can switch off is not a check.
 */
const DECLARES_METHOD = /"method"\s*:\s*"agent-project-rules"/;

/** Every version string in a block. Global: a block may show more than one. */
const VERSION = /"version"\s*:\s*"([^"]*)"/g;

/**
 * The fenced blocks of a markdown document, each with the line its body starts
 * on.
 *
 * Fence detection mirrors `blankFences` deliberately, including that a fence is
 * closed only by its own marker character. Two functions disagreeing about
 * where a fence ends would put one of them quietly out of step with the
 * document, and this one would fail open.
 *
 * @param text whole document, end-of-line already normalised
 * @returns {{body: string, startLine: number}[]} bodies without their fences
 */
export function fencedBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let open = null;
  let marker = '';
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (!open) {
        open = { body: [], startLine: i + 2 };
        marker = m[1][0];
        return;
      }
      if (m[1][0] === marker) {
        blocks.push({ body: open.body.join('\n'), startLine: open.startLine });
        open = null;
        return;
      }
    }
    if (open) open.body.push(line);
  });
  // An unclosed fence still yields its block. Dropping it would mean a stray
  // fence anywhere above a declaration silently removed that declaration from
  // the scan, which is the silent no-op E3 is about.
  if (open) {
    blocks.push({ body: open.body.join('\n'), startLine: open.startLine });
  }
  return blocks;
}

/**
 * Every version this document states about a declaration of this method.
 *
 * @param text whole document
 * @param fenced true for markdown, false for a `.json` file that is one block
 * @returns {{version: string, line: number}[]}
 */
export function declaredVersions(text, fenced) {
  const normalised = normaliseEol(text);
  const blocks = fenced
    ? fencedBlocks(normalised)
    : [{ body: normalised, startLine: 1 }];
  const found = [];
  for (const block of blocks) {
    if (!DECLARES_METHOD.test(block.body)) continue;
    const lines = block.body.split('\n');
    lines.forEach((line, i) => {
      VERSION.lastIndex = 0;
      let m;
      while ((m = VERSION.exec(line)) !== null) {
        found.push({ version: m[1], line: block.startLine + i });
      }
    });
  }
  return found;
}

/**
 * Compare what the documents show against the catalogue's own VERSION.
 *
 * Finding nothing at all is a finding. A template that stopped declaring a
 * version, or a rename that moved the method's name and left this pattern
 * matching nothing, both arrive as a clean run otherwise — the check reporting
 * success because it understood none of what it read.
 *
 * @param files {{rel: string, text: string, fenced: boolean}[]}
 * @param catalogueVersion contents of method/VERSION, trimmed
 * @returns {{findings: string[], read: number}}
 */
export function compareDeclaredVersions(files, catalogueVersion) {
  const findings = [];
  let read = 0;
  for (const file of files) {
    for (const { version, line } of declaredVersions(file.text, file.fenced)) {
      read += 1;
      if (version !== catalogueVersion) {
        findings.push(
          `${file.rel}:${line} — declares ${JSON.stringify(version)}; ` +
            `method/VERSION is ${JSON.stringify(catalogueVersion)}`
        );
      }
    }
  }
  if (read === 0) {
    findings.push(
      'no documented declaration states a version — the scan understood ' +
        'nothing it read, which is not the same as agreement'
    );
  }
  return { findings, read };
}
