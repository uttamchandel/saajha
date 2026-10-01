import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "Saajha state node — crop advice by voice, SMS and WhatsApp",
  description:
    "The farmer layer of a Saajha state node: crop advice over voice calls, SMS and WhatsApp in 12+ Indian languages, with photo diagnosis, crop recommendations, weather alerts and expert escalation. Farmer records stay in their state. Build with AI: Code for Communities, Edition 2 · PS-04 Agricultural Intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
