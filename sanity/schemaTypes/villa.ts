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
    { name: "surroundings", title: "Alentours" },
    { name: "info", title: "Infos & conciergerie" },
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

    defineField({
      name: "pricingCalendars",
      title: "Grille tarifaire (par année) (optionnel)",
      type: "array",
      group: "pricing",
      of: [
        {
          type: "object",
          name: "pricingCalendar",
          title: "Année",
          fields: [
            defineField({
              name: "year",
              title: "Année",
              type: "number",
              validation: (Rule) => Rule.required().integer().min(2000).max(2100),
            }),
            defineField({
              name: "defaultNightlyPrice",
              title: "Prix par défaut / nuit (EUR)",
              type: "number",
              validation: (Rule) => Rule.required().integer().min(0),
            }),
            defineField({
              name: "overrides",
              title: "Périodes (prix / nuit)",
              type: "array",
              of: [
                {
                  type: "object",
                  name: "pricingOverride",
                  title: "Période",
                  fields: [
                    defineField({
                      name: "from",
                      title: "Du",
                      type: "date",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "to",
                      title: "Au",
                      type: "date",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "nightlyPrice",
                      title: "Prix / nuit (EUR)",
                      type: "number",
                      validation: (Rule) => Rule.required().integer().min(0),
                    }),
                  ],
                  preview: {
                    select: { from: "from", to: "to", nightlyPrice: "nightlyPrice" },
                    prepare({ from, to, nightlyPrice }: any) {
                      return {
                        title: `${from ?? "—"} → ${to ?? "—"}`,
                        subtitle:
                          typeof nightlyPrice === "number"
                            ? `${nightlyPrice.toLocaleString("fr-FR")} € / nuit`
                            : "—",
                      };
                    },
                  },
                },
              ],
              validation: (Rule) => Rule.min(0),
            }),
          ],
          preview: {
            select: { year: "year", defaultNightlyPrice: "defaultNightlyPrice", overrides: "overrides" },
            prepare({ year, defaultNightlyPrice, overrides }: any) {
              const count = Array.isArray(overrides) ? overrides.length : 0;
              const base =
                typeof defaultNightlyPrice === "number"
                  ? `${defaultNightlyPrice.toLocaleString("fr-FR")} € / nuit`
                  : "—";
              return {
                title: year ? `Tarifs ${year}` : "Tarifs (année)",
                subtitle: `${base}${count ? ` • ${count} périodes` : ""}`,
              };
            },
          },
        },
      ],
      validation: (Rule) => Rule.min(0),
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

    // Listes simples pilotées par l’onboarding
    defineField({
      name: "quickHighlights",
      title: "Incontournables (highlights)",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "keyAmenities",
      title: "Équipements clés (amenities)",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.min(0),
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

    // ALENTOURS -----------------------------------------------------------
    defineField({
      name: "surroundingsIntro",
      title: "Accroche / introduction",
      type: "text",
      rows: 3,
      group: "surroundings",
    }),
    defineField({
      name: "environmentType",
      title: "Type d'environnement",
      type: "string",
      group: "surroundings",
    }),
    defineField({
      name: "distances",
      title: "Distances",
      type: "array",
      group: "surroundings",
      of: [
        defineField({
          name: "distanceItem",
          type: "object",
          fields: [
            { name: "label", type: "string", title: "Label" },
            { name: "duration", type: "string", title: "Durée" },
            { name: "by", type: "string", title: "Moyen", options: { list: ["car", "walk", "boat"] } },
          ],
        }),
      ],
    }),

    // INFOS & CONCIERGERIE -----------------------------------------------
    defineField({
      name: "goodToKnow",
      title: "Bon à savoir",
      type: "array",
      group: "info",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "conciergeSubtitle",
      title: "Sous-titre conciergerie",
      type: "string",
      group: "info",
    }),
    defineField({
      name: "conciergePoints",
      title: "Points conciergerie",
      type: "array",
      group: "info",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "extraInfo",
      title: "Informations supplémentaires",
      type: "array",
      group: "info",
      of: [{ type: "string" }],
    }),

    // TÉMOIGNAGES ---------------------------------------------------------
    defineField({
      name: "testimonials",
      title: "Témoignages",
      type: "array",
      group: "info",
      of: [
        defineField({
          name: "testimonial",
          type: "object",
          fields: [
            { name: "name", type: "string", title: "Nom" },
            { name: "date", type: "string", title: "Date" },
            { name: "text", type: "text", title: "Texte", rows: 3 },
            { name: "rating", type: "number", title: "Note (0-5)" },
          ],
        }),
      ],
    }),

    // SIMILAR VILLAS ------------------------------------------------------
    defineField({
      name: "similarVillas",
      title: "Villas similaires",
      type: "array",
      group: "content",
      of: [
        defineField({
          name: "similarVillaLink",
          type: "object",
          fields: [
            defineField({
              name: "relatedVilla",
              title: "Villa liée",
              type: "reference",
              to: [{ type: "villa" }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: "extraPersonsBadge", title: "Badge personnes supplémentaires", type: "string" }),
            defineField({ name: "periodSuggestion", title: "Suggestion de période", type: "string" }),
          ],
        }),
      ],
      validation: (Rule) => Rule.min(0),
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
