"use client";

import { usePathname } from "next/navigation";
//import { HeaderBar } from "../HeaderBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio");

  if (isStudio) {
    return <div className="fixed inset-0 overflow-hidden">{children}</div>;
  }

  return (
    <>
      {/* <HeaderBar /> */}
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-8">{children}</main>
    </>
  );
}
