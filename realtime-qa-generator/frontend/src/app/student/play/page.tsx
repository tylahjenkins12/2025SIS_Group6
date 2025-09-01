"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusEvent, LeaderboardRow, PublicMCQ, RoundResults } from "@/types";
import { bus } from "@/lib/bus";
import { Card, CardBody } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";

export default function StudentPlayPage() {
  const code = useMemo(() => sessionStorage.getItem("mvp_code") ?? "", []);
  const name = useMemo(() => sessionStorage.getItem("mvp_name") ?? "Anon", []);

  const [current, setCurrent] = useState<PublicMCQ | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [results, setResults] = useState<RoundResults | null>(null);
  const [top, setTop] = useState<LeaderboardRow[]>([]);

  // Subscribe to events
  useEffect(() => {
    if (!code) return;

    const off = bus.on((e: BusEvent) => {
      if (e.type === "mcq_published" && e.code === code) {
        setCurrent(e.mcq);
        setPicked(null);
        setResults(null);
        tickCountdown(e.mcq.deadlineMs);
      } else if (e.type === "round_results" && e.code === code) {
        setResults(e.results);
        setCurrent(null); // round ended
      } else if (e.type === "leaderboard_update" && e.code === code) {
        setTop(e.top);
      } else if (e.type === "session_ended" && e.code === code) {
        setCurrent(null);
        setResults(null);
        alert("Session ended");
      }
    });

    return () => { off(); };
  }, [code]);

  // Countdown ticker
  function tickCountdown(deadlineMs: number) {
    const update = () => {
      const ms = Math.max(0, deadlineMs - Date.now());
      setSecondsLeft(Math.ceil(ms / 1000));
      if (ms <= 0) clearInterval(id);
    };
    update();
    const id = setInterval(update, 250);
  }

  function submit(optionId: string) {
    if (!current || picked || secondsLeft <= 0) return;
    setPicked(optionId);

    bus.emit({
      type: "answer_submitted",
      code,
      student: name,
      mcqId: current.mcqId,
      optionId,
      respondedAtMs: Date.now(),
    });
  }

  if (!code) return <p className="text-red-700">No session code — go back and join.</p>;

  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        {/* Live round */}
        {current && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Time left</h3>
                <div className="rounded-full bg-blue-600 px-3 py-1 text-sm text-white">{secondsLeft}s</div>
              </div>
              <p className="mt-3 font-medium">{current.question}</p>
              <ul className="mt-4 space-y-2">
                {current.options.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => submit(o.id)}
                      disabled={!!picked || secondsLeft <= 0}
                      className={`w-full rounded-md border px-3 py-2 text-left ${picked === o.id ? "bg-blue-50 border-blue-300" : ""}`}
                    >
                      {o.text}
                    </button>
                  </li>
                ))}
              </ul>
              {picked && <p className="mt-3 text-sm text-gray-600">Answer locked in ✅</p>}
            </CardBody>
          </Card>
        )}

        {/* Results chart */}
        {results && (
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">Class results</h3>
              <p className="text-sm text-gray-600">Number of students who chose each option</p>
              <div className="mt-4">
                <ColumnChart
                  data={results.counts.map((c) => ({
                    label: c.optionId.toUpperCase(),
                    value: c.count,
                    highlight: c.optionId === results.correctOptionId,
                  }))}
                />
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Correct option: <b>{results.correctOptionId.toUpperCase()}</b>
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Leaderboard (shared) */}
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">
              You are <b>{name}</b> in session <b>{code}</b>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold">Leaderboard</h3>
            <ol className="mt-2 space-y-1 text-sm">
              {top.length === 0 && <li className="text-gray-500">Waiting for updates…</li>}
              {top.map((t) => (
                <li key={t.name}>
                  {t.name} — {t.score}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
