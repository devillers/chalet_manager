// app/studio/[[...tool]]/page.tsx
"use client";

import dynamic from "next/dynamic";
import config from "@/sanity.config";

// Load NextStudio only on the client to avoid passing any unsupported props to DOM
const Studio = dynamic(
  () => import("next-sanity/studio").then((m) => m.NextStudio),
  { ssr: false }
);

export default function StudioPage() {
  return <Studio config={config} />;
}
