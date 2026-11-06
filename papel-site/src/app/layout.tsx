import type { Metadata, Viewport } from "next";
import { DM_Sans, Urbanist } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const display = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", weight: ["500", "600", "700", "800"] });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Papel Industries — L'hygiène au quotidien",
    template: "%s | Papel Industries",
  },
  description:
    "Papel Industries, entreprise guinéenne de produits d'hygiène et de transformation du papier. Découvrez les mouchoirs Papel Doux et devenez distributeur.",
  applicationName: "Papel Industries",
  openGraph: {
    type: "website",
    locale: "fr_GN",
    siteName: "Papel Industries",
    images: [{ url: "/images/papel-doux-table.jpg", width: 1400, height: 958, alt: "Mouchoirs Papel Doux" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#095146",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
