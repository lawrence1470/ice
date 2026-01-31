"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { supabase } from "@/lib/supabase";

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

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});

  const addSightingMarker = useCallback((sighting: SightingView) => {
    const map = mapRef.current;
    if (!map || markersRef.current[sighting.id]) return;

    const el = document.createElement("div");
    el.className = "sighting-marker";
    el.title = sighting.description || "ICE sighting reported";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([sighting.lng, sighting.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div style="color:#000;font-size:14px">
            <strong>ICE Sighting</strong>
            ${sighting.description ? `<p style="margin:4px 0 0">${sighting.description}</p>` : ""}
            <p style="margin:4px 0 0;font-size:12px;color:#666">
              ${new Date(sighting.created_at).toLocaleTimeString()}
            </p>
          </div>`
        )
      )
      .addTo(map);

    markersRef.current[sighting.id] = marker;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent double-init
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = {};
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
      center: [-98.5795, 39.8283],
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        map.flyTo({ center: coords, zoom: 13 });

        new maplibregl.Marker({ color: "#3b82f6" })
          .setLngLat(coords)
          .setPopup(new maplibregl.Popup().setText("You are here"))
          .addTo(map);
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Load sightings and subscribe to realtime
  useEffect(() => {
    async function loadSightings() {
      const { data, error } = await supabase
        .from("sightings_view")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Sightings loaded:", data, "Error:", error);
      (data as SightingView[] | null)?.forEach(addSightingMarker);
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
          if (latest) addSightingMarker(latest);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [addSightingMarker]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}
