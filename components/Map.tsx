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
  image_path: string | null;
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

const SOURCE_ID = "sightings-source";
const LAYER_CLUSTERS = "clusters";
const LAYER_CLUSTER_COUNT = "cluster-count";
const LAYER_UNCLUSTERED = "unclustered-point";

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
  const sourceReadyRef = useRef(false);

  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;

    const filter = timeFilterRef.current;
    const now = Date.now();
    const cutoff = FILTER_MS[filter];
    const filtered =
      cutoff === Infinity
        ? sightingsRef.current
        : sightingsRef.current.filter(
            (s) => now - new Date(s.created_at).getTime() < cutoff
          );

    setFilteredCount(filtered.length);

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filtered.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          description: s.description,
          image_path: s.image_path,
          created_at: s.created_at,
        },
      })),
    };

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-98.5795, 39.8283],
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      setLoading(false);
      sourceReadyRef.current = true;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: LAYER_CLUSTERS,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, // default
            5, 18,
            10, 22,
            25, 26,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
        },
      });

      // Cluster count labels
      map.addLayer({
        id: LAYER_CLUSTER_COUNT,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual sighting dots
      map.addLayer({
        id: LAYER_UNCLUSTERED,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": 6,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
        },
      });

      // Click cluster → zoom in
      map.on("click", LAYER_CLUSTERS, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = features[0].geometry as GeoJSON.Point;
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom,
          });
        });
      });

      // Click individual point → popup
      map.on("click", LAYER_UNCLUSTERED, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_UNCLUSTERED] });
        if (!features.length) return;
        const feat = features[0];
        const geom = feat.geometry as GeoJSON.Point;
        const coords = geom.coordinates.slice() as [number, number];
        const props = feat.properties;
        const currentT = tRef.current;
        const currentLocale = localeRef.current;

        const imageUrl = (path: string | null) => {
          if (!path) return null;
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          return `${url}/storage/v1/object/public/sighting-images/${path}`;
        };

        const buildPopupHtml = (desc: string | null) => {
          const imgSrc = imageUrl(props.image_path);
          return `<div style="color:#000;font-size:14px">
            <strong>${currentT.iceSighting}</strong>
            ${desc ? `<p style="margin:4px 0 0">${desc}</p>` : ""}
            ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" style="margin:6px 0 2px;border-radius:8px;max-width:200px;max-height:150px;object-fit:cover" />` : ""}
            <p style="margin:4px 0 0;font-size:12px;color:#666">
              ${relativeTime(props.created_at, currentT)}
            </p>
          </div>`;
        };

        const rawDesc = props.description
          ? escapeHtml(props.description)
          : null;

        const popup = new maplibregl.Popup({ offset: 15 })
          .setLngLat(coords)
          .setHTML(buildPopupHtml(rawDesc))
          .addTo(map);

        if (currentLocale !== "en" && rawDesc) {
          translateText(rawDesc, "en", currentLocale).then((translated) => {
            popup.setHTML(buildPopupHtml(translated));
          });
        }
      });

      // Cursor changes
      map.on("mouseenter", LAYER_CLUSTERS, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_CLUSTERS, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", LAYER_UNCLUSTERED, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_UNCLUSTERED, () => {
        map.getCanvas().style.cursor = "";
      });

      // Render any sightings that loaded before map was ready
      updateSource();
    });

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
      sourceReadyRef.current = false;
      map.remove();
      mapRef.current = null;
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Sync filter ref and update source
  useEffect(() => {
    timeFilterRef.current = timeFilter;
    updateSource();
  }, [timeFilter, updateSource]);

  // Update source when language changes (for count display)
  useEffect(() => {
    updateSource();
  }, [t, updateSource]);

  // Load sightings and subscribe to realtime
  useEffect(() => {
    async function loadSightings() {
      const { data } = await supabase
        .from("sightings_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        sightingsRef.current = data as SightingView[];
        updateSource();
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
            updateSource();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [updateSource]);

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
