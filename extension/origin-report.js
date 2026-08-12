/* Remembers which Snapp the user actually uses.

   The save button has to know where to POST while no Snapp tab is open — which
   is the entire point of it. Production is the right default, but during
   development the answer is localhost, and there's no build-time switch that
   can tell them apart in a way that survives being packed for the store.

   So: every time a Snapp page loads, tell the service worker which origin it
   was. Whichever Snapp you last actually visited is the one the button talks
   to. Isolated world, because unlike announce.js this needs chrome.runtime. */

chrome.runtime.sendMessage({
  type: "snapp-origin",
  origin: location.origin,
});
