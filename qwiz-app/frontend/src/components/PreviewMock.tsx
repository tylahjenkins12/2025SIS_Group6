"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function PreviewMock({ duration = 20 }: { duration?: number }) {
  const [t, setT] = useState(duration);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reduceMotion) {
      const id = setInterval(() => {
        setT((prev) => (prev <= 1 ? duration : prev - 1));
      }, 1000);
      return () => clearInterval(id);
    }

    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const elapsed = (now - start.current) / 1000;
      const remaining = Math.max(duration - elapsed, 0);
      setT(remaining);
      if (remaining <= 0) {
        start.current = now;
        setT(duration);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      start.current = null;
    };
  }, [duration, reduceMotion]);

  const pct = Math.max(0, Math.min(100, (t / duration) * 100));
  const seconds = Math.ceil(t);

  return (
    <div className="grid w-full grid-cols-1 sm:grid-cols-2">
      {/* Left: Question */}
      <div className="p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-sm font-medium text-slate-700">Question 3</h5>
          <div className="text-xs tabular-nums text-slate-600">{seconds}s left</div>
        </div>

        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(t)}
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-150 ease-linear will-change-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-4 text-lg font-semibold text-slate-900">
          What is the time complexity of binary search?
        </p>
        <ul className="mt-4 space-y-2">
          {["O(n)", "O(log n)", "O(n log n)", "O(1)"].map((opt, i) => (
            <li
              key={opt}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {String.fromCharCode(65 + i)}. {opt}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Leaderboard */}
      <div className="p-6">
        <h5 className="text-sm font-medium text-slate-700">Leaderboard</h5>
        <ol className="mt-3 space-y-2">
          {[
            ["Ava", 420],
            ["Noah", 390],
            ["Mia", 360],
            ["Leo", 310],
            ["Zoe", 300],
          ].map(([name, score], i) => (
            <li
              key={name as string}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {i + 1}. {name}
              </span>
              <span className="tabular-nums text-slate-600">{score} pts</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Instant scoring & insights update as students answer.
        </p>
      </div>
    </div>
  );
}
