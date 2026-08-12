/* Tells the Snapp web app that the extension is here.

   The app needs to know for two reasons: it can stop asking the server which
   sites permit framing (with the extension installed, all of them do), and it
   can stop advertising the install.

   Runs in the MAIN world so it can hand the page a plain global. The obvious
   alternative — an isolated-world script setting an attribute on <html> — is
   what a browser extension is normally reduced to, but it breaks React: the
   attribute lands before hydration, React compares the server's markup against
   a document that no longer matches, and the app throws a hydration error. So
   this mutates nothing in the DOM.

   `externally_connectable` messaging would also work and is tamper-proof, but
   it needs the Web Store extension ID baked into the web app, and that ID does
   not exist until the first submission is approved. A page-world global is not
   a security boundary — any script on the page could set it — but nothing here
   is a permission, only a hint about how to render a preview. */

// Keep in sync with `version` in manifest.json. Chrome APIs, including
// runtime.getManifest(), are unavailable in the MAIN world.
const VERSION = "0.1.0";

window.__snappExtension = VERSION;

// For anything that started listening before this ran. The app itself reads
// the global on mount and doesn't depend on catching this.
document.dispatchEvent(
  new CustomEvent("snapp:extension", { detail: { version: VERSION } })
);
