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
 * @param root    directory to walk
 * @param ignores directory names to skip at any depth
 * @returns relative paths, sorted, for stable output
 */
export function listMarkdownFiles(root, ignores = DEFAULT_IGNORES) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: not this check's business to report
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (ignores.has(e.name)) continue;
        walk(join(dir, e.name));
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        found.push(relative(root, join(dir, e.name)).split(sep).join('/'));
      }
    }
  };
  if (!isDirectory(root)) return found;
  walk(root);
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
 * Every relative link target in a document, excluding fenced examples. External
 * links are dropped: whether a URL resolves is a network question, and a check
 * that depends on the network fails for reasons unrelated to the repository.
 *
 * @param text whole document
 * @returns array of `{ n, target }` where target keeps any `#fragment`
 */
export function relativeLinks(text) {
  const out = [];
  const lines = blankFences(text).split('\n');
  lines.forEach((line, i) => {
    const scannable = blankCodeSpans(line);
    for (const m of scannable.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#!)/i.test(target)) continue;
      out.push({ n: i + 1, target });
    }
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
    const title = m[1].replace(/`/g, '').toLowerCase();

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
    }
  }

  for (const m of body.matchAll(/<a\s+id="([^"]+)"/g)) set.add(m[1]);
  return set;
}
