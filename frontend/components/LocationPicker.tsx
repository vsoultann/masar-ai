"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/lib/locale-context";

/**
 * Emirate, then city, with an optional browser-geolocation shortcut.
 *
 * Three things this deliberately does:
 *
 *  - The permission prompt is never fired on mount. A page that asks for your
 *    location before you have done anything is the pattern everyone has learned
 *    to deny, and a denied permission is sticky. It fires on an explicit tap.
 *  - Failure is non-blocking. Denied, unavailable or timed out all fall back to
 *    the dropdowns with an explanation, because the city list alone is enough
 *    to rank institutions by distance.
 *  - The privacy note is shown before the button, not after, and it is true:
 *    the coordinates go into localStorage and are read by the distance
 *    calculation in this same browser. There is no server to send them to.
 */

const CITIES: Record<string, string[]> = {
  abu_dhabi: ["abu_dhabi_city", "al_ain", "al_dhafra", "ruwais"],
  dubai: ["dubai_city", "hatta"],
  sharjah: ["sharjah_city"],
  ajman: ["ajman_city"],
  umm_al_quwain: ["uaq_city"],
  ras_al_khaimah: ["rak_city"],
  fujairah: ["fujairah_city"],
};

export default function LocationPicker({
  emirate,
  city,
  onCityChange,
  onCoordinates,
}: {
  emirate: string;
  city: string;
  onCityChange: (city: string) => void;
  onCoordinates: (
    coordinates: { lat: number; lng: number } | null,
    source: "manual" | "geolocation" | null,
  ) => void;
}) {
  const { t, lookup } = useLocale();
  const [status, setStatus] = useState<"idle" | "asking" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const cities = CITIES[emirate] ?? [];

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setMessage(t.assessment.locationUnavailable);
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinates(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          "geolocation",
        );
        setStatus("ok");
        setMessage(null);
      },
      (error) => {
        setStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? t.assessment.locationDenied
            : t.assessment.locationUnavailable,
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="space-y-3">
      {cities.length > 0 && (
        <div>
          <label htmlFor="wiz-city" className="mb-1 block text-sm font-medium">
            {t.assessment.city}
          </label>
          <select
            id="wiz-city"
            value={city}
            onChange={(event) => {
              onCityChange(event.target.value);
              // A hand-picked city supersedes any coordinate we captured.
              onCoordinates(null, "manual");
              setStatus("idle");
              setMessage(null);
            }}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.assessment.selectCity}</option>
            {cities.map((id) => (
              <option key={id} value={id}>
                {lookup(t.cities, id)}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs muted">{t.assessment.locationPrivacy}</p>

      <button
        type="button"
        onClick={requestLocation}
        disabled={status === "asking"}
        className="btn btn-ghost text-sm"
      >
        <MapPin size={15} aria-hidden className="me-1.5" />
        {status === "asking" ? t.common.loading : t.assessment.useLocation}
      </button>

      {status === "ok" && (
        <p role="status" className="text-xs font-medium text-[var(--brand)]">
          {t.universities.youAreHere} ✓
        </p>
      )}
      {status === "error" && message && (
        <p role="status" className="text-xs muted">
          {message}
        </p>
      )}
    </div>
  );
}
