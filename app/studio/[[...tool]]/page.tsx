// app/studio/[[...tool]]/page.tsx
"use client";

import { useSyncExternalStore } from "react";
import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {}, // subscribe noop
    () => true,     // client snapshot
    () => false     // server snapshot
  );
}

export default function StudioPage() {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <NextStudio config={config} />;
}
