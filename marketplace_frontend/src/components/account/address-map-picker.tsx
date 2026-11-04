"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const MAP_ZOOM = 15;

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--primary);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 26],
});

interface AddressMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}

export default function AddressMapPicker({
  latitude,
  longitude,
  onChange,
}: AddressMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start: L.LatLngTuple = [latitude, longitude];
    const map = L.map(container).setView(start, MAP_ZOOM);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const marker = L.marker(start, { draggable: true, icon: markerIcon }).addTo(map);

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current(lat, lng);
    });

    map.on("click", ({ latlng }: L.LeafletMouseEvent) => {
      onChangeRef.current(latlng.lat, latlng.lng);
    });

    // Dialog mở có hiệu ứng nên kích thước bản đồ chỉ đúng sau khi layout xong
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Bản đồ chỉ khởi tạo một lần, các lần đổi tọa độ do effect bên dưới xử lý
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;

    marker.setLatLng([latitude, longitude]);
    map.panTo([latitude, longitude]);
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="isolate h-[220px] w-full overflow-hidden rounded-lg border border-border bg-muted"
    />
  );
}
