---
title: Using references without cloning
description: Every designer works from references. The line between borrowing and copying is real, and it's easier to stay on the right side of it than people assume.
date: 2026-07-28
topic: Design for builders
---

There's a discomfort that shows up whenever you point at someone else's site
and say *like that*. It feels close to stealing. So people either don't do it,
and produce something generic, or they do it quietly and feel odd about it.

Both are avoidable, because the distinction is not subtle once you look at it.

## Everyone works from references

No designer starts from an empty canvas and a pure idea. They start from a
wall of things they've collected — competitors, unrelated industries, a book
cover, a museum sign. The wall is the input. The work is choosing which parts
apply and reconciling them into something coherent.

The reason this doesn't feel like copying when a designer does it is that
nobody sees the wall. You see the outcome, which resembles none of its inputs
in particular.

When you're building with an agent, the wall is the missing piece. You have
one — it's your open tabs and your bookmarks — but nothing gets from it to the
model. So the model works from the only reference it has: everything, averaged.
That's where generic output comes from. Not a lack of capability. A lack of
references.

## Where the line actually is

The distinction that matters is between **decisions** and **expression**.

A decision is *serif display type with tight tracking*, *a warm off-white
background*, *cards with a 14px radius*, *one loud accent against otherwise
muted colour*. Decisions aren't ownable. Nobody has a claim on serif headings
or a beige background, and every design system in the world is assembled from
decisions someone else made first.

Expression is the specific execution: their logo, their photography, their
copy, their illustrations, their actual layout with their actual content in
it. That's theirs.

Take decisions. Leave expression. It's not a fuzzy line — it's the difference
between "warm paper background, serif headings" and a screenshot of their
homepage with your name pasted over it.

## Three habits that keep you on the right side

**Pull from several sources.** One reference plus a swap of colours is a
knock-off. Four references, taking one thing from each, is a system. The more
sources, the less any single one is recognisable, and the more the result is
actually a set of choices you made.

**Take parts, not pages.** Decide which aspect you're borrowing — the type,
the palette, the motion — and be deliberate about leaving the rest. If you
can't name the part, you're taking the whole thing.

**Add your own constraint.** Your content is different, your audience is
different, and the moment you apply borrowed decisions to your actual material
the result diverges. A type scale built for a ceramics studio behaves
differently carrying a dashboard's density.

## The uncomfortable case

There is one that genuinely isn't fine, and it's worth naming rather than
being vague: taking a single site and reproducing it. If someone could put
your page next to theirs and see the same thing with different words in it,
you copied. No framing fixes that.

The tell is usually the count. One source is where copying happens. It's
almost impossible to clone a site while also borrowing from three others,
because the parts have to be reconciled and reconciliation is design work.

## What this means for how snapp works

This shaped the product more than anything else. snapp doesn't take a URL and
reproduce a site — it wouldn't be useful if it did, and it isn't what people
actually want when they point at something.

It reads the sites you saved, takes only the aspects you tagged on each, and
writes one system that reconciles them, attributing decisions back to their
source so you can see where each came from and change your mind. Multiple
sources, named parts, your own notes on top. That's the designer's wall,
written down in a form an agent can act on.

The output is a spec, not markup. What gets built from it is yours.
