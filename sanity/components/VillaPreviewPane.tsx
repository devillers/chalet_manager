"use client";

import { useMemo } from "react";
import { Box, Card, Text } from "@sanity/ui";

const RAW_BASE =
  process.env.NEXT_PUBLIC_STUDIO_PREVIEW_URL || "http://localhost:3000";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function toDomainUrl(input?: string) {
  const v = (input || "").trim();
  if (!v) return null;

  // Si l’utilisateur met déjà https://...
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // Domaine simple: doit contenir au moins un point
  const looksLikeDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v);
  if (!looksLikeDomain) return null;

  return `https://${v}`;
}

export default function VillaPreviewPane(props: any) {
  const displayed = props?.document?.displayed;

  const slug = displayed?.slug?.current as string | undefined;
  const customDomain = displayed?.customDomain as string | undefined;

  const url = useMemo(() => {
    const base = normalizeBaseUrl(RAW_BASE);
    const domainUrl = toDomainUrl(customDomain);

    if (domainUrl) return domainUrl;
    if (slug) return `${base}/sites/${encodeURIComponent(slug)}`;
    return base;
  }, [slug, customDomain]);

  if (!displayed) {
    return (
      <Card padding={4} radius={3}>
        <Text size={1}>Chargement…</Text>
      </Card>
    );
  }

  if (!slug && !customDomain) {
    return (
      <Card padding={4} radius={3} tone="caution">
        <Text size={1}>
          Renseigne un <b>slug</b> (ou un <b>domaine</b>) pour afficher l’aperçu.
        </Text>
      </Card>
    );
  }

  return (
    <Box style={{ height: "100%" }}>
      <iframe
        title="Aperçu"
        src={url}
        style={{ width: "100%", height: "100%", border: 0, borderRadius: 12 }}
      />
    </Box>
  );
}
