// app/sites/_components/GoogleMapsEmbed.tsx
"use client";





import Map, { Marker } from "react-map-gl/mapbox";

type MapboxMapProps = {
  lat: number;
  lng: number;
  name: string;
  className?: string;
};

function isValidLatLng(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function MapboxMap({ lat, lng, name, className }: MapboxMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // 1) Token absent => pas de map
  if (!token) return null;

  // 2) Coordonnées invalides => pas de map (évite un rendu cassé)
  if (!isValidLatLng(lat, lng)) return null;

  return (
    <div className={className ?? "h-full w-full"}>
      <Map
        mapboxAccessToken={token}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 14.5 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        attributionControl={false}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
        onError={(e) => {
          // utile en dev si token / style / CSP
          console.error("Mapbox error:", e.error);
        }}
      >
        <Marker latitude={lat} longitude={lng} anchor="bottom">
          <div
            aria-label={`Localisation de ${name}`}
            className="relative h-4 w-4 rounded-full bg-black shadow-md ring-4 ring-white"
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
