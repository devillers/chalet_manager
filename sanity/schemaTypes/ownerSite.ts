import { defineField, defineType } from "sanity";
import { OwnerPortalLink } from "../components/OwnerPortalLink";

export default defineType({
  name: "ownerSite",
  title: "Site propriétaire",
  type: "document",

  groups: [
    { name: "owner", title: "Propriétaire", default: true },
    { name: "site", title: "Site (optionnel)" },
    { name: "access", title: "Accès" },
  ],

  fields: [
    // OWNER (Step 1) -------------------------------------------------------
    defineField({
      name: "ownerFirstName",
      title: "Prénom",
      type: "string",
      group: "owner",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "ownerLastName",
      title: "Nom",
      type: "string",
      group: "owner",
      validation: (Rule) => Rule.required(),
    }),

    // compat / affichage (auto rempli par l’API)
    defineField({
      name: "ownerName",
      title: "Nom complet (auto)",
      type: "string",
      group: "owner",
      readOnly: true,
      description: "Rempli automatiquement à partir de Prénom + Nom.",
    }),

    defineField({
      name: "ownerBirthDate",
      title: "Date de naissance",
      type: "date",
      group: "owner",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "ownerMainAddress",
      title: "Adresse principale",
      type: "text",
      group: "owner",
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "ownerEmail",
      title: "Email",
      type: "string",
      group: "owner",
      validation: (Rule) => Rule.required().email().warning("Email invalide"),
    }),
    defineField({
      name: "ownerPhone",
      title: "Téléphone",
      type: "string",
      group: "owner",
      validation: (Rule) => Rule.required(),
    }),

    // ACCESS --------------------------------------------------------------
    defineField({
      name: "slug",
      title: "Slug propriétaire (URL /owner/[slug])",
      type: "slug",
      group: "access",
      options: {
        source: (doc: any) =>
          `${doc?.ownerFirstName ?? ""} ${doc?.ownerLastName ?? ""}`.trim() ||
          "owner",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "ownerPortalKey",
      title: "Clé d’accès propriétaire",
      type: "string",
      group: "access",
      description: "Utilisée dans /owner/[slug]?key=...",
      initialValue: () =>
        `owner-${Math.random().toString(36).slice(2, 10)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "ownerPortalUrl",
      title: "Lien propriétaire",
      type: "string",
      group: "access",
      description: "URL à envoyer au propriétaire",
      readOnly: true,
      components: { input: OwnerPortalLink },
    }),

    // SITE (optionnel) ----------------------------------------------------
    defineField({
      name: "title",
      title: "Nom du chalet / site (optionnel)",
      type: "string",
      group: "site",
    }),
    defineField({
      name: "location",
      title: "Localisation (optionnel)",
      type: "string",
      group: "site",
    }),
    defineField({
      name: "heroImage",
      title: "Image principale (optionnel)",
      type: "image",
      group: "site",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "shortDescription",
      title: "Description courte (optionnel)",
      type: "text",
      group: "site",
      rows: 3,
    }),
    defineField({
      name: "siteUrl",
      title: "URL du site propriétaire (optionnel)",
      type: "url",
      group: "site",
    }),
  ],

  preview: {
    select: {
      first: "ownerFirstName",
      last: "ownerLastName",
      subtitle: "ownerEmail",
      media: "heroImage",
    },
    prepare({ first, last, subtitle, media }) {
      return {
        title: [first, last].filter(Boolean).join(" ") || "Propriétaire",
        subtitle,
        media,
      };
    },
  },
});
