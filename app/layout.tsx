import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

import AppShell from "./sites/_components/AppShell";
import { pattaya, roboto } from "./font";

export const metadata: Metadata = {
  title: "Chalet Manager – Portail propriétaires",
  description: "Portail centralisant toutes les landing pages des propriétaires.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${pattaya.variable} ${roboto.variable}`}>
      <body
        suppressHydrationWarning
        className={`${roboto.className} bg-slate-50 text-slate-900 antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
