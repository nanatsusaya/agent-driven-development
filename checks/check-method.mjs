#!/usr/bin/env node
/**
 * The coherence check.
 *
 * It answers one question: does this project's declaration match this project?
 * It does not ask whether the project obeys the catalogue. Rule A1 says the
 * catalogue is a starting point and expects to be reshaped, so "compliance" is
 * the wrong frame — a narrowed rule with a stated reason is a correct state,
 * not a defect. What is a defect is a rule that vanished without anyone
 * deciding it should.
 *
 * Eight checks: `declaration`, `artefacts`, `adaptations`, `accounting`,
 * `links`, `decisions`, `withdrawn`, `language`. The last four belong to rules
 * (C5, D2, M2, L1) and run only while that rule is in force; the first four
 * are about the declaration itself. See checks/README.md for the table.
 *
 * The report ends by naming what it could *not* check. A check that stays quiet
 * about its own blind spots reads as a clean bill of health, which is rule H1
 * broken by the tool meant to enforce it.
 *
 * Usage:
 *   node check-method.mjs [project-path] [--catalogue <path>] [--quiet]
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, posix } from 'node:path';
import {
  DEFAULT_IGNORES,
  listMarkdownFiles,
  assertedLines,
  relativeLinks,
  anchors,
  blankFences,
  blankCodeSpans,
  exists,
  isDirectory,
} from './lib/markdown.mjs';
import { parseRules, parseWithdrawn } from './lib/catalogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Roles the method defines. A declaration may not invent others. */
const ROLES = ['operating-rules', 'decisions', 'state', 'method-log'];

/** The kinds of adaptation a project may declare. */
const CHANGES = ['dropped', 'narrowed', 'replaced', 'deferred'];

/**
 * Rules whose `automated` check cannot be decided by reading the working tree.
 * Named in the report so that "no findings" is never mistaken for "everything
 * verified".
 */
const NOT_LOCALLY_CHECKABLE = {
  G1: 'trunk protection is a hosting-platform setting; verify it there',
};

/** American spellings and their British counterparts, for the L1 scan. */
const SPELLING_PAIRS = {
  color: 'colour',
  colors: 'colours',
  colored: 'coloured',
  behavior: 'behaviour',
  behaviors: 'behaviours',
  favor: 'favour',
  favors: 'favours',
  honor: 'honour',
  labor: 'labour',
  neighbor: 'neighbour',
  flavor: 'flavour',
  humor: 'humour',
  rumor: 'rumour',
  armor: 'armour',
  endeavor: 'endeavour',
  harbor: 'harbour',
  vapor: 'vapour',
  center: 'centre',
  centers: 'centres',
  centered: 'centred',
  theater: 'theatre',
  fiber: 'fibre',
  liter: 'litre',
  caliber: 'calibre',
  defense: 'defence',
  offense: 'offence',
  pretense: 'pretence',
  analyze: 'analyse',
  analyzed: 'analysed',
  analyzing: 'analysing',
  paralyze: 'paralyse',
  artifact: 'artefact',
  artifacts: 'artefacts',
  fulfill: 'fulfil',
  enroll: 'enrol',
  skillful: 'skilful',
  willful: 'wilful',
  instill: 'instil',
  traveled: 'travelled',
  traveling: 'travelling',
  canceled: 'cancelled',
  modeling: 'modelling',
  labeled: 'labelled',
  signaling: 'signalling',
  catalog: 'catalogue',
  catalogs: 'catalogues',
  dialog: 'dialogue',
  gray: 'grey',
};

/**
 * `-ize` words that are correct in every English regime, so the general
 * `-ise` preference must not fire on them. Kept deliberately generous: a scan
 * that produces false alarms teaches people to distrust every scan (rule E3).
 */
const IZE_ALLOWED = new Set([
  'size',
  'sizes',
  'sized',
  'sizing',
  'resize',
  'resized',
  'resizes',
  'resizing',
  'downsize',
  'upsize',
  'midsize',
  'oversize',
  'oversized',
  'capsize',
  'prize',
  'prizes',
  'seize',
  'seizes',
  'seized',
  'seizing',
  'maize',
  'baptize',
]);

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const findings = [];
const notes = [];

/**
 * Record a failure.
 *
 * @param check short name of the check that fired, shown as a prefix
 * @param where file (and line, where known) the reader should open
 * @param message what is wrong, phrased so the reader can act on it
 */
function fail(check, where, message) {
  findings.push({ check, where, message });
}

/** Record something the reader should know that is not a failure. */
function note(message) {
  notes.push(message);
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let projectArg = null;
let catalogueArg = null;
let quiet = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--catalogue') catalogueArg = argv[++i];
  else if (a === '--quiet') quiet = true;
  else if (a === '--help' || a === '-h') {
    console.log(
      'Usage: check-method.mjs [project-path] [--catalogue <path>] [--quiet]'
    );
    process.exit(0);
  } else if (!a.startsWith('-')) projectArg = a;
  else {
    console.error(`Unknown option: ${a}`);
    process.exit(2);
  }
}

const project = resolve(projectArg ?? process.cwd());
const catalogueDir = resolve(catalogueArg ?? join(HERE, '..', 'method'));

// ---------------------------------------------------------------------------
// Load the catalogue
// ---------------------------------------------------------------------------

let rules;
let withdrawn;
try {
  rules = parseRules(join(catalogueDir, 'rules.md'));
  withdrawn = parseWithdrawn(join(catalogueDir, 'withdrawn.md'));
} catch (e) {
  console.error(`Cannot read the catalogue at ${catalogueDir}`);
  console.error(`  ${e.message}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 1. The declaration
// ---------------------------------------------------------------------------

const declPath = join(project, 'method.json');
let decl = null;

if (!exists(declPath)) {
  fail(
    'declaration',
    'method.json',
    'No declaration found. A project adopts the method by binding the four ' +
      'roles to its own files; without that, there is nothing to check against. ' +
      'See method/adapting.md for the format.'
  );
} else {
  try {
    decl = JSON.parse(readFileSync(declPath, 'utf8'));
  } catch (e) {
    fail('declaration', 'method.json', `Not valid JSON — ${e.message}`);
  }
}

if (decl) {
  if (decl.method !== 'agent-driven-development') {
    fail(
      'declaration',
      'method.json',
      `"method" must be "agent-driven-development" (found ${JSON.stringify(decl.method)}).`
    );
  }
  if (typeof decl.version !== 'string') {
    fail('declaration', 'method.json', '"version" is required and must be a string.');
  }
  if (typeof decl.artefacts !== 'object' || decl.artefacts === null) {
    fail('declaration', 'method.json', '"artefacts" is required and must be an object.');
    decl.artefacts = {};
  }
  if (!Array.isArray(decl.adaptations)) {
    fail(
      'declaration',
      'method.json',
      '"adaptations" is required and must be an array. Use [] when nothing is adapted — ' +
        'an absent field and a deliberate empty list are different claims.'
    );
    decl.adaptations = [];
  }
}

// ---------------------------------------------------------------------------
// 2. Artefacts
// ---------------------------------------------------------------------------

const bound = {};

if (decl) {
  for (const key of Object.keys(decl.artefacts)) {
    if (!ROLES.includes(key)) {
      fail(
        'artefacts',
        'method.json',
        `Unknown role "${key}". The method defines: ${ROLES.join(', ')}.`
      );
    }
  }
  for (const role of ROLES) {
    if (!(role in decl.artefacts)) {
      fail(
        'artefacts',
        'method.json',
        `Role "${role}" is not declared. Bind it to a path, or to null with an ` +
          'adaptation explaining why the project does not use it.'
      );
      continue;
    }
    const value = decl.artefacts[role];
    if (value === null) {
      note(`role "${role}" is unbound — checks that depend on it were skipped`);
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      fail('artefacts', 'method.json', `Role "${role}" must be a path or null.`);
      continue;
    }
    const p = join(project, value);
    if (!exists(p)) {
      fail(
        'artefacts',
        'method.json',
        `Role "${role}" is bound to "${value}", which does not exist.`
      );
      continue;
    }
    bound[role] = value;
  }
}

// ---------------------------------------------------------------------------
// 3 & 4. Adaptations and accounting
// ---------------------------------------------------------------------------

const adapted = new Map();

if (decl) {
  decl.adaptations.forEach((a, i) => {
    const at = `method.json → adaptations[${i}]`;
    if (typeof a !== 'object' || a === null) {
      fail('adaptations', at, 'Each adaptation must be an object.');
      return;
    }
    const id = typeof a.rule === 'string' ? a.rule.toUpperCase() : null;
    if (!id) {
      fail('adaptations', at, '"rule" is required and must be a rule identifier.');
      return;
    }
    if (!rules.has(id)) {
      fail(
        'adaptations',
        at,
        `Rule "${a.rule}" is not in the catalogue. Identifiers are never reused, ` +
          'so this is either a typo or a rule from a different method version.'
      );
      return;
    }
    if (adapted.has(id)) {
      fail(
        'adaptations',
        at,
        `Rule ${id} is adapted more than once. Two entries for one rule means ` +
          'the project states two different things about it.'
      );
      return;
    }
    if (!CHANGES.includes(a.change)) {
      fail(
        'adaptations',
        at,
        `"change" must be one of: ${CHANGES.join(', ')} (found ${JSON.stringify(a.change)}).`
      );
    }
    if (typeof a.reason !== 'string' || a.reason.trim().length < 20) {
      fail(
        'adaptations',
        at,
        'An adaptation needs a reason a stranger could act on. An undocumented ' +
          'divergence is indistinguishable from carelessness, so the next session ' +
          'helpfully restores the rule you deliberately removed (rule A2).'
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.decided ?? '')) {
      fail('adaptations', at, '"decided" is required, as an ISO date (YYYY-MM-DD).');
    }
    if (a.change === 'deferred' && !/trigger|until|once|when|after/i.test(a.reason ?? '')) {
      fail(
        'adaptations',
        at,
        'A deferred rule needs a named trigger — what event makes it apply? ' +
          'Deferred without a trigger is dropped with better manners.'
      );
    }
    adapted.set(id, a);
  });

  for (const role of ROLES) {
    if (decl.artefacts[role] === null) {
      const relevant = [...adapted.keys()];
      if (relevant.length === 0) {
        fail(
          'accounting',
          'method.json',
          `Role "${role}" is unbound but nothing is adapted. Leaving a role out ` +
            'is a decision; record it as an adaptation of the rule it belongs to.'
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Collect the project's documents once
// ---------------------------------------------------------------------------

const ignores = new Set(DEFAULT_IGNORES);
for (const extra of decl?.ignore ?? []) ignores.add(extra.replace(/\/+$/, ''));

const docs = listMarkdownFiles(project, ignores).map((rel) => ({
  rel,
  text: readFileSync(join(project, rel), 'utf8'),
}));

// ---------------------------------------------------------------------------
// 5. Withdrawn rules
// ---------------------------------------------------------------------------

if (withdrawn.length === 0) {
  note('the catalogue has withdrawn no rules, so the stale-rule scan found nothing to look for');
} else {
  // The document that defines the patterns necessarily contains them.
  const definesPatterns = posix.join(
    posix.relative(project.split(/[\\/]/).join('/'), catalogueDir.split(/[\\/]/).join('/')),
    'withdrawn.md'
  );
  for (const { rel, text } of docs) {
    if (rel === definesPatterns) continue;
    for (const { n, text: line } of assertedLines(text)) {
      for (const w of withdrawn) {
        if (w.regex.test(line)) {
          fail(
            'withdrawn',
            `${rel}:${n}`,
            `Still teaches ${w.id} (${w.label}), withdrawn ${w.withdrawn}.\n` +
              `      Instead: ${w.instead}\n` +
              '      (If this line quotes the old rule for the record, make it a "> " blockquote.)'
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Structural checks for the automated rules
// ---------------------------------------------------------------------------

const inForce = (id) => rules.has(id) && !adapted.has(id);

// --- C5: relative links and anchors resolve.
// Gated like every other rule check. Before C5 existed this block ran
// unconditionally, which meant the check producing the most findings in a real
// repository belonged to no rule and could not be adapted away under A1.
if (inForce('C5')) {
  const anchorCache = new Map();
  const anchorsFor = (rel) => {
    if (!anchorCache.has(rel)) {
      const doc = docs.find((d) => d.rel === rel);
      anchorCache.set(rel, doc ? anchors(doc.text) : null);
    }
    return anchorCache.get(rel);
  };

  for (const { rel, text } of docs) {
    for (const { n, target } of relativeLinks(text)) {
      const [pathPart, frag] = target.split('#');
      const targetRel = pathPart
        ? posix.normalize(posix.join(posix.dirname(rel), pathPart)).replace(/\/$/, '')
        : rel;
      if (pathPart && !exists(join(project, targetRel))) {
        fail('links', `${rel}:${n}`, `Link target does not exist: ${target}`);
        continue;
      }
      if (frag && targetRel.toLowerCase().endsWith('.md')) {
        const set = anchorsFor(targetRel);
        if (set && !set.has(frag)) {
          fail(
            'links',
            `${rel}:${n}`,
            `Link points at "#${frag}" in ${targetRel}, which has no such anchor.`
          );
        }
      }
    }
  }
}

// --- D2: the decision index and the decisions agree
if (decl && inForce('D2') && bound.decisions) {
  const dir = join(project, bound.decisions);
  if (!isDirectory(dir)) {
    note(
      `"decisions" is bound to a file rather than a directory; the index check was skipped`
    );
  } else {
    const rel = bound.decisions.replace(/\/+$/, '');
    const inDir = docs.filter((d) => d.rel.startsWith(rel + '/'));
    const indexDoc = inDir.find((d) => /\/README\.md$/i.test(d.rel));

    if (!indexDoc) {
      fail(
        'decisions',
        rel,
        'No README.md index. Rule D2 is checkable only against an index that ' +
          'claims a status for every decision; without one, a superseded ' +
          'decision looks exactly like a current one.'
      );
    } else {
      const indexBody = blankFences(indexDoc.text);
      const claimed = new Map();
      for (const row of indexBody.matchAll(/^\|(.+)\|\s*$/gm)) {
        const cells = row[1].split('|').map((c) => c.trim());
        if (cells.length < 3) continue;
        const idm = cells[0].match(/(\d{4})/);
        const status = cells[cells.length - 1];
        if (idm && /^(Proposed|Accepted|Superseded|Planned)$/i.test(status)) {
          claimed.set(idm[1], status);
        }
      }
      if (claimed.size === 0) {
        fail(
          'decisions',
          indexDoc.rel,
          'The index lists no decision with a recognised status. Expected a table ' +
            'whose first cell carries the number and whose last cell is one of: ' +
            'Proposed, Accepted, Superseded, Planned.'
        );
      }
      for (const d of inDir) {
        if (d === indexDoc) continue;
        const num = d.rel.match(/(\d{4})/);
        if (!num) continue;
        if (!claimed.has(num[1])) {
          fail(
            'decisions',
            d.rel,
            `Decision ${num[1]} is not listed in ${indexDoc.rel}. Every decision ` +
              'file must appear in the index with a status.'
          );
          continue;
        }
        const own = blankFences(d.text).match(
          /^\s*(?:-\s*)?\*{0,2}Status:?\*{0,2}\s*:?\s*\*{0,2}(\w+)/im
        );
        if (own && own[1].toLowerCase() !== claimed.get(num[1]).toLowerCase()) {
          fail(
            'decisions',
            d.rel,
            `Status disagreement: the file says "${own[1]}", the index says ` +
              `"${claimed.get(num[1])}". One of them is lying to the next session.`
          );
        }
      }
    }
  }
}

// --- L1: one spelling regime, if the project declares one
{
  const spelling = decl?.language?.spelling;
  if (!spelling) {
    if (decl && inForce('L1')) {
      note(
        'no spelling regime declared ("language": { "spelling": "british" | "american" }), ' +
          'so rule L1 was not checked'
      );
    }
  } else if (spelling !== 'british' && spelling !== 'american') {
    fail(
      'language',
      'method.json',
      `Unknown spelling regime "${spelling}". This check knows "british" and ` +
        '"american". Oxford -ize is not modelled; declare it as an adaptation of L1.'
    );
  } else if (inForce('L1')) {
    const wrongWay =
      spelling === 'british'
        ? SPELLING_PAIRS
        : Object.fromEntries(
            Object.entries(SPELLING_PAIRS).map(([us, uk]) => [uk, us])
          );
    const declaresRule = new Set(
      [bound['operating-rules'], 'method/rules.md'].filter(Boolean)
    );

    for (const { rel, text } of docs) {
      if (declaresRule.has(rel)) continue;
      for (const { n, text: raw } of assertedLines(text)) {
        // A URL or link target is not prose and keeps its own spelling.
        const line = raw
          .replace(/\]\([^)\s]*\)/g, '')
          .replace(/https?:\/\/\S+/g, '');
        for (const m of line.matchAll(/\b[A-Za-z]+\b/g)) {
          const w = m[0].toLowerCase();
          if (wrongWay[w]) {
            fail(
              'language',
              `${rel}:${n}`,
              `"${m[0]}" is not ${spelling} spelling — write "${wrongWay[w]}".`
            );
          } else if (
            spelling === 'british' &&
            /^[a-z]+iz(e|es|ed|ing|ation|ations)$/.test(w) &&
            !IZE_ALLOWED.has(w)
          ) {
            fail(
              'language',
              `${rel}:${n}`,
              `"${m[0]}" uses -ize; this project declares British -ise spelling.`
            );
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const bar = '─'.repeat(72);
console.log(bar);
console.log(`agent-driven-development · coherence check`);
console.log(`  project:   ${project}`);
console.log(`  catalogue: ${catalogueDir} (${rules.size} rules, ${withdrawn.length} withdrawn)`);
console.log(bar);

if (findings.length) {
  const byCheck = new Map();
  for (const f of findings) {
    if (!byCheck.has(f.check)) byCheck.set(f.check, []);
    byCheck.get(f.check).push(f);
  }
  for (const [check, list] of byCheck) {
    console.log(`\n${check} — ${list.length} finding${list.length === 1 ? '' : 's'}`);
    for (const f of list) console.log(`  ${f.where}\n      ${f.message}`);
  }
  console.log('');
}

if (decl && !quiet) {
  const inForceCount = rules.size - adapted.size;
  console.log(`\nrules: ${inForceCount} in force, ${adapted.size} adapted`);
  for (const [id, a] of adapted) {
    console.log(`  ${id} ${a.change.padEnd(8)} ${rules.get(id).title}`);
  }

  const skipped = [...rules.values()]
    .filter((r) => r.check === 'automated' && NOT_LOCALLY_CHECKABLE[r.id])
    .map((r) => `  ${r.id} — ${NOT_LOCALLY_CHECKABLE[r.id]}`);
  const manual = [...rules.values()].filter(
    (r) => r.check === 'manual' && !adapted.has(r.id)
  ).length;

  console.log(`\nnot verified here`);
  for (const line of skipped) console.log(line);
  console.log(`  ${manual} rule(s) in force are marked \`manual\` and depend on review`);
  for (const n of notes) console.log(`  ${n}`);
}

console.log(`\n${bar}`);
if (findings.length) {
  console.log(`FAIL · ${findings.length} finding${findings.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('OK · the declaration matches the project');
