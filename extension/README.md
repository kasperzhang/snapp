# Snapp Live Previews

A companion Chrome extension that lets Snapp's bookmark cards show the real
site instead of a screenshot — including the roughly half of sites that refuse
to be framed.

## Why it exists

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
