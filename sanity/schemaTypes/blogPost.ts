import { defineField, defineType } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "Article (Blog)",
  type: "document",
  // Autoriser uniquement les admins à créer/mettre à jour/supprimer
  access: {
    create: ({ currentUser }) => currentUser?.roles?.some((r) => r.name === "administrator") ?? false,
    update: ({ currentUser }) => currentUser?.roles?.some((r) => r.name === "administrator") ?? false,
    delete: ({ currentUser }) => currentUser?.roles?.some((r) => r.name === "administrator") ?? false,
  },
  fields: [
    defineField({
      name: "title",
      title: "Titre",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Accroche (meta / listing)",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().max(320),
    }),
    defineField({
      name: "coverImage",
      title: "Image de couverture",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Catégorie",
      type: "reference",
      to: [{ type: "blogCategory" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "body",
      title: "Contenu (texte)",
      type: "text",
      rows: 20,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "publishedAt",
      title: "Date de publication",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "readingTime",
      title: "Temps de lecture (ex: 5 min)",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "coverImage",
      category: "category.title",
    },
    prepare({ title, media, category }) {
      return {
        title: title || "Sans titre",
        subtitle: category || "",
        media,
      };
    },
  },
});

export default blogPost;
