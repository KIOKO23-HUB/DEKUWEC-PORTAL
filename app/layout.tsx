import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#06382a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app"),
  title: "DEKUWEC Portal - Dedan Kimathi Wildlife & Environmental Club",
  description: "Official membership portal for the Dedan Kimathi Wildlife and Environmental Club",
  manifest: "/manifest.json",
  openGraph: {
    siteName: "DEKUWEC",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "DEKUWEC" }],
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DEKUWEC",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-canvas text-ink">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
