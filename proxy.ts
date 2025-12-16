// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { auth } from "@/auth";

function redirectToLogin(req: NextRequest) {
  const url = new URL("/login", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const proxy = auth(async (req) => {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  const pathname = req.nextUrl.pathname;

  // 1) Garde d'accès (admin / propriétaires / locataires)
  if (pathname !== "/login") {
    const role = req.auth?.user?.role;
    const userId = req.auth?.user?.id;

    const isProtected =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/studio") ||
      pathname.startsWith("/proprietaire/") ||
      pathname.startsWith("/locataire/") ||
      pathname.startsWith("/redirect");

    if (isProtected && (!role || !userId)) return redirectToLogin(req);

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/redirect", req.url));
    }

    if (pathname.startsWith("/studio") && role !== "admin") {
      return NextResponse.redirect(new URL("/redirect", req.url));
    }

    if (pathname.startsWith("/proprietaire/")) {
      if (role !== "admin") {
        const id = pathname.split("/")[2] || "";
        if (role !== "owner" || id !== userId) {
          return NextResponse.redirect(new URL("/redirect", req.url));
        }
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/locataire/")) {
      if (role !== "admin") {
        const id = pathname.split("/")[2] || "";
        if (role !== "tenant" || id !== userId) {
          return NextResponse.redirect(new URL("/redirect", req.url));
        }
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/redirect")) {
      // page interne de routage: autorisée si connecté
      return NextResponse.next();
    }
  }

  // 2) Routing custom domain -> /sites/[slug]
  // ignore les routes système / internes (pas de rewrite)
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/carte") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/proprietaire") ||
    pathname.startsWith("/locataire") ||
    pathname.startsWith("/redirect") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const query = `
    *[_type == "villa" && customDomain == $host][0]{
      "slug": slug.current
    }
  `;

  const match = await client.fetch<{ slug?: string } | null>(query, { host });

  if (match?.slug) {
    const url = req.nextUrl.clone();
    const target = `/sites/${match.slug}`;
    if (url.pathname === target) return NextResponse.next();
    url.pathname = target;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
});

// matcher recommandé en Next.js 15+
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
