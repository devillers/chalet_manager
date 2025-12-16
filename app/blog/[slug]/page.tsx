// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { groq } from "next-sanity";
import { client } from "@/sanity/lib/client";

type BlogPost = {
  title: string;
  excerpt: string;
  body: string;
  publishedAt?: string;
  readingTime?: string;
  tags?: string[];
  category?: { slug?: string; title?: string } | null;
  coverImage?: { url?: string; alt?: string } | null;
  slug: string;
};

type Params = { slug: string };

const POST_QUERY = groq`*[_type=="blogPost" && slug.current == $slug][0]{
  title,
  excerpt,
  body,
  publishedAt,
  readingTime,
  tags,
  "slug": slug.current,
  "category": category->{ "slug": slug.current, title },
  "coverImage": {
    "url": coverImage.asset->url,
    "alt": coalesce(coverImage.alt, title)
  }
}`;

const SLUGS_QUERY = groq`*[_type=="blogPost" && defined(slug.current)]{ "slug": slug.current }`;

function formatDate(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateStaticParams() {
  const docs = await client.fetch<{ slug: string }[]>(SLUGS_QUERY);
  return docs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = await params;
  const data = await client.fetch<BlogPost | null>(POST_QUERY, { slug: resolved.slug });
  if (!data) return { title: "Article non trouvé" };
  return {
    title: `${data.title} | Blog` || "Article | Blog",
    description: data.excerpt || data.title,
    openGraph: {
      title: data.title,
      description: data.excerpt,
      url: `/blog/${resolved.slug}`,
      type: "article",
      images: data.coverImage?.url ? [{ url: data.coverImage.url, alt: data.coverImage?.alt || data.title }] : undefined,
    },
    alternates: { canonical: `/blog/${resolved.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const data = await client.fetch<BlogPost | null>(POST_QUERY, { slug: resolved.slug });
  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-slate-600">Article introuvable.</p>
          <Link href="/blog" className="text-amber-700 hover:text-amber-800">Retour au blog</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:py-14">
        {/* Breadcrumb */}
        <nav className="text-xs uppercase tracking-[0.18em] text-slate-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-amber-700">Accueil</Link></li>
            <li className="text-slate-400">/</li>
            <li><Link href="/blog" className="hover:text-amber-700">Blog</Link></li>
            {data.category?.title ? (
              <>
                <li className="text-slate-400">/</li>
                <li><Link href={`/blog?category=${data.category.slug || ""}`} className="hover:text-amber-700">{data.category.title}</Link></li>
              </>
            ) : null}
            <li className="text-slate-400">/</li>
            <li className="text-slate-800">{data.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mt-6 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {data.category?.title || "Article"}
          </p>
          <h1 className="text-5xl font-thin tracking-tight text-slate-900">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{formatDate(data.publishedAt)}</span>
            {data.readingTime ? <span>• {data.readingTime}</span> : null}
          </div>
        </header>

        {data.coverImage?.url ? (
          <div className="mt-6 overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.coverImage.url}
              alt={data.coverImage.alt || data.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <article className="prose prose-slate text-sm text-justify leading-7 mt-8 max-w-none prose-h2:mt-8 prose-h2:text-2xl prose-p:leading-7">
            <h2 className="text-3xl font-thin tracking-tight text-slate-900 mb-8">{data.title}</h2>
          {data.body?.split(/\n\n+/).map((para, idx) => (
            <p className="text-[10px] text-justify leading-7" key={idx}>{para}</p>
          ))}
        </article>

        {data.tags && data.tags.length ? (
          <div className="mt-8 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.09em] text-slate-800">
            {data.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
