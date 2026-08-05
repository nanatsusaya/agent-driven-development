/**
 * The plugin's version, against what actually changed under it.
 *
 * The plugin is distributed through a marketplace, and Claude Code uses its
 * version as a cache key: a user who installed at one version keeps the copy
 * they have until the version string changes. Pushing commits does nothing.
 * That is documented behaviour, not a bug — and it means an explicit version is
 * a promise that somebody remembers to keep.
 *
 * Nobody did. Two procedures changed and both manifests stayed at `0.2.0`, so
 * every existing installation went on running the old ones with nothing to say
 * so. This is the check that stops that being a matter of attention.
 *
 * The decision lives here as a pure function of what git found, so that the
 * cases can be written without building a repository per case.
 */

import { blankFences, normaliseEol } from './markdown.mjs';

/** A version this project will accept: three numbers, as the reference asks. */
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * The plugin README's statement of the version the manifests carry.
 *
 * Deliberately a fixed phrase rather than "every version-shaped string in the
 * file". That file legitimately contains several, and one of them is the reason
 * this check exists: the account of both manifests sitting at `0.2.0` while two
 * procedures changed underneath them. Reporting a true historical sentence would
 * be the false alarm E3 calls the half that teaches people to ignore a check
 * when it is right — and the only way to silence it would be to falsify the
 * record.
 *
 * The cost is that rewording the sentence takes it out of the scan. That is why
 * finding no statement at all is itself a finding: the failure mode becomes a
 * loud one instead of a check that quietly stops looking, which is what E3 is
 * about.
 */
const STATED_VERSION = /manifests currently declare `([^`\n]*)`/;

/**
 * What the plugin README claims the current version is.
 *
 * @param text whole document
 * @returns `{ version, line }`, or null when it makes no such claim
 */
export function statedVersion(text) {
  // Fenced content is an example, not an assertion — the same exemption every
  // other scan in this repository makes, and for the same reason.
  const body = blankFences(normaliseEol(text));
  const m = STATED_VERSION.exec(body);
  if (!m) return null;
  return { version: m[1], line: body.slice(0, m.index).split('\n').length };
}

/**
 * Does the README agree with the manifest about the version?
 *
 * The manifests are the authority — `plugin.json` is what the runtime resolves
 * — and the README restates them for a reader deciding whether to install. C2
 * allows the restatement only while something keeps it true, and nothing did:
 * the prose said `0.4.0` for as long as it took somebody to notice, while both
 * manifests had moved to `0.5.0`.
 *
 * @param text          the plugin README
 * @param pluginVersion `version` in plugin.json now, or null
 * @param rel           path to name in a finding
 */
export function readmeVersionFindings(text, pluginVersion, rel) {
  const stated = statedVersion(text);
  if (!stated) {
    return [
      `${rel} no longer states which version the manifests carry, so nothing ` +
        'holds its prose to them. State it as: the manifests currently declare ' +
        '`X.Y.Z`.',
    ];
  }
  if (stated.version !== pluginVersion) {
    return [
      `${rel}:${stated.line} says the manifests declare ` +
        `${JSON.stringify(stated.version)}; plugin.json says ` +
        `${JSON.stringify(pluginVersion ?? null)}.`,
    ];
  }
  return [];
}

/**
 * Does a changed path mean users need a new version?
 *
 * Everything shipped inside the plugin does — a procedure, the manifest, an
 * asset. A `README.md` under `plugins/` does not: it is read on GitHub by
 * somebody deciding whether to install, never by an agent that already has.
 * Requiring a version bump for a typo in prose is how a version discipline
 * becomes something people work around.
 *
 * @param path repository-relative path, forward slashes
 */
export function shipsToUsers(path) {
  if (!path.startsWith('plugins/')) return false;
  return !/(^|\/)README\.md$/i.test(path);
}

/**
 * Compare the declared versions against what changed since the last release.
 *
 * @param state.pluginVersion       `version` in plugin.json now, or null
 * @param state.marketplaceVersion  `version` in the marketplace entry now, or null
 * @param state.previousVersion     `version` in plugin.json at `releaseTag`;
 *                                  null when that release declared none
 * @param state.releaseTag          the release compared against, or null when
 *                                  there is no release yet
 * @param state.changedPaths        paths differing between that release and now
 * @returns `{ findings, notes }`
 */
export function versionFindings(state) {
  const {
    pluginVersion,
    marketplaceVersion,
    previousVersion,
    releaseTag,
    changedPaths = [],
  } = state;
  const findings = [];
  const notes = [];

  // 1. A version has to be there at all. The alternative strategy — no version
  //    anywhere, so the commit SHA decides — is legitimate and documented, but
  //    it is not this project's, and half of it is the worst of both: an
  //    absent `plugin.json` version silently hands the decision to the
  //    marketplace entry, which is the field nobody remembers exists.
  if (typeof pluginVersion !== 'string' || !pluginVersion.trim()) {
    findings.push(
      'plugins/agent-method/.claude-plugin/plugin.json declares no "version". ' +
        'This project versions the plugin explicitly, so the field is required. ' +
        '(Removing it everywhere is the other documented strategy — then the ' +
        'commit SHA decides, and this check asks for its absence instead.)'
    );
  } else if (!SEMVER.test(pluginVersion.trim())) {
    findings.push(
      `plugin.json declares version "${pluginVersion}", which is not ` +
        'MAJOR.MINOR.PATCH. The reference asks for semantic versioning, and a ' +
        'two-part version sorts unpredictably against a three-part one.'
    );
  }

  // 2. The two manifests are read in a fixed order — plugin.json wins — so a
  //    disagreement is not a tie the runtime resolves usefully. It is one
  //    number a maintainer bumped and another they did not, and the marketplace
  //    entry is the one a user reads before installing.
  if ((pluginVersion ?? null) !== (marketplaceVersion ?? null)) {
    findings.push(
      `plugin.json says ${JSON.stringify(pluginVersion ?? null)} and the ` +
        `marketplace entry says ${JSON.stringify(marketplaceVersion ?? null)}. ` +
        'plugin.json wins at resolution time, so the marketplace entry is what ' +
        'a reader believes and the runtime ignores.'
    );
  }

  if (!releaseTag) {
    notes.push(
      'no release tag to compare against, so nothing here could be said about ' +
        'whether the version kept up with the plugin'
    );
    return { findings, notes };
  }

  const shipped = changedPaths.filter(shipsToUsers);
  if (!shipped.length) {
    notes.push(`nothing under plugins/ has changed since ${releaseTag}`);
    return { findings, notes };
  }

  // 3. The failure this check exists for.
  if (previousVersion === null || previousVersion === undefined) {
    // The one arrangement it cannot decide: the release being compared against
    // declared no version at all, which is what the previous strategy looked
    // like. Said out loud rather than passed over, because a check that cannot
    // decide and reports success is the failure E3 is about — and this one
    // resolves itself at the next release rather than needing anything done.
    notes.push(
      `${releaseTag} declared no plugin version, so there is nothing to compare ` +
        `the current one against. ${shipped.length} shipped file(s) have ` +
        'changed since. From the next release this check has teeth'
    );
  } else if (pluginVersion === previousVersion) {
    findings.push(
      `${shipped.length} file(s) that ship to users changed since ${releaseTag}, ` +
        `and the version is still ${previousVersion}. Claude Code uses the ` +
        'version as a cache key: everyone who installed at that version keeps ' +
        'what they have. Bump plugin.json and the marketplace entry together.\n' +
        shipped.map((p) => `      ${p}`).join('\n')
    );
  }

  return { findings, notes };
}
