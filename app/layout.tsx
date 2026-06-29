import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visual Coach · Gemma 4 on Cerebras",
  description:
    "Instant on-image visual guidance for anything — joints, parts, food, equipment — powered by Gemma 4 31B on Cerebras.",
  openGraph: {
    title: "Visual Coach · Gemma 4 on Cerebras",
    description:
      "Instant on-image visual guidance for photos and webcam frames, powered by Gemma 4 31B on Cerebras.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Visual Coach · Gemma 4 on Cerebras",
    description:
      "Instant on-image visual guidance for photos and webcam frames, powered by Gemma 4 31B on Cerebras.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
