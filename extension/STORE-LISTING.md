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

## Privacy practices tab

Everything below is required before "Submit for review" turns on. The dashboard
asks for one box per permission, plus a single-purpose statement, a remote-code
answer and the data certifications.

### Single purpose

> Snapp is a visual bookmark manager. This extension connects the browser to the user's Snapp library, and does two things in service of that: it saves the page the user is currently on to their library when they click the toolbar button, and it lets the bookmark cards in that library render the saved sites as live pages rather than static screenshots. It takes no action on any website unless the user clicks the button, and it does nothing at all for a user without a Snapp account.

### `<all_urls>` — host permission

> Host access is needed for two things. First, when the user clicks the save button, the extension reads the address and title of the active tab so that page can be added to their Snapp library. Second, it removes framing headers from responses loaded inside the preview frames on the user's own Snapp library page. A user may bookmark and preview any site on the web, so neither set of URLs can be enumerated in advance. Page content is never read, no browsing activity is collected, stored or transmitted, and nothing happens on any site unless the user explicitly clicks the button.

### `declarativeNetRequest`

> A single static rule in rules/frame_headers.json removes the X-Frame-Options and Content-Security-Policy response headers so that sites the user has bookmarked can be displayed inside the preview cards on their Snapp library page. Roughly half of all sites otherwise refuse to render in a frame, leaving the user looking at a stale screenshot instead of the real site. The rule is conditioned on resourceTypes ["sub_frame"] and initiatorDomains ["usesnapp.app"], so it can only ever apply to a frame that the user's own Snapp library page embedded. Top-level page loads are never modified and frames on every other website keep their headers. declarativeNetRequest is used rather than webRequest precisely because the rule is static, declarative and auditable.

### `declarativeNetRequestWithHostAccess`

> The modifyHeaders action above applies only where the extension has host access to the request being modified. Bookmarked sites can be any URL, so this variant is used to ensure the rule is evaluated only against requests the user has granted host access for, rather than globally.

### `tabs`

> To read the address and title of the active tab when the user clicks the save button, so that page can be added to their library, and to locate an already-open Snapp tab so the extension can reuse it instead of opening a duplicate. Tab data is not read at any other time, and is never stored or transmitted other than as the bookmark the user asked to create.

### `scripting`

> To show the save confirmation — a small dismissible toast displaying the saved page's title, with "Add tags" and "Undo" actions — in the corner of the page the user just saved. The injected function is defined in the extension package, runs only in direct response to the user clicking save, and reads nothing from the page.

### `storage`

> Stores a single value in chrome.storage.local: the origin of the Snapp web app the user last visited, so the save button knows where to send bookmarks. No user data, browsing history or page content is stored.

### `notifications`

> Used only to confirm a save the user just initiated. The confirmation is normally drawn into the page itself; this is the fallback for pages where a script cannot be injected, such as chrome:// pages, the Chrome Web Store and the PDF viewer. A notification is never shown except in direct response to the user clicking save.

### Remote code

Answer **"No, I am not using remote code."** Correct: every line of JavaScript
is in the package. `chrome.scripting.executeScript` is called with a `func`
defined in `background.js`, which is packaged code — remote code means script
fetched or evaluated from a server, and nothing here does that.

---

## Data usage

**Declare "Web history" as collected.** Google defines web history as "the list
of web pages a user has visited, and data associated with them, such as page
title" — and a saved bookmark is a page URL plus its title. It is only ever a
page the user explicitly chose to save, never passive browsing, and the
justification text above says so. Under-declaring is the dangerous direction:
it risks takedown after publication, whereas declaring a category you handle
narrowly costs nothing.

Everything else is **No** — no personally identifiable information, health,
financial, authentication, personal communications, location, user activity or
website content.

Certify all three:

- Not being sold to third parties
- Not being used for purposes unrelated to the item's single purpose
- Not being used to determine creditworthiness or for lending

**Privacy policy URL** — `https://www.usesnapp.app/privacy` (section 7 covers
the extension specifically; reviewers check that the policy actually addresses
the permissions requested).

**Remember to press "Save draft"** — the dialog's own advice, and the form does
not autosave.

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
