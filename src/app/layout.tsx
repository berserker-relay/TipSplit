import type { Metadata } from "next";
import Script from "next/script";
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
  title: "TipSplit — Hospitality-ready tip calculator",
  description:
    "Calculate tips, service charges, and per-person totals instantly while capturing insights for your hospitality operation.",
  metadataBase: new URL("https://tipsplit.app"),
  openGraph: {
    title: "TipSplit — Hospitality-ready tip calculator",
    description:
      "Modern bill intelligence for tipping, service charges, and BOH pools with exports and newsletter capture.",
    url: "https://tipsplit.app",
    siteName: "TipSplit",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "TipSplit calculator preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@tipsplit",
    title: "TipSplit — Hospitality-ready tip calculator",
    description:
      "Auto-calc tip splits, exports, and insights for modern hospitality teams.",
    images: ["https://tipsplit.app/og.png"],
  },
  alternates: {
    canonical: "https://tipsplit.app",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="https://plausible.io/js/script.js"
          data-domain="tipsplit.app"
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}
