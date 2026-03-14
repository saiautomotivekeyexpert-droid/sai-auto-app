import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { JobsProvider } from "@/context/JobsContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Sai Auto Key Works | E-KYC Registry",
  description: "Secure Digital Registry & Locksmithing Compliance",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <SettingsProvider>
          <JobsProvider>
            {children}
          </JobsProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
