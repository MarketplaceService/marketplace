"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { LocateButton } from "../map/locate-button";
import {
  BASE_MAP_OPTIONS,
  createBaseLayer,
  HAS_WEBGL,
  watchBaseMap,
} from "../map/map-config";

const MAP_OPTIONS: L.MapOptions = { ...BASE_MAP_OPTIONS, maxZoom: 18 };
const CIRCLE_PADDING: L.PointExpression = [24, 24];

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
  /** Gọi sau khi người dùng bấm nút định vị và tâm đã tới vị trí hiện tại */
  onLocated?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function ServiceAreaMapPicker({
  latitude,
  longitude,
  radiusKm,
  onChangeCenter,
  onLocated,
  interactive = true,
}: ServiceAreaMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const radiusRef = useRef(radiusKm);
  const onChangeCenterRef = useRef(onChangeCenter);

  useEffect(() => {
    onChangeCenterRef.current = onChangeCenter;
  }, [onChangeCenter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start: L.LatLngTuple = [latitude, longitude];
    const map = L.map(container, MAP_OPTIONS).setView(start, 13);

    // Chặn lớp MapLibre gọi getZoom sau khi bản đồ đã bị gỡ (PR #147)
    const glLayer = createBaseLayer();
    let rafId = 0;
    const rawLayer = glLayer as unknown as {
      _map: L.Map | null;
      _glMap: MapLibreMap | null;
      _resizeContainer: () => void;
      _zoomEnd: () => void;
      _transitionEnd: () => void;
    };
    const origZoomEnd = rawLayer._zoomEnd.bind(rawLayer);
    rawLayer._zoomEnd = () => {
      if (rawLayer._map && rawLayer._glMap) origZoomEnd();
    };
    rawLayer._transitionEnd = () => {
      if (rafId) L.Util.cancelAnimFrame(rafId);
      rafId = L.Util.requestAnimFrame(() => {
        rafId = 0;
        if (!rawLayer._map || !rawLayer._glMap) return;
        const zoom = rawLayer._map.getZoom();
        const center = rawLayer._map.getCenter();
        const offset = rawLayer._map.latLngToContainerPoint(
          rawLayer._map.getBounds().getNorthWest(),
        );
        rawLayer._resizeContainer();
        const canvas = (rawLayer._glMap as unknown as { _actualCanvas?: HTMLElement })._actualCanvas;
        if (canvas) L.DomUtil.setTransform(canvas, offset, 1);
        rawLayer._glMap.once("moveend", () => rawLayer._zoomEnd());
        rawLayer._glMap.jumpTo({ center: [center.lng, center.lat], zoom: zoom - 1 });
      });
    };

    const baseMap = glLayer.addTo(map).getMaplibreMap();
    watchBaseMap(baseMap);

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

    // Hiện trọn vòng tròn bán kính ngay từ đầu
    map.fitBounds(circle.getBounds(), { padding: CIRCLE_PADDING, animate: false });

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

    const resizeObserver = new ResizeObserver(() => {
      if (container.isConnected && container.clientWidth > 0 && container.clientHeight > 0) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      resizeObserver.disconnect();
      if (rafId) L.Util.cancelAnimFrame(rafId);
      glLayer.remove();
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

    if (radiusRef.current !== radiusKm) {
      // Đổi bán kính thì thu phóng cho vừa vòng tròn
      radiusRef.current = radiusKm;
      map.fitBounds(circle.getBounds(), { padding: CIRCLE_PADDING });
    } else {
      map.panTo(pos);
    }
  }, [latitude, longitude, radiusKm]);

  const handleLocated = (lat: number, lng: number) => {
    const center = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    onChangeCenter(center.lat, center.lng);
    onLocated?.(center.lat, center.lng);
  };

  if (!HAS_WEBGL) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
        Trình duyệt không hỗ trợ WebGL2 để hiển thị bản đồ vector. Tọa độ hiện tại: {latitude}, {longitude} - Bán kính {radiusKm}km.
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="isolate h-80 w-full overflow-hidden rounded-xl border border-border shadow-inner"
      />
      {interactive && (
        <LocateButton
          onLocated={handleLocated}
          className="absolute top-2 right-2 z-10"
        />
      )}
    </div>
  );
}
