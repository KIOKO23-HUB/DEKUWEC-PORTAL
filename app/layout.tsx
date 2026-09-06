import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEKUWEC Portal - Dedan Kimathi Wildlife & Environmental Club",
  description: "Official membership portal for the Dedan Kimathi Wildlife and Environmental Club",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className={`${inter.className} min-h-full flex flex-col bg-white text-gray-900`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
