// sanity/structure.ts
import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenu")
    .items([
      S.listItem()
        .title("Villas premium")
        .child(
          S.documentTypeList("villa")
            .title("Villas premium")
            .defaultLayout("detail")
            .defaultOrdering([{ field: "_updatedAt", direction: "desc" }])
        ),

      S.divider(),

      S.documentTypeListItem("blogPost").title("Articles"),
      S.documentTypeListItem("blogCategory").title("Catégories"),
      S.documentTypeListItem("ownerSite").title("Owner sites"),
    ]);
