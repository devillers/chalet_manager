// sanity/schemaTypes/index.ts
import type { SchemaTypeDefinition } from "sanity";
import ownerSite from "./ownerSite";
import { villa } from "./villa";
import { blogPost } from "./blogPost";
import { blogCategory } from "./blogCategory";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [ownerSite, villa, blogCategory, blogPost],
};
