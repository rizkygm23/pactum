import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

// Single type family across the system (Inter stands in for abcNormal per
// DESIGN-runwayml.md); Plex Mono survives only for hashes/addresses/code.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pactum — Metered billing, settled in USDC on Arc",
  description:
    "Meter every API call off-chain, settle in batches on Arc, and hand your customer a receipt with a transaction hash on it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#030303",
              border: "1px solid #e7eaf0",
              borderRadius: "16px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
