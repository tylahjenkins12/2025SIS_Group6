// src/components/Chart.tsx
import * as React from "react";

type Datum = { label: string; value: number; highlight?: boolean };

export function ColumnChart({
  data,
  max = Math.max(1, ...data.map((d) => d.value)),
  height = 180,
}: {
  data: Datum[];
  max?: number;
  height?: number;
}) {
  // Make one equal-width column per data point
  const cols = `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`;
  const usable = Math.max(0, height - 40); // reserve space for labels/values

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid items-end gap-3"
        style={{ height, gridTemplateColumns: cols }}
      >
        {data.map((d) => {
          const h = max ? Math.round((d.value / max) * usable) : 0;
          return (
            <div
              key={d.label}
              className="flex min-w-[64px] flex-col items-center"
            >
              {/* Bar */}
              <div
                className={`mx-auto w-6 sm:w-8 rounded-t-md ${
                  d.highlight ? "bg-indigo-600" : "bg-gray-300"
                }`}
                style={{ height: Math.max(4, h) }}
                title={`${d.label}: ${d.value}`}
              />
              {/* Label + value */}
              <div className="mt-1 break-words text-center text-xs leading-tight text-gray-700">
                {d.label}
              </div>
              <div className="text-[11px] text-gray-500">{d.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
