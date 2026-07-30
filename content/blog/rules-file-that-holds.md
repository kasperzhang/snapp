---
title: Writing a rules file your agent actually follows
description: Most CLAUDE.md and .cursorrules files get ignored by the third file. The ones that hold have a property in common, and it isn't length.
date: 2026-07-30
topic: Working with agents
---

You wrote the rules file. The agent read it, agreed with it, and then produced
a component that ignores half of it. By file forty you've stopped reading the
diffs closely because you already know what you'll find.

The instinct is to write more rules. It's usually the wrong move. The rules
that survive a long session have one property in common, and it isn't length.

## Rules that can be checked survive. Rules that can't, don't.

Look at two lines from a real rules file:

- Use TanStack Query for all server state. Never fetch in a `useEffect`.
- Keep the UI clean and consistent.

The first one holds across a hundred files. The second one is gone by the
third. It isn't that the model cares more about data fetching — it's that the
first line can be checked against the code in front of it and the second
can't. There is no test for "clean". When the model has to decide whether
what it just wrote satisfies a rule, an unverifiable rule gives it nothing to
decide with, so it falls back on whatever it would have done anyway.

This is the whole trick. Before you add a line, ask: could a reviewer say
definitively whether this file breaks it? If not, the model can't either.

## Design rules fail this test almost every time

Engineering conventions are already written in specifics. Design conventions
usually aren't, which is why the same rules file that governs your
architecture perfectly says nothing useful about how anything looks.

Compare:

- Modern, minimal, lots of whitespace.
- Body text is Geist at 16px/1.6. Headings are Bricolage Grotesque, 650
  weight, `-0.02em` tracking. Section padding is 110px on desktop, 64px below
  900px.

The second is longer, but that isn't why it works. It works because every
claim in it is falsifiable. The model can look at what it wrote and tell.

## Values, not adjectives

The rewrite is mechanical once you see it. Each vague instruction becomes one
or more concrete ones:

| Instead of | Write |
| --- | --- |
| Clean, modern colours | `--bg #FBFAF7`, `--ink #221C15`, `--accent #8D6F4C`, and what each is for |
| Consistent spacing | A scale — 4 / 8 / 12 / 20 / 32 — and the rule that nothing else is allowed |
| Rounded corners | 14px on cards, fully rounded on buttons |
| Subtle animation | Fade-up on scroll, 0.6s, ease-out, 70ms stagger |
| Good typography | Two families, named, with weights and the tracking on each |

Notice that none of these are longer than a line. Precision isn't verbosity —
it's usually shorter than the paragraph of adjectives it replaces.

## Put it where the agent will actually see it

A rule the model doesn't have in context can't be followed. Two practical
consequences:

**Keep it in the file the tool reads on every turn.** `CLAUDE.md` for Claude
Code, `.cursorrules` for Cursor. A design doc in `/docs` that nobody loads is
decoration.

**Put the load-bearing values near the top.** In a long file, the specifics
most likely to be violated — the palette, the type scale — should not be
buried under three sections of preamble.

## Where the values come from

The honest problem with all of the above: to write `--accent: #8D6F4C` you
have to have decided on an accent, and "decide the palette" is exactly the
part most people building with an agent haven't done and don't want to do.

That's the gap snapp fills. You point at sites whose look you'd be happy to
be compared to, tag what to take from each — this one's typography, that
one's colour, a third one's motion — and it writes the specifics: real font
stacks, hex values with roles attached, a spacing scale, radii, motion
timings. Paste that under a `## Design system` heading in your rules file and
every prompt after it inherits values instead of adjectives.

The rule that holds isn't the strongly worded one. It's the one with a number
in it.
