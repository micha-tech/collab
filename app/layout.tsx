import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "V One Collab — Meet. Talk. Collaborate.",
    template: "%s · V One Collab",
  },
  description:
    "Create a meeting. Share the link. Join instantly. Simple video meetings with chat, screen sharing and collaboration — built for getting things done.",
  openGraph: {
    title: "V One Collab",
    description:
      "Simple video meetings built for getting things done.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <TooltipProvider delayDuration={0}>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}