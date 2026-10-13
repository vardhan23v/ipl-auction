import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const display = Oswald({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: { default: "IPL Mega Auction — Live Franchise Auction", template: "%s · IPL Auction" },
  description: "Ten franchises. ₹120 crore each. Right-To-Match cards. Bid live for the biggest names in the IPL pool.",
  openGraph: { title: "IPL Mega Auction — Live", description: "Ten franchises. One live auction. RTM cards in play.", siteName: "IPL Auction", type: "website" },
};
export const viewport = { themeColor: "#07090f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen"><Providers>{children}</Providers></body>
    </html>
  );
}
