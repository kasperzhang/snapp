# Chrome Web Store submission

Everything the dashboard asks for, written out to paste. Build the upload with
`node scripts/build-extension.mjs` — never zip `extension/` by hand, because the
source treats localhost as Snapp and a published build must not.

---

## Listing

**Name** — `Snapp — Save & Live Previews`

**Summary** (132 char max, currently 117)

> Save the page you're on to Snapp in one click, and see your bookmarks as the real, live site instead of a screenshot.

**Category** — Productivity → Workflow & Planning

**Language** — English

**Description**

> Snapp is a visual bookmark manager for designers and people who build with AI. This extension is its companion, and it does two things.
>
> **Save in one click.** Press the toolbar button, or ⌘⇧S, and the page you're on is saved to your Snapp library. No tab opens, nothing steals your focus, and Snapp doesn't need to be open. A small confirmation appears in the corner of the page with the option to add tags, or to undo if you didn't mean it.
>
> **See your bookmarks alive.** Roughly half the web refuses to be displayed inside another page, which is why bookmark managers show you flat screenshots. With this extension installed, every card in your Snapp library renders the real, current site — scrolling, animating, exactly as it looks today rather than as it looked the day you saved it.
>
> The extension is optional. Snapp works without it; sites that permit embedding stay live either way.
>
> **What it does not do:** it does not read the pages you visit, does not track your browsing, and contains no analytics. It reads a page's address and title only at the moment you click save.
>
> Requires a Snapp account — https://www.usesnapp.app

**Single purpose** (required field)

> A companion for the Snapp bookmark manager: saving the current page to a
> user's Snapp library, and rendering that library's bookmarks as live sites.

---

## Permission justifications

Each of these goes in its own box in the dashboard. Be specific — vague
justifications are the most common cause of rejection.

**`<all_urls>` (host permission)**

> Users can save any page and preview any bookmarked site, so neither set of URLs can be known in advance. The access is used for exactly two things: reading the address and title of the active tab when the user clicks save, and removing framing headers from responses loaded inside preview frames on the extension's own web app. Page content is never read, and no browsing activity is recorded or transmitted.

**`declarativeNetRequest` / `declarativeNetRequestWithHostAccess`**

> A single static rule removes X-Frame-Options and Content-Security-Policy from responses so that bookmarked sites can be displayed inside preview cards, which the browser would otherwise refuse. The rule is conditioned on resourceTypes ["sub_frame"] and initiatorDomains ["usesnapp.app"], so it can only ever apply to a frame the user's own Snapp library page has embedded. Top-level navigation is untouched, and frames on every other site keep their headers. declarativeNetRequest was chosen over webRequest precisely because the rule is static and auditable.

**`tabs`**

> To read the address and title of the active tab when the user clicks the save button, and to find or focus an existing Snapp tab instead of opening a duplicate.

**`scripting`**

> To display the save confirmation — a small dismissible toast with "Add tags" and "Undo" — in the corner of the page the user just saved. It is injected only in response to the user clicking save, and reads nothing from the page.

**`storage`**

> Stores one value locally: the address of the Snapp instance the user last visited, so the save button knows where to send bookmarks. No user data is stored.

**`notifications`**

> Fallback confirmation for pages where a toast cannot be injected, such as chrome:// pages and the Web Store.

---

## Data usage disclosures

Tick **only**:

- [x] Website content — *"Personally identifiable information"* → **No**
- [x] User activity → **No**
- [x] Web history → **No**

Declare collection of: **the URL and title of a page, at the moment the user
saves it.** Nothing else.

Certify all three:

- Not being sold to third parties
- Not being used for purposes unrelated to the item's single purpose
- Not being used to determine creditworthiness or for lending

**Privacy policy URL** — `https://www.usesnapp.app/privacy` (section 7 covers
the extension specifically; reviewers check that the policy actually addresses
the permissions requested).

---

## Assets still needed

- **Screenshots** — at least 1, up to 5, at **1280×800** or 640×400. The
  strongest pair: a Snapp library with live cards, and the save toast on a real
  page. Take these at 1280×800 with the extension installed.
- **Small promo tile** — 440×280 PNG. Optional, but required to be featured.

## Before each upload

1. Bump `version` in `extension/manifest.json` **and** `VERSION` in
   `announce.js` — the store rejects duplicate versions.
2. `node scripts/build-extension.mjs`
3. Upload `dist/snapp-extension-<version>.zip`

## What to expect from review

Header-stripping draws manual review, so expect days rather than hours, and
possibly a question. The answer is the rule's scope: point at
`rules/frame_headers.json` and note that `initiatorDomains` confines it to
frames the extension's own web app embeds. Do not widen that rule to make
anything else work.
