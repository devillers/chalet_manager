// app/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { groq } from "next-sanity";
import { client } from "@/sanity/lib/client";

type BlogCategory = {
  slug: string;
  title: string;
};

type BlogPostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingTime?: string;
  tags?: string[];
  category?: BlogCategory | null;
  coverImage?: { url?: string; alt?: string } | null;
};

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog & Guides | Chalet Manager",
  description:
    "Guides destinations, conciergerie et investissement pour optimiser vos séjours et vos locations de chalets premium.",
  openGraph: {
    title: "Blog & Guides | Chalet Manager",
    description:
      "Guides destinations, conciergerie et investissement pour optimiser vos séjours et vos locations de chalets premium.",
    url: "/blog",
    type: "website",
  },
  alternates: { canonical: "/blog" },
};

const CATEGORIES_QUERY = groq`*[_type=="blogCategory"] | order(title asc) {
  "slug": slug.current,
  title
}`;

const POSTS_QUERY = groq`*[_type=="blogPost" && defined(slug.current) && (!defined($category) || category->slug.current == $category)]
  | order(publishedAt desc)[0...30] {
    "id": _id,
    title,
    excerpt,
    publishedAt,
    readingTime,
    tags,
    "slug": slug.current,
    "category": category->{ "slug": slug.current, title },
    "coverImage": {
      "url": coverImage.asset->url,
      "alt": coalesce(coverImage.alt, title)
    }
  }
`;

function formatDate(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" });
}

export default async function BlogPage(props: { searchParams?: Promise<{ category?: string }> | { category?: string } }) {
  const params = await Promise.resolve(props.searchParams || {});
  const activeCategory = params.category || "";

  const [categories, posts] = await Promise.all([
    client.fetch<BlogCategory[]>(CATEGORIES_QUERY),
    client.fetch<BlogPostCard[]>(POSTS_QUERY, { category: activeCategory || null }),
  ]);

  const activeCategoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.title
    : undefined;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:py-14">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blog & Guides</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Inspirations, conciergerie, investissement
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Sélectionne une catégorie ou parcours nos articles pour optimiser tes séjours, tes services ou la rentabilité de ton bien.
          </p>
        </div>

        {/* Breadcrumb simple */}
        <nav className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-amber-700">Accueil</Link>
            </li>
            <li className="text-slate-400">/</li>
            <li>
              <Link href="/blog" className="hover:text-amber-700">Blog</Link>
            </li>
            {activeCategoryName ? (
              <>
                <li className="text-slate-400">/</li>
                <li className="text-slate-800">{activeCategoryName}</li>
              </>
            ) : null}
          </ol>
        </nav>

        {/* Catégories */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
              !activeCategory ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Toutes
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog?category=${cat.slug}`}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                activeCategory === cat.slug
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
              prefetch={false}
              aria-label={`Filtrer par ${cat.title}`}
            >
              {cat.title}
            </Link>
          ))}
        </div>

        {/* Grille d’articles */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg"
            >
              {post.coverImage?.url ? (
                <div className="relative w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage.url}
                    alt={post.coverImage.alt || post.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col justify-between p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <span>{post.category?.title ?? ""}</span>
                    <span className="text-slate-400 text-[9px]">{formatDate(post.publishedAt)}</span>
                  </div>
                  <h2 className="text-lg font-thin uppercase text-slate-900">{post.title}</h2>
                  <p className="text-[13px] leading-relaxed text-justify text-slate-600">{post.excerpt}</p>
                  {post.tags && post.tags.length ? (
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 ring-1 ring-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{post.readingTime || ""}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 hover:text-amber-800"
                  >
                    Lire l’article
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-100">
              Aucun article dans cette catégorie pour le moment.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
