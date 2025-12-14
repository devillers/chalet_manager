// app/sites/_components/GalleryPreview.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Villa } from "./villa-types"

interface GalleryPreviewProps {
  villa: Villa
}

export function GalleryPreview({ villa }: GalleryPreviewProps) {
  if (!villa.gallery || villa.gallery.length === 0) {
    return null
  }

  const mainImage = villa.gallery[0]
  const mainAlt = villa.galleryAlt?.[0] ?? villa.name
  const thumbs = villa.gallery.slice(1, 5)

  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const total = villa.gallery.length

  const openLightbox = (index = 0) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }

  const closeLightbox = () => setIsOpen(false)

  const showNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total)
  }

  const showPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }

  return (
    <section aria-labelledby="apercu-propriete">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="apercu-propriete"
            className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
          >
            Aperçu de la propriété
          </h2>

          <Link
            href="#galerie"
            onClick={(e) => {
              e.preventDefault()
              openLightbox(0)
            }}
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#bd9254] hover:text-[#bd9254]"
          >
            Voir ({villa.gallery.length})
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 
          Sur mobile : 1 colonne (grande photo, puis les 4 petites en dessous)
          Sur desktop (lg): 2 colonnes (grande à gauche, 4 petites à droite)
        */}
        <div
          id="galerie"
          className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:h-[360px]"
        >
          {/* Grande image */}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-200 lg:h-full lg:aspect-auto"
          >
            <Image
              src={mainImage}
              alt={mainAlt}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </button>

          {/* 4 petites images
              - Mobile : elles viennent en dessous (car grille parent 1 colonne)
              - Desktop : colonne droite, grille 2x2 qui remplit la hauteur
          */}
          <div className="grid grid-cols-2 gap-4 lg:h-full lg:grid-rows-2">
            {thumbs.map((src, index) => (
              <button
                type="button"
                key={`${src}-${index}`}
                onClick={() => openLightbox(index + 1)} // +1 car 0 = mainImage
                className={`relative overflow-hidden rounded-2xl bg-slate-200 
                  aspect-4/3 lg:h-full lg:aspect-auto
                  ${thumbs.length === 3 && index === 2 ? "lg:col-span-2" : ""}
                `}
              >
                <Image
                  src={src}
                  alt={villa.galleryAlt?.[index + 1] ?? villa.name}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal centré, avec marges, fermeture OK mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox} // clic sur le fond noir = fermer
        >
          <div
            className="relative mx-4 w-full max-w-5xl rounded-3xl bg-black/30 p-3 sm:mx-6 sm:p-4 lg:mx-10 backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()} // empêcher la fermeture quand on clique sur la carte
          >
            {/* Fermer */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Précédent */}
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Image centrale */}
            <div className="relative mx-auto h-[60vh] w-full max-w-4xl overflow-hidden rounded-2xl">
              <Image
                src={villa.gallery[currentIndex]}
                alt={villa.galleryAlt?.[currentIndex] ?? villa.name}
                fill
                className="object-contain"
              />
            </div>

            {/* Suivant */}
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
