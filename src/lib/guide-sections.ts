/* The "## " sections the combined-guide prompt asks for, in order — see the
   <output-format> block in /api/workbenches/generate. Only the length is
   load-bearing (it's the denominator in the panel's "N of 10" while the guide
   streams); the names are here so that count documents itself.

   Quick Reference and Paste-Ready Agent Prompt used to close the document and
   were dropped: both restated decisions already made above, which is a second
   source of truth an agent can find contradicting the first — and the
   paste-ready block was a lossy 200-word compression of a guide the reader
   already had in full. The document is the prompt now; it says so in a line
   under its own title. Guides written before that still carry the old headings
   and render fine, since the splitter reads whatever actually arrived. */
export const GUIDE_SECTIONS = [
  "Design Philosophy",
  "Typography",
  "Color & Background",
  "Layout & Spacing",
  "Components",
  "Motion & Effects",
  "Imagery & Iconography",
  "Your Additions",
  "What This Design Is NOT",
  "Design Tokens",
] as const;
