"use client";

import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

// DNS của Viettel trả về 127.0.0.1 cho openstreetmap.org nên không dùng tile gốc của OSM,
// còn tile raster của CARTO hiện bắt buộc có API key
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAP_ZOOM = 15;

// Dữ liệu OSM ghi tên tiếng Trung ở Hoàng Sa, Trường Sa và Biển Đông nên chỉ cho xem đất liền
// và đảo gần bờ. Zoom 7 là mức thấp nhất mà bản đồ rộng 640px vẫn nằm trọn trong khung này.
const MAP_OPTIONS: L.MapOptions = {
  maxBounds: [
    [8.2, 101.9],
    [23.6, 109.7],
  ],
  maxBoundsViscosity: 1,
  bounceAtZoomLimits: false,
  minZoom: 7,
  maxZoom: 19,
};

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

// MapLibre ném lỗi ngay khi khởi tạo nếu thiếu WebGL2, làm hỏng cả trang.
// Chỉ kiểm tra một lần vì trình duyệt chỉ giữ được khoảng 16 WebGL context.
const HAS_WEBGL = document.createElement("canvas").getContext("webgl2") !== null;

// Style ưu tiên tên tiếng Anh và kèm chữ bản địa. name:latin giữ nguyên tên tiếng Việt,
// còn nhãn chỉ có chữ Trung như tên bãi ngầm ngoài khơi thì không có trường này nên bị ẩn.
function showLatinNames(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol" && String(layer.layout?.["text-field"]).includes("name")) {
      map.setLayoutProperty(layer.id, "text-field", ["get", "name:latin"]);
    }
  }
}

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
    const map = L.map(container, MAP_OPTIONS).setView(start, MAP_ZOOM);

    const baseMap = maplibreGL({ style: MAP_STYLE }).addTo(map).getMaplibreMap();
    baseMap.once("style.load", () => showLatinNames(baseMap));

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

  if (!HAS_WEBGL) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center rounded-lg border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
        Trình duyệt không hiển thị được bản đồ. Bạn hãy nhập tọa độ ở bên dưới.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="isolate h-[220px] w-full overflow-hidden rounded-lg border border-border bg-muted"
    />
  );
}
