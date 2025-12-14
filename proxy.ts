// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const pathname = request.nextUrl.pathname;

  // ignore les routes système
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // 1) Sanity : on cherche une villa qui possède ce domaine
  const query = `
    *[_type == "villa" && customDomain == $host][0]{
      "slug": slug.current
    }
  `;

  const match = await client.fetch(query, { host });

  if (match?.slug) {
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${match.slug}`;
    return NextResponse.rewrite(url);
  }

  // aucun domaine assigné → site normal
  return NextResponse.next();
}

// matcher recommandé en Next.js 15+
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
