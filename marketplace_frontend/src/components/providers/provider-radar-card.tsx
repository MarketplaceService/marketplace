"use client";

import type { ProviderRadarResponse } from "@/services/provider.services";
import { ShieldCheck } from "lucide-react";

const CX = 120;
const CY = 120;
const MAX_RADIUS = 92;

interface RadarAxisConfig {
  key: keyof Pick<
    ProviderRadarResponse,
    | "punctuality"
    | "priceAdherence"
    | "skillQuality"
    | "completionRate"
    | "acceptanceSpeed"
  >;
  label: string;
  shortLabel: string;
  angleDeg: number;
}

const RADAR_AXES: RadarAxisConfig[] = [
  { key: "punctuality", label: "Đúng giờ hẹn", shortLabel: "Đúng giờ", angleDeg: -90 },
  {
    key: "priceAdherence",
    label: "Đúng giá niêm yết",
    shortLabel: "Đúng giá",
    angleDeg: -18,
  },
  { key: "skillQuality", label: "Tay nghề thực hiện", shortLabel: "Tay nghề", angleDeg: 54 },
  {
    key: "completionRate",
    label: "Tỉ lệ hoàn thành đơn",
    shortLabel: "Hoàn thành",
    angleDeg: 126,
  },
  {
    key: "acceptanceSpeed",
    label: "Tốc độ nhận đơn",
    shortLabel: "Phản hồi",
    angleDeg: 198,
  },
];

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Number((CX + radius * Math.cos(rad)).toFixed(1)),
    y: Number((CY + radius * Math.sin(rad)).toFixed(1)),
  };
}

function buildPolygonPoints(radii: number[]): string {
  return RADAR_AXES.map((axis, idx) => {
    const pt = polarPoint(axis.angleDeg, radii[idx] ?? 0);
    return `${pt.x},${pt.y}`;
  }).join(" ");
}

function hasCompletedData(radar: ProviderRadarResponse | undefined): boolean {
  if (!radar) return false;
  if (radar.reviewCount > 0) return true;
  if (radar.metrics) {
    return radar.metrics.completionRate.completedCount > 0;
  }
  return false;
}

function hasAxisData(
  radar: ProviderRadarResponse | undefined,
  key: RadarAxisConfig["key"],
  score: number,
): boolean {
  if (!hasCompletedData(radar) || !radar) return false;
  if (!radar.metrics) {
    return radar.reviewCount > 0 || score > 0;
  }

  switch (key) {
    case "punctuality":
      return radar.metrics.punctuality.totalStartedCount > 0;
    case "priceAdherence":
      return radar.metrics.priceAdherence.totalReviewCount > 0;
    case "skillQuality":
      return radar.metrics.skillQuality.totalReviewCount > 0;
    case "completionRate":
      return radar.metrics.completionRate.denominatorCount > 0;
    case "acceptanceSpeed":
      return radar.metrics.acceptanceSpeed.respondedCount > 0;
  }
}

export function ProviderRadarCard({
  radar,
  isLoading,
}: {
  radar?: ProviderRadarResponse;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mx-auto size-60 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const scores = RADAR_AXES.map((axis) => {
    const raw = radar?.[axis.key] ?? 0;
    return Math.max(0, Math.min(5, Number(raw) || 0));
  });

  const completedCount = radar?.metrics?.completionRate?.completedCount ?? 0;
  const hasAnyData =
    hasCompletedData(radar) &&
    ((radar?.reviewCount ?? 0) > 0 || scores.some((score) => score > 0));

  const dataRadii = scores.map((score) => (score / 5) * MAX_RADIUS);
  const dataPoints = scores.map((score, idx) =>
    polarPoint(RADAR_AXES[idx].angleDeg, (score / 5) * MAX_RADIUS),
  );
  const dataPolygon = buildPolygonPoints(dataRadii);

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Biểu đồ 5 tiêu chí uy tín
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {radar && radar.reviewCount > 0
              ? `Tổng hợp từ ${radar.reviewCount} đánh giá thực tế`
              : completedCount > 0
                ? `Tổng hợp từ ${completedCount} đơn đã hoàn thành`
                : "Chưa có dữ liệu từ đơn hoàn thành"}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
      </div>

      {/* Biểu đồ ngũ giác SVG */}
      <div className="relative flex flex-col items-center">
        <div className="relative flex aspect-square w-full max-w-[290px] items-center justify-center">
          <svg
            className="size-full overflow-visible"
            viewBox="0 0 240 240"
            role="img"
            aria-label="Biểu đồ Radar uy tín 5 chiều của nhà cung cấp"
          >
            {/* 5 vòng ngũ giác đồng tâm 20% -> 100% */}
            {gridLevels.map((level) => {
              const r = MAX_RADIUS * level;
              const pts = buildPolygonPoints(RADAR_AXES.map(() => r));
              return (
                <polygon
                  key={level}
                  fill="none"
                  points={pts}
                  stroke={level === 1 ? "currentColor" : "currentColor"}
                  className={
                    level === 1 ? "text-border" : "text-border/70"
                  }
                  strokeWidth={level === 1 ? 1.5 : 1}
                />
              );
            })}

            {/* 5 trục hướng tâm + nhãn ngắn ở đỉnh */}
            {RADAR_AXES.map((axis) => {
              const outer = polarPoint(axis.angleDeg, MAX_RADIUS);
              const labelPt = polarPoint(axis.angleDeg, MAX_RADIUS + 18);
              const textAnchor =
                Math.abs(labelPt.x - CX) < 8
                  ? "middle"
                  : labelPt.x > CX
                    ? "start"
                    : "end";
              return (
                <g key={axis.key}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="currentColor"
                    className="text-border/80"
                    strokeWidth={1}
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor={textAnchor}
                    dominantBaseline="central"
                    className="fill-muted-foreground text-[9.5px] font-semibold"
                  >
                    {axis.shortLabel}
                  </text>
                </g>
              );
            })}

            {/* Đa giác dữ liệu thực */}
            {hasAnyData && (
              <>
                <polygon
                  fill="#006948"
                  fillOpacity={0.18}
                  points={dataPolygon}
                  stroke="#006948"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                {dataPoints.map((pt, idx) => (
                  <circle
                    key={RADAR_AXES[idx].key}
                    cx={pt.x}
                    cy={pt.y}
                    r={3.5}
                    fill="#006948"
                  />
                ))}
              </>
            )}
          </svg>
        </div>

        {/* Bảng điểm chi tiết 5 trục */}
        <div className="mt-4 w-full space-y-2.5 text-sm">
          {RADAR_AXES.map((axis, idx) => {
            const score = scores[idx];
            const axisHasData = hasAxisData(radar, axis.key, score);
            return (
              <div
                key={axis.key}
                className="flex items-center justify-between gap-3 text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={
                      axisHasData && score > 0
                        ? "inline-block size-2.5 rounded-full bg-primary"
                        : "inline-block size-2.5 rounded-full bg-muted-foreground/30"
                    }
                  />
                  <span>{axis.label}</span>
                </span>
                {axisHasData ? (
                  <span className="font-bold tabular-nums text-foreground">
                    {score.toFixed(1)} / 5.0
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    Chưa có dữ liệu
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
