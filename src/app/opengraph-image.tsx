import { ImageResponse } from "next/og";

// The social share card for snapp. Rendered by next/og into a 1200×630 PNG at
// request time, so there's no binary asset to keep in the repo. Next wires this
// file into openGraph.images (and the twitter card) automatically.

export const alt = "snapp — bookmarks that guide your coding agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens, mirrored from globals.css so the card matches the app.
const PAPER = "#FBFAF7";
const INK = "#221C15";
const INK_SOFT = "#5C5346";
const MOCHA = "#8D6F4C";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "80px",
        }}
      >
        {/* Wordmark: mocha tile + name, echoing the sidebar/landing lockup. */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: MOCHA,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 34 34" fill="none">
              <path
                d="M31.6442 3.07696C32.622 3.22502 33.3448 4.06548 33.3448 5.05441L33.3448 18.8127L11.3252 16.6727L11.3252 4.9504e-07L31.6442 3.07696Z"
                fill="#FBFAF7"
              />
              <path
                d="M22.0196 16.6727L22.0196 33.347L1.70041 30.2685C0.72269 30.1204 0 29.28 0 28.2911L0 14.532L22.0196 16.6727Z"
                fill="#FBFAF7"
              />
            </svg>
          </div>
          <div style={{ fontSize: "44px", fontWeight: 700, color: INK }}>
            snapp
          </div>
        </div>

        {/* Headline + tagline. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.1,
              color: INK,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            Bookmarks that guide your coding agent.
          </div>
          <div style={{ fontSize: "32px", color: INK_SOFT, maxWidth: "860px" }}>
            Save the sites you admire, tag what to borrow, and get one design
            guide your agent can build from.
          </div>
        </div>

        <div style={{ fontSize: "26px", color: MOCHA, fontWeight: 600 }}>
          usesnapp.app
        </div>
      </div>
    ),
    { ...size }
  );
}
