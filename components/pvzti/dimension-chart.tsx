"use client";

import type { Dimensions, DimensionKey } from "@/lib/pvzti/types";
import { dimensionMetas } from "@/lib/pvzti/dimensions";
import { cn } from "@/lib/utils";

const dimColorClass: Record<DimensionKey, string> = {
  edge: "bg-dim-edge",
  resonance: "bg-dim-resonance",
  order: "bg-dim-order",
  tenacity: "bg-dim-tenacity",
  bond: "bg-dim-bond",
};

interface DimensionChartProps {
  dimensions: Dimensions;
  compareDimensions?: Dimensions;
  className?: string;
}

export function DimensionChart({ dimensions, compareDimensions, className }: DimensionChartProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {dimensionMetas.map((meta) => {
        const value = dimensions[meta.key];
        const compareValue = compareDimensions?.[meta.key];
        return (
          <div key={meta.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{meta.lowLabel}</span>
              <span className="font-medium">{meta.name}</span>
              <span className="text-muted-foreground">{meta.highLabel}</span>
            </div>
            <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", dimColorClass[meta.key])}
                style={{ width: `${value}%` }}
              />
              {compareValue !== undefined && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                  style={{ left: `${compareValue}%` }}
                  title={`你的得分: ${compareValue}`}
                />
              )}
            </div>
            <div className="text-center text-xs text-muted-foreground">{value}%</div>
          </div>
        );
      })}
    </div>
  );
}
