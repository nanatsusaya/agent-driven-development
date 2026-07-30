/**
 * Markdown scanning primitives shared by the coherence check.
 *
 * Every function here exists to answer one question: which parts of a document
 * are the author *asserting* something, as opposed to quoting, illustrating or
 * naming it? A check that cannot tell the difference is worse than no check,
 * because it fires on correct documents and teaches people to ignore it.
 *
 * Three kinds of text are never assertions:
 *
 *   - fenced code blocks   — examples, including examples of what is forbidden
 *   - inline code spans    — identifiers, patterns, filenames
 *   - blockquotes          — quoted material, including superseded wording that
 *                            a decision record is required to reproduce verbatim
 *
 * The blockquote exemption is load-bearing rather than convenient: rule D2
 * requires an amended decision to quote the wording it replaced, and rule M2
 * requires a check that fails on stale copies of that same wording. Without the
 * exemption the two rules contradict each other.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Directories never worth scanning, whatever the project is. */
export const DEFAULT_IGNORES = new Set([
  '.git',
  'node_modules',
  '.turbo',
  'dist',
  'build',
  '.next',
  '.astro',
  '.obsidian',
  'vendor',
]);

/**
 * Collect every Markdown file under `root`, as paths relative to `root` using
 * forward slashes regardless of platform, so that findings and configuration
 * compare equal on Windows and Linux alike.
 *
 * The optional third argument is how a caller learns what the walk *did not*
 * look at. Both kinds of omission used to be invisible: a directory in `ignores`
 * was skipped without a word, and an unreadable one was skipped on the reasoning
 * that reporting it was not this check's business. For `.git` that is obviously
 * right; for `vendor` and `.obsidian`, which can hold real documents, it is a
 * blind spot — and a report that names its blind spots is the one thing this
 * check insists on everywhere else.
 *
 * @param root    directory to walk
 * @param ignores directory names to skip at any depth
 * @param report  optional `{ skipped: [], unreadable: [] }`, filled with
 *                relative paths as they are met
 * @returns relative paths, sorted, for stable output
 */
export function listMarkdownFiles(root, ignores = DEFAULT_IGNORES, report = null) {
  const found = [];
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      if (report) report.unreadable.push(rel || '.');
      return;
    }
    for (const e of entries) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (ignores.has(e.name)) {
          if (report) report.skipped.push(childRel);
          continue;
        }
        walk(join(dir, e.name), childRel);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        found.push(relative(root, join(dir, e.name)).split(sep).join('/'));
      }
    }
  };
  if (!isDirectory(root)) return found;
  walk(root, '');
  return found.sort();
}

/**
 * Directories under `root` that are themselves a copy of the method repository.
 *
 * The documented way to get the check used to put the clone *inside* the project
 * being checked, and its directory name is in nobody's ignore list, so the first
 * run an adopter ever made scanned it: 115 findings about files that were not
 * theirs, at the one moment the tool has to be worth trusting. The command is
 * fixed, but people will keep cloning wherever they like, and a tool that is only
 * correct when the instructions were followed is not correct.
 *
 * Recognised by content, never by name — `method/rules.md` **and**
 * `checks/check-method.mjs` together. A name test would break the moment somebody
 * renamed the directory, and it would break silently, which is worse than not
 * having the test.
 *
 * `root` itself is never a candidate: only children are examined, so the method
 * repository can still be checked against itself.
 *
 * The cost is a second directory traversal. Traversal is the cheap half of this
 * check — every document is read and scanned line by line afterwards — and the
 * alternative is teaching the generic walker what a method repository is.
 *
 * @param root    directory to walk
 * @param ignores directory names to skip at any depth
 * @returns relative paths with forward slashes, sorted
 */
export function embeddedMethodRepos(root, ignores = DEFAULT_IGNORES) {
  const found = [];
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: not this check's business to report
    }
    for (const e of entries) {
      if (!e.isDirectory() || ignores.has(e.name)) continue;
      const child = join(dir, e.name);
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (
        exists(join(child, 'method', 'rules.md')) &&
        exists(join(child, 'checks', 'check-method.mjs'))
      ) {
        found.push(childRel);
        continue; // nothing inside a copy of the method is the project's
      }
      walk(child, childRel);
    }
  };
  if (!isDirectory(root)) return found;
  walk(root, '');
  return found.sort();
}

/** True when `p` exists and is a directory. Never throws. */
export function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** True when `p` exists at all, file or directory. Never throws. */
export function exists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Byte length of `p`, or null when it is not a readable regular file.
 *
 * Existence alone answers less than it looks like it does. A role bound to a
 * zero-byte file passes an existence test and supports nothing: the next
 * session opens it and learns what it would have learnt from a missing file,
 * with a name in the declaration insisting otherwise.
 */
export function fileSize(p) {
  try {
    const s = statSync(p);
    return s.isFile() ? s.size : null;
  } catch {
    return null;
  }
}

/**
 * Strip a byte-order mark and normalise CRLF and lone CR to LF.
 *
 * Every document is put through this on the way in. Without it, a Windows
 * checkout leaves a trailing `\r` on every line, so any pattern anchored to the
 * end of a line matches nothing — the silent-no-op failure of rule E3, caused
 * by the platform rather than by the pattern. A BOM has the mirror effect at
 * the other end: it hides the `#` of the first heading, and with it that
 * heading's anchor.
 */
export function normaliseEol(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/**
 * Replace the *contents* of fenced code blocks with empty lines, keeping the
 * fence markers and the total line count. Line numbers stay usable for
 * reporting, which matters more than the few bytes saved by dropping them.
 *
 * @param text whole document
 * @returns the document with fenced content blanked
 */
export function blankFences(text) {
  const lines = text.split('\n');
  let inFence = false;
  let marker = '';
  return lines
    .map((line) => {
      const m = line.match(/^\s*(`{3,}|~{3,})/);
      if (m) {
        if (!inFence) {
          inFence = true;
          marker = m[1][0];
          return '';
        }
        if (m[1][0] === marker) {
          inFence = false;
          return '';
        }
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

/**
 * Blank the contents of inline code spans while preserving line length, so a
 * pattern cannot match an identifier that merely looks like prose. Length is
 * preserved because column numbers are cheap to keep and awkward to recover.
 *
 * @param line a single line, already outside any fence
 */
export function blankCodeSpans(line) {
  return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
}

/** True when the line is a blockquote, and therefore quoted rather than asserted. */
export function isBlockquote(line) {
  return /^\s{0,3}>/.test(line);
}

/**
 * The lines of a document that carry the author's own assertions: outside
 * fences, not quoted, with code spans blanked.
 *
 * @param text whole document
 * @returns array of `{ n, text }` with `n` a 1-based line number
 */
export function assertedLines(text) {
  return blankFences(text)
    .split('\n')
    .map((line, i) => ({ n: i + 1, text: line }))
    .filter(({ text: t }) => t.trim() !== '' && !isBlockquote(t))
    .map(({ n, text: t }) => ({ n, text: blankCodeSpans(t) }));
}

/**
 * The paragraphs of a document that carry the author's own assertions, with
 * their internal whitespace collapsed to single spaces.
 *
 * Line-based scanning cannot see a phrase that a hard wrap has split across two
 * lines — and prose wrapped at a fixed width splits phrases constantly. A
 * pattern that can never fire reports success and is believed, which is the
 * failure rule E3 exists to prevent, so the withdrawn-rule scan works on
 * paragraphs rather than lines.
 *
 * @param text whole document
 * @returns array of `{ n, text }` with `n` the 1-based line the paragraph opens on
 */
export function assertedParagraphs(text) {
  const lines = blankFences(text).split('\n');
  const out = [];
  let buf = [];
  let start = 0;

  const flush = () => {
    if (buf.length) {
      const joined = blankCodeSpans(buf.join(' ')).replace(/\s+/g, ' ').trim();
      if (joined) out.push({ n: start, text: joined });
    }
    buf = [];
  };

  lines.forEach((line, i) => {
    if (line.trim() === '' || isBlockquote(line)) {
      flush();
      return;
    }
    if (buf.length === 0) start = i + 1;
    buf.push(line);
  });
  flush();
  return out;
}

/**
 * Anything of the form `scheme:` — the shape of a URI, whatever the scheme is.
 *
 * The exclusion list used to name three: `https?:`, `mailto:` and `#!`. Every
 * other scheme was treated as a path relative to the document and reported as a
 * broken link. `tel:`, `file:`, `ftp:`, `vscode://`, `slack://` and
 * `obsidian://` all produced findings — and `.obsidian` is in DEFAULT_IGNORES,
 * so an Obsidian vault is a target this check knows it will meet. False alarms
 * in the check that produces the most findings in a real repository is the worst
 * possible place for them (rule E3).
 *
 * Written as a shape rather than a list because a list is wrong again the next
 * time someone invents a scheme. What no scheme can be is a relative path: a
 * path is relative precisely by having no scheme.
 */
const URI_SCHEME = /^[a-z][a-z0-9+.\-]*:/i;

/**
 * Every relative link target in a document, excluding fenced examples. External
 * links are dropped: whether a URL resolves is a network question, and a check
 * that depends on the network fails for reasons unrelated to the repository.
 *
 * Three destination forms are read, because all three are links a reader can
 * click and a reference is only as good as the form it was written in:
 *
 *   - `[text](dest)`, with an optional `"title"` after the destination — the
 *     title used to make the whole link invisible to this scan
 *   - `[text](<dest>)`, which is how CommonMark permits a destination
 *     containing spaces
 *   - `[label]: dest`, a reference definition. A definition pointing nowhere is
 *     a broken link however many places use it — including none, which is its
 *     own kind of stale.
 *
 * @param text whole document
 * @returns array of `{ n, target }` where target keeps any `#fragment`
 */
export function relativeLinks(text) {
  const out = [];
  const lines = blankFences(text).split('\n');
  const take = (n, target) => {
    const t = target.trim();
    if (t === '' || URI_SCHEME.test(t) || t.startsWith('#!')) return;
    out.push({ n, target: t });
  };
  lines.forEach((line, i) => {
    const scannable = blankCodeSpans(line);
    for (const m of scannable.matchAll(
      /\[[^\]]*\]\(\s*(?:<([^<>]*)>|([^)\s]*))\s*(?:"[^"]*"|'[^']*'|\([^)]*\))?\s*\)/g
    )) {
      take(i + 1, m[1] ?? m[2] ?? '');
    }
    // A label opening with `^` is a GFM footnote, whose body is prose rather
    // than a destination. Reading one as a path would report every footnote in
    // the document as a broken link.
    const def = scannable.match(
      /^ {0,3}\[([^\]^][^\]]*)\]:\s*(?:<([^<>]*)>|(\S+))\s*(?:"[^"]*"|'[^']*')?\s*$/
    );
    if (def) take(i + 1, def[2] ?? def[3] ?? '');
  });
  return out;
}

/**
 * The set of fragment identifiers a document offers: heading slugs plus any
 * explicit `<a id="...">` anchor.
 *
 * Heading slugs are **approximated**, and the approximation is deliberately
 * permissive. Platforms disagree about which punctuation survives slug
 * generation — dash punctuation in particular — and there is no way to settle
 * it by reasoning, only by rendering the page. Where the answer is unknown,
 * every plausible slug is accepted.
 *
 * Being permissive is the right trade here. A missed broken anchor costs one
 * dead link; a false alarm teaches people to distrust the check, and the
 * distrust generalises to the checks that are right (rule E3).
 *
 * The character classes are Unicode-aware on purpose. JavaScript's `\w` is
 * ASCII-only, so an earlier version stripped the umlaut out of a German
 * heading and reported every link to it as broken. Any project whose documents
 * are not in English would have met a check that was wrong about all of them.
 *
 * @param text whole document
 */
export function anchors(text) {
  const set = new Set();
  const body = blankFences(text);

  for (const m of body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    const title = m[1]
      .replace(/`/g, '')
      // A heading that is itself a link contributes its *text* to the slug, not
      // its destination. Stripping the punctuation instead glued the two
      // together, so every link to such a heading was reported as broken.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
      .toLowerCase();

    // Keep letters, numbers, connector punctuation, dash punctuation, spaces.
    const kept = title.replace(/[^\p{L}\p{N}\p{Pc}\p{Pd}\p{Zs}\s]/gu, '');

    // An em or en dash in a heading is the case platforms disagree about: it
    // may survive as itself, be normalised to a plain hyphen, or be dropped
    // entirely. All three are accepted. Written as filters rather than a
    // set-difference character class, which needs a newer runtime than this
    // repository requires.
    const isExoticDash = (c) => c !== '-' && /\p{Pd}/u.test(c);
    const normalised = [...kept].map((c) => (isExoticDash(c) ? '-' : c)).join('');
    const dropped = [...kept].filter((c) => !isExoticDash(c)).join('');

    for (const variant of [kept, normalised, dropped]) {
      set.add(variant.trim().replace(/[\s\p{Zs}]/gu, '-'));
      // The untrimmed form as well. A heading opening or closing with something
      // the strip removes — an emoji, a bracketed tag, a trailing colon — leaves
      // a space there, and platforms disagree about whether the resulting slug
      // keeps the edge hyphen or loses it. Same reasoning as the dash variants:
      // where the answer cannot be settled by reasoning, accept both.
      set.add(variant.replace(/[\s\p{Zs}]/gu, '-'));
    }
  }

  for (const m of body.matchAll(/<a\s+id="([^"]+)"/g)) set.add(m[1]);
  return set;
}
