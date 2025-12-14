# SANITY NEXT JS — Chalet Manager (Portail propriétaires & pages villas)

Application **Next.js 15 (App Router)** connectée à **Sanity** pour gérer et publier des **landing pages de villas/chalets premium** (contenu, médias, SEO) + un **portail propriétaire** (accès par clé) + des **endpoints API** (ex: export iCal). Le Studio Sanity est **embarqué directement dans l’app** via une route `/studio`.

---

## Objectif du projet

- Centraliser la gestion des contenus “villa” dans **Sanity** (texte, images, informations pratiques).
- Générer des pages publiques propres, performantes et orientées conversion.
- Proposer une page “owner” dédiée (portail propriétaire) pour afficher des informations spécifiques ou faciliter la validation du contenu.
- Exposer des routes API utiles (ex: calendrier `.ics`).

---

## Stack

- **Next.js 15** (App Router, Server Components)
- **TypeScript**
- **Tailwind CSS**
- **Sanity** (Content Lake + Studio)
- **next-sanity / GROQ**
- Cartographie : **Mapbox** (token public) + possibilité de basculer vers Google Maps si souhaité
- Images : **next/image** + `remotePatterns` pour `cdn.sanity.io`

---

## Fonctionnalités principales

### 1) Sanity Studio embarqué
- Studio accessible via : `GET /studio`
- Implémentation client-side (mount guard) pour éviter les problèmes SSR/hydratation.

Fichier clé :
- `app/studio/[[...tool]]/page.tsx`

---

### 2) Modèle de contenu “Villa”
Le schéma Sanity `villa` est la source de vérité pour :
- identité (nom, slug)
- propriétaire (nom/email)
- **clé d’accès propriétaire** (ex: `ownerPortalKey`)
- infos commerciales (prix min/max, max voyageurs, points conciergerie)
- localisation (adresse, éventuellement lat/lng)
- médias (hero + galerie + alts)

Fichier clé :
- `sanity/schemaTypes/villa.ts`

---

### 3) Pages “site/villa”
- Pages publiques de type landing premium.
- Rendu conditionnel : **si une info n’existe pas dans Sanity, elle n’est pas affichée** (objectif : zéro “placeholder” parasite).
- Composants UI dédiés (ex : `BookingSidebar`, `GalleryPreview`, sections de présentation, etc.)

Dossier clé :
- `app/sites/_components/*`

---

### 4) Portail propriétaire (accès par clé)
- URL type : `/owner/[slug]?key=...`
- Permet d’afficher une page associée à une villa (slug) avec contrôle par paramètre `key`.
- Gestion Next.js 15 : `params` et `searchParams` sont des Promises → nécessité de les “unwrap” (`await`) avant usage.

Fichier clé :
- `app/owner/[slug]/page.tsx`

> Note sécurité : un `key` en querystring est pratique pour un MVP, mais ne remplace pas une authentification robuste (NextAuth, accès par email magic-link, JWT signé, etc.).

---

### 5) Export calendrier iCal (.ics)
- Route API : `/api/villas/[slug]/calendar.ics`
- Objectif : fournir un flux calendrier exploitable par des outils externes (synchronisation, disponibilité, etc.).
- Compatible Next.js 15 : `ctx.params` doit être résolu (`await`) avant accès.

Fichier clé :
- `app/api/villas/[slug]/calendar.ics/route.ts`

---

## Structure (repères)

