import OwnerDashboardClient from "./_components/OwnerDashboardClient";
import { buildMockOwnerPortalData } from "./_lib/mockOwnerData";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  // ownerSlug is now a static segment, so we mock a slug here.
  // Replace with real slug if you later convert to /dashboard/[ownerSlug]/page.js
  const slug = "owner-demo";

  const data = buildMockOwnerPortalData(slug);

  return (
    <OwnerDashboardClient
      owner={data.owner}
      properties={data.properties}
      reservations={data.reservations}
      initialMessages={data.messages}
      adminContact={data.adminContact}
    />
  );
}
