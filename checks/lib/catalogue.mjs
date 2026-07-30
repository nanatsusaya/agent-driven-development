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

    // Identifiers are permanent and never reused, which is what lets a project
    // refer to a rule by identifier and mean something stable. A duplicate
    // breaks exactly that: `Map.set` kept the last definition silently, so the
    // catalogue said one thing to a reader scrolling past the first heading and
    // another to every check, every adaptation and every link resolving the
    // anchor. Refusing to parse is the only honest response — there is no way
    // to decide which of the two the project meant.
    if (rules.has(headingId)) {
      throw new Error(
        `rules.md: rule ${headingId} is defined twice. Identifiers are permanent ` +
          'and never reused, so a duplicate is either a copied heading or a ' +
          'renumbering that half happened. Nothing here can tell which of the ' +
          'two definitions a project referring to ' +
          `${headingId} meant.`
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
 * True when `source` quantifies a group that already quantifies something —
 * `(x+)+`, `(x*)*`, `(x+)*`, `(x?)+` and their relatives.
 *
 * That shape is where a regular expression stops being linear: on input that
 * nearly matches, the engine explores exponentially many ways to divide the
 * repetition between the inner quantifier and the outer one. A withdrawn-rule
 * pattern is applied to every paragraph of every document in a project, so one
 * such entry does not fail — it hangs, with no indication which pattern is
 * responsible. Measured on a fixture: `(a+)+b` against a paragraph of 34 `a`s
 * and a `c` had not finished after 45 seconds.
 *
 * The right time for this is before the first entry exists, which is now.
 *
 * This is not a proof of linearity, and does not pretend to be one. Overlapping
 * alternation — `(a|aa)+` — is the other classic shape and is not detected;
 * detecting it needs the analysis a regular-expression engine does. What this
 * catches is the shape that gets written by accident.
 *
 * Written as a scan rather than a pattern, because a pattern for nested
 * quantifiers has to understand escapes, character classes and group prefixes,
 * and one that does not would reject `direct(ly)?` — the example this very
 * document gives.
 */
function hasNestedQuantifier(source) {
  /** One entry per open group: whether anything inside it is repeatable. */
  const open = [];
  const AMBIGUOUS_COUNT = /^\{\d*,\d*\}/;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '[') {
      // A character class. `]` immediately after `[` or `[^` is a literal.
      i++;
      if (source[i] === '^') i++;
      if (source[i] === ']') i++;
      while (i < source.length && source[i] !== ']') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '(') {
      open.push(false);
      i++;
      // Skip a group prefix, so that the `?` of `(?:` is not read as a
      // quantifier: `(?:`, `(?=`, `(?!`, `(?<=`, `(?<!`, `(?<name>`.
      if (source[i] === '?') {
        i++;
        if (source[i] === '<') {
          if (source[i + 1] === '=' || source[i + 1] === '!') i += 2;
          else {
            const close = source.indexOf('>', i);
            i = close === -1 ? i + 1 : close + 1;
          }
        } else if (':=!'.includes(source[i])) i++;
      }
      continue;
    }
    if (c === ')') {
      const innerRepeats = open.pop();
      const rest = source.slice(i + 1);
      const outerRepeats =
        rest[0] === '*' || rest[0] === '+' || rest[0] === '?' || AMBIGUOUS_COUNT.test(rest);
      if (innerRepeats && outerRepeats) return true;
      i++;
      continue;
    }
    // A quantifier applies to whatever precedes it, inside the innermost group.
    // `{3}` is deliberately not one: an exact count is not ambiguous, so
    // `(ab{3})+` divides only one way and rejecting it would be a false alarm.
    if (c === '*' || c === '+' || c === '?') {
      if (open.length) open[open.length - 1] = true;
      i++;
      continue;
    }
    if (c === '{') {
      const m = AMBIGUOUS_COUNT.exec(source.slice(i));
      if (m) {
        if (open.length) open[open.length - 1] = true;
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return false;
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

    if (hasNestedQuantifier(pattern)) {
      throw new Error(
        `withdrawn.md: entry ${m[1]} has a nested quantifier in /${pattern}/. ` +
          'A group that repeats something already repeatable can take ' +
          'exponential time on input that nearly matches, and this pattern is ' +
          'applied to every paragraph of every document. Write the repetition ' +
          'once, or spell the alternatives out. withdrawn.md says so under ' +
          'Format.'
      );
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
