"use client";

import {
  BASE_MAP_OPTIONS,
  createBaseLayer,
  HAS_WEBGL,
  watchBaseMap,
} from "@/components/map/map-config";
import type { NearbyServiceItem } from "@/types/discovery.types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LocateFixed,
  Minus,
  Plus,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

const MAP_OPTIONS: L.MapOptions = {
  ...BASE_MAP_OPTIONS,
  maxZoom: 18,
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createUserIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
        <div style="position:relative; display:flex; align-items:center; justify-content:center;">
          <span style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(5,150,105,0.25); animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></span>
          <div style="width:28px; height:28px; border-radius:50%; background:#059669; color:white; border:2.5px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
        <div style="margin-top:4px; padding:2px 8px; border-radius:9999px; background:rgba(15,23,42,0.92); color:white; font-size:11px; font-weight:600; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.25); display:flex; align-items:center; gap:4px; backdrop-filter:blur(4px);">
          <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
          <span>${escapeHtml(label)}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export interface NearbyProvidersMapProps {
  centerLat: number;
  centerLng: number;
  centerLabel?: string;
  radiusKm: number;
  items: NearbyServiceItem[];
  selectedServiceId: string | null;
  selectionTrigger?: number;
  onSelectService: (serviceId: string) => void;
  onChangeCenter?: (lat: number, lng: number) => void;
  onRequestMyLocation?: () => void;
}

export default function NearbyProvidersMap({
  centerLat,
  centerLng,
  centerLabel = "Vị trí của bạn",
  radiusKm,
  items,
  selectedServiceId,
  selectionTrigger = 0,
  onSelectService,
  onChangeCenter,
  onRequestMyLocation,
}: NearbyProvidersMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const freeCircleRef = useRef<L.Circle | null>(null);
  const sweepCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerPosMapRef = useRef<Map<string, L.LatLngTuple>>(new Map());

  const onChangeCenterRef = useRef(onChangeCenter);
  useEffect(() => {
    onChangeCenterRef.current = onChangeCenter;
  }, [onChangeCenter]);

  const onSelectServiceRef = useRef(onSelectService);
  useEffect(() => {
    onSelectServiceRef.current = onSelectService;
  }, [onSelectService]);

  // Khởi tạo bản đồ 1 lần duy nhất khi mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start: L.LatLngTuple = [centerLat, centerLng];
    const map = L.map(container, {
      ...MAP_OPTIONS,
      zoomControl: false,
    }).setView(start, 13);

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
        const canvas = (
          rawLayer._glMap as unknown as { _actualCanvas?: HTMLElement }
        )._actualCanvas;
        if (canvas) L.DomUtil.setTransform(canvas, offset, 1);
        rawLayer._glMap.once("moveend", () => rawLayer._zoomEnd());
        rawLayer._glMap.jumpTo({
          center: [center.lng, center.lat],
          zoom: zoom - 1,
        });
      });
    };

    const baseMap = glLayer.addTo(map).getMaplibreMap();
    watchBaseMap(baseMap);

    // Marker Vị trí khách hàng
    const userMarker = L.marker(start, {
      draggable: Boolean(onChangeCenterRef.current),
      icon: createUserIcon(centerLabel),
      zIndexOffset: 800,
    }).addTo(map);

    // Vòng tròn 1: Miễn phí 3km (nét liền)
    const freeCircle = L.circle(start, {
      color: "#059669",
      fillColor: "#10b981",
      fillOpacity: 0.08,
      weight: 2,
      radius: 3000,
    }).addTo(map);

    // Vòng tròn 2: Quét bán kính (nét đứt)
    const sweepCircle = L.circle(start, {
      color: "#059669",
      fillColor: "#059669",
      fillOpacity: 0.03,
      weight: 2,
      dashArray: "6, 6",
      radius: radiusKm * 1000,
    }).addTo(map);

    // Layer chứa các Marker Nhà cung cấp
    const markersLayer = L.layerGroup().addTo(map);

    // Tương tác kéo hoặc click bản đồ để thay đổi tâm
    userMarker.on("dragend", () => {
      const { lat, lng } = userMarker.getLatLng();
      onChangeCenterRef.current?.(
        parseFloat(lat.toFixed(6)),
        parseFloat(lng.toFixed(6)),
      );
    });

    map.on("click", ({ latlng }: L.LeafletMouseEvent) => {
      onChangeCenterRef.current?.(
        parseFloat(latlng.lat.toFixed(6)),
        parseFloat(latlng.lng.toFixed(6)),
      );
    });

    const resizeObserver = new ResizeObserver(() => {
      if (
        container.isConnected &&
        container.clientWidth > 0 &&
        container.clientHeight > 0
      ) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    mapRef.current = map;
    userMarkerRef.current = userMarker;
    freeCircleRef.current = freeCircle;
    sweepCircleRef.current = sweepCircle;
    markersLayerRef.current = markersLayer;

    return () => {
      resizeObserver.disconnect();
      if (rafId) L.Util.cancelAnimFrame(rafId);
      markersLayer.clearLayers();
      glLayer.remove();
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      freeCircleRef.current = null;
      sweepCircleRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật vị trí tâm bản đồ khi tọa độ thay đổi
  useEffect(() => {
    const map = mapRef.current;
    const userMarker = userMarkerRef.current;
    const freeCircle = freeCircleRef.current;
    const sweepCircle = sweepCircleRef.current;
    if (!map || !userMarker || !freeCircle || !sweepCircle) return;
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;

    const pos: L.LatLngTuple = [centerLat, centerLng];
    userMarker.setLatLng(pos);
    freeCircle.setLatLng(pos);
    sweepCircle.setLatLng(pos);
    map.panTo(pos);
  }, [centerLat, centerLng]);

  // Cập nhật bán kính quét độc lập, tránh kéo bản đồ về tâm khi user đang xem marker khác
  useEffect(() => {
    const sweepCircle = sweepCircleRef.current;
    if (!sweepCircle) return;
    sweepCircle.setRadius(radiusKm * 1000);
  }, [radiusKm]);

  // Cập nhật nhãn icon vị trí khách hàng khi địa chỉ mặc định/GPS thay đổi
  useEffect(() => {
    const userMarker = userMarkerRef.current;
    if (!userMarker) return;
    userMarker.setIcon(createUserIcon(centerLabel));
  }, [centerLabel]);

  // Cập nhật các Marker Nhà cung cấp khi danh sách items hoặc selectedServiceId thay đổi
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    markerPosMapRef.current.clear();

    // Nhóm dịch vụ trùng tọa độ để rải đều theo vòng tròn (~120m), tránh đè ghim
    const coordCounts = new Map<string, number>();
    const coordSlot = new Map<string, number>();
    for (const item of items) {
      const key = `${item.location.latitude.toFixed(5)}:${item.location.longitude.toFixed(5)}`;
      coordCounts.set(key, (coordCounts.get(key) ?? 0) + 1);
    }

    items.forEach((item, index) => {
      const isSelected = item.service.id === selectedServiceId;
      const baseLat = item.location.latitude;
      const baseLng = item.location.longitude;
      const coordKey = `${baseLat.toFixed(5)}:${baseLng.toFixed(5)}`;
      const groupTotal = coordCounts.get(coordKey) ?? 1;
      const slotIndex = coordSlot.get(coordKey) ?? 0;
      coordSlot.set(coordKey, slotIndex + 1);

      let pos: L.LatLngTuple = [baseLat, baseLng];
      if (groupTotal > 1) {
        const angle = (2 * Math.PI * slotIndex) / groupTotal;
        const radiusDegLat = 0.0011; // ~122m
        const cosLat = Math.max(0.2, Math.cos((baseLat * Math.PI) / 180));
        pos = [
          baseLat + radiusDegLat * Math.sin(angle),
          baseLng + (radiusDegLat / cosLat) * Math.cos(angle),
        ];
      }

      const avatarInitial = escapeHtml(
        (item.provider.displayName.trim().charAt(0) || "?").toUpperCase(),
      );
      const avatarContentHtml = item.provider.avatar
        ? `<img src="${escapeHtml(item.provider.avatar)}" alt="${escapeHtml(item.provider.displayName)}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#006948;font-weight:700;font-size:${isSelected ? "16px" : "14px"};">${avatarInitial}</div>`;

      const pinHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
          <div style="
            margin-bottom: 4px;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
            background: ${isSelected ? "#059669" : "rgba(255,255,255,0.95)"};
            color: ${isSelected ? "#ffffff" : "#0f172a"};
            border: 1px solid ${isSelected ? "#047857" : "#e2e8f0"};
            transform: ${isSelected ? "scale(1.08)" : "scale(1)"};
          ">
            <span style="
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: ${item.provider.isOnline ? "#10b981" : "#94a3b8"};
            "></span>
            <span>${escapeHtml(item.provider.displayName)}</span>
            <span style="opacity: 0.65;">•</span>
            <span style="
              font-weight: 700;
              color: ${
                isSelected
                  ? "#ffffff"
                  : item.distance.isFreeShipping
                    ? "#059669"
                    : "#b45309"
              };
            ">
              ${item.distance.distanceKm}km
            </span>
          </div>

          <div style="position: relative;">
              <div style="
                width: ${isSelected ? "42px" : "36px"};
                height: ${isSelected ? "42px" : "36px"};
                border-radius: 50%;
                overflow: hidden;
                border: ${isSelected ? "3px solid #059669" : "2.5px solid #ffffff"};
                box-shadow: 0 3px 10px rgba(0,0,0,0.25);
                transition: all 0.2s ease;
                background: #f1f5f9;
              ">
                ${avatarContentHtml}
              </div>
            <span style="
              position: absolute;
              top: -3px;
              right: -3px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #d97706;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: bold;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            ">★</span>
          </div>
        </div>
      `;

      const providerIcon = L.divIcon({
        className: "",
        html: pinHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(pos, {
        icon: providerIcon,
        zIndexOffset: isSelected ? 1200 : 200 + index,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectServiceRef.current(item.service.id);
      });

      marker.addTo(markersLayer);
      markerPosMapRef.current.set(item.service.id, pos);
    });
  }, [items, selectedServiceId]);

  // Chỉ pan tới marker khi người dùng chủ động click chọn thẻ hoặc marker
  useEffect(() => {
    if (selectionTrigger === 0 || !selectedServiceId) return;
    const map = mapRef.current;
    const pos = markerPosMapRef.current.get(selectedServiceId);
    if (map && pos) {
      map.panTo(pos);
    }
  }, [selectionTrigger, selectedServiceId]);

  if (!HAS_WEBGL) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
        Trình duyệt không hỗ trợ WebGL2 để hiển thị bản đồ vector. Tọa độ: {centerLat}, {centerLng} - Bán kính {radiusKm}km.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Container Leaflet map */}
      <div ref={containerRef} className="isolate h-full w-full" />

      {/* Chú thích bản đồ (Góc dưới trái) */}
      <div className="absolute bottom-6 left-6 z-20 hidden md:block">
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl px-3.5 py-2 shadow-sm text-xs text-muted-foreground flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-600 rounded-full" />
            <span className="text-[11px] font-medium text-foreground">
              Vùng ≤ 3km miễn phí di chuyển
            </span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-emerald-600" />
            <span className="text-[11px] font-medium text-foreground">
              Bán kính quét ({radiusKm}km)
            </span>
          </div>
        </div>
      </div>

      {/* Điều khiển thu phóng & định vị (Góc dưới phải) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <div className="bg-card rounded-xl shadow-md border border-border flex flex-col divide-y divide-border overflow-hidden">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Phóng to"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Thu nhỏ"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        {onRequestMyLocation && (
          <button
            type="button"
            onClick={onRequestMyLocation}
            className="w-9 h-9 bg-card rounded-xl shadow-md border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            title="Vị trí của tôi"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
