// src/components/Chart.tsx
import * as React from "react";

export function ColumnChart({
  data,
  max = Math.max(1, ...data.map((d) => d.value)),
  height = 140,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  max?: number;
  height?: number;
}) {
  return (
    <div className="w-full">
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d) => {
          const h = max ? Math.round((d.value / max) * (height - 24)) : 0;
          return (
            <div key={d.label} className="flex w-12 flex-col items-center">
              <div
                className={`w-8 rounded-t-md ${d.highlight ? "bg-blue-600" : "bg-gray-300"}`}
                style={{ height: Math.max(4, h) }}
                title={`${d.label}: ${d.value}`}
              />
              <div className="mt-1 text-xs text-gray-700">{d.label}</div>
              <div className="text-[11px] text-gray-500">{d.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
