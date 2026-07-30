/* The landing page's stylesheet, shared by every marketing surface so the
   /for/* pages inherit the same type scale, palette and motion instead of
   re-declaring 600 lines of it. Injected via a <style> tag by MarketingShell. */

export const lpCss = `
.lp {
  --paper: #FBFAF7;
  --ink: #221C15;
  --ink-soft: #5C5346;
  --ink-mute: #9C927F;
  --line: #E7E1D5;
  --card: #FFFFFF;
  --mocha: #8D6F4C;
  --mocha-deep: #6B5335;
  --mocha-tint: #F1EBE0;
  --agent: #4C6B9A;
  --agent-ink: #17202E;
  --dark: #201A13;
  --dark-2: #2A2219;
  --display: var(--font-bricolage), var(--font-space-grotesk), sans-serif;
  --body: var(--font-geist-sans), system-ui, sans-serif;
  --mono: var(--font-geist-mono), monospace;
  --hand: var(--font-playpen), cursive;

  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  min-height: 100vh;
  overflow-x: clip;
}
.lp a { text-decoration: none; color: inherit; }
.lp i, .lp b { font-style: normal; }

/* ── primitives ── */
.lp-eyebrow {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mocha);
  margin-bottom: 18px;
}
.lp-eyebrow-dark { color: #C9AE87; }
.lp-h1 {
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(3rem, 7.2vw, 5.6rem);
  line-height: 1.0;
  letter-spacing: -0.035em;
}
.lp-h2 {
  font-family: var(--display);
  font-weight: 650;
  font-size: clamp(1.9rem, 3.8vw, 2.9rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
  max-width: 21em;
}
.lp-h2-dark { color: #F3EDE2; }
.lp-h3 {
  font-family: var(--display);
  font-weight: 650;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  letter-spacing: -0.015em;
}
.lp-body {
  margin-top: 18px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink-soft);
  max-width: 34em;
}
.lp-body-dark { color: #B7AB97; }
.lp-center { text-align: center; margin-left: auto; margin-right: auto; }

.lp-btn {
  display: inline-block;
  font-size: 15px;
  font-weight: 550;
  padding: 14px 28px;
  border-radius: 999px;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.lp-btn-sm { padding: 9px 18px; font-size: 13.5px; }
.lp-btn-block { display: block; text-align: center; margin-top: 26px; padding: 12px; font-size: 14px; }
.lp .lp-btn-primary { background: var(--mocha-deep); color: #FBFAF7; }
.lp .lp-btn-primary:hover { background: var(--ink); transform: translateY(-1px); }
.lp .lp-btn-ghost { border: 1px solid var(--line); background: var(--card); color: var(--ink); }
.lp .lp-btn-ghost:hover { border-color: var(--ink-mute); }
.lp :is(a,button):focus-visible { outline: 2px solid var(--mocha); outline-offset: 3px; border-radius: 6px; }

/* ── nav ── */
.lp-nav {
  position: sticky; top: 0; z-index: 40;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.lp-nav-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 28px;
  height: 62px; display: flex; align-items: center; justify-content: space-between;
}
.lp-wordmark { display: flex; align-items: center; gap: 9px; font-family: var(--display); font-weight: 700; font-size: 19px; letter-spacing: -0.02em; }
.lp-logo-tile {
  width: 27px; height: 27px; border-radius: 8px;
  background: var(--mocha); color: #FBFAF7;
  display: grid; place-items: center;
}
.lp-logo-tile svg { width: 13px; height: 13px; }
.lp-nav-links { display: flex; gap: 30px; font-size: 13.5px; color: var(--ink-soft); }
.lp-nav-links a:hover { color: var(--ink); }
.lp-nav-cta { display: flex; align-items: center; gap: 16px; }
.lp-nav-login { font-size: 13.5px; color: var(--ink-soft); }
.lp-nav-login:hover { color: var(--ink); }
@media (max-width: 720px) { .lp-nav-links, .lp-nav-login { display: none; } }

/* ── hero ── */
.lp-hero {
  max-width: 880px; margin: 0 auto; padding: 92px 28px 0;
  text-align: center;
}
.lp-hero-sub {
  margin: 26px auto 0; max-width: 39em;
  font-size: 17.5px; line-height: 1.65; color: var(--ink-soft);
}
.lp-hero-ctas { margin-top: 36px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.lp-hero-note { margin-top: 16px; font-size: 13px; color: var(--ink-mute); }

.lp-that { font-style: italic; color: var(--mocha); }

/* ── screenshot ── */
.lp-shot-wrap { padding: 64px 20px 0; }
.lp-shot { position: relative; max-width: 1180px; margin: 0 auto; }
.lp-shot::before {
  content: ""; position: absolute; inset: -8% -12% -14%;
  background: radial-gradient(58% 62% at 50% 42%, rgba(141,111,76,0.16), transparent 70%);
  pointer-events: none;
}
.lp-agents {
  max-width: 1180px; margin: 26px auto 0;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: 14px 20px;
  font-family: var(--mono); font-size: 12.5px; color: var(--ink-soft);
  letter-spacing: 0.04em;
}
/* Only the leading label gets the small-caps treatment. Scoping this to a
   bare span element also caught the tool names and stacked them under their
   marks. NB: this file is one JS template literal, so backticks and
   dollar-brace sequences must not appear anywhere in it. */
.lp-agents > span:first-child {
  text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.2em;
  color: var(--ink-mute);
}

.lp-note {
  position: absolute; z-index: 5;
  font-family: var(--hand); font-size: 15.5px; color: var(--ink-soft);
  opacity: 0; animation: lpFade 0.5s ease-out 1.5s forwards;
}
.lp-note-borrow { top: -34px; left: 26%; transform: rotate(-3deg); }
.lp-note-guide { top: -34px; right: 4%; transform: rotate(2deg); }
@media (max-width: 900px) { .lp-note { display: none; } }

/* browser window */
.mk-window {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--card);
  box-shadow: 0 1px 2px rgba(34,28,21,0.05), 0 24px 70px -18px rgba(34,28,21,0.22);
  overflow: hidden;
}
.mk-chrome {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  background: #F6F3EC;
}
.mk-chrome-dots { display: flex; gap: 6px; }
.mk-chrome-dots i { width: 10px; height: 10px; border-radius: 50%; background: #DCD5C6; }
.mk-chrome-url {
  flex: 0 1 340px; margin: 0 auto;
  font-family: var(--mono); font-size: 11px; color: var(--ink-mute);
  background: var(--card); border: 1px solid var(--line);
  border-radius: 7px; padding: 4px 12px; text-align: center;
}
.mk-chrome-spacer { width: 42px; }

.mk-app { display: flex; text-align: left; background: var(--card); }

/* sidebar */
.mk-side {
  width: 208px; flex-shrink: 0;
  border-right: 1px solid var(--line);
  background: #F6F3EC;
  padding: 14px 12px 12px;
  display: flex; flex-direction: column;
  font-size: 12.5px;
}
.mk-side-brand { display: flex; align-items: center; gap: 8px; font-family: var(--display); font-size: 15px; font-weight: 700; padding: 2px 6px 12px; }
.mk-side-logo { width: 21px; height: 21px; border-radius: 6px; background: var(--mocha); color: #FBFAF7; display: grid; place-items: center; font-size: 12px; }
.mk-side-logo svg { width: 10px; height: 10px; }
.mk-side-search {
  border: 1px solid var(--line); background: var(--card); border-radius: 8px;
  padding: 6px 10px; font-size: 11.5px; color: var(--ink-mute); margin-bottom: 14px;
}
.mk-side-label {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-mute); margin: 10px 6px 5px;
}
.mk-side-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 8px; color: var(--ink-soft);
}
.mk-side-active { background: var(--mocha-tint); color: var(--ink); font-weight: 550; }
.mk-side-count { margin-left: auto; font-size: 10.5px; color: var(--ink-mute); }
.mk-side-tag i { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.mk-wb-dot { width: 7px; height: 7px; border-radius: 2.5px; background: var(--mocha); flex-shrink: 0; }
.mk-ico { width: 12px; height: 12px; border: 1.5px solid currentColor; border-radius: 3px; opacity: 0.75; }
.mk-ico-grid { background: linear-gradient(currentColor, currentColor) 50% 0/1.5px 100% no-repeat, linear-gradient(currentColor, currentColor) 0 50%/100% 1.5px no-repeat; }
.mk-ico-bench { border-radius: 3px 3px 6px 6px; }
.mk-side-foot {
  margin-top: auto; display: flex; align-items: center; gap: 8px;
  border-top: 1px solid var(--line); padding: 10px 6px 2px;
}
.mk-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: var(--paper); display: grid; place-items: center; font-size: 11px; font-weight: 600; }
.mk-side-foot b { display: block; font-size: 12px; }
.mk-pro {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.12em;
  background: var(--mocha); color: #FBFAF7; border-radius: 4px; padding: 1.5px 5px;
}

/* main */
.mk-main { flex: 1; min-width: 0; padding: 16px 18px 20px; }
.mk-compose {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  border: 1px solid #DECDB4; background: linear-gradient(90deg, #F8F2E7, #FDFBF6);
  border-radius: 11px; padding: 9px 12px; font-size: 12.5px; color: var(--ink-soft);
}
.mk-compose b { color: var(--ink); }
.mk-compose-left { display: flex; align-items: center; gap: 9px; min-width: 0; white-space: nowrap; overflow: hidden; }
.mk-compose-badge {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  border: 1px solid var(--mocha); color: var(--mocha); border-radius: 5px; padding: 2px 6px;
}
.mk-cancel {
  margin-left: auto; flex-shrink: 0;
  font-size: 11.5px; font-weight: 500; color: var(--ink-soft); padding: 6px 4px;
}
.mk-generate {
  flex-shrink: 0; background: var(--ink); color: var(--paper);
  font-size: 11.5px; font-weight: 550; border-radius: 999px; padding: 6px 13px;
}

/* Mix notes — the designer's own direction, above the grid */
.mk-mixnotes-label {
  margin: 13px 0 5px; font-family: var(--mono); font-size: 8.5px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute);
}
.mk-mixnotes {
  border: 1px solid var(--line); background: var(--card); border-radius: 10px;
  padding: 9px 12px; font-size: 11.5px; line-height: 1.5; color: var(--ink-soft);
}
.mk-hint { margin-top: 10px; font-size: 11px; color: var(--ink-mute); }
.mk-hint b { font-weight: 500; color: var(--ink-soft); }

.mk-grid {
  margin-top: 14px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.mk-card {
  position: relative;
  border: 1px solid var(--line); border-radius: 12px; background: var(--card);
  overflow: visible;
  box-shadow: 0 1px 2px rgba(34,28,21,0.04);
}
.mk-card-sel { border-color: var(--mocha); box-shadow: 0 0 0 1px var(--mocha), 0 6px 18px -6px rgba(141,111,76,0.35); }
.mk-check {
  position: absolute; top: -7px; left: -7px; z-index: 4;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--mocha); color: #FBFAF7;
  font-size: 10px; display: grid; place-items: center;
}
.mk-chips { position: absolute; top: -11px; right: 8px; z-index: 4; display: flex; gap: 5px; }
.mk-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--ink); color: var(--paper);
  font-size: 10px; font-weight: 550; border-radius: 999px; padding: 3.5px 9px;
  box-shadow: 0 3px 8px rgba(34,28,21,0.25);
  opacity: 0; transform: scale(0.5) translateY(6px);
  animation: lpPin 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.mk-chip i { width: 6px; height: 6px; border-radius: 50%; }

.mk-thumb {
  height: 96px; border-radius: 11px 11px 0 0; overflow: hidden;
  padding: 10px 12px; position: relative; color: var(--ink);
}
.mk-meta { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--line); }
.mk-favicon {
  width: 20px; height: 20px; border-radius: 6px; color: #FFF;
  display: grid; place-items: center; font-size: 10px; font-weight: 650; flex-shrink: 0;
}
.mk-meta b { display: block; font-size: 11.5px; line-height: 1.25; }
.mk-meta span { display: block; font-size: 10px; color: var(--ink-mute); }

/* mini-site art direction */
.mk-obj-nav { display: flex; justify-content: space-between; font-size: 6.5px; letter-spacing: 0.05em; }
.mk-obj-nav span { opacity: 0.55; }
.mk-obj-display { margin-top: 10px; font-family: var(--display); font-weight: 800; font-size: 21px; line-height: 0.92; letter-spacing: -0.02em; }
.mk-obj-dot { position: absolute; right: 12px; bottom: 12px; width: 11px; height: 11px; border-radius: 50%; background: #D14B32; }
.mk-mer-nav { display: flex; gap: 5px; align-items: center; }
.mk-mer-logo { width: 8px; height: 8px; border-radius: 2.5px; background: #6E92C9; }
.mk-mer-nav i { width: 16px; height: 3px; border-radius: 2px; background: rgba(232,237,245,0.28); }
.mk-mer-h { margin-top: 13px; font-weight: 650; font-size: 12.5px; letter-spacing: -0.01em; }
.mk-mer-sub { margin-top: 6px; width: 70%; height: 4px; border-radius: 2px; background: rgba(232,237,245,0.25); }
.mk-mer-btn { display: inline-block; margin-top: 9px; background: #6E92C9; color: #0E1520; font-size: 7.5px; font-weight: 650; border-radius: 999px; padding: 3px 8px; }
.mk-grove-h { font-family: Georgia, serif; font-size: 12px; font-style: italic; color: #3E4A38; }
.mk-grove-img { margin-top: 7px; height: 34px; border-radius: 7px; background: linear-gradient(120deg, #7B8F6B, #4E5F44 60%, #38452F); }
.mk-grove-row { display: flex; gap: 5px; margin-top: 6px; }
.mk-grove-row i { flex: 1; height: 5px; border-radius: 3px; background: #D8D3C0; }
.mk-pulse-h { font-family: var(--display); font-weight: 800; font-size: 15px; letter-spacing: 0.24em; }
.mk-pulse-bars { display: flex; align-items: flex-end; gap: 3.5px; margin-top: 12px; height: 32px; }
.mk-pulse-bars i { flex: 1; background: #D8FF4F; border-radius: 2px 2px 0 0; opacity: 0.9; }
.mk-paper-mast { font-family: Georgia, serif; font-size: 12.5px; text-align: center; border-bottom: 1px solid #DCD2BC; padding-bottom: 5px; color: #4A3F30; }
.mk-paper-cols { display: flex; gap: 8px; margin-top: 7px; }
.mk-paper-cols > div { flex: 1; display: flex; flex-direction: column; gap: 3.5px; }
.mk-paper-cols i { height: 3.5px; border-radius: 2px; background: #DED4BE; }
.mk-paper-cols i:first-child { background: #C9BCA0; width: 72%; }
.mk-nord-card {
  background: #3E4C7A; color: #EDF0F8; border-radius: 8px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px; font-size: 8px;
}
.mk-nord-card b { font-size: 12px; font-weight: 650; }
.mk-nord-rows { margin-top: 7px; display: flex; flex-direction: column; gap: 4px; }
.mk-nord-rows i { height: 6px; border-radius: 3px; background: #E3E6EF; }
.mk-kiln-h { font-family: Georgia, serif; font-size: 13px; color: #5C4632; }
.mk-kiln-shelf { display: flex; gap: 7px; margin-top: 9px; align-items: flex-end; }
.mk-kiln-shelf i { flex: 1; border-radius: 6px 6px 3px 3px; height: 30px; }
.mk-kiln-shelf i:nth-child(2) { height: 38px; border-radius: 50% 50% 3px 3px; }
.mk-term { font-family: var(--mono); font-size: 8.5px; line-height: 1.8; }
.mk-term-line { display: block; }
.mk-term-dim { opacity: 0.55; }
.mk-term-cursor { display: inline-block; animation: lpBlink 1.1s steps(1) infinite; }

/* mix panel */
.mk-panel {
  width: 252px; flex-shrink: 0;
  border-left: 1px solid var(--line);
  background: #F6F3EC;
  padding: 16px 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.mk-panel-head b { font-family: var(--display); font-size: 15px; font-weight: 650; display: block; }
.mk-panel-head > span { font-size: 10.5px; color: var(--ink-mute); }
/* Scanned sources, as the real Mix panel lists them */
.mk-panel-srcs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.mk-src {
  border: 1px solid var(--line); background: #FFF; border-radius: 999px;
  padding: 2px 7px; font-size: 9.5px; color: var(--ink-soft); white-space: nowrap;
}
/* Designer's own direction for the whole mix — collapsed, with a dot when set */
.mk-notes {
  display: flex; align-items: center; gap: 4px; margin-top: 10px;
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-mute);
}
.mk-notes i { width: 3px; height: 3px; border-radius: 999px; background: var(--mocha); }
.mk-panel-actions { margin-top: auto; display: flex; align-items: center; gap: 5px; }
.mk-copy-btn {
  flex: 1; text-align: center;
  background: var(--mocha-deep); color: #FBFAF7;
  font-size: 11px; font-weight: 550; border-radius: 999px; padding: 8px;
}
.mk-icon-btn, .mk-open-btn {
  flex-shrink: 0; border: 1px solid var(--line); background: #FFF;
  color: var(--ink); border-radius: 999px; font-size: 10.5px; padding: 7px 9px;
}

@media (max-width: 1080px) { .mk-panel { display: none; } .lp-note-guide { display: none; } }
@media (max-width: 860px) {
  .mk-side { display: none; }
  .mk-grid { grid-template-columns: repeat(3, 1fr); }
  .mk-grid .mk-card:nth-child(n+7) { display: none; }
}
@media (max-width: 560px) {
  .mk-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .mk-grid .mk-card:nth-child(n+5) { display: none; }
  .mk-compose-left { font-size: 11px; }
  .mk-thumb { height: 82px; }
}

/* ── guide document ── */
.bd {
  background: var(--card); border: 1px solid var(--line); border-radius: 13px;
  padding: 14px; font-size: 11px;
  /* Explicit — the large variant sits inside .lp-dark and would otherwise
     inherit its light-on-dark text colour onto a white card. */
  color: var(--ink);
}
.bd-label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }

/* The artifact is Markdown — the app renders it as running text, so the
   mockup does too. Headings keep their # markers; the muted marker colour is
   the only liberty taken over the real <pre>. */
.bd-doc { margin-top: 8px; }
.bd-h1 {
  font-family: var(--display); font-size: 13px; font-weight: 650;
  letter-spacing: -0.01em; line-height: 1.35; margin-bottom: 9px;
}
.bd-h2 {
  font-family: var(--display); font-size: 10.5px; font-weight: 650;
  margin: 10px 0 3px;
}
.bd-h1 > span, .bd-h2 > span { color: var(--mocha); font-weight: 500; }
.bd-p { font-size: 10px; line-height: 1.55; color: var(--ink-soft); }
.bd-p em { font-style: normal; color: var(--ink-mute); }
.bd-toks { display: flex; flex-direction: column; gap: 3px; }
.bd-tok { font-family: var(--mono); font-size: 9px; display: flex; align-items: center; gap: 5px; }
.bd-tok-n { color: var(--mocha); min-width: 52px; }
.bd-tok i { width: 9px; height: 9px; border-radius: 3px; border: 1px solid var(--line); flex-shrink: 0; }
.bd-tok em { font-style: normal; color: var(--ink-mute); }
/* The document runs past the fold, as it does in the panel. */
.bd-fade-h { opacity: 0.45; }
.bd-more {
  margin-top: 9px; padding-top: 8px; border-top: 1px dashed var(--line);
  font-family: var(--mono); font-size: 8.5px; color: var(--ink-mute);
}

.bd-large { padding: 30px 32px; border-radius: 18px; box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5); transform: rotate(-1deg); }
.bd-large .bd-label { font-size: 10px; }
.bd-large .bd-doc { margin-top: 12px; }
.bd-large .bd-h1 { font-size: 22px; margin-bottom: 16px; }
.bd-large .bd-h2 { font-size: 14px; margin: 17px 0 5px; }
.bd-large .bd-p { font-size: 12.5px; line-height: 1.6; }
.bd-large .bd-tok { font-size: 11.5px; gap: 8px; }
.bd-large .bd-tok-n { min-width: 74px; }
.bd-large .bd-tok i { width: 12px; height: 12px; border-radius: 4px; }
.bd-large .bd-more { font-size: 10.5px; margin-top: 16px; padding-top: 12px; }

/* ── sections ── */
.lp-section { padding: 110px 28px; }
/* Two plain sections in a row stack 110px of bottom padding onto 110px of
   top padding — 220px of void between two short text blocks. The first
   section's bottom padding is separation enough. Tinted sections keep theirs
   either side: their background makes the padding read as the panel's inset
   rather than as a gap. */
.lp-section:not(.lp-section-tint) + .lp-section:not(.lp-section-tint) {
  padding-top: 0;
}
.lp-section-tint { background: #F6F3EC; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.lp-section-inner { max-width: 1120px; margin: 0 auto; }
.lp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
.lp-cols-wb { margin-top: 72px; }
@media (max-width: 900px) { .lp-cols { grid-template-columns: 1fr; gap: 44px; } }

.lp-feature-list { margin-top: 28px; display: flex; flex-direction: column; gap: 16px; }
.lp-feature-list li {
  list-style: none; font-size: 15px; line-height: 1.6; color: var(--ink-soft);
  padding-left: 18px; position: relative;
}
.lp-feature-list li::before {
  content: ""; position: absolute; left: 0; top: 9px;
  width: 7px; height: 7px; border-radius: 2.5px; background: var(--mocha);
}
.lp-feature-list strong { color: var(--ink); font-weight: 600; }

.lp-wb-head { max-width: 640px; }
.lp-pro-tag {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em;
  background: var(--mocha); color: #FBFAF7; border-radius: 5px; padding: 2.5px 7px;
  vertical-align: 2px; margin-left: 8px;
}
.lp-aspects { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 26px; }
.lp-aspect {
  display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); background: var(--card);
  border-radius: 999px; padding: 8px 15px; font-size: 13.5px;
}
.lp-aspect i { width: 8px; height: 8px; border-radius: 50%; }

/* library vignette */
.lv { position: relative; padding-top: 26px; }
.lv-search {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 6;
  display: flex; align-items: center; gap: 10px; white-space: nowrap;
  background: var(--ink); color: var(--paper);
  border-radius: 12px; padding: 12px 18px; font-size: 13.5px;
  box-shadow: 0 16px 40px -8px rgba(34,28,21,0.4);
}
.lv-search span { font-family: var(--mono); font-size: 10.5px; border: 1px solid rgba(251,250,247,0.3); border-radius: 5px; padding: 2px 6px; }
.lv-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding-top: 26px; }
.lv-card-0 { transform: rotate(-1.5deg) translateY(8px); }
.lv-card-2 { transform: rotate(1.8deg) translateY(4px); }
.lv-hit { box-shadow: 0 0 0 2px var(--mocha), 0 14px 34px -10px rgba(141,111,76,0.45); }
.lv-note { position: absolute; bottom: -30px; right: 16%; transform: rotate(-2deg); animation: none; opacity: 1; }
@media (max-width: 560px) { .lv-row { grid-template-columns: repeat(2, 1fr); } .lv-row .mk-card:nth-child(3) { display: none; } }

/* borrow vignette */
.bv { display: flex; gap: 18px; align-items: center; justify-content: center; }
.bv-card { width: min(46%, 230px); flex-shrink: 0; transform: rotate(-1.5deg); }
.bv-menu {
  background: var(--card); border: 1px solid var(--line); border-radius: 13px;
  padding: 12px 13px; width: min(50%, 230px);
  box-shadow: 0 18px 44px -12px rgba(34,28,21,0.18);
  transform: rotate(0.8deg);
}
.bv-opt {
  display: flex; align-items: center; gap: 9px;
  font-size: 12.5px; padding: 7px 9px; border-radius: 8px; color: var(--ink-soft);
}
.bv-opt i { width: 7px; height: 7px; border-radius: 50%; }
.bv-opt span { margin-left: auto; color: var(--mocha); font-weight: 650; font-size: 11px; }
.bv-on { background: var(--mocha-tint); color: var(--ink); font-weight: 550; }

/* dark section */
.lp-dark {
  background: var(--dark); color: #F3EDE2;
  padding: 120px 28px;
  background-image: radial-gradient(70% 60% at 78% 30%, rgba(141,111,76,0.16), transparent 70%);
}
.lp-dark .lp-cols { align-items: center; }
.lp-terminal {
  margin-top: 34px; border-radius: 13px; overflow: hidden;
  border: 1px solid #3A3125;
  background: var(--agent-ink);
  box-shadow: 0 20px 50px -16px rgba(0,0,0,0.6);
}
.lp-terminal-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 13px; border-bottom: 1px solid rgba(126,151,188,0.18);
}
.lp-terminal-bar i { width: 8px; height: 8px; border-radius: 50%; background: rgba(126,151,188,0.3); }
.lp-terminal-bar span { margin-left: 8px; font-family: var(--mono); font-size: 10.5px; color: #7E97BC; }
.lp-terminal pre {
  padding: 16px 18px; margin: 0;
  font-family: var(--mono); font-size: 12px; line-height: 1.9;
  color: #C7D5EA; white-space: pre-wrap; word-break: break-word;
}
.lp-t-prompt { color: #6E92C9; }
.lp-t-dim { color: #7E97BC; }
.lp-t-cursor { animation: lpBlink 1.1s steps(1) infinite; color: #6E92C9; }

/* steps */
/* ── working flow ──
   A rail rather than a row of cards: four phases reading left to right with
   the line carrying the eye between them, so it looks like a sequence
   instead of four unrelated columns. */
.lp-flow {
  margin-top: 54px; display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; list-style: none;
}
.lp-phase { position: relative; padding-right: 30px; }
.lp-phase-rail { display: block; position: relative; height: 13px; margin-bottom: 20px; }
.lp-phase-rail i {
  position: absolute; top: 3px; left: 0;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--mocha);
}
/* The connector stops at the last phase — the sequence ends there. */
.lp-phase:not(:last-child) .lp-phase-rail::after {
  content: ""; position: absolute; top: 6px; left: 15px; right: 8px;
  height: 1px; background: var(--line);
}
.lp-phase-n {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
  color: var(--ink-mute);
}
.lp-phase h3 { margin-top: 8px; }
.lp-phase p { margin-top: 10px; font-size: 14.5px; line-height: 1.6; color: var(--ink-soft); }
@media (max-width: 900px) {
  .lp-flow { grid-template-columns: repeat(2, 1fr); row-gap: 34px; }
  .lp-phase:nth-child(2) .lp-phase-rail::after { display: none; }
}
@media (max-width: 560px) {
  .lp-flow { grid-template-columns: 1fr; row-gap: 28px; }
  .lp-phase { padding-right: 0; }
  .lp-phase .lp-phase-rail::after { display: none; }
}

/* pricing */
.lp-plans { display: grid; grid-template-columns: repeat(2, minmax(0, 340px)); gap: 20px; justify-content: center; margin-top: 60px; }
.lp-plan {
  position: relative; background: var(--card);
  border: 1px solid var(--line); border-radius: 18px; padding: 30px 28px;
}
.lp-plan-pro { border-color: var(--mocha); box-shadow: 0 24px 60px -20px rgba(141,111,76,0.35); }
.lp-plan-flag {
  position: absolute; top: -11px; right: 24px;
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase;
  background: var(--mocha); color: #FBFAF7; border-radius: 999px; padding: 3.5px 10px;
}
.lp-plan h3 { font-family: var(--display); font-size: 17px; font-weight: 650; }
.lp-price { margin-top: 12px; font-family: var(--display); font-size: 40px; font-weight: 700; letter-spacing: -0.03em; }
.lp-price span { font-size: 13.5px; font-weight: 400; color: var(--ink-mute); letter-spacing: 0; font-family: var(--body); }
.lp-plan-blurb { margin-top: 5px; font-size: 14px; color: var(--ink-soft); }
.lp-plan ul { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.lp-plan li {
  list-style: none; font-size: 14px; color: var(--ink-soft);
  padding-left: 16px; position: relative;
}
.lp-plan li::before {
  content: ""; position: absolute; left: 0; top: 8px;
  width: 6px; height: 6px; border-radius: 2px; background: var(--mocha);
}
@media (max-width: 680px) { .lp-plans { grid-template-columns: minmax(0, 400px); } }

/* closer + footer */
.lp-closer { text-align: center; padding: 130px 28px; }
.lp-closer-h { margin-bottom: 38px; }
.lp-footer { border-top: 1px solid var(--line); padding: 34px 28px; }
.lp-footer-inner {
  max-width: 1120px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
}
.lp-wordmark-sm { font-size: 15px; }
.lp-wordmark-sm .lp-logo-tile { width: 22px; height: 22px; border-radius: 6px; }
.lp-wordmark-sm .lp-logo-tile svg { width: 11px; height: 11px; }
.lp-footer-spec { font-family: var(--mono); font-size: 10.5px; color: var(--ink-mute); line-height: 2; }
.lp-swatch-i {
  display: inline-block; width: 9px; height: 9px; border-radius: 3px;
  border: 1px solid var(--line); vertical-align: -1px; margin: 0 1px;
}
.lp-footer-copy { font-size: 12px; color: var(--ink-mute); }
.lp-footer-link:hover { color: var(--ink); }

/* ── motion ── */
.lp-rise { opacity: 0; transform: translateY(16px); animation: lpRise 0.75s cubic-bezier(0.22,1,0.36,1) forwards; }
.lp-d1 { animation-delay: 0.08s; }
.lp-d2 { animation-delay: 0.16s; }
.lp-d3 { animation-delay: 0.24s; }
.lp-d4 { animation-delay: 0.38s; }
@keyframes lpRise { to { opacity: 1; transform: none; } }
@keyframes lpFade { to { opacity: 1; } }
@keyframes lpPin { to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes lpBlink { 50% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .lp-rise, .lp-note, .mk-chip { animation: none; opacity: 1; transform: none; }
  .lp-t-cursor, .mk-term-cursor { animation: none; }
  .lp * { transition: none !important; }
}
/* ── tool logos ── */
.lp-tools { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 18px; }
.lp-agents .lp-tool {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--ink-mute); white-space: nowrap;
  font-size: 12.5px; letter-spacing: 0.02em; text-transform: none;
}
.lp-tool-mark { width: 15px; height: 15px; flex-shrink: 0; }

/* ── faq ── */
.lp-faq-inner { max-width: 720px; }
.lp-faq { margin-top: 40px; border-top: 1px solid var(--line); }
.lp-faq-item { border-bottom: 1px solid var(--line); }
.lp-faq-item summary {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 18px 0; cursor: pointer; list-style: none;
  font-family: var(--display); font-size: 16px; font-weight: 600;
  letter-spacing: -0.01em;
}
.lp-faq-item summary::-webkit-details-marker { display: none; }
/* A plus that becomes a minus — no icon dependency in a CSS-only disclosure. */
.lp-faq-item summary i {
  position: relative; width: 11px; height: 11px; flex-shrink: 0; opacity: 0.5;
}
.lp-faq-item summary i::before,
.lp-faq-item summary i::after {
  content: ""; position: absolute; background: var(--ink);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.lp-faq-item summary i::before { inset: 5px 0; height: 1px; }
.lp-faq-item summary i::after { inset: 0 5px; width: 1px; }
.lp-faq-item[open] summary i::after { transform: scaleY(0); opacity: 0; }
.lp-faq-item p {
  padding: 0 40px 20px 0; font-size: 14.5px; line-height: 1.7;
  color: var(--ink-soft);
}

/* ── long-form article pages (/for/*) ── */
.lp-article { max-width: 720px; margin: 0 auto; padding: 76px 28px 96px; }
.lp-article-h1 { font-size: clamp(2.3rem, 5vw, 3.4rem); line-height: 1.05; }
.lp-article-lede {
  margin-top: 26px; font-size: 18px; line-height: 1.65; color: var(--ink-soft);
}
.lp-article h2 {
  font-family: var(--display); font-weight: 650; font-size: 21px;
  letter-spacing: -0.015em; margin: 46px 0 12px;
}
.lp-article p { font-size: 16px; line-height: 1.72; color: var(--ink-soft); margin-top: 14px; }
.lp-article code {
  font-family: var(--mono); font-size: 0.88em;
  background: var(--mocha-tint); border-radius: 5px; padding: 1px 5px;
  color: var(--ink);
}
.lp-article-list { margin-top: 16px; padding-left: 20px; }
.lp-article-list li {
  font-size: 16px; line-height: 1.72; color: var(--ink-soft); margin-top: 10px;
}
.lp-article-list strong { color: var(--ink); font-weight: 600; }
.lp-article .lp-agents { justify-content: flex-start; margin-top: 22px; }
.lp-article-cta {
  margin-top: 52px; padding-top: 34px; border-top: 1px solid var(--line);
  text-align: center;
}
.lp-article-cta .lp-hero-note { margin-top: 14px; }
/* ── blog ── */
.lp-blog-index { padding-bottom: 72px; }
.lp-post-list { margin-top: 52px; border-top: 1px solid var(--line); }
.lp-post-list li { border-bottom: 1px solid var(--line); }
.lp-post { display: block; padding: 26px 0; }
.lp-post-meta {
  display: flex; align-items: center; gap: 12px;
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-mute);
}
.lp-post-topic { color: var(--mocha); }
.lp-post h2 {
  margin-top: 10px; font-family: var(--display); font-size: 22px;
  font-weight: 650; letter-spacing: -0.02em; line-height: 1.25;
  transition: color 0.15s ease;
}
.lp-post p { margin-top: 8px; font-size: 15.5px; line-height: 1.6; color: var(--ink-soft); max-width: 42em; }
.lp-post:hover h2 { color: var(--mocha-deep); }

.lp-back {
  display: inline-block; margin-bottom: 26px;
  font-size: 13.5px; color: var(--ink-mute);
}
.lp-back:hover { color: var(--ink); }
.lp-post-date {
  margin-top: 18px; font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute);
}

/* Rendered Markdown. The .lp-article rules already cover h2/p/code; these are
   the elements a post adds on top. */
.lp-prose { margin-top: 40px; }
.lp-prose h2:first-child { margin-top: 0; }
.lp-prose ul, .lp-prose ol { margin-top: 16px; padding-left: 20px; }
.lp-prose li { font-size: 16px; line-height: 1.72; color: var(--ink-soft); margin-top: 10px; }
.lp-prose li strong, .lp-prose p strong { color: var(--ink); font-weight: 600; }
.lp-prose table {
  margin-top: 22px; width: 100%; border-collapse: collapse;
  font-size: 15px; text-align: left;
}
.lp-prose th, .lp-prose td {
  padding: 11px 14px 11px 0; border-bottom: 1px solid var(--line);
  vertical-align: top; color: var(--ink-soft);
}
.lp-prose th {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-mute); font-weight: 400;
}
.lp-prose blockquote {
  margin-top: 20px; padding-left: 18px; border-left: 2px solid var(--mocha);
  color: var(--ink-soft);
}

/* ── blog teaser on the landing page ── */
.lp-latest { margin-top: 46px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.lp-latest-card {
  display: flex; flex-direction: column; gap: 10px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 16px; padding: 22px 20px;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.lp-latest-card:hover { border-color: var(--ink-mute); transform: translateY(-2px); }
.lp-latest-card span {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mocha);
}
.lp-latest-card h3 {
  font-family: var(--display); font-size: 17px; font-weight: 650;
  letter-spacing: -0.015em; line-height: 1.3;
}
.lp-latest-card p { font-size: 14px; line-height: 1.6; color: var(--ink-soft); }
.lp-latest-more { margin-top: 30px; text-align: center; }
@media (max-width: 860px) { .lp-latest { grid-template-columns: 1fr; } }
`;
