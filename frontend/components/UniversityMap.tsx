"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { useLocale } from "@/lib/locale-context";
import type { UniversityMatch } from "@/lib/matching/universities";
import type { University } from "@/lib/types";

/**
 * Matched institutions on an OpenStreetMap base layer.
 *
 * Two deliberate choices:
 *
 *  - Markers are `divIcon`, not Leaflet's default image marker. The default
 *    resolves three PNGs by URL, which bundlers rewrite and which would then
 *    404 under the /masar-ai base path — the classic broken-marker bug. A
 *    styled div has no assets to lose and themes with the rest of the site.
 *  - The component is imported dynamically by its callers with `ssr: false`.
 *    Leaflet touches `window` at module scope, so importing it during the
 *    static export would fail the build.
 */

function markerIcon(colour: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:grid;place-items:center;
      width:26px;height:26px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${colour};color:#fff;
      font:600 10px/1 system-ui,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    "><span style="transform:rotate(45deg)">${label}</span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

/** Refits the viewport whenever the set of pins changes. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function UniversityMap({
  matches,
  universities,
  you,
  height = 460,
}: {
  matches?: UniversityMatch[];
  universities?: University[];
  you?: { lat: number; lng: number } | null;
  height?: number;
}) {
  const { locale, t } = useLocale();

  const pins = useMemo(() => {
    if (matches) {
      return matches.map((match) => ({
        university: match.university,
        distanceKm: match.distanceKm,
      }));
    }
    return (universities ?? []).map((university) => ({ university, distanceKm: null }));
  }, [matches, universities]);

  const points = useMemo<[number, number][]>(() => {
    const list: [number, number][] = pins.map((pin) => [
      pin.university.coordinates.lat,
      pin.university.coordinates.lng,
    ]);
    if (you) list.push([you.lat, you.lng]);
    return list;
  }, [pins, you]);

  if (pins.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-card)] border"
      style={{ height }}
    >
      <MapContainer
        center={[24.45, 54.38]}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {you && (
          <Marker position={[you.lat, you.lng]} icon={markerIcon("#0B3D5C", "•")}>
            <Popup>{t.universities.youAreHere}</Popup>
          </Marker>
        )}

        {pins.map((pin, index) => (
          <Marker
            key={pin.university.id}
            position={[pin.university.coordinates.lat, pin.university.coordinates.lng]}
            icon={markerIcon("#00732F", String(index + 1))}
          >
            <Popup>
              <strong>{pin.university.name[locale]}</strong>
              <br />
              {t.universities.typeLabels[pin.university.type as keyof typeof t.universities.typeLabels]}
              {pin.distanceKm !== null && pin.distanceKm !== undefined && (
                <>
                  <br />
                  {Math.round(pin.distanceKm)} {t.universities.distanceAway}
                </>
              )}
              <br />
              <a href={`/${locale}/universities/${pin.university.id}`}>
                {t.universities.viewDetails}
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
