import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/ui/ServiceWorkerRegister";
import { SecurityProtector } from "@/ui/SecurityProtector";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ink-of-the-forgotten-path.pages.dev"),
  title: "Ink of the Forgotten Path — A Murim Souls-like",
  description:
    "A browser-native, single-player Murim story game. Low-poly ink wash aesthetic. Restore your broken meridian core. Face the Five Calamities.",
  keywords: [
    "murim",
    "souls-like",
    "browser game",
    "three.js",
    "low poly",
    "black and white",
    "martial arts",
    "cultivation",
    "single player",
    "story game",
  ],
  authors: [{ name: "Animatrous" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  openGraph: {
    title: "Ink of the Forgotten Path — A Murim Souls-like",
    description: "A browser-native, single-player Murim story-game with a low-poly ink wash aesthetic. Restore your core and survive.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "Ink of the Forgotten Path Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ink of the Forgotten Path — A Murim Souls-like",
    description: "A browser-native, single-player Murim story-game.",
    images: ["/og-image.png"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        <SecurityProtector />
        {children}
      </body>
    </html>
  );
}
