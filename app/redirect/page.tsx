import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const revalidate = 0;

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

function canAccessPath(pathname: string, role: string, id: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/studio")) {
    return role === "admin";
  }
  if (pathname.startsWith("/proprietaire/")) {
    const targetId = pathname.split("/")[2] || "";
    return role === "admin" || (role === "owner" && targetId === id);
  }
  if (pathname.startsWith("/locataire/")) {
    const targetId = pathname.split("/")[2] || "";
    return role === "admin" || (role === "tenant" && targetId === id);
  }
  return true;
}

export default async function RedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, id } = session.user;

  const resolvedSearchParams = await (searchParams ?? Promise.resolve({} as { from?: string }));
  const from = resolvedSearchParams.from;
  if (from && isSafeInternalPath(from) && from !== "/login" && from !== "/redirect" && canAccessPath(from, role, id)) {
    redirect(from);
  }

  if (role === "admin") redirect("/admin");
  if (role === "owner") redirect(`/proprietaire/${encodeURIComponent(id)}`);
  if (role === "tenant") redirect(`/locataire/${encodeURIComponent(id)}`);

  redirect("/");
}
