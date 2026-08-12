/* The save button.

   Saves the current tab straight to Snapp's API and confirms with a
   notification — no tab, no focus stolen, and Snapp does not have to be open.

   It works with no login of its own because Chrome treats a request from an
   extension as same-site when the extension holds host permissions for the
   target, so the usesnapp.app session cookie rides along. Cookies live in the
   browser's cookie jar rather than in a tab, which is why an open Snapp tab was
   never actually required. Two things can still break that — a signed-out user
   and a browser configured to block third-party cookies — so every failure
   falls back to opening the add dialog in a tab, which can also walk somebody
   through logging in. The silent path is an optimisation; it can't lose a save. */

const PROD_ORIGIN = "https://www.usesnapp.app";

// Snapp tabs, in the order we'd rather reuse them.
const SNAPP_TAB_PATTERNS = [
  "https://www.usesnapp.app/*",
  "https://usesnapp.app/*",
  "http://localhost/*",
];

/* Every Snapp page reports its own origin as it loads (origin-report.js), so
   the button knows where to POST while no Snapp tab is open — which is the
   whole point of it. Whichever Snapp you last visited wins, which is what makes
   this work against a dev server with no build-time switch. */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "snapp-origin" && msg.origin) {
    chrome.storage.local.set({ snappOrigin: msg.origin });
  }
});

/* Which Snapp to talk to, in order of confidence: a tab that's open right now,
   then the last one seen, then production. The tabId comes back too — the
   fallback path reuses that tab rather than piling up new ones. */
async function resolveTarget() {
  for (const pattern of SNAPP_TAB_PATTERNS) {
    const [tab] = await chrome.tabs.query({ url: pattern });
    if (tab) return { origin: new URL(tab.url).origin, tabId: tab.id };
  }
  const { snappOrigin } = await chrome.storage.local.get("snappOrigin");
  return { origin: snappOrigin || PROD_ORIGIN, tabId: null };
}

async function openInSnapp(origin, tabId, path) {
  const url = `${origin}${path}`;
  if (tabId !== null) {
    await chrome.tabs.update(tabId, { url, active: true });
    const { windowId } = await chrome.tabs.get(tabId);
    await chrome.windows.update(windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
}

/* The pre-API behaviour, now only a fallback: hand the page to the add dialog
   as a top-level navigation, which carries the session cookie even when a
   background request wouldn't and shows a login screen if there isn't one. */
async function fallbackToDialog(origin, tabId, pageUrl, pageTitle) {
  const path =
    `/app?add=${encodeURIComponent(pageUrl)}` +
    `&title=${encodeURIComponent(pageTitle ?? "")}`;
  await openInSnapp(origin, tabId, path);
}

/* The confirmation is drawn into the page we saved from, not handed to the OS.

   Chrome has used macOS's native notification system since Chrome 59, and that
   system treats extension action buttons as second-class — so "Add tags" and
   "Undo" are, at best, hidden behind a hover. Worse, the whole banner is
   dropped in silence if the browser doesn't hold macOS notification
   permission, which turns a working save into a feature that appears broken.
   An injected toast has none of those failure modes, needs no OS permission,
   and looks like Snapp rather than like the system.

   chrome.notifications stays on as the fallback for pages that refuse script
   injection — chrome:// URLs, the Web Store, the PDF viewer. */

function snappToast({ status, label, domain, bookmarkId }) {
  const HOST_ID = "snapp-toast-host";
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "position:fixed;bottom:20px;right:20px;z-index:2147483647;";
  const root = host.attachShadow({ mode: "closed" });

  const created = status === "created";
  root.innerHTML = `
    <style>
      @keyframes in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
      .card {
        display:flex; align-items:center; gap:12px;
        padding:12px 14px; border-radius:14px;
        background:#FBFAF7; border:1px solid #E7DFD2;
        box-shadow:0 12px 32px rgba(34,28,21,.16);
        font:500 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        color:#221C15; animation:in .18s ease-out;
      }
      .dot { width:8px; height:8px; border-radius:50%; background:#8D6F4C; flex:none }
      .text { min-width:0 }
      .title { font-weight:600 }
      .sub { color:#7A6E5F; font-weight:400; font-size:12px; margin-top:2px;
             max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
      .acts { display:flex; gap:6px; margin-left:4px }
      button {
        font:500 12px/1 inherit; color:#6B5335; cursor:pointer;
        background:#F1EBE0; border:1px solid transparent; border-radius:999px;
        padding:7px 11px; transition:background .15s, border-color .15s;
      }
      button:hover { background:#E7DFD2; border-color:#D6C9B4 }
      .close { background:none; color:#A2907C; padding:7px 4px }
      .close:hover { background:none; color:#221C15 }
    </style>
    <div class="card">
      <span class="dot"></span>
      <div class="text">
        <div class="title">${created ? "Saved to Snapp" : "Already in Snapp"}</div>
        <div class="sub">${label || domain || ""}</div>
      </div>
      <div class="acts">
        <button data-act="open">${created ? "Add tags" : "Open"}</button>
        ${created ? '<button data-act="undo">Undo</button>' : ""}
        <button data-act="dismiss" class="close" aria-label="Dismiss">✕</button>
      </div>
    </div>`;

  const close = () => host.remove();
  const timer = setTimeout(close, 6000);

  root.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      clearTimeout(timer);
      const act = b.dataset.act;
      close();
      if (act !== "dismiss") {
        chrome.runtime.sendMessage({ type: "snapp-toast-action", act, bookmarkId });
      }
    })
  );

  document.documentElement.appendChild(host);
}

/* Fallback only. Checks lastError, because a notification that can't be shown
   fails silently otherwise — which is exactly how this went wrong the first
   time. */
function notify({ title, message }) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn("[Snapp] Notification failed:", chrome.runtime.lastError.message);
      }
    }
  );
}

async function confirmInPage(tabId, payload) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: snappToast,
      args: [payload],
    });
    return true;
  } catch (e) {
    console.warn("[Snapp] Couldn't draw the toast here:", e.message);
    return false;
  }
}

// The most recent save, for the toast's buttons to act on. Held here rather
// than passed into the page, so nothing on that page can redirect them.
let lastSave = null;

async function saveCurrentTab() {
  /* lastFocusedWindow, not currentWindow: a service worker has no window of
     its own, so `currentWindow` has nothing meaningful to resolve against and
     can come back empty. */
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.url) {
    console.warn("[Snapp] No active tab to save.");
    return;
  }

  // Nothing to save from a new tab page, a PDF viewer, or our own UI.
  if (!/^https?:/.test(tab.url)) {
    console.warn("[Snapp] Not a savable page:", tab.url);
    return;
  }

  const { origin, tabId } = await resolveTarget();
  console.log("[Snapp] Saving", tab.url, "to", origin);

  let res;
  try {
    res = await fetch(`${origin}/api/bookmarks/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url: tab.url, title: tab.title ?? "" }),
    });
  } catch (e) {
    // Offline, or Snapp unreachable. Let the tab flow surface it.
    console.warn("[Snapp] Request failed, falling back to the dialog:", e);
    await fallbackToDialog(origin, tabId, tab.url, tab.title);
    return;
  }

  // Signed out, or cookies withheld. The dialog handles both.
  if (res.status === 401) {
    console.warn("[Snapp] Not authenticated — falling back to the dialog.");
    await fallbackToDialog(origin, tabId, tab.url, tab.title);
    return;
  }

  if (!res.ok) {
    console.error("[Snapp] Save failed:", res.status, res.statusText);
    const body = await res.json().catch(() => ({}));
    notify({
      title: "Couldn't save to Snapp",
      message: body.error || "Something went wrong. Try again in a moment.",
    });
    return;
  }

  const { status, bookmark } = await res.json();
  console.log(`[Snapp] ${status}:`, bookmark.id);

  // Where the toast's buttons should act. Kept on the worker rather than sent
  // into the page, so nothing on that page can aim them somewhere else.
  lastSave = { origin, tabId, bookmarkId: bookmark.id };

  const shown = await confirmInPage(tab.id, {
    status,
    label: bookmark.title,
    domain: bookmark.domain,
    bookmarkId: bookmark.id,
  });

  if (!shown) {
    notify({
      title: status === "created" ? "Saved to Snapp" : "Already in Snapp",
      message: bookmark.title || bookmark.domain,
    });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "snapp-toast-action" || !lastSave) return;
  if (msg.bookmarkId !== lastSave.bookmarkId) return;

  const { origin, tabId, bookmarkId } = lastSave;

  if (msg.act === "open") {
    openInSnapp(origin, tabId, `/app?edit=${bookmarkId}`);
    return;
  }

  if (msg.act === "undo") {
    fetch(`${origin}/api/bookmarks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: bookmarkId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        lastSave = null;
      })
      .catch((e) => {
        console.error("[Snapp] Undo failed:", e);
        notify({
          title: "Couldn't undo",
          message: "The bookmark is still in Snapp.",
        });
      });
  }
});

chrome.action.onClicked.addListener(saveCurrentTab);

chrome.commands.onCommand.addListener((command) => {
  if (command === "save_current_tab") saveCurrentTab();
});
