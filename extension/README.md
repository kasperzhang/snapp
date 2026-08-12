# Snapp — Save & Live Previews

A companion Chrome extension that does two independent jobs:

1. **Save the current page to Snapp** in one click (`background.js`).
2. **Make every bookmark card render the real, live site** instead of a
   screenshot, including the ~46% of sites that refuse to be framed
   (`rules/frame_headers.json`).

The two are unrelated in the machinery, and it's worth being clear about that
because it's the natural thing to get wrong: **live previews have nothing to do
with how a bookmark was saved.** Whether a site can be framed is asked and
answered per response, at view time, on every load. So the header rule applies
retroactively to every bookmark in the account, including ones added by pasting
a URL years earlier, and pages saved through this button are no more "live"
than any other.

## The save button

Clicking the toolbar icon (or ⌘⇧S / Ctrl+Shift+S) POSTs the current tab to
`/api/bookmarks/quick-add` and shows a notification. Snapp does not need to be
open, no tab appears, and focus stays where it was.

**There is no login in the extension, and it doesn't need one.** Chrome treats
a request from an extension as *same-site* when the extension holds host
permissions for the target, so the usesnapp.app session cookie is attached to
the request — see
[Storage and cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies).
Cookies live in the browser's cookie jar, not in a tab, which is why requiring
an open Snapp tab was never a real constraint. MV3 service workers with host
permissions are also exempt from CORS, so the endpoint needs no CORS headers —
and **must not be given any**, since that would expose it to ordinary websites,
where `SameSite=Lax` is the only thing preventing a cross-site POST from
inserting bookmarks into someone's library.

Two things still defeat the cookie: a signed-out user, and a browser set to
block third-party cookies. Both surface as a 401, and every failure path falls
back to the original behaviour — opening `/app?add=<url>&title=<title>` as a
top-level navigation, which carries the cookie regardless and can walk somebody
through logging in. The silent path is an optimisation that can never lose a
save.

### The confirmation is a toast in the page, not an OS notification

Chrome has routed notifications through macOS's native system
[since Chrome 59](https://developer.chrome.com/blog/native-mac-os-notifications),
and that system treats extension action buttons as second-class — "Add tags"
and "Undo" end up hidden behind a hover, if they render at all. Worse, the
entire banner is dropped **in silence** when the browser doesn't hold macOS
notification permission, which makes a save that worked perfectly look broken.

So `snappToast()` is injected into the page that was saved from, via
`chrome.scripting.executeScript`. It needs no OS permission, always renders,
can't have its buttons taken away by the platform, and looks like Snapp. It
draws into a closed shadow root so the host page's CSS can't reach it.

`chrome.notifications` remains as a fallback for pages that refuse injection —
`chrome://` URLs, the Web Store, the PDF viewer — and now checks
`chrome.runtime.lastError`, without which a notification that can't be shown
fails invisibly.

Buttons: **Add tags** / **Open** go to `/app?edit=<id>`; **Undo** calls
`DELETE /api/bookmarks`. The toast auto-dismisses after 6s, and that's the
window for undo. The target of those buttons is held in the service worker and
matched against the bookmark id the toast reports, so a hostile page can't
point them at someone else's bookmark.

`resolveTarget()` picks the target in order of confidence: a Snapp tab open
right now, then the last Snapp origin seen, then production. `origin-report.js`
records that last origin every time a Snapp page loads. The stored step is what
makes the button work against a dev server *while no Snapp tab is open* — which
is the whole point of the feature, and which an open-tab lookup alone silently
got wrong by falling through to production.

## Debugging

**The service worker has its own console.** Nothing `background.js` logs will
appear in the console of the page you're saving from. `arc://extensions` →
Snapp → **service worker** opens the right DevTools. Every step of a save logs
there, prefixed `[Snapp]`.

Notifications are a second, separate thing that can silently swallow a working
save: they need the browser itself to hold macOS notification permission. If
the service worker logs a successful save and no banner appears, check
System Settings → Notifications → Arc before touching any code.

## Why the framing rule exists

A bookmark card renders the site in an `<iframe>`. About 46% of the sites
people actually save send `X-Frame-Options: SAMEORIGIN` or a CSP
`frame-ancestors` directive, and Chrome refuses to paint those. Measured over
a real account: 11 of 24 origins, including apple.com, outcrowd.io and
elevatedfaith.com.

No web page can override that. The headers are enforced by the browser before
any of our code runs, and only something sitting earlier in the request path —
an extension or a proxy — can change them. This is the extension.

`rules/frame_headers.json` removes three response headers, using Chrome's
declarativeNetRequest engine so the rule applies before the network response
reaches the renderer:

- `x-frame-options`
- `content-security-policy`
- `content-security-policy-report-only`

## The scope of the rule, and why it's narrow

```json
"condition": {
  "resourceTypes": ["sub_frame"],
  "initiatorDomains": ["usesnapp.app", "localhost"]
}
```

Both conditions matter, and dropping either would be a meaningful downgrade to
the user's security rather than a convenience:

- **`sub_frame`** — only frames, never top-level page loads. Browsing to a site
  normally is untouched.
- **`initiatorDomains`** — only frames embedded by Snapp itself. Frames on any
  other site keep their headers.

Together these mean the only page that ever loses its CSP is one Snapp has
deliberately put inside a preview card. Compare this with how the technique is
usually shipped: the same rule with `"urlFilter": "*"` and no conditions strips
CSP from **every page the user browses**, which silently disables those sites'
XSS protections browser-wide. Don't widen this rule.

`host_permissions` still has to be `<all_urls>`, because the framed site can be
any URL and `modifyHeaders` requires host access to the request being modified.
That produces the "read and change all your data on all websites" install
warning, which is worth writing honest onboarding copy for.

## Telling the app it's installed

`announce.js` runs on Snapp pages only, in the **MAIN world**, and sets
`window.__snappExtension` to its version at `document_start`. The app reads it
via the `useSnappExtension` hook and, when present, stops asking
`/api/embeddable` which sites can be framed — the answer is now "all of them" —
and renders every card live.

Two things about that choice:

- **It must not touch the DOM.** The first version set an attribute on `<html>`
  from an isolated-world script, which lands before React hydrates and throws
  `A tree hydrated but some attributes of the server rendered HTML didn't match`.
  A MAIN-world global mutates nothing React is watching.
- **A page-world global rather than `externally_connectable` messaging**, which
  would be tamper-proof but needs the Web Store extension ID hardcoded in the
  web app — and that ID doesn't exist until the first submission is approved.
  Nothing here is a permission, only a hint about how to render a preview, so
  spoofability doesn't matter.

`VERSION` in `announce.js` is hardcoded and must be kept in sync with
`manifest.json` — MAIN-world scripts have no access to `chrome.runtime`.

## Loading it for development

1. `chrome://extensions` (or `arc://extensions`)
2. Turn on **Developer mode**
3. **Load unpacked** → select this `extension/` directory
4. Reload Snapp. Every card should go live, including Apple.

After editing `rules/frame_headers.json` or `manifest.json`, hit **Reload** on
the extension card — DNR rules are read at load time, not per request.

To confirm the rule is actually firing rather than a site simply permitting
framing: open a card for `https://www.apple.com/ca/`. Apple sends
`X-Frame-Options: SAMEORIGIN`, so if it renders, the rule works.

## Before submitting to the Chrome Web Store

- **Header-stripping gets manual review.** Expect to justify it. The narrow
  condition above is the argument: say plainly that it applies only to frames
  Snapp embeds, and point at the rule file.
- The listing needs a privacy policy covering the `<all_urls>` host permission.
- **Chromium only.** Safari has no equivalent `modifyHeaders` rule, and
  Firefox's MV3 differs. Users on those browsers keep the 54% that permit
  framing natively, which is why the app must keep working without this.
- Bump `version` in `manifest.json` on every upload; the store rejects
  duplicates.
