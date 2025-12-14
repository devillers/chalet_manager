import { defineField, defineType } from "sanity";

export const villa = defineType({
  name: "villa",
  title: "Villa premium",
  type: "document",

  groups: [
    { name: "identity", title: "Identité", default: true },
    { name: "owner", title: "Propriétaire" },
    { name: "location", title: "Adresse" },
    { name: "capacity", title: "Capacité" },
    { name: "pricing", title: "Prix" },
    { name: "content", title: "Contenu" },
    { name: "gallery", title: "Galerie" },
  ],

  fields: [
    // IDENTITÉ ------------------------------------------------------------
    defineField({
      name: "name",
      title: "Nom du bien",
      type: "string",
      group: "identity",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "identity",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),

    // OWNER ---------------------------------------------------------------
    defineField({
      name: "ownerSite",
      title: "Propriétaire (ownerSite)",
      type: "reference",
      to: [{ type: "ownerSite" }],
      group: "owner",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "customDomain",
      title: "Nom de domaine personnalisé (optionnel)",
      type: "string",
      group: "owner",
      description: "ex : villa-exceptionnelle.com",
      validation: (Rule) =>
        Rule.custom((v) => {
          if (!v) return true;
          const ok = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(String(v).trim());
          return ok ? true : "Format attendu : domaine.tld (sans https://)";
        }),
    }),
    defineField({
      name: "availabilityIcalUrl",
      title: "Lien iCal (optionnel)",
      type: "url",
      group: "owner",
    }),

    // ADRESSE -------------------------------------------------------------
    defineField({
      name: "street",
      title: "Adresse (rue)",
      type: "string",
      group: "location",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "postalCode",
      title: "Code postal",
      type: "string",
      group: "location",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "city",
      title: "Ville",
      type: "string",
      group: "location",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "region",
      title: "Région / zone",
      type: "string",
      group: "location",
      description: "Par défaut: même valeur que la ville (si tu veux).",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "country",
      title: "Pays",
      type: "string",
      group: "location",
      initialValue: "France",
      validation: (Rule) => Rule.required(),
    }),

    // (optionnel) pour plus tard (géocodage)
    defineField({
      name: "location",
      title: "Localisation (geopoint) (optionnel)",
      type: "geopoint",
      group: "location",
    }),

    // CAPACITÉ ------------------------------------------------------------
    defineField({
      name: "maxGuests",
      title: "Voyageurs max",
      type: "number",
      group: "capacity",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "bedrooms",
      title: "Chambres",
      type: "number",
      group: "capacity",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "bathrooms",
      title: "Salles de bain",
      type: "number",
      group: "capacity",
      validation: (Rule) => Rule.required().min(1),
    }),

    // PRIX + MENAGE -------------------------------------------------------
    defineField({
      name: "cleaningIncluded",
      title: "Ménage",
      type: "boolean",
      group: "pricing",
      initialValue: false,
    }),
    defineField({
      name: "cleaningPrice",
      title: "Prix ménage (EUR)",
      type: "number",
      group: "pricing",
      validation: (Rule) =>
        Rule.custom((val, ctx: any) => {
          const cleaningIncluded = Boolean(ctx?.document?.cleaningIncluded);
          if (!cleaningIncluded) return true;
          return typeof val === "number" && val >= 0
            ? true
            : "Prix ménage requis si ménage = oui.";
        }),
    }),

    defineField({
      name: "priceMin",
      title: "Prix min / nuitée (EUR)",
      type: "number",
      group: "pricing",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "priceMax",
      title: "Prix max / nuitée (EUR) (optionnel)",
      type: "number",
      group: "pricing",
      validation: (Rule) =>
        Rule.min(0).custom((val, ctx: any) => {
          const min = ctx?.document?.priceMin;
          if (typeof val !== "number" || typeof min !== "number") return true;
          return val >= min ? true : "Le prix max doit être ≥ prix min.";
        }),
    }),

    // CONTENU -------------------------------------------------------------
    defineField({
      name: "shortDescription",
      title: "Description courte",
      type: "text",
      group: "content",
      rows: 3,
      validation: (Rule) => Rule.required().min(10),
    }),
    defineField({
      name: "longDescription",
      title: "Description longue",
      type: "text",
      group: "content",
      rows: 8,
      validation: (Rule) => Rule.required().min(50),
    }),

    defineField({
      name: "heroImage",
      title: "Hero image (optionnel)",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
      description: "Si vide, on peut fallback sur gallery[0] côté front.",
    }),

    // GALERIE -------------------------------------------------------------
    defineField({
      name: "gallery",
      title: "Galerie photos (max 20 via onboarding)",
      type: "array",
      group: "gallery",
      of: [
        {
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
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],

  preview: {
    select: {
      title: "name",
      media: "heroImage",
      city: "city",
      maxGuests: "maxGuests",
    },
    prepare({ title, media, city, maxGuests }) {
      return {
        title: title || "Sans nom",
        subtitle: [city, typeof maxGuests === "number" ? `${maxGuests} pers.` : null]
          .filter(Boolean)
          .join(" · "),
        media,
      };
    },
  },
});
