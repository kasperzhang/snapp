/* How many bookmark cards may run a live site at once, and who gets to.

   A live card is a whole website loaded in an iframe, rendered at desktop
   width and scaled down — its own renderer process, its own JS, its own
   animation loops, still running long after you have scrolled past. The grid
   loads forever, so without a ceiling a long session accumulates every site
   you have scrolled through and never gives any of them back.

   Two mechanisms, because either alone leaves a hole:

     distance   a card tears its frame down once it drifts far enough away,
                which is what keeps a long scroll flat instead of cumulative
     this cap   a ceiling for the case distance can't cover — a tall window,
                a zoomed-out page, where genuinely many cards are near at once

   The numbers come from the grid's own geometry rather than a benchmark. At
   three columns and a 16:10 card, a typical laptop viewport shows about two
   rows; the mount margin reaches roughly a screen further in each direction,
   so around a dozen cards are plausibly "near" at any moment. Twelve is
   therefore the point where the cap stops being a limit on normal use and
   starts being a limit on the pathological case, which is what a safety net
   should be. Lower it if the grid feels heavy; it is deliberately one number. */

export const MAX_LIVE_FRAMES = 12;

/** Mount a frame once the card is within this much of the viewport. */
export const MOUNT_MARGIN_PX = 600;

/* Tear it down only once it is *much* further away than that. The gap between
   the two is deliberate: with a single threshold, a card parked on the
   boundary would mount and unmount on every small scroll, and each remount is
   a fresh page load — traffic we would be sending to somebody else's server
   because our user jiggled a trackpad. */
export const KEEP_MARGIN_PX = 2000;

type Revoke = () => void;

/* Insertion-ordered, so the oldest claim is the first entry. Oldest is a good
   proxy for "furthest behind you": in a grid you scroll one way, so the frames
   claimed longest ago are the ones you have travelled away from. */
const claims = new Map<object, Revoke>();

/** Take a live-frame slot, evicting the oldest claim if we are at the ceiling. */
export function claimFrameSlot(token: object, revoke: Revoke): void {
  if (claims.has(token)) return;

  if (claims.size >= MAX_LIVE_FRAMES) {
    const oldest = claims.keys().next().value;
    if (oldest) {
      const revokeOldest = claims.get(oldest);
      claims.delete(oldest);
      revokeOldest?.();
    }
  }

  claims.set(token, revoke);
}

export function releaseFrameSlot(token: object): void {
  claims.delete(token);
}

/** Live frames right now — exposed for debugging, not for rendering. */
export function liveFrameCount(): number {
  return claims.size;
}
