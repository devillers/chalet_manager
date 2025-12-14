// sanity/components/OwnerPortalLink.tsx
import React from "react";
import type { StringInputProps } from "sanity";
import { useFormValue } from "sanity";

export function OwnerPortalLink(props: StringInputProps) {
  const { renderDefault, elementProps } = props;

  // On lit les valeurs directement dans le formulaire
  const slug = useFormValue(["slug", "current"]) as string | undefined;
  const key = useFormValue(["ownerPortalKey"]) as string | undefined;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const url =
    slug && key
      ? `${baseUrl}/owner/${slug}?key=${key}`
      : "Renseigner le slug et la clé propriétaire";

  return (
    <div>
      {renderDefault({
        ...props,
        elementProps: {
          ...elementProps,
          readOnly: true,
        },
      })}

      <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{url}</p>
    </div>
  );
}
