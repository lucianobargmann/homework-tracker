import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetaCTO Homework Tracker",
  description: "Secure platform for coding assignment submissions and candidate evaluation. Track progress, review submissions, and manage technical assessments.",
  keywords: "coding assessment, technical interview, candidate evaluation, homework tracker, MetaCTO",
  authors: [{ name: "MetaCTO", url: "https://metacto.com" }],
  creator: "MetaCTO",
  publisher: "MetaCTO",
  applicationName: "MetaCTO Homework Tracker",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: "noindex, nofollow", // Private admin tool
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://homework.metacto.com",
    title: "MetaCTO Homework Tracker",
    description: "Secure platform for coding assignment submissions and candidate evaluation. Track progress, review submissions, and manage technical assessments.",
    siteName: "MetaCTO Homework Tracker",
    images: [
      {
        url: "https://homework.metacto.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "MetaCTO Homework Tracker - Coding Assignment Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MetaCTO Homework Tracker",
    description: "Secure platform for coding assignment submissions and candidate evaluation.",
    site: "@metacto",
    creator: "@metacto",
    images: ["https://homework.metacto.com/og-image.png"],
  },
  verification: {
    google: "your-google-site-verification-code",
  },
  alternates: {
    canonical: "https://homework.metacto.com",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
