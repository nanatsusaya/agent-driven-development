# Security

## What is here to attack

Most of this repository is prose, and prose has no attack surface. Two things
do.

**[`checks/`](checks/README.md) is code you run over your own repository.** It
walks directories, reads every Markdown file it finds, reads your `method.json`,
and prints what it found. It writes nothing, executes nothing, and opens no
network connection. It does compile patterns from a catalogue —
[`method/withdrawn.md`](method/withdrawn.md) — and it prints text that came from
your files.

**[`plugins/agent-method/`](plugins/agent-method/README.md) is five procedures
an agent follows.** They are Markdown. An agent that has installed them does
what they say, so a change to one of those files is a change to what an agent
does on your machine. The plugin carries no version number and resolves to this
repository's current commit, which means a change reaches you on
`/plugin update` — deliberately, and it is the reason to read a diff before
updating rather than after.

## What is already handled

Named because "we take security seriously" is not information, and because each
of these was a real defect here rather than a hypothetical:

- **A pattern in the catalogue that hangs.** Nested quantifiers are refused
  before compilation. A withdrawn-rule pattern is applied to every paragraph of
  every document, so one written badly could take exponential time.
- **Terminal escapes from your files.** Every value read from `method.json` or a
  document is stripped of control characters before printing. Without that, a
  value could clear the screen and remove real findings from view — the exit
  code stayed correct, but a person reading the output did not.
- **Paths leaving the project.** An artefact bound to `../elsewhere.md` or to an
  absolute path is a finding. Nothing outside the project root is read at any
  point; only its existence was ever tested, and now not even that.

## What is not handled, and is not meant to be

- **The check does not look for secrets, credentials or personal data.**
  [P1](method/rules.md#p1) says a repository holds none, and the report says
  plainly that verifying it belongs to your platform's scanning rather than to
  this tool.
- **The check does not follow symbolic links out of the project**, and does not
  report having skipped them.
- **The catalogue says nothing about text your project does not control** — an
  issue from a stranger, a dependency's release notes. That gap is named in
  [`method/rationale.md`](method/rationale.md#where-it-is-most-likely-wrong).
  Treat it as unsolved rather than as covered.

## Reporting something

Use GitHub's private vulnerability reporting on
[this repository](https://github.com/nanatsusaya/agent-project-rules/security/advisories/new).
It is private until a fix exists, which a public issue is not.

If that form is unavailable to you, open a normal
[issue](https://github.com/nanatsusaya/agent-project-rules/issues) saying
only that you have something to report and asking for a private channel — no
details in the issue itself.

**What to expect.** One maintainer, no service-level agreement, and an honest
answer rather than a fast one. A report that turns out to be a defect gets
fixed, gets a counter-test case so it cannot come back, and is credited unless
you would rather it were not.
