// app/sites/_components/MapboxMap.tsx
"use client";

import Map, { Marker } from "react-map-gl/mapbox";

type MapboxMapProps = {
  lat: number;
  lng: number;
  name: string;
};

export function MapboxMap({ lat, lng, name }: MapboxMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) return null;

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{ latitude: lat, longitude: lng, zoom: 14.5 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      attributionControl={false}
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
  );
}
