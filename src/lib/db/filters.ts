/* Building PostgREST filter strings by hand is a small minefield: inside an
   `or=(...)` list a comma starts a new condition, and in an `ilike` pattern
   `%` and `_` are wildcards. Interpolating raw user input hits both — a search
   for "studi,o" silently becomes two conditions and matches the wrong rows.

   `ilikeContains` produces a value that is safe to drop into an `.or()` list
   and matches the input literally. */

/** Escape a literal so it means itself inside a LIKE/ILIKE pattern. */
function escapeLikeLiteral(value: string): string {
  // Backslash first — escaping it afterwards would double the others.
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Quote a value for a PostgREST filter so commas, parens and dots are data. */
function quoteFilterValue(value: string): string {
  return `"${value.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

/**
 * A `column.ilike.<value>` condition matching rows that contain `term`
 * literally, safe for use inside `.or()`.
 */
export function ilikeContains(column: string, term: string): string {
  return `${column}.ilike.${quoteFilterValue(`%${escapeLikeLiteral(term)}%`)}`;
}
