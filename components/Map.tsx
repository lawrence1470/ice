"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { supabase } from "@/lib/supabase";
import { useI18n, type Locale, translateText } from "@/lib/i18n";

interface SightingView {
  id: string;
  lng: number;
  lat: number;
  description: string | null;
  created_at: string;
  expires_at: string;
}

// Inject MapLibre CSS once via <link> tag
if (typeof document !== "undefined") {
  const id = "maplibre-css";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5.17.0/dist/maplibre-gl.css";
    document.head.appendChild(link);
  }
}

// Cluster using pixel distance on screen — 60px threshold
const CLUSTER_PX = 60;

interface Cluster {
  lng: number;
  lat: number;
  sightings: SightingView[];
}

function clusterSightings(sightings: SightingView[], map: maplibregl.Map): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  // Project all sightings to screen pixels
  const projected = sightings.map((s) => ({
    s,
    px: map.project([s.lng, s.lat]),
  }));

  for (const { s, px } of projected) {
    if (assigned.has(s.id)) continue;

    const nearby: SightingView[] = [];
    for (const other of projected) {
      if (assigned.has(other.s.id)) continue;
      const dx = other.px.x - px.x;
      const dy = other.px.y - px.y;
      if (dx * dx + dy * dy < CLUSTER_PX * CLUSTER_PX) {
        nearby.push(other.s);
      }
    }

    nearby.forEach((n) => assigned.add(n.id));

    const avgLng = nearby.reduce((sum, n) => sum + n.lng, 0) / nearby.length;
    const avgLat = nearby.reduce((sum, n) => sum + n.lat, 0) / nearby.length;

    clusters.push({ lng: avgLng, lat: avgLat, sightings: nearby });
  }

  return clusters;
}

type TimeFilter = "all" | "30m" | "1h" | "2h";

const FILTER_MS: Record<TimeFilter, number> = {
  all: Infinity,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
};

function relativeTime(dateStr: string, t: ReturnType<typeof useI18n>["t"]): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minutesAgo(mins);
  return t.hoursAgo(Math.floor(mins / 60));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ageOpacity(dateStr: string): number {
  const hours = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  return Math.max(0.4, 1 - hours * 0.1);
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const sightingsRef = useRef<SightingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const timeFilterRef = useRef<TimeFilter>("all");
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { t, locale } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;

  const renderMarkers = useCallback((newIds?: Set<string>) => {
    const map = mapRef.current;
    if (!map) return;
    const t = tRef.current;
    const filter = timeFilterRef.current;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Apply time filter
    const now = Date.now();
    const cutoff = FILTER_MS[filter];
    const filtered = cutoff === Infinity
      ? sightingsRef.current
      : sightingsRef.current.filter((s) => now - new Date(s.created_at).getTime() < cutoff);

    setFilteredCount(filtered.length);

    const clusters = clusterSightings(filtered, map);

    for (const cluster of clusters) {
      const count = cluster.sightings.length;
      const isNew = newIds && cluster.sightings.some((s) => newIds.has(s.id));
      const latest = cluster.sightings[0];

      const el = document.createElement("div");

      if (count > 1) {
        el.className = `sighting-cluster${isNew ? " sighting-new" : ""}`;
        el.textContent = String(count);
        el.style.opacity = String(ageOpacity(latest.created_at));
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          map.flyTo({ center: [cluster.lng, cluster.lat], zoom: Math.min(map.getZoom() + 3, 18) });
        });
      } else {
        el.className = `sighting-dot-wrapper${isNew ? " sighting-new" : ""}`;
        el.style.opacity = String(ageOpacity(latest.created_at));

        const dot = document.createElement("div");
        dot.className = "sighting-marker";

        const label = document.createElement("span");
        label.className = "sighting-time-label";
        label.textContent = relativeTime(latest.created_at, t);

        el.appendChild(dot);
        el.appendChild(label);
      }

      const currentLocale = localeRef.current;

      const buildPopupHtml = (descriptions: (string | null)[]) => {
        if (count > 1) {
          return `<div style="color:#000;font-size:14px">
            <strong>${t.iceSightings(count)}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#666">
              ${t.latest}: ${new Date(latest.created_at).toLocaleTimeString()}
            </p>
            ${descriptions
              .slice(0, 3)
              .map((d) => d ? `<p style="margin:4px 0 0;font-size:12px">${d}</p>` : "")
              .join("")}
            ${count > 3 ? `<p style="margin:4px 0 0;font-size:11px;color:#999">${t.more(count - 3)}</p>` : ""}
          </div>`;
        }
        return `<div style="color:#000;font-size:14px">
            <strong>${t.iceSighting}</strong>
            ${descriptions[0] ? `<p style="margin:4px 0 0">${descriptions[0]}</p>` : ""}
            <p style="margin:4px 0 0;font-size:12px;color:#666">
              ${new Date(latest.created_at).toLocaleTimeString()}
            </p>
          </div>`;
      };

      const descriptions = cluster.sightings.map((s) => s.description ? escapeHtml(s.description) : null);
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(buildPopupHtml(descriptions));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cluster.lng, cluster.lat]);

      if (count === 1) {
        marker.setPopup(popup);
      }

      // Translate descriptions asynchronously when locale is not English
      if (currentLocale !== "en") {
        const textsToTranslate = descriptions.filter((d): d is string => !!d);
        if (textsToTranslate.length > 0) {
          Promise.all(
            textsToTranslate.map((d) => translateText(d, "en", currentLocale))
          ).then((translated) => {
            let idx = 0;
            const translatedDescs = descriptions.map((d) =>
              d ? translated[idx++] : null
            );
            popup.setHTML(buildPopupHtml(translatedDescs));
          });
        }
      }

      marker.addTo(map);

      markersRef.current.push(marker);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = [];
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
      center: [-98.5795, 39.8283],
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => setLoading(false));
    map.on("moveend", () => renderMarkers());

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        map.flyTo({ center: coords, zoom: 13 });

        const userEl = document.createElement("div");
        userEl.className = "user-marker";
        new maplibregl.Marker({ element: userEl })
          .setLngLat(coords)
          .addTo(map);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationDenied(true);
      },
      { enableHighAccuracy: true }
    );

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Sync filter ref and re-render
  useEffect(() => {
    timeFilterRef.current = timeFilter;
    renderMarkers();
  }, [timeFilter, renderMarkers]);

  // Re-render markers when language changes
  useEffect(() => {
    renderMarkers();
  }, [t, renderMarkers]);

  // Load sightings and subscribe to realtime
  useEffect(() => {
    async function loadSightings() {
      const { data } = await supabase
        .from("sightings_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        sightingsRef.current = data as SightingView[];
        renderMarkers();
      }
    }

    loadSightings();

    const channel = supabase
      .channel("sightings-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sightings" },
        async () => {
          const { data } = await supabase
            .from("sightings_view")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1);

          const latest = (data as SightingView[] | null)?.[0];
          if (latest && !sightingsRef.current.find((s) => s.id === latest.id)) {
            sightingsRef.current = [latest, ...sightingsRef.current];
            renderMarkers(new Set([latest.id]));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [renderMarkers]);

  const filters: TimeFilter[] = ["all", "30m", "1h", "2h"];
  const filterLabels: Record<TimeFilter, string> = {
    all: t.filterAll,
    "30m": t.filter30m,
    "1h": t.filter1h,
    "2h": t.filter2h,
  };

  return (
    <>
      <div
        ref={containerRef}
        className={loading ? "map-loading" : "map-loaded"}
        style={{ position: "absolute", top: 48, left: 0, right: 0, bottom: 0 }}
      />
      {!loading && (
        <div className="time-filter-bar">
          {filters.map((f) => (
            <button
              key={f}
              className={`time-filter-pill${timeFilter === f ? " time-filter-active" : ""}`}
              onClick={() => setTimeFilter(f)}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      )}
      {!loading && filteredCount === 0 && (
        <div className="empty-state">
          {timeFilter === "all" ? t.noSightings : t.noSightingsFilter}
        </div>
      )}
      {locationDenied && (
        <div className="toast-banner toast-warning">{t.locationDenied}</div>
      )}
      {offline && (
        <div className="toast-banner toast-offline">{t.offline}</div>
      )}
    </>
  );
}
