import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

const description =
  "Uny, le passeport étudiant africain : carte étudiante digitale, réductions, jobs, stages, logements et marketplace réunis dans une seule application. Version pilote à Conakry.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Uny — Être étudiant a ses avantages", template: `%s · ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: [
    "étudiant",
    "Guinée",
    "Conakry",
    "carte étudiante",
    "réductions étudiantes",
    "jobs étudiants",
    "stages",
    "logement étudiant",
  ],
  openGraph: {
    type: "website",
    locale: "fr_GN",
    siteName: SITE_NAME,
    title: "Uny — Ton statut étudiant devient un avantage",
    description,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Uny — Ton statut étudiant devient un avantage",
    description,
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5733f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
