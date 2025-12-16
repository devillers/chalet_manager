"use client";

import { usePathname } from "next/navigation";
//import { HeaderBar } from "../HeaderBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio");
  const isFullScreen =
    isStudio ||
    pathname === "/login" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/proprietaire") ||
    pathname?.startsWith("/locataire") ||
    pathname?.startsWith("/carte");

  if (isStudio) {
    return <div className="fixed inset-0 overflow-hidden">{children}</div>;
  }

  if (isFullScreen) {
    return <div className="min-h-screen w-screen">{children}</div>;
  }

  return (
    <>
      {/* <HeaderBar /> */}
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-8">{children}</main>
    </>
  );
}
