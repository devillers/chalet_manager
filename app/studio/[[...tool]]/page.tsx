// app/studio/[[...tool]]/page.tsx
"use client";

import dynamic from "next/dynamic";
import config from "@/sanity.config";
import { useEffect } from "react";

// Load NextStudio only on the client to avoid passing any unsupported props to DOM
const Studio = dynamic(
  () => import("next-sanity/studio").then((m) => m.NextStudio),
  { ssr: false }
);

const ORIGINAL_CONSOLE_ERROR = console.error;
let isPatched = false;

function shouldIgnoreStudioConsoleError(args: unknown[]) {
  const message = args
    .map((arg) => (typeof arg === "string" ? arg : ""))
    .join(" ");
  return (
    message.includes("flushSync was called from inside a lifecycle method") ||
    message.includes("does not recognize the `disableTransition` prop")
  );
}

function patchConsoleErrorForStudio() {
  if (isPatched || process.env.NODE_ENV !== "development") return;
  isPatched = true;
  console.error = (...args: unknown[]) => {
    if (shouldIgnoreStudioConsoleError(args)) return;
    ORIGINAL_CONSOLE_ERROR(...(args as Parameters<typeof console.error>));
  };
}

function restoreConsoleErrorForStudio() {
  if (!isPatched) return;
  console.error = ORIGINAL_CONSOLE_ERROR;
  isPatched = false;
}

patchConsoleErrorForStudio();

export default function StudioPage() {
  useEffect(() => {
    return () => {
      restoreConsoleErrorForStudio();
    };
  }, []);

  return <Studio config={config} />;
}
