import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
  Playpen_Sans_Hebrew,
  Space_Grotesk,
} from "next/font/google";
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
  title: "snapp — bookmarks that brief your coding agent",
  description:
    "Save the sites you wish you'd made, tag what to borrow from each, and snapp writes one design brief your coding agent can actually follow.",
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
      </body>
    </html>
  );
}
