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
 * Ten checks: `declaration`, `artefacts`, `authorities`, `adaptations`,
 * `accounting`, `links`, `placeholders`, `decisions`, `withdrawn`, `language`.
 * The last five belong to rules (C5, C3, D2, M2, L1) and run only while that
 * rule is in force; the first five are about the declaration itself. See
 * checks/README.md.
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
import { basename, dirname, join, resolve, sep, posix } from 'node:path';
import {
  DEFAULT_IGNORES,
  embeddedMethodRepos,
  listMarkdownFiles,
  assertedLines,
  assertedParagraphs,
  relativeLinks,
  anchors,
  blankFences,
  normaliseEol,
  exists,
  fileSize,
  isDirectory,
} from './lib/markdown.mjs';
import { parseRules, parseWithdrawn } from './lib/catalogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Roles the method defines. A declaration may not invent others. */
const ROLES = ['operating-rules', 'decisions', 'state', 'method-log'];

/** The kinds of adaptation a project may declare. */
const CHANGES = ['dropped', 'narrowed', 'replaced', 'deferred'];

/**
 * Adaptation kinds that switch a rule's automated check off.
 *
 * `dropped` and `deferred` mean the rule does not apply — at all, or not yet —
 * so its check has nothing to decide. `replaced` means the project meets the
 * rule's concern by a mechanism this check knows nothing about, and a check
 * aimed at the wrong mechanism reports findings that are not defects.
 *
 * `narrowed` is deliberately **not** in this set, and that is the whole point
 * of having the set. An earlier version asked only whether an adaptation
 * existed, so declaring a rule `narrowed` switched its check off completely —
 * a project could state that it had merely tightened a rule and silently stop
 * verifying it. A narrowed rule is still in force; only its scope shrank.
 * Where the narrowing genuinely puts documents outside the rule, `ignore` is
 * the field that names them.
 */
const SUSPENDS_CHECK = new Set(['dropped', 'replaced', 'deferred']);

/**
 * Whether an adaptation actually takes a rule's automated check out of the run.
 *
 * Two conditions, and the second is easy to leave out. The kind has to be one
 * that suspends — and the entry has to be *complete*. An adaptation missing its
 * reason or its date is already a finding, and it used to switch the rule's check
 * off on the way past: the run reported the malformed entry and then went quiet
 * about everything that entry claimed, which is the strongest possible reading of
 * a line the check has just said it cannot read. The same reasoning already
 * applied to an unreadable `change` kind, which returns before it is recorded.
 *
 * @param a an adaptation from `adapted`, or undefined
 */
const suspends = (a) => Boolean(a) && a.complete && SUSPENDS_CHECK.has(a.change);

/**
 * The rule each role exists to serve.
 *
 * Leaving a role out is a decision, and A2 says a decision is recorded. The
 * recording has to name *this* role's rule: an earlier version accepted any
 * adaptation at all, so a project could unbind three roles, declare one
 * unrelated change, and pass — which is precisely the silent absence A2 exists
 * to prevent, shipped as a passing check.
 *
 * `state` said `D3` until catalogue 0.3 introduced S3, which is the rule that
 * *requires* the artefact; D3 only publishes something beside it. The stale
 * entry was a bypass in both directions — adapting S3 correctly was rejected,
 * and adapting the unrelated D3 switched S3's only automated part off — and no
 * case covered the mapping, so the drift was invisible to the whole suite.
 * There is now one case per role, which is what makes this table checked rather
 * than merely written down.
 */
const ROLE_RULES = {
  'operating-rules': 'C3',
  decisions: 'D1',
  state: 'S3',
  'method-log': 'M1',
};

/**
 * External systems the method actually talks about, and the rule each serves.
 *
 * `artefacts` binds roles to files, which is everything the method needs *in*
 * the repository. These are the counterpart: three things a project keeps
 * outside it that a rule depends on. The block is optional — a project that
 * declares nothing here is not failing anything.
 *
 * Declaring one is a pointer, never an instruction to fetch. C3 forbids
 * instructions the agent must retrieve before it can work, because the retrieval
 * can fail, be blocked or be skipped and costs something on every task. It does
 * not forbid the repository from recording *where* the issue tracker is: that
 * line is local, costs no request, and without it the next session has to guess
 * or ask. The distinction the method never spelled out is between an
 * instruction held elsewhere and an address held here.
 *
 * Kept to three deliberately. Two are the rules this check already admits it
 * cannot decide locally, where naming the place turns "verify it there" into
 * something a reader can act on. The third is where a task's definition of done
 * usually lives (W1). Inventing a fuller taxonomy would be ceremony bought
 * against a need nobody has stated (A3).
 */
const AUTHORITIES = {
  gate: 'G1',
  tasks: 'W1',
  secrets: 'P1',
};

/**
 * What each role has to *be*, not merely that something is there.
 *
 * `exists` answered file-or-directory for all four, so `state` could be bound to
 * a directory and pass. That is a type error, not a quality judgement: a role
 * that names one document and gets a directory is bound to something no rule can
 * read. `decisions` is the one role where both are legitimate — D1's *Binding*
 * describes a directory of records, and a project small enough to keep them in
 * one file is following the same rule.
 *
 * E2 forbids a check from judging quality, and it is worth being precise about
 * where the line falls: whether the artefact says anything *useful* is a review
 * question and stays one. Whether it is the kind of thing the declaration claims
 * is not.
 */
const ROLE_SHAPES = {
  'operating-rules': 'file',
  decisions: 'either',
  state: 'file',
  'method-log': 'file',
};

/**
 * Rules whose `automated` check cannot be decided by reading the working tree.
 * Named in the report so that "no findings" is never mistaken for "everything
 * verified".
 */
const NOT_LOCALLY_CHECKABLE = {
  G1:
    'trunk protection is a hosting-platform setting; verify it there. Even then ' +
    'it proves a change arrived through review, not that anyone read it',
  P1: 'secret scanning belongs to the platform; this check does not look for credentials',
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
const IZE_ALLOWED = new Set(
  [
    'size',
    'resize',
    'downsize',
    'upsize',
    'midsize',
    'oversize',
    'capsize',
    'prize',
    'seize',
    'maize',
    'baptize',
  ].flatMap((stem) => {
    // Generated rather than listed. The hand-written list held base forms only,
    // so `downsizing`, `capsized`, `prized` and `baptized` all fired — false
    // alarms in the check that enforces L1, which is the worst place for them.
    const root = stem.slice(0, -1);
    return [
      stem,
      `${stem}s`,
      `${root}ed`,
      `${root}ing`,
      `${root}able`,
      `${root}er`,
      `${root}ers`,
    ];
  })
);

/**
 * The status a decision record claims about itself, or null.
 *
 * Two shapes, because the two that exist in the field are not variations of one
 * another. `- **Status:** Accepted` puts the value on the line with the label;
 * the Nygard record — the most widespread decision-record format there is, and
 * the one D1's own *Binding* points people at — puts a `## Status` heading above
 * it. Only the first was read, so for a project using the second the only
 * automated check with any content to it decided nothing, on every record, and
 * the run stayed green with the contradiction D2 exists to catch sitting in it.
 *
 * @param text whole decision record
 * @returns the status word, or null when neither shape is present
 */
function ownStatus(text) {
  const body = blankFences(text);
  const inline = body.match(
    /^\s*(?:-\s*)?\*{0,2}Status:?\*{0,2}\s*:?\s*\*{0,2}(\w+)/im
  );
  if (inline) return inline[1];
  const heading = body.match(/^#{1,6}[ \t]*\*{0,2}Status\*{0,2}[ \t]*$/im);
  if (heading) {
    const after = body.slice(heading.index + heading[0].length);
    const line = after.split('\n').find((l) => l.trim() !== '');
    const word = line?.trim().match(/^\*{0,2}(\w+)/);
    if (word) return word[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const findings = [];
const notes = [];

/**
 * Make text safe to print, by replacing every control character with a visible
 * one. Newline and tab survive, because the report uses both.
 *
 * Values out of `method.json` were printed as they came. A string carrying ANSI
 * sequences therefore acted on the terminal, and because the authorities block is
 * printed *after* the findings, a declaration could scroll real findings off the
 * screen or overwrite them. The exit code stayed correct throughout — CI cannot
 * be fooled this way — but a person reading the run can be, and reading the run
 * is exactly what `--lint` is advertised for.
 *
 * U+FFFD rather than a caret notation: it cannot be mistaken for text that was
 * really there.
 */
function sanitise(s) {
  return String(s).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '�');
}

/**
 * Record a failure.
 *
 * @param check short name of the check that fired, shown as a prefix
 * @param where file (and line, where known) the reader should open
 * @param message what is wrong, phrased so the reader can act on it
 */
function fail(check, where, message) {
  findings.push({ check, where: sanitise(where), message: sanitise(message) });
}

/** Record something the reader should know that is not a failure. */
function note(message) {
  notes.push(sanitise(message));
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let projectArg = null;
let catalogueArg = null;
let spellingArg = null;
let quiet = false;
let lint = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--catalogue' || a === '--spelling') {
    // An option that swallows a missing value used to fall back to the default
    // without a word, so a typo in a CI line produced a green run against the
    // wrong catalogue.
    const value = argv[++i];
    if (value === undefined || value.startsWith('-')) {
      console.error(`${a} needs a value.`);
      process.exit(2);
    }
    if (a === '--catalogue') catalogueArg = value;
    else spellingArg = value;
  } else if (a === '--quiet') quiet = true;
  else if (a === '--lint') lint = true;
  else if (a === '--help' || a === '-h') {
    console.log(
      'Usage: check-method.mjs [project-path] [--catalogue <path>]\n' +
        '                       [--lint [--spelling british|american]] [--quiet]\n\n' +
        '  --lint  run the document scans only, with no method.json: links and\n' +
        '          anchors resolve, no document teaches a withdrawn rule, and one\n' +
        '          spelling regime holds. For a project that has not adopted the\n' +
        '          method, or does not intend to.'
    );
    process.exit(0);
  } else if (!a.startsWith('-')) {
    // The last one used to win, in silence. `check-method.mjs . ../other` then
    // checked one project and said nothing about the other, and a CI line with a
    // stray path in it reported a green run about somewhere nobody looked.
    if (projectArg !== null) {
      console.error(
        `Two project paths given: "${projectArg}" and "${a}". One run checks ` +
          'one project; nothing here would tell you which.'
      );
      process.exit(2);
    }
    projectArg = a;
  } else {
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

/** The catalogue's own version, if it states one. A catalogue without a
 * VERSION file is legitimate — it simply cannot be compared against. */
let catalogueVersion = null;
try {
  catalogueVersion = readFileSync(join(catalogueDir, 'VERSION'), 'utf8').trim();
} catch {
  catalogueVersion = null;
}

// ---------------------------------------------------------------------------
// 1. The declaration
// ---------------------------------------------------------------------------

const declPath = join(project, 'method.json');

/**
 * The declaration. Either null — there is none to check against — or an object.
 * Never anything else, and that is load-bearing: every block below gates on
 * `if (decl)`, so a falsy value skipped the declaration, artefact, authority,
 * adaptation and accounting checks in one go and the run printed
 * "OK · the declaration matches the project". `null`, `false`, `0` and `""` are
 * all valid JSON. Nobody writes them on purpose; a truncated write, a generator
 * or a `jq` edit that empties the file all produce one. A *truthy* primitive was
 * the mirror failure — it reached `decl.artefacts = {}` and threw a raw
 * TypeError, because an ES module runs in strict mode.
 */
let decl = null;

if (!exists(declPath)) {
  if (!lint) {
    fail(
      'declaration',
      'method.json',
      'No declaration found. A project adopts the method by binding the four ' +
        'roles to its own files; without that, there is nothing to check against. ' +
        'See method/adapting.md for the format. To scan the documents without ' +
        'adopting anything, use --lint.'
    );
  }
} else {
  let parsed;
  let parsedOk = false;
  try {
    // Normalised like every document, and for the same reason. `JSON.parse`
    // rejects a leading byte-order mark outright, so a declaration written by a
    // Windows editor — several write one by default — failed as "not valid
    // JSON" against a file that reads as perfectly valid. The message sent the
    // reader hunting for a syntax error that was not there.
    parsed = JSON.parse(normaliseEol(readFileSync(declPath, 'utf8')));
    parsedOk = true;
  } catch (e) {
    fail('declaration', 'method.json', `Not valid JSON — ${e.message}`);
  }
  // "Did not parse" and "parsed into the wrong shape" are different states and
  // are kept apart, so that neither can be mistaken for the other by a later
  // block. Only the second kind can be reported precisely.
  if (parsedOk) {
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      const shape = Array.isArray(parsed)
        ? 'an array'
        : parsed === null
          ? 'null'
          : `a ${typeof parsed}`;
      fail(
        'declaration',
        'method.json',
        `A declaration must be a JSON object; this file parses as ${shape}. ` +
          'Expected at least "method", "version", "artefacts" and ' +
          '"adaptations" — see method/adapting.md. Nothing else could be ' +
          'checked, so this run says nothing about the rest of the project.'
      );
    } else {
      decl = parsed;
    }
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
  // Reported, never enforced: pinning to an older catalogue is a legitimate
  // decision, and a check that failed on it would punish the project for the
  // catalogue moving. Without this, `version` was read and then ignored, and
  // nothing anywhere told an adopter the catalogue had moved at all.
  if (
    typeof decl.version === 'string' &&
    catalogueVersion &&
    decl.version !== catalogueVersion
  ) {
    note(
      `declared against catalogue version ${decl.version}; this catalogue is ` +
        `${catalogueVersion}. method/CHANGELOG.md says which rules moved and ` +
        'which of them can change your result; update the version once you have ' +
        'read it.'
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Artefacts
// ---------------------------------------------------------------------------

const bound = {};

/** Roles bound to a file with nothing in it, collected for one line at the end. */
const emptyArtefacts = [];

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
    // `resolve` rather than `join`, and then checked against the root. `join`
    // happily produced a path outside the project for "../elsewhere.md" and for
    // an absolute path, and an existence test on it passed — so the check
    // certified coherence for a project whose operating rules were not in the
    // repository at all. That is the arrangement C3 exists to rule out: the next
    // session clones the repository and the instructions are not in it.
    const p = resolve(project, value);
    if (p !== project && !p.startsWith(project + sep)) {
      fail(
        'artefacts',
        'method.json',
        `Role "${role}" is bound to "${value}", which resolves outside the ` +
          'project. An artefact the repository does not contain is not there ' +
          'for the next session that clones it (rule C3).'
      );
      continue;
    }
    if (!exists(p)) {
      fail(
        'artefacts',
        'method.json',
        `Role "${role}" is bound to "${value}", which does not exist.`
      );
      continue;
    }
    if (ROLE_SHAPES[role] === 'file' && isDirectory(p)) {
      fail(
        'artefacts',
        'method.json',
        `Role "${role}" is bound to "${value}", which is a directory. This role ` +
          'names one document. Only "decisions" may be either.'
      );
      continue;
    }
    if (fileSize(p) === 0) emptyArtefacts.push(`${role} → ${value}`);
    bound[role] = value;
  }
  if (emptyArtefacts.length) {
    // A note rather than a finding, and the distinction is the point: the file
    // is there, so nothing about the declaration is untrue. What is worth saying
    // is that an artefact with no content supports exactly as much as a missing
    // one, and the reader is the only one who can decide whether that is a state
    // the project is passing through or one it is stuck in.
    note(
      `${emptyArtefacts.length} bound artefact(s) are empty, so the roles are ` +
        `filled in name only: ${emptyArtefacts.join(', ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// 2b. External authorities
// ---------------------------------------------------------------------------

/** Declared pointers to systems outside the repository, by role. */
const authorities = {};

if (decl && decl.authorities !== undefined) {
  if (typeof decl.authorities !== 'object' || decl.authorities === null || Array.isArray(decl.authorities)) {
    fail(
      'authorities',
      'method.json',
      '"authorities" must be an object mapping a role to where that system ' +
        `lives. The method defines: ${Object.keys(AUTHORITIES).join(', ')}.`
    );
  } else {
    for (const [role, value] of Object.entries(decl.authorities)) {
      if (!(role in AUTHORITIES)) {
        fail(
          'authorities',
          'method.json',
          `Unknown authority "${role}". The method defines: ` +
            `${Object.keys(AUTHORITIES).join(', ')}. Adding one here would ` +
            'declare a relationship no rule refers to, so nothing would read it.'
        );
        continue;
      }
      // Nothing is verified about where it points, and nothing tries. Following
      // it would make the check depend on the network, and a check that fails
      // for reasons unrelated to the repository gets ignored for the right ones.
      if (value === null) continue;
      if (typeof value !== 'string' || value.trim() === '') {
        fail(
          'authorities',
          'method.json',
          `Authority "${role}" must be a non-empty string, or null. It is read ` +
            'by a person, so a URL, a board name or a queue identifier are all ' +
            'fine — an empty one is not.'
        );
        continue;
      }
      // The same failure the placeholder check catches in documents, in the one
      // file that check never scans: a template copied and not filled in.
      if (/«[^»]*»/.test(value)) {
        fail(
          'authorities',
          'method.json',
          `Authority "${role}" still carries the template placeholder ` +
            `${value.match(/«[^»]*»/)[0]}. It points the next session at ` +
            'something that was never filled in.'
        );
        continue;
      }
      // Sanitised on the way in, so that both places it is printed are covered
      // by one call. It is only ever printed.
      authorities[role] = sanitise(value.trim());
    }
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
    if (id === 'EXAMPLE') {
      fail(
        'adaptations',
        at,
        'This is the placeholder entry from agent-manual/method.json. Delete it, or ' +
          'replace it with a real adaptation. It is deliberately not a rule ' +
          'identifier, so that a template copied unread fails here rather than ' +
          'silently switching a rule off.'
      );
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
      // Return rather than record it. An entry whose change kind is unreadable
      // states nothing, and treating it as an adaptation would switch the rule
      // off on the strength of a malformed line.
      return;
    }
    // Every remaining requirement is recorded rather than returned on, because
    // an entry this incomplete still tells the reader which rule the project
    // meant to adapt — which is worth reporting against. What it does not do is
    // switch that rule's check off: see `suspends`.
    let complete = true;
    if (typeof a.reason !== 'string' || a.reason.trim().length < 20) {
      fail(
        'adaptations',
        at,
        'An adaptation needs a reason a stranger could act on. An undocumented ' +
          'divergence is indistinguishable from carelessness, so the next session ' +
          'helpfully restores the rule you deliberately removed (rule A2).'
      );
      complete = false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.decided ?? '')) {
      fail('adaptations', at, '"decided" is required, as an ISO date (YYYY-MM-DD).');
      complete = false;
    }
    if (a.change === 'deferred' && !/trigger|until|once|when|after/i.test(a.reason ?? '')) {
      fail(
        'adaptations',
        at,
        'A deferred rule needs a named trigger — what event makes it apply? ' +
          'Deferred without a trigger is dropped with better manners.'
      );
      complete = false;
    }
    adapted.set(id, { ...a, complete });
  });

  for (const role of ROLES) {
    if (decl.artefacts[role] !== null) continue;
    const owner = ROLE_RULES[role];
    if (!adapted.has(owner)) {
      fail(
        'accounting',
        'method.json',
        `Role "${role}" is unbound, but rule ${owner} is still in force. Leaving ` +
          `a role out is a decision: record it as an adaptation of ${owner}, ` +
          'with a reason and a date.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Collect the project's documents once
// ---------------------------------------------------------------------------

// `ignore` names paths relative to the project root, not bare directory names.
// An earlier version fed them to the walker's name set, so "docs/vendor" never
// matched anything — and a string given instead of an array was iterated one
// character at a time, quietly ignoring every directory called "d", "o", "c"
// or "s".
let declaredIgnores = [];
if (decl && decl.ignore !== undefined) {
  if (Array.isArray(decl.ignore)) {
    declaredIgnores = decl.ignore.map((p) =>
      String(p).replace(/^\.?\/+/, '').replace(/\/+$/, '')
    );
  } else {
    fail(
      'declaration',
      'method.json',
      '"ignore" must be an array of paths relative to the project root.'
    );
  }
}

// A clone of the method repository inside the project is not the project's
// documents, and scanning it produces findings about files the reader does not
// own. Skipped rather than declared in `ignore`, because the first run an adopter
// makes happens before they have written anything to declare.
const embedded = embeddedMethodRepos(project, DEFAULT_IGNORES);

// `language` was read as `decl?.language?.spelling` and never checked, so a
// project writing `"language": "british"` — the obvious mistake — got the note
// saying no regime was declared, and L1 went unverified with nothing to say the
// declaration had been misread rather than left out.
let declaredAllow = [];
if (decl && decl.language !== undefined) {
  if (
    typeof decl.language !== 'object' ||
    decl.language === null ||
    Array.isArray(decl.language)
  ) {
    fail(
      'declaration',
      'method.json',
      '"language" must be an object: { "spelling": "british" | "american", ' +
        '"allow": ["…"] }. A string here reads as no regime declared at all, ' +
        'and rule L1 then goes unchecked.'
    );
  } else if (decl.language.allow !== undefined) {
    const list = decl.language.allow;
    if (
      !Array.isArray(list) ||
      list.some((w) => typeof w !== 'string' || w.trim() === '')
    ) {
      fail(
        'declaration',
        'method.json',
        '"language.allow" must be an array of non-empty words. It exempts ' +
          'those words from the spelling scan and nothing else — a path or a ' +
          'directory belongs in "ignore".'
      );
    } else {
      declaredAllow = list.map((w) => w.trim());
    }
  }
}

const skipped = [...declaredIgnores, ...embedded];
/** What the walk did not look at, so the report can say so. */
const scan = { skipped: [], unreadable: [] };
const docs = listMarkdownFiles(project, DEFAULT_IGNORES, scan)
  .filter((rel) => !skipped.some((ig) => ig && (rel === ig || rel.startsWith(ig + '/'))))
  .map((rel) => ({
    rel,
    text: normaliseEol(readFileSync(join(project, rel), 'utf8')),
  }));

if (embedded.length) {
  note(
    `${embedded.length} copy/ies of the method repository inside this project ` +
      `were not scanned: ${embedded.join(', ')}. Recognised by content, not by ` +
      'name. Clone it outside the project to keep the two apart'
  );
}

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
    // Paragraphs, not lines: a withdrawn-rule pattern is usually a phrase, and
    // a phrase in wrapped prose lands across a line break more often than not.
    for (const { n, text: line } of assertedParagraphs(text)) {
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

const inForce = (id) => rules.has(id) && !suspends(adapted.get(id));

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

  // A target may be percent-encoded — `docs/my%20notes/x.md` is how a path with
  // a space is written — and the file system knows nothing about that encoding.
  // Testing the raw form alone reported such a link as broken while the file sat
  // right there. Both forms are tried, and a malformed escape falls back to the
  // raw text rather than throwing: it is then not a path, and the raw form is
  // all there is to report.
  const decoded = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const forms = (s) => [...new Set([s, decoded(s)])];

  for (const { rel, text } of docs) {
    for (const { n, target } of relativeLinks(text)) {
      // Split at the first `#` only. `split('#')` dropped everything after a
      // second one, so a fragment containing one was silently truncated.
      const hash = target.indexOf('#');
      const pathPart = hash === -1 ? target : target.slice(0, hash);
      const frag = hash === -1 ? '' : target.slice(hash + 1);
      const asRel = (p) =>
        posix.normalize(posix.join(posix.dirname(rel), p)).replace(/\/$/, '');
      let targetRel = rel;
      if (pathPart) {
        const hit = forms(pathPart)
          .map(asRel)
          .find((r) => exists(join(project, r)));
        if (!hit) {
          fail('links', `${rel}:${n}`, `Link target does not exist: ${target}`);
          continue;
        }
        targetRel = hit;
      }
      if (frag && targetRel.toLowerCase().endsWith('.md')) {
        const set = anchorsFor(targetRel);
        if (set && !forms(frag).some((f) => set.has(f))) {
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
      '"decisions" is bound to a file rather than a directory, so rule D2 — ' +
        'the index and the records agree — was not checked. There is no index ' +
        'to compare against, and one file cannot disagree with itself'
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
      /**
       * Numbered rows whose status is not one of the four, kept rather than
       * dropped. Dropping them was silent in the worst way: the decision then
       * looked *absent* from the index, so the finding named the wrong cause and
       * sent the reader looking for a missing row that was right there.
       *
       * Not reported on its own, and deliberately so. A first cell holding four
       * digits is also what a date column looks like, so an index containing an
       * unrelated table would produce findings about rows that are not decisions.
       * It is only used to explain a decision file that has no recognised row.
       */
      const unrecognised = new Map();
      for (const row of indexBody.matchAll(/^\|(.+)\|\s*$/gm)) {
        const cells = row[1].split('|').map((c) => c.trim());
        if (cells.length < 3) continue;
        const idm = cells[0].match(/(\d{4})/);
        if (!idm) continue;
        const status = cells[cells.length - 1];
        if (!/^(Proposed|Accepted|Superseded|Planned)$/i.test(status)) {
          unrecognised.set(idm[1], status);
          continue;
        }
        if (claimed.has(idm[1])) {
          fail(
            'decisions',
            indexDoc.rel,
            `The index claims decision ${idm[1]} twice, as ` +
              `"${claimed.get(idm[1])}" and "${status}". Whichever row a reader ` +
              'happens to stop at is the status they believe; only one of them ' +
              'can be checked against the record.'
          );
        }
        claimed.set(idm[1], status);
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
      /** Which file first used each number, so a second use can name the first. */
      const numberedBy = new Map();

      for (const d of inDir) {
        if (d === indexDoc) continue;
        // The number lives in the file name, not the path. Matching the path
        // would collapse every decision under a directory like docs/2026/ onto
        // the same number.
        const num = basename(d.rel).match(/(\d{4})/);
        if (!num) continue;
        // Two records wearing one number is the same defect as two rules wearing
        // one identifier, and it used to pass in silence whenever both agreed
        // with the index: "decision 0001" then names two different documents, and
        // a reference to it points at whichever one the reader finds first.
        if (numberedBy.has(num[1])) {
          fail(
            'decisions',
            d.rel,
            `Decision number ${num[1]} is already used by ` +
              `${numberedBy.get(num[1])}. A number is how the rest of the ` +
              'project refers to a decision, so two files cannot share one.'
          );
        } else {
          numberedBy.set(num[1], d.rel);
        }
        if (!claimed.has(num[1])) {
          const invented = unrecognised.get(num[1]);
          fail(
            'decisions',
            d.rel,
            invented
              ? `Decision ${num[1]} is listed in ${indexDoc.rel} with status ` +
                `"${invented}", which is not one of: Proposed, Accepted, ` +
                'Superseded, Planned. A status nothing recognises cannot be ' +
                'compared against the record, so the row counts for nothing.'
              : `Decision ${num[1]} is not listed in ${indexDoc.rel}. Every ` +
                'decision file must appear in the index with a status.'
          );
          continue;
        }
        const own = ownStatus(d.text);
        if (!own) {
          // Silence here would mean a decision record whose status this parser
          // cannot find gets no status check at all, with nothing to say so.
          note(
            `${d.rel}: no status found, so it was not compared against the ` +
              'index. Expected either "Status: <value>" on one line or a ' +
              '"Status" heading with the value on the next non-empty line'
          );
        }
        if (own && own.toLowerCase() !== claimed.get(num[1]).toLowerCase()) {
          fail(
            'decisions',
            d.rel,
            `Status disagreement: the file says "${own}", the index says ` +
              `"${claimed.get(num[1])}". One of them is lying to the next session.`
          );
        }
      }

      // The other direction, which went unchecked: a row claiming a decision
      // that has no file behind it. A copied index template produces exactly
      // that. `Planned` is the one declared exception — it means ticketed and
      // not yet written.
      const numbered = new Set(
        inDir
          .filter((d) => d !== indexDoc)
          .map((d) => basename(d.rel).match(/(\d{4})/))
          .filter(Boolean)
          .map((m) => m[1])
      );
      for (const [num, status] of claimed) {
        if (/^planned$/i.test(status)) continue;
        if (!numbered.has(num)) {
          fail(
            'decisions',
            indexDoc.rel,
            `The index claims decision ${num} with status "${status}", but no ` +
              'file for it exists. A decision that lives only in the index is a ' +
              'decision nobody can read. Only a "Planned" row may have no file.'
          );
        }
      }
    }
  }
}

// --- L1: one spelling regime, if the project declares one
{
  const spelling = spellingArg ?? decl?.language?.spelling;
  if (!spelling) {
    if (lint) {
      note('no --spelling given, so rule L1 was not checked');
    } else if (decl && inForce('L1')) {
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
    if (spelling === 'american') {
      note(
        'under an American regime only the listed word pairs are scanned. The ' +
          'general -ise ending is not: the exception list for it (wise, precise, ' +
          'promise, exercise…) is long, and one wrong entry is a false alarm'
      );
    }

    // Every finding says how to exempt a legitimate mention, because a document
    // that *names* a spelling rather than using it is common enough — a style
    // note, a glossary, a rule being stated — that a reader meeting the finding
    // without the escape hatch would file it as a false alarm.
    const howToQuote =
      ' If this names the spelling rather than uses it, put it in a code span ' +
      'or a blockquote; neither is scanned.';

    // Words the project has declared exempt. The scan compares against a word
    // list, so a proper noun or a foreign word that happens to be an American
    // spelling of something fires — `Liter` reads as a misspelt `litre`. Until
    // now the only escape was `ignore`, which puts a whole document outside every
    // scan to spare one word. An exemption is a hole, so it is named in the
    // report: a project cannot quietly allow its way out of L1.
    const allowed = new Set(declaredAllow.map((w) => w.toLowerCase()));
    if (allowed.size) {
      note(
        `${allowed.size} word(s) are exempt from the spelling scan by ` +
          `declaration: ${sanitise(declaredAllow.join(', '))}`
      );
    }

    // No document is exempt as a whole. The operating-rules artefact and the
    // catalogue used to be, on the reasoning that a document stating rule L1
    // necessarily contains the spellings it forbids — true, but the exemption
    // was granted to the entire file rather than to the mention. A project's
    // operating rules are often its longest document, and it went unscanned
    // from the first line to the last. The per-mention exemption already
    // exists: a code span is blanked and a blockquote is not an assertion,
    // which is how this repository's own documents name a forbidden spelling.
    for (const { rel, text } of docs) {
      for (const { n, text: raw } of assertedLines(text)) {
        // A URL or link target is not prose and keeps its own spelling.
        const line = raw
          .replace(/\]\([^)\s]*\)/g, '')
          .replace(/https?:\/\/\S+/g, '');
        for (const m of line.matchAll(/\b[A-Za-z]+\b/g)) {
          const w = m[0].toLowerCase();
          if (allowed.has(w)) continue;
          if (wrongWay[w]) {
            fail(
              'language',
              `${rel}:${n}`,
              `"${m[0]}" is not ${spelling} spelling — write "${wrongWay[w]}".` +
                howToQuote
            );
          } else if (
            spelling === 'british' &&
            // `-izer`, `-izable` and `-izational` used to slip through: the
            // pattern only knew the verb endings.
            /^[a-z]+iz(e|es|ed|ing|er|ers|able|ation|ations|ational)$/.test(w) &&
            !IZE_ALLOWED.has(w)
          ) {
            fail(
              'language',
              `${rel}:${n}`,
              `"${m[0]}" uses -ize; this project declares British -ise spelling.` +
                howToQuote
            );
          }
        }
      }
    }
  }
}

// --- C3: a bound artefact still carrying template placeholders was never
// finished. Only *bound* artefacts are scanned, and that is the whole trick:
// a template file is supposed to contain placeholders, and the declaration is
// the one thing that tells a template apart from a working document. Scanning
// everything would fire on the templates directory of every project that has
// one, and a false alarm teaches people to ignore the check (rule E3).
if (decl && inForce('C3')) {
  const boundPaths = Object.values(bound).map((v) => v.replace(/\/+$/, ''));
  for (const { rel, text } of docs) {
    if (!boundPaths.some((b) => rel === b || rel.startsWith(b + '/'))) continue;
    for (const { n, text: line } of assertedLines(text)) {
      const m = line.match(/«[^»\n]*»/);
      if (m) {
        fail(
          'placeholders',
          `${rel}:${n}`,
          `Still carries the template placeholder ${m[0]}. A document that was ` +
            'copied and not finished does not support the next session; it ' +
            'tells it to look somewhere that was never filled in.'
        );
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
console.log(`  project:   ${sanitise(project)}`);
console.log(
  `  catalogue: ${sanitise(catalogueDir)} (${rules.size} rules, ${withdrawn.length} withdrawn)`
);
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

/** Adaptations that stopped an automated check from running at all. */
const suspended = [...adapted.entries()].filter(
  ([id, a]) => suspends(a) && rules.get(id)?.check === 'automated'
);

if (decl && !quiet) {
  const notInForce = [...adapted.values()].filter(suspends).length;
  console.log(`\nrules: ${rules.size - notInForce} in force, ${adapted.size} adapted`);
  for (const [id, a] of adapted) {
    // Whether the check still runs is the part a reader cannot infer from the
    // change kind alone, and it is the part that decides how much this report
    // is worth. A narrowed rule keeps its check; the other three kinds do, too,
    // while the entry claiming them is incomplete.
    const marker =
      rules.get(id).check !== 'automated'
        ? ''
        : suspends(a)
          ? '  · check off'
          : SUSPENDS_CHECK.has(a.change)
            ? '  · check still runs — this adaptation is incomplete'
            : '  · check still runs';
    console.log(sanitise(`  ${id} ${a.change.padEnd(8)} ${rules.get(id).title}${marker}`));
  }

  // Printed for the reader who is not this check: the next session, which
  // otherwise has to guess where the work is tracked or ask someone.
  const declared = Object.entries(authorities);
  if (declared.length) {
    console.log('\nexternal authorities');
    for (const [role, where] of declared) {
      console.log(`  ${role.padEnd(8)} ${where}`);
    }
  }
}

// Always printed, --quiet included. A report that says nothing about what it
// did not look at reads as a clean bill of health, which is rule H1 broken by
// the tool meant to enforce it. --quiet suppresses the listing above, which is
// a convenience; this section is the point of the report.
{
  // Where a rule cannot be decided here, the project's own declaration is what
  // turns "verify it there" into somewhere a reader can actually go. Without it
  // the line names a blind spot and leaves finding it as an exercise.
  const authorityFor = (id) =>
    authorities[Object.keys(AUTHORITIES).find((k) => AUTHORITIES[k] === id)];

  const skipped = [...rules.values()]
    .filter((r) => r.check === 'automated' && NOT_LOCALLY_CHECKABLE[r.id])
    .map((r) => {
      const where = authorityFor(r.id);
      return (
        `  ${r.id} — ${NOT_LOCALLY_CHECKABLE[r.id]}` +
        (where ? `\n      verify it at: ${where}` : '')
      );
    });
  // Filtered against what actually suspends a check, not against whether an
  // adaptation exists at all. `narrowed` is deliberately not a suspension — a
  // narrowed rule is still in force — but it landed in `adapted`, so declaring
  // one shrank this number. The report then said the rule was in force in the
  // listing above and left it out of the honesty figure below, which is the one
  // number a reader uses to judge how much the run is worth.
  const manual = [...rules.values()].filter(
    (r) => r.check === 'manual' && !suspends(adapted.get(r.id))
  ).length;

  console.log(`\nnot verified here`);
  // First, because it is the number that decides what everything below is worth.
  // A run over an empty directory used to print "OK · the documents scan clean"
  // with nothing saying it had read nothing — the most confident report the tool
  // can produce, about no evidence at all.
  console.log(`  scanned ${docs.length} markdown file(s)`);
  if (scan.skipped.length) {
    console.log(
      `  skipped ${scan.skipped.length} directory/ies never scanned by default: ` +
        `${sanitise(scan.skipped.join(', '))}`
    );
  }
  if (scan.unreadable.length) {
    console.log(
      `  could not read ${scan.unreadable.length} directory/ies, so their ` +
        `documents were not scanned: ${sanitise(scan.unreadable.join(', '))}`
    );
  }
  if (lint) {
    console.log(
      '  --lint: only the document scans ran. The declaration, artefact,\n' +
        '  adaptation and decision-index checks all need a method.json.'
    );
  }
  for (const line of skipped) console.log(line);
  // A check the project itself switched off is the blind spot most likely to be
  // forgotten, because nothing in a passing run hints at it. It used to appear
  // only in the listing above, which --quiet suppresses — so the quietest run
  // was the one that hid the most.
  for (const [id, a] of suspended) {
    console.log(`  ${id} — ${a.change} by this project's declaration, so its check did not run`);
  }
  console.log(`  ${manual} rule(s) in force are marked \`manual\` and depend on review`);
  for (const n of notes) console.log(`  ${n}`);
}

console.log(`\n${bar}`);
if (findings.length) {
  console.log(`FAIL · ${findings.length} finding${findings.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(lint ? 'OK · the documents scan clean' : 'OK · the declaration matches the project');
