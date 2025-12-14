// sanity/defaultDocumentNode.tsx
import {type DefaultDocumentNodeResolver} from 'sanity/structure'
import VillaPreviewPane from './components/VillaPreviewPane'

export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) => {
  if (schemaType === 'villa') {
    return S.document().views([
      S.view.form().title('Contenu'),
      S.view.component(VillaPreviewPane).title('Aperçu'),
    ])
  }
  return S.document()
}
