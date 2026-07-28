/**
 * Reading the catalogue.
 *
 * `method/rules.md` and `method/withdrawn.md` are written for people; this
 * module is the only place that also reads them as data. Keeping the human
 * document authoritative — rather than generating it from a machine-readable
 * file, or maintaining both — is rule C2 applied to the method itself: there is
 * one definition of a rule, and it is the one a reader sees.
 *
 * The cost is a parser that depends on the documents keeping their shape. That
 * is deliberate and checked: `parseRules` throws when it finds no rules at all,
 * because a silently empty catalogue would make every subsequent check pass.
 */

import { readFileSync } from 'node:fs';
import { blankFences, normaliseEol } from './markdown.mjs';

/** Check statuses a rule may declare. */
export const CHECK_KINDS = new Set(['automated', 'manual', 'n/a']);

/**
 * Parse the rule catalogue.
 *
 * A rule is an explicit `<a id="...">` anchor followed by a level-3 heading
 * carrying the identifier. The anchor is what projects link to and what
 * `method.json` refers to, so it — not the heading text — is the identity.
 *
 * @param path absolute path to rules.md
 * @returns Map of id (upper case) to `{ id, title, check, cluster }`
 * @throws when the file yields no rules, which always means the format moved
 */
export function parseRules(path) {
  const text = normaliseEol(readFileSync(path, 'utf8'));
  const body = blankFences(text);
  const rules = new Map();

  const heads = [
    ...body.matchAll(/<a\s+id="([a-z]\d+)"><\/a>\s*\n###\s+([A-Z]\d+)\s+—\s+(.+?)\s*$/gm),
  ];

  heads.forEach((m, i) => {
    const [full, anchorId, headingId, title] = m;
    if (anchorId.toUpperCase() !== headingId) {
      throw new Error(
        `rules.md: anchor "${anchorId}" does not match heading "${headingId}". ` +
          'The anchor is the rule identity; a mismatch means links resolve to the wrong rule.'
      );
    }
    const start = m.index + full.length;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    const block = body.slice(start, end);

    const cm = block.match(/^\*\*Check:\*\*\s+`([^`]+)`/m);
    const check = cm ? cm[1].trim() : null;
    if (!check || !CHECK_KINDS.has(check)) {
      throw new Error(
        `rules.md: rule ${headingId} declares no usable Check status ` +
          `(found ${check === null ? 'none' : `"${check}"`}). ` +
          `Expected one of: ${[...CHECK_KINDS].join(', ')}.`
      );
    }

    rules.set(headingId, {
      id: headingId,
      title,
      check,
      cluster: headingId[0],
    });
  });

  if (rules.size === 0) {
    throw new Error(
      `rules.md at ${path} yielded no rules. The catalogue format has changed ` +
        'and this parser has not. Refusing to report success on an empty catalogue.'
    );
  }
  return rules;
}

/**
 * Parse the withdrawn-rule patterns.
 *
 * The format example in the document lives inside a fenced block and is
 * therefore invisible here — which is the same exemption the scan itself grants
 * to fenced examples, applied one level up. An empty result is legitimate: a
 * catalogue that has never withdrawn a rule has nothing to scan for.
 *
 * @param path absolute path to withdrawn.md
 * @returns array of `{ id, label, pattern, regex, withdrawn, reason, instead }`
 */
export function parseWithdrawn(path) {
  const body = blankFences(normaliseEol(readFileSync(path, 'utf8')));
  const entries = [];

  const heads = [...body.matchAll(/^###\s+(W\d+)\s+—\s+(.+?)\s*$/gm)];
  heads.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    const block = body.slice(start, end);

    const field = (name) => {
      const fm = block.match(
        new RegExp(`^-\\s+\\*\\*${name}:\\*\\*\\s+(.+?)\\s*$`, 'm')
      );
      return fm ? fm[1] : null;
    };

    const raw = field('Pattern');
    const pattern = raw ? raw.replace(/^`|`$/g, '') : null;
    const withdrawn = field('Withdrawn');
    const reason = field('Reason');
    const instead = field('Instead');

    for (const [name, value] of Object.entries({
      Pattern: pattern,
      Withdrawn: withdrawn,
      Reason: reason,
      Instead: instead,
    })) {
      if (!value) {
        throw new Error(
          `withdrawn.md: entry ${m[1]} is missing the **${name}:** field. ` +
            'An incomplete entry is a pattern that never fires.'
        );
      }
    }

    let regex;
    try {
      regex = new RegExp(pattern, 'i');
    } catch (e) {
      throw new Error(
        `withdrawn.md: entry ${m[1]} has an invalid pattern /${pattern}/ — ${e.message}`
      );
    }

    entries.push({
      id: m[1],
      label: m[2],
      pattern,
      regex,
      withdrawn,
      reason,
      instead,
    });
  });

  return entries;
}
