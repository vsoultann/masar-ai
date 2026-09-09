"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
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

/**
 * Marker colour by institution type, matching the palette the campus artwork
 * uses. On a map of fifty pins, type is the distinction worth seeing at a
 * glance — a student choosing between a federal university and an
 * international branch is making a different decision than one comparing two
 * private colleges.
 */
const TYPE_COLOUR: Record<string, string> = {
  federal_public: "#0f5132",
  local_public: "#0e7490",
  private: "#8a6a12",
  international_branch: "#5b3fd6",
  technical: "#475569",
};

/** Initials, not logos: institution crests are their property, not ours. */
function monogram(shortName: string): string {
  const words = shortName.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function markerIcon(colour: string, label: string, emphasis = false) {
  // The label is institution data rendered into an HTML string, so it is
  // escaped: Leaflet's divIcon takes raw HTML and would happily inject it.
  const safe = escapeHtml(label);
  const size = emphasis ? 34 : 30;
  return L.divIcon({
    className: "",
    html: `<span style="
      display:grid;place-items:center;
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:linear-gradient(135deg, ${colour}, ${colour}cc);
      color:#fff;border:2px solid rgba(255,255,255,.85);
      font:700 ${safe.length > 2 ? 8 : 10}px/1 system-ui,sans-serif;
      letter-spacing:.02em;
      box-shadow:0 3px 10px rgba(0,0,0,.4);
    "><span style="transform:rotate(45deg)">${safe}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 6],
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
  majorNames,
}: {
  matches?: UniversityMatch[];
  universities?: University[];
  you?: { lat: number; lng: number } | null;
  height?: number;
  /** major id -> display name, so popups name majors rather than show ids. */
  majorNames?: Map<string, string>;
}) {
  const { locale, t } = useLocale();

  const pins = useMemo(() => {
    if (matches) {
      return matches.map((match) => ({
        university: match.university,
        distanceKm: match.distanceKm,
        matchedMajors: match.matchedMajors.map(
          (id) => majorNames?.get(id) ?? id,
        ),
      }));
    }
    return (universities ?? []).map((university) => ({
      university,
      distanceKm: null,
      matchedMajors: [] as string[],
    }));
  }, [matches, universities, majorNames]);

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
          <Marker position={[you.lat, you.lng]} icon={markerIcon("#111827", "◉")}>
            <Popup>{t.universities.youAreHere}</Popup>
          </Marker>
        )}

        {pins.map((pin) => (
          <Marker
            key={pin.university.id}
            position={[pin.university.coordinates.lat, pin.university.coordinates.lng]}
            icon={markerIcon(
              TYPE_COLOUR[pin.university.type] ?? "#0f5132",
              monogram(pin.university.shortName.en),
              pins.length === 1,
            )}
          >
            <Popup>
              <span className="block text-sm font-bold leading-snug">
                {pin.university.name[locale]}
              </span>
              <span className="mt-0.5 block text-xs opacity-70">
                {t.universities.typeLabels[
                  pin.university.type as keyof typeof t.universities.typeLabels
                ]}
                {pin.distanceKm !== null && pin.distanceKm !== undefined && (
                  <> · {Math.round(pin.distanceKm)} {t.universities.distanceAway}</>
                )}
              </span>

              {pin.matchedMajors && pin.matchedMajors.length > 0 && (
                <span className="mt-1.5 block text-xs">
                  <strong>{t.universities.majorsMatched}:</strong>{" "}
                  {pin.matchedMajors.join(", ")}
                </span>
              )}

              {/* next/link, not a bare anchor. A raw href skips Next's
                  basePath, so this pointed at /en/universities/... while the
                  site is served from /masar-ai/ — every popup link 404ed in
                  production while working perfectly in development. */}
              <Link
                href={`/${locale}/universities/${pin.university.id}`}
                className="mt-2 inline-block font-semibold underline"
              >
                {t.universities.viewDetails}
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
