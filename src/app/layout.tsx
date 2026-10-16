import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Papel ERP", template: "%s · Papel ERP" },
  description: "ERP de Papel Industries — Coyah, Guinée",
  applicationName: "Papel ERP",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Papel", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#07524d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
