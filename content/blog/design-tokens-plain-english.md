---
title: Design tokens, in plain English
description: Hex roles, type scales, spacing systems and radii — what the words mean and why an agent needs them, for people who never had to name any of this.
date: 2026-07-27
topic: Design for builders
---

If you're shipping with an agent and you've never worked with a designer, you
run into a wall of vocabulary the first time you try to be specific about how
something should look. This is a short translation of the words that actually
matter, and why each one makes a difference to what a model produces.

## Tokens are just named values

A design token is a value with a name and a job. `#8D6F4C` is a colour.
`--accent: #8D6F4C` is a token, because now it means *the colour used for
things the user should act on*.

The name is doing the work. Told "use `#8D6F4C` for buttons", a model applies
it to buttons. Told "`--accent` is `#8D6F4C`", it applies it to buttons, links,
focus rings, the active state in a nav, and the selected item in a list —
because it knows what the colour is *for*. That's the difference between a
palette and a system.

## Colour: five roles, not twelve swatches

Most interfaces need surprisingly few colours, but each needs a job:

- **Background** — the page itself
- **Surface** — things sitting on the page: cards, modals, inputs
- **Text** — usually two, a primary and a muted one
- **Accent** — the one colour that means *do something*
- **Border** — the hairline between things

A palette of five with roles beats a palette of twelve without. And the most
common mistake in AI-generated UI is a beautiful set of swatches with no
statement about which is which, so the model guesses per component and you get
three greys that are almost the same.

## Type: pick two, then commit to a scale

Two families is plenty — one for headings, one for body. Sometimes a
monospace for numbers and code.

A **type scale** is the set of sizes you allow. Not "headings are big" but
`32 / 24 / 20 / 16 / 14`. The point isn't the specific numbers, it's that the
list is closed. Without one, a model picks a plausible size per component and
your page ends up with 17px, 18px and 19px text in three places, which reads
as sloppy without anyone being able to say why.

Two more worth knowing because they're the difference between amateur and
not: **line height**, the space between lines — roughly 1.5–1.7 for body text,
tighter for large headings. And **tracking**, the space between letters — big
display text usually wants slightly negative tracking, small uppercase labels
want it opened up.

## Spacing: one scale, applied everywhere

Pick a set of spacing values and use nothing else: `4 / 8 / 12 / 20 / 32 / 64`.

This is the least glamorous item here and probably the highest impact. Almost
all "looks a bit off" is inconsistent spacing — 13px here, 15px there, 22px
somewhere else. None is wrong individually; collectively they're noise. A
closed scale removes the decision, which is exactly what you want a model to
stop improvising about.

## Shape: radius and elevation

**Radius** is corner roundness. The thing that matters is having a rule — 14px
on cards, fully rounded on buttons, 8px on inputs — rather than a value the
model re-picks each time.

**Elevation** is how things lift off the page: shadows, borders, or nothing.
Worth stating, because a shadow using pure black over a warm background is one
of the most reliable tells of a generic result. Warm-tinted shadows against a
warm palette; cool ones against a cool palette.

## Motion: two numbers and a curve

You need less than you'd think. A **duration** — 150–250ms for interface
feedback, 400–700ms for something entering. An **easing** — `ease-out` for
things arriving, since it decelerates like a physical object. And optionally a
**stagger**, the delay between items in a list, which is what makes a sequence
feel deliberate rather than simultaneous.

"Add subtle animation" produces a coin flip. "Fade up 10px over 0.6s ease-out,
70ms stagger" produces the same thing every time.

## Why any of this matters to an agent

Every item above turns something checkable into something the model can verify
against what it just wrote. "Modern and clean" gives it nothing to check
against, so it falls back on the average of everything it has seen. That
average is what people mean by AI slop.

You don't have to invent these values. That's what snapp does — you point at
sites whose look you want, tag which aspects to take from each, and it writes
the tokens out with the roles attached, ready to paste into your agent.

But it's worth knowing what the words mean, because once you can name what's
wrong with a screen you can ask for the fix in one sentence instead of forty.
