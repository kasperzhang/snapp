"use client";

import { useState } from "react";
import { Eye, ImageIcon } from "lucide-react";
import { useEmbeddable, useSnappExtension } from "@/hooks";
import { cn } from "@/lib/utils/cn";

interface PreviewPanelProps {
  url: string;
  screenshotUrl: string | null;
}

export function PreviewPanel({ url, screenshotUrl }: PreviewPanelProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  /* Live or screenshot isn't a choice the reader can make — nobody knows from
     the outside whether a site permits framing, and the iframe can't tell us
     either (a refused frame still fires onLoad, never onError). So we ask the
     same way the grid does: the extension strips the refusing headers, and
     without it the server probes them. Undefined means the probe hasn't
     answered yet, and we keep the screenshot until it does. */
  const hasExtension = useSnappExtension();
  const embeddable = useEmbeddable(hasExtension ? [] : [url]);
  const live = hasExtension || embeddable[url] === true;

  // A new frame has to fade in again rather than inheriting the last one's
  // opacity. State-during-render, per React's derived-state docs.
  const [liveLast, setLiveLast] = useState(live);
  if (live !== liveLast) {
    setLiveLast(live);
    if (!live) setIframeLoaded(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* What you're looking at. Live or screenshot isn't a choice the reader
          gets to make, so this is a label, not a control. */}
      <div className="flex items-center gap-1.5 mb-3 px-1 text-xs font-medium text-[var(--text-secondary)]">
        {live ? (
          <>
            <Eye className="w-3 h-3" />
            Live page
          </>
        ) : (
          <>
            <ImageIcon className="w-3 h-3" />
            Screenshot
          </>
        )}
      </div>

      {/* Preview area. The screenshot is the base layer and the live frame is
          painted over it once loaded — same arrangement as the cards, so a
          framed site never shows an empty box while it boots and a site that
          refuses framing simply keeps the picture it already had. */}
      <div className="flex-1 relative bg-[var(--border)] rounded-lg overflow-hidden min-h-[300px]">
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Website screenshot"
            className="w-full h-full object-contain"
          />
        ) : (
          !live && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <ImageIcon className="w-10 h-10 text-[var(--text-secondary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                This site can&apos;t be shown live.
                <br />
                Use Scan page on the right to capture it.
              </p>
            </div>
          )
        )}

        {live && (
          <iframe
            src={url}
            title="Website preview"
            className={cn(
              "absolute inset-0 w-full h-full border-0 transition-opacity duration-300",
              !iframeLoaded && "opacity-0"
            )}
            sandbox="allow-scripts allow-same-origin"
            onLoad={() => setIframeLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
