/* The "## " sections the combined-guide prompt asks for, in order — see the
   <output-format> block in /api/workbenches/generate. Only the length is
   load-bearing (it's the denominator in the panel's "N of 11" while the guide
   streams); the names are here so that count documents itself. */
export const GUIDE_SECTIONS = [
  "Design Philosophy",
  "Typography",
  "Color & Background",
  "Layout & Spacing",
  "Components",
  "Motion & Effects",
  "Imagery & Iconography",
  "Your Additions",
  "Implementation Notes",
  "Quick Reference",
  "Paste-Ready Agent Prompt",
] as const;
