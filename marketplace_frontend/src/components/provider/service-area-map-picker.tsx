"use client";

import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const MAP_OPTIONS: L.MapOptions = {
  maxBounds: [
    [8.2, 101.9],
    [23.6, 109.7],
  ],
  maxBoundsViscosity: 1,
  bounceAtZoomLimits: false,
  minZoom: 6,
  maxZoom: 18,
};

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

const HAS_WEBGL =
  typeof document !== "undefined" &&
  document.createElement("canvas").getContext("webgl2") !== null;

function showLatinNames(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol" && String(layer.layout?.["text-field"]).includes("name")) {
      map.setLayoutProperty(layer.id, "text-field", ["get", "name:latin"]);
    }
  }
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="background-color: #059669; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface ServiceAreaMapPickerProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onChangeCenter: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function ServiceAreaMapPicker({
  latitude,
  longitude,
  radiusKm,
  onChangeCenter,
  interactive = true,
}: ServiceAreaMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeCenterRef = useRef(onChangeCenter);

  useEffect(() => {
    onChangeCenterRef.current = onChangeCenter;
  }, [onChangeCenter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start: L.LatLngTuple = [latitude, longitude];
    const map = L.map(container, MAP_OPTIONS).setView(start, 13);

    const baseMap = maplibreGL({ style: MAP_STYLE }).addTo(map).getMaplibreMap();
    baseMap.once("style.load", () => showLatinNames(baseMap));

    const marker = L.marker(start, {
      draggable: interactive,
      icon: pinIcon,
    }).addTo(map);

    const circle = L.circle(start, {
      color: "#059669",
      fillColor: "#059669",
      fillOpacity: 0.15,
      weight: 2,
      radius: radiusKm * 1000,
    }).addTo(map);

    if (interactive) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onChangeCenterRef.current(
          parseFloat(lat.toFixed(6)),
          parseFloat(lng.toFixed(6)),
        );
      });

      map.on("click", ({ latlng }: L.LeafletMouseEvent) => {
        onChangeCenterRef.current(
          parseFloat(latlng.lat.toFixed(6)),
          parseFloat(latlng.lng.toFixed(6)),
        );
      });
    }

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const pos: L.LatLngTuple = [latitude, longitude];
    marker.setLatLng(pos);
    circle.setLatLng(pos);
    circle.setRadius(radiusKm * 1000);
    map.panTo(pos);
  }, [latitude, longitude, radiusKm]);

  if (!HAS_WEBGL) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
        Trình duyệt không hỗ trợ WebGL2 để hiển thị bản đồ vector. Tọa độ hiện tại: {latitude}, {longitude} - Bán kính {radiusKm}km.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="isolate h-80 w-full overflow-hidden rounded-xl border border-border shadow-inner"
    />
  );
}

