// app/page.tsx
import type { Metadata } from "next";
import HomeClient from "./_components/HomeClient";

const siteUrl = "https://careconciergeluxury.com";

export const metadata: Metadata = {
  title: "Gestion locative & conciergerie de luxe | Megève - Chamonix | Care Concierge Luxury",
  description:
    "Gestion locative haut de gamme et conciergerie privée pour villas et chalets d’exception à Megève, Chamonix et Haute-Savoie. Propriétaires et voyageurs premium.",
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Gestion locative & conciergerie de luxe | Care Concierge Luxury",
    description:
      "Services luxe pour family offices, propriétaires et voyageurs premium : gestion locative, conciergerie, expériences sur-mesure.",
    images: [
      {
        url: `${siteUrl}/og/home.jpg`,
        width: 1200,
        height: 630,
        alt: "Villa de luxe dans les Alpes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Care Concierge Luxury",
    description:
      "Gestion locative haut de gamme et conciergerie privée pour villas et chalets d’exception.",
    images: [`${siteUrl}/og/home.jpg`],
  },
};

export default function Page() {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Care Concierge Luxury",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      // Remplacer par vos URLs réelles
      "https://www.instagram.com/",
      "https://www.linkedin.com/",
      "https://www.facebook.com/",
    ],
    areaServed: ["Megève", "Chamonix", "Saint-Gervais-les-Bains", "Haute-Savoie"],
    serviceType: ["Rental Management", "Concierge", "Property Management"],
  };

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Care Concierge Luxury",
    url: siteUrl,
    image: `${siteUrl}/og/home.jpg`,
    priceRange: "€€€",
    areaServed: ["Megève", "Chamonix", "Haute-Savoie"],
    // address: { ... } // Optionnel si vous avez une adresse publique
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationLd, localBusinessLd]),
        }}
      />
      <HomeClient />
    </>
  );
}
