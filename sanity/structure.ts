// sanity/structure.ts
import {type StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.documentTypeList('villa')
    .title('Villas premium')
    .defaultLayout('detail') // layouts supportés: "default" | "detail" :contentReference[oaicite:0]{index=0}
    .defaultOrdering([{field: '_updatedAt', direction: 'desc'}])
