import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
  Playpen_Sans_Hebrew,
  Space_Grotesk,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playpen = Playpen_Sans_Hebrew({
  variable: "--font-playpen",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.usesnapp.app"
  ),
  title: "snapp — give your coding agent taste",
  description:
    "For people building with Cursor, Claude Code, v0 and Lovable. Save the sites you wish you'd made, tag what to borrow from each, and snapp writes one design guide your agent actually follows.",
  openGraph: {
    title: "snapp — give your coding agent taste",
    description:
      "For people building with Cursor, Claude Code, v0 and Lovable. Save the sites you wish you'd made, tag what to borrow from each, and snapp writes one design guide your agent actually follows.",
    url: "/",
    siteName: "snapp",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "snapp — give your coding agent taste",
    description:
      "For people building with Cursor, Claude Code, v0 and Lovable. Save the sites you wish you'd made, tag what to borrow from each, and snapp writes one design guide your agent actually follows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playpen.variable} ${spaceGrotesk.variable} ${bricolage.variable} antialiased`}
      >
        {children}
        {/* Page views and referrers — without this every copy and layout
            decision on the marketing pages is unfalsifiable. */}
        <Analytics />
      </body>
    </html>
  );
}
