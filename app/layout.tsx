import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const fontSans = Roboto({
  variable: "--font-sans-roboto",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono-geist",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
