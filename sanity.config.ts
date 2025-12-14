'use client'

/**
 * Sanity Studio config mounted on `/app/studio/[[...tool]]/page.tsx`
 */

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { apiVersion, dataset, projectId } from './sanity/env'
import { schema } from './sanity/schemaTypes'
import { structure } from './sanity/structure'
import { defaultDocumentNode } from './sanity/defaultDocumentNode'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({ structure, defaultDocumentNode }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
