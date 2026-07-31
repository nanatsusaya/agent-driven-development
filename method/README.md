# The method

## Two layers

The method assumes every project has two layers, and keeping them apart is what
makes the whole thing transferable.

**The core** is this catalogue: rules that hold regardless of what the project
is. They are about the conditions work happens under — who decides, where facts
live, what "done" means, how a session begins and ends. They do not mention a
stack, a domain or a tool.

**The project layer** is everything true only of your project: the
architecture, the domain constraints, the commands, the legal obligations, the
rules that exist because of a bug you actually hit. Most of your
operating-rules file will be this layer, and it is the part nobody else can
write for you.

The failure the split prevents is copying an operating-rules file from one
project to another. It looks efficient and it is not: much of what a mature
file asserts is false in a different project, and the false parts are not
marked. The transferable unit is the **rule**, not the file.

## Adopting it

1. Read [`rules.md`](rules.md) and copy what fits into your own
   operating-rules file, in your own words. Nothing requires you to reference
   this repository at runtime, and [C3](rules.md#c3) argues against it.
2. Optionally, write a `method.json` binding the four roles to your actual
   files and listing what you changed. [`adapting.md`](adapting.md) has the
   format.
3. Optionally, run the [coherence check](../checks/README.md). It verifies that
   your declaration matches your repository and that every rule is either in
   force or consciously adapted.

Step 1 alone is a legitimate stopping point. Steps 2 and 3 buy one thing: when
a rule here changes, you find out which of your projects still teaches the old
version — instead of discovering it two sessions later.

## Backing out

Each step undoes on its own, and nothing you keep depends on anything you drop.

- **Step 3.** Stop running the check. It writes nothing and reads nothing
  outside your project, so there is no state to clean up.
- **Step 2.** Delete `method.json`. Your artefacts are ordinary files and stay
  exactly as they are; what you lose is being told when the catalogue moves.
- **Step 1.** Your operating-rules file is yours — it is in your words about
  your project, and most of it was never ours. Keep it, cut it down, or throw
  it away.

Said plainly because a method that only documents the way in is asking for a
commitment it has not earned. If steps 2 and 3 are not paying for themselves,
dropping them is the intended use, not a failure.

## The documents

| Document | Answers |
|---|---|
| [`rules.md`](rules.md) | What are the rules? |
| [`adapting.md`](adapting.md) | How do I reshape them for my project? |
| [`withdrawn.md`](withdrawn.md) | Which rules no longer apply, and what replaced them? |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed between versions, and what must I do about it? |
| [`rationale.md`](rationale.md) | Why does the method look like this, and where is it weak? |

`rules.md` is the only normative one; [`VERSION`](VERSION) is what a project
pins to. The others explain, apply and correct it.

## What each version number means

Three things here change on their own schedules, so they carry their own
numbers. Written down because it was once inferred, and inferring it went
wrong: 0.3 moved five version statements and left three behind, and nothing
said whether that was a mistake or a decision.

| Number | Versions | Moves when |
|---|---|---|
| [`VERSION`](VERSION) | the **catalogue** — the rules themselves | a rule is added, changed or withdrawn |
| `version` in `package.json` | the **checks** | the tools start deciding differently |
| `version` in `plugin.json` | the **plugin** | a release is cut; it carries the release number |

The first two are deliberately not tied to each other. The catalogue can stand
still for months while a check is corrected, and a check can stand still while a
rule is rewritten. Tying them would mean claiming a change nobody made.

The plugin is the exception, and for a reason that is about distribution rather
than meaning. It is the one thing here somebody *installs*, and the number they
see in a marketplace is only useful if they can find what it refers to — so it
carries the release number, and a release is tagged against the catalogue. That
coupling is enforced by a command rather than a habit:
`checks/plugin-version.mjs` fails when anything that ships to users changed
since the last release and the version did not. The habit failed once already,
and everyone who had installed the plugin kept running procedures that had been
replaced.

What your `method.json` pins to is the **catalogue** number, and only that. The
check compares it against [`VERSION`](VERSION) and reports a difference without
failing on it — [`CHANGELOG.md`](CHANGELOG.md) says which rules moved and which
of them can change your result.
