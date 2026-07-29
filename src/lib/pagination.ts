/** Bookmarks per page — three full rows of the 3-column grid. Shared so the
    API, the hook and the pager can't disagree about page boundaries. */
export const BOOKMARKS_PAGE_SIZE = 18;

/** Total pages for a result count, never less than 1 (an empty list is page 1). */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
