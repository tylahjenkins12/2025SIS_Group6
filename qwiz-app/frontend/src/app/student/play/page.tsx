"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BusEvent, LeaderboardRow, PublicMCQ, RoundResults } from "@/types";
import { useBus } from "@/lib/useBus";
import { Card, CardBody, Button } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";


const OVERLAY_MS = 3500;

export default function StudentPlayPage() {
  const router = useRouter();

  // Read session + name AFTER mount to avoid hydration mismatch
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    try {
      setCode(sessionStorage.getItem("mvp_code") ?? "");
      setName(sessionStorage.getItem("mvp_name") ?? "Anon");
    } catch {
      setCode("");
      setName("Anon");
    }
  }, []);

  // WS-backed event bus bound to this session + role
  const bus = useBus({ sessionId: code ?? "", role: "student", name: name ?? "Anon" });

  const [current, setCurrent] = useState<PublicMCQ | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [results, setResults] = useState<RoundResults | null>(null);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [showFullLB, setShowFullLB] = useState(false);

  // helper to close overlay
  const hideOverlay = useCallback(() => setShowFullLB(false), []);

  // close overlay on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hideOverlay]);

  // Subscribe to bus (questions, results, leaderboard, session end)
  useEffect(() => {
    if (!code) return;

    const off = bus.on((e: BusEvent) => {
      if (e.code !== code) return;

      if (e.type === "mcq_published") {
        setCurrent(e.mcq);
        setPicked(null);
        setResults(null);
        setShowFullLB(false);
        tickCountdown(e.mcq.deadlineMs, e.mcq.roundMs);
      } else if (e.type === "round_results") {
        setResults(e.results);
        setCurrent(null); // round ended
        setProgressPct(0);
        setSecondsLeft(0);
        // flash overlay for the leaderboard
        setShowFullLB(true);
        window.setTimeout(() => setShowFullLB(false), OVERLAY_MS);
      } else if (e.type === "leaderboard_update") {
        setTop(e.top);
      } else if (e.type === "session_ended") {
        setCurrent(null);
        setResults(null);
        setShowFullLB(false);
        alert("Session ended");
      }
    });

    return () => off();
  }, [code, bus]);

  // Countdown ticker with progress bar
  function tickCountdown(deadlineMs: number, roundMs: number) {
    const update = () => {
      const remaining = Math.max(0, deadlineMs - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
      setProgressPct(Math.max(0, Math.min(100, (remaining / roundMs) * 100)));
      if (remaining <= 0) window.clearInterval(id);
    };
    update();
    const id = window.setInterval(update, 250);
  }

  function submit(optionId: string) {
    if (!current || picked || secondsLeft <= 0) return;
    setPicked(optionId);

    bus.emit({
      type: "answer_submitted",
      code: code!, // non-null after mount
      student: name ?? "Anon",
      mcqId: current.mcqId,
      optionId,
      respondedAtMs: Date.now(),
    });
  }

  function leaveSession() {
    if (!confirm("Leave this session? You can rejoin with the code.")) return;
    try {
      sessionStorage.removeItem("mvp_code");
      sessionStorage.removeItem("mvp_name");
    } catch {}
    router.push("/student");
  }


  // Fullscreen Leaderboard overlay
  const FullscreenLeaderboard = () => (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={hideOverlay}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(100%,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🏆 Leaderboard</h2>
          <Button variant="ghost" onClick={hideOverlay} aria-label="Close leaderboard">
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Top-10 list */}
          <div>
            <ol className="space-y-1 text-sm">
              {top.slice(0, 10).map((t, i) => (
                <li
                  key={t.name}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    t.name === name ? "bg-indigo-50" : "bg-transparent"
                  }`}
                >
                  <span className="truncate">
                    <span className="mr-2 text-gray-500">#{i + 1}</span>
                    <b className={t.name === name ? "text-indigo-700" : ""}>{t.name}</b>
                  </span>
                  <span className="font-medium">{t.score}</span>
                </li>
              ))}
              {top.length === 0 && (
                <li className="text-gray-500">Waiting for scores…</li>
              )}
            </ol>
          </div>

          {/* Chart: how close everyone is */}
          <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
            <ColumnChart
              height={240}
              data={(top.length ? top : []).slice(0, 10).map((t) => ({
                label: t.name === name ? `${t.name} (you)` : t.name,
                value: t.score,
                highlight: t.name === name,
              }))}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Showing top 10 for a moment… resuming quiz view.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 pt-20 pb-12 sm:px-6 lg:px-8">
      {/* Overlay */}
      {showFullLB && <FullscreenLeaderboard />}

      {/* Top bar: identity + leave */}
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
          You are <b>{name}</b> in session <b>{code}</b>
        </div>
        <Button variant="secondary" onClick={leaveSession}>
          Leave session
        </Button>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Waiting state */}
          {!current && !results && (
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold">🎤 Waiting for the next question…</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Hang tight—your lecturer will release a question soon. Keep this tab open.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Live round */}
          {current && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Time left</h3>
                  <div className="rounded-full bg-indigo-600 px-3 py-1 text-sm text-white">
                    {secondsLeft}s
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-200"
                    style={{ width: `${progressPct}%` }}
                    aria-hidden
                  />
                </div>

                <p className="mt-3 font-medium">{current.question}</p>

                <ul className="mt-4 space-y-2">
                  {current.options.map((o) => {
                    const isPicked = picked === o.id;
                    return (
                      <li key={o.id}>
                        <button
                          onClick={() => submit(o.id)}
                          disabled={!!picked || secondsLeft <= 0}
                          className={[
                            "w-full rounded-xl border px-4 py-3 text-left shadow-sm transition",
                            "hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300",
                            !!picked || secondsLeft <= 0 ? "cursor-not-allowed opacity-95" : "",
                            isPicked ? "border-indigo-300 bg-indigo-50" : "border-gray-300 bg-white/90",
                          ].join(" ")}
                        >
                          {o.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {picked && (
                  <p className="mt-3 text-sm text-gray-600">Answer locked in ✅</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardBody className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Class results</h3>
                    <p className="text-sm text-gray-600">
                      Number of students who chose each option
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Correct: <b>{results.correctOptionId.toUpperCase()}</b>
                  </div>
                </div>

                {/* Divider */}
                <div className="mt-3 h-px w-full bg-gray-200/70" />

                <div className="mt-4 rounded-xl border border-gray-200 bg-white/70 p-3">
                  <ColumnChart
                    height={220}
                    data={results.counts.map((c) => ({
                      label: c.optionId.toUpperCase(),
                      value: c.count,
                      // highlight correct answer
                      highlight: c.optionId === results.correctOptionId,
                    }))}
                  />
                </div>

                {/* Personal feedback */}
                {picked && (
                  <p className="mt-3 text-sm">
                    Your answer:{" "}
                    <b>{picked.toUpperCase()}</b>{" "}
                    {picked === results.correctOptionId ? (
                      <span className="text-green-600">✅ Correct</span>
                    ) : (
                      <span className="text-red-600">❌ Incorrect</span>
                    )}
                  </p>
                )}

                {/* CTA: show overlay again */}
                <div className="mt-4">
                  <Button variant="ghost" onClick={() => setShowFullLB(true)}>
                    View full leaderboard
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar: leaderboard */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">Leaderboard</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {top.length === 0 && (
                  <li className="text-gray-500">Waiting for updates…</li>
                )}
                {top.map((t, i) => (
                  <li
                    key={t.name}
                    className={`flex justify-between rounded-md px-2 py-1 hover:bg-gray-50 ${
                      t.name === name ? "bg-indigo-50" : ""
                    }`}
                  >
                    <span className="truncate">
                      <span className="mr-2 text-gray-500">#{i + 1}</span>
                      <b className={t.name === name ? "text-indigo-700" : ""}>{t.name}</b>
                    </span>
                    <span className="font-medium">{t.score}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
