import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type L from "leaflet";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import { MAINLAND_BOUNDS } from "./map-bounds";

// File này chạm tới window ngay khi import, nên chỉ dùng trong component tải bằng next/dynamic với ssr: false

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

export const BASE_MAP_OPTIONS: L.MapOptions = {
  maxBounds: MAINLAND_BOUNDS,
  maxBoundsViscosity: 1,
  bounceAtZoomLimits: false,
  minZoom: 7,
};

export const LOCATE_ZOOM = 16;

// MapLibre ném lỗi ngay khi khởi tạo nếu thiếu WebGL2, làm hỏng cả trang.
// Chỉ kiểm tra một lần vì trình duyệt chỉ giữ được khoảng 16 WebGL context.
export const HAS_WEBGL =
  typeof document !== "undefined" &&
  document.createElement("canvas").getContext("webgl2") !== null;

// Key bản đồ của MapVina nằm trong trình duyệt, nên dùng key riêng cho bản đồ (không dùng chung với
// key REST ở backend) và giới hạn domain cho key trong trang quản lý của MapVina nếu có.
// Style v2 theo đơn vị hành chính mới; key trong URL được MapVina tự gắn vào tile, sprite và font.
const MAPVINA_MAP_KEY = process.env.NEXT_PUBLIC_MAPVINA_MAP_KEY?.trim();
const MAPVINA_STYLE = MAPVINA_MAP_KEY
  ? `https://maps.mapvina.com/styles/v2/streets.json?key=${encodeURIComponent(MAPVINA_MAP_KEY)}`
  : null;

// DNS của Viettel trả về 127.0.0.1 cho openstreetmap.org nên không dùng tile gốc của OSM,
// còn tile raster của CARTO bắt buộc có API key. Vì vậy nền dự phòng lấy từ OpenFreeMap.
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Lỗi do key: sai hoặc thiếu key (MapVina trả 401), không có quyền, hoặc hết hạn mức
const KEY_ERROR_STATUSES = new Set([401, 403, 429]);

// Style của OpenFreeMap ưu tiên tên tiếng Anh kèm chữ bản địa. name:latin giữ nguyên tên tiếng Việt,
// còn nhãn chỉ có chữ Trung thì không có trường này nên bị ẩn. Không áp cho MapVina vì style của
// MapVina vẽ nhãn từ name_vi, tile không có name:latin, áp vào sẽ làm mất hết nhãn.
function showLatinNames(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol" && String(layer.layout?.["text-field"]).includes("name")) {
      map.setLayoutProperty(layer.id, "text-field", ["get", "name:latin"]);
    }
  }
}

/** Lớp nền vector: MapVina khi có key bản đồ, ngược lại là OpenFreeMap */
export function createBaseLayer() {
  return maplibreGL({ style: MAPVINA_STYLE ?? FALLBACK_STYLE });
}

/**
 * Gọi sau khi lớp nền đã được addTo(map). Nếu MapVina trả lỗi key hoặc hết hạn mức thì đổi sang
 * OpenFreeMap một lần, để bản đồ không bị xám.
 */
export function watchBaseMap(baseMap: MapLibreMap) {
  let usingMapVina = MAPVINA_STYLE !== null;

  baseMap.on("style.load", () => {
    if (!usingMapVina) showLatinNames(baseMap);
  });

  if (!usingMapVina) return;

  baseMap.on("error", (event) => {
    // Lỗi tải style hay tile của MapLibre có kèm mã HTTP trong trường status
    const status = (event.error as { status?: number } | undefined)?.status;
    if (!usingMapVina || status === undefined || !KEY_ERROR_STATUSES.has(status)) return;

    usingMapVina = false;
    baseMap.setStyle(FALLBACK_STYLE);
  });
}
