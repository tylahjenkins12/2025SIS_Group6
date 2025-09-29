"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MCQ, LeaderboardRow, PublicMCQ, BusEvent, RoundResults } from "@/types";
import { useBus } from "@/lib/useBus";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";
import { MicCapture } from "@/components/MicCapture";

// Sample draft(s)
const SAMPLE_DRAFTS: MCQ[] = [
  {
    mcqId: "m1",
    question: "Which GCP service runs containers without servers?",
    options: [
      { id: "a", text: "Cloud Run" },
      { id: "b", text: "Compute Engine" },
      { id: "c", text: "Bare metal" },
      { id: "d", text: "Filestore" },
    ],
    correctOptionId: "a",
  },
];

// 15-second rounds
const ROUND_MS = 15_000;
const BASE_SCORE = 600;
const SPEED_BONUS_MAX = 400;

type Answer = { student: string; optionId: string; respondedAtMs: number };

function LecturerSessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";

  // WebSocket-backed bus for this lecturer/session
  const bus = useBus({ sessionId: code, role: "lecturer", name: "lecturer" });

  const [drafts, setDrafts] = useState<MCQ[]>(SAMPLE_DRAFTS);
  const [published, setPublished] = useState<MCQ[]>([]);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [lastResults, setLastResults] = useState<RoundResults | null>(null);
  const [round, setRound] = useState<{
    mcq: MCQ | null;
    deadlineMs: number;
    answers: Answer[];
    ticking: boolean;
    now: number;
  }>({ mcq: null, deadlineMs: 0, answers: [], ticking: false, now: Date.now() });

  // 🔴 live transcript (mic)
  const [transcript, setTranscript] = useState<string>("");

  // Timer tick
  useEffect(() => {
    if (!round.ticking) return;
    const id = setInterval(() => setRound((r) => ({ ...r, now: Date.now() })), 1000);
    return () => clearInterval(id);
  }, [round.ticking]);

  // Subscribe to bus (answers + server-published results)
  useEffect(() => {
    if (!code) return;
    const off = bus.on((e: BusEvent) => {
      // Student answers stream in live
      if (e.type === "answer_submitted" && e.code === code && round.mcq && e.mcqId === round.mcq.mcqId) {
        setRound((r) => {
          if (!r.mcq) return r;
          if (Date.now() > r.deadlineMs) return r;
          if (r.answers.some((a) => a.student === e.student)) return r;
          return {
            ...r,
            answers: [
              ...r.answers,
              { student: e.student, optionId: e.optionId, respondedAtMs: e.respondedAtMs },
            ],
          };
        });
      }
      // If backend emits authoritative round_results, display them
      if (e.type === "round_results" && e.code === code) {
        setLastResults(e.results);
      }
      // If backend emits leaderboard updates, reflect them
      if (e.type === "leaderboard_update" && e.code === code) {
        setTop(e.top);
      }
    });
    return () => off();
  }, [code, bus, round.mcq, round.deadlineMs]);

  const codeLabel = useMemo(() => code || "N/A", [code]);

  // Mic transcript handler (append + broadcast chunk for future features)
  const onTranscript = useCallback(
    (chunk: string) => {
      const clean = chunk.trim();
      if (!clean) return;
      setTranscript((t) => (t ? t + " " + clean : clean));
      // Broadcast so other parts (e.g., auto-question generator) can listen
      bus.emit({ type: "transcript_chunk", code, text: clean, at: Date.now() } as any);
    },
    [code, bus]
  );

  const publish = useCallback(
    (mcq: MCQ) => {
      setDrafts((d) => d.filter((x) => x.mcqId !== mcq.mcqId));
      setPublished((p) => [mcq, ...p]);
      setLastResults(null);

      const now = Date.now();
      const deadlineMs = now + ROUND_MS;
      setRound({ mcq, deadlineMs, answers: [], ticking: true, now });

      const publicMcq: PublicMCQ = {
        mcqId: mcq.mcqId,
        question: mcq.question,
        options: mcq.options,
        deadlineMs,
        roundMs: ROUND_MS,
      };
      bus.emit({ type: "mcq_published", code, mcq: publicMcq });
      setTimeout(finishRound, ROUND_MS + 50);
    },
    [code, bus]
  );

  function finishRound() {
    setRound((r) => {
      if (!r.mcq) return r;
      const correct = r.mcq.correctOptionId;

      // counts per option
      const countsMap = new Map<string, number>();
      r.mcq.options.forEach((o) => countsMap.set(o.id, 0));
      r.answers.forEach((a) => countsMap.set(a.optionId, (countsMap.get(a.optionId) || 0) + 1));
      const counts = r.mcq.options.map((o) => ({ optionId: o.id, count: countsMap.get(o.id) || 0 }));

      // per-student delta for this round
      const byStudentDelta = new Map<string, number>();
      r.answers.forEach((a) => {
        const isCorrect = a.optionId === correct;
        let delta = 0;
        if (isCorrect) {
          const remaining = Math.max(0, r.deadlineMs - a.respondedAtMs);
          const bonus = Math.round((remaining / ROUND_MS) * SPEED_BONUS_MAX);
          delta = BASE_SCORE + bonus;
        }
        byStudentDelta.set(a.student, (byStudentDelta.get(a.student) || 0) + delta);
      });

      // compute new leaderboard from existing top + deltas
      const nextTotals = new Map<string, number>(top.map((x) => [x.name, x.score]));
      for (const [name, delta] of byStudentDelta.entries()) {
        nextTotals.set(name, (nextTotals.get(name) || 0) + delta);
      }
      const sorted: LeaderboardRow[] = Array.from(nextTotals.entries())
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // broadcast updates (client-side for now; later move to server authority)
      bus.emit({ type: "leaderboard_update", code, top: sorted });

      const results: RoundResults = {
        mcqId: r.mcq.mcqId,
        counts,
        correctOptionId: correct,
        top: sorted,
      };
      bus.emit({ type: "round_results", code, results });

      // commit UI state
      setTop(sorted);
      return { ...r, ticking: false };
    });
  }

  function endSession() {
    if (!confirm("End session for everyone?")) return;
    bus.emit({ type: "session_ended", code });
    router.push("/lecturer");
  }

  const timeLeft = Math.max(0, round.deadlineMs - round.now);
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const progressPct = round.mcq ? Math.max(0, Math.min(100, (timeLeft / ROUND_MS) * 100)) : 0;

  const startNextDraft = () => {
    if (round.ticking) return;
    if (drafts.length > 0) publish(drafts[0]);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeLabel);
    } catch {}
  };

  if (!code) {
    return (
      <p className="text-red-700">
        Missing code. Go back to <a className="underline" href="/lecturer">Start</a>.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📝</div>
          <h2 className="text-xl font-semibold tracking-tight">Live session</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Code: {codeLabel}</Badge>
          <Button variant="ghost" onClick={copyCode}>Copy</Button>

          {/* 🎙 Mic capture (browser STT for MVP; switch to mode="server" when /api/stt is wired) */}
          <MicCapture mode="browser" onTranscript={onTranscript} />

          <Button onClick={startNextDraft} disabled={round.ticking || drafts.length === 0}>
            ▶ Start round
          </Button>
          <Button variant="secondary" onClick={endSession}>End session</Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* LEFT */}
        <div className="md:col-span-2 space-y-6">
          {/* Drafts */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">🧪 Draft questions</h3>
              {drafts.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">No drafts (add more samples if needed).</p>
              )}
              <ul className="mt-4 space-y-3">
                {drafts.map((mcq) => (
                  <li key={mcq.mcqId} className="rounded-xl border p-4">
                    <p className="font-medium">{mcq.question}</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {mcq.options.map((o) => (
                        <li
                          key={o.id}
                          className="rounded-lg border bg-white/70 px-3 py-2 text-sm text-gray-800 opacity-70"
                          aria-disabled
                        >
                          {o.text}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <Button onClick={() => publish(mcq)} disabled={round.ticking}>
                        ▶ Start 15s round
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Live round */}
          {round.mcq && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">⏱️ Round in progress</h3>
                  <Badge>{secondsLeft}s left</Badge>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to purple-500 transition-[width] duration-1000"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-3 font-medium">{round.mcq.question}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Answers received: <b>{round.answers.length}</b>
                </p>
              </CardBody>
            </Card>
          )}

          {/* ✅ Round results */}
          {lastResults && !round.ticking && (
            <Card>
              <CardBody className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">✅ Round results</h3>
                  <span className="text-xs text-gray-500">
                    Correct:{" "}
                    {round.mcq?.options.find((o) => o.id === lastResults.correctOptionId)?.text ??
                      lastResults.correctOptionId}
                  </span>
                </div>

                <div className="mt-3 h-px w-full bg-gray-200/70" />

                <div className="mt-4 w-full overflow-x-auto">
                  <div className="min-w-[480px]">
                    {lastResults.counts.every((c) => c.count === 0) ? (
                      <p className="text-sm text-gray-600">No answers this round.</p>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                        <ColumnChart
                          height={220}
                          data={lastResults.counts.map((c) => ({
                            label:
                              (round.mcq?.options.find((o) => o.id === c.optionId)?.text ?? c.optionId) +
                              (c.optionId === lastResults.correctOptionId ? " ✓" : ""),
                            value: c.count,
                            highlight: c.optionId === lastResults.correctOptionId,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 🗣️ Live transcript preview */}
          {transcript && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">🗣️ Live transcript (preview)</h3>
                  <Button variant="ghost" onClick={() => setTranscript("")}>
                    Clear
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{transcript}</p>
              </CardBody>
            </Card>
          )}

          {/* History of published questions */}
          {published.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold">🗂️ Published (history)</h3>
                <ol className="mt-3 space-y-3">
                  {published.map((mcq) => (
                    <li key={mcq.mcqId} className="rounded-xl border p-4">
                      <p className="font-medium">{mcq.question}</p>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🏆 Leaderboard</h3>
                <span className="text-xs text-gray-500">Top 10</span>
              </div>
              <ol className="mt-2 space-y-1 text-sm">
                {top.length === 0 && <li className="text-gray-500">Waiting for answers…</li>}
                {top.map((t, i) => (
                  <li key={t.name} className="flex justify-between rounded-md px-2 py-1 hover:bg-gray-50">
                    <span>
                      <span className="mr-2 text-gray-500">#{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="font-medium">{t.score}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LecturerSessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LecturerSessionContent />
    </Suspense>
  );
}
