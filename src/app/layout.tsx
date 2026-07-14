import type { Metadata } from "next";
import {
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

export const metadata: Metadata = {
  title: "snapp — turn the sites you love into one design system",
  description:
    "Save the sites that inspire you, pick what to borrow from each — type, color, motion, layout — and snapp fuses them into a single, buildable design guide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playpen.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
