"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MCQ, LeaderboardRow, PublicMCQ, BusEvent, RoundResults } from "@/types";
import { bus } from "@/lib/bus";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";

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

const ROUND_MS = 30_000;           // 30 seconds
const BASE_SCORE = 600;            // for correctness
const SPEED_BONUS_MAX = 400;       // scale remaining time into bonus (0..400)

type Answer = { student: string; optionId: string; respondedAtMs: number };

function LecturerSessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";

  const [drafts, setDrafts] = useState<MCQ[]>(SAMPLE_DRAFTS);
  const [published, setPublished] = useState<MCQ[]>([]);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [round, setRound] = useState<{
    mcq: MCQ | null;
    deadlineMs: number;
    answers: Answer[];
    ticking: boolean;
  }>({ mcq: null, deadlineMs: 0, answers: [], ticking: false });

  // Subscribe to answers
  useEffect(() => {
    if (!code) return;
    const off = bus.on((e: BusEvent) => {
      if (e.type === "answer_submitted" && e.code === code && round.mcq && e.mcqId === round.mcq.mcqId) {
        // Record answer once per student per round
        setRound((r) => {
          if (!r.mcq) return r;
          if (Date.now() > r.deadlineMs) return r; // too late
          if (r.answers.some((a) => a.student === e.student)) return r; // already answered
          return { ...r, answers: [...r.answers, { student: e.student, optionId: e.optionId, respondedAtMs: e.respondedAtMs }] };
        });
      }
    });
    return () => { off(); };
  }, [code, round.mcq, round.deadlineMs]);

  const codeLabel = useMemo(() => code || "N/A", [code]);

  function publish(mcq: MCQ) {
    // Move draft -> published list (history)
    setDrafts((d) => d.filter((x) => x.mcqId !== mcq.mcqId));
    setPublished((p) => [mcq, ...p]);

    const now = Date.now();
    const deadlineMs = now + ROUND_MS;

    // Start the round
    setRound({ mcq, deadlineMs, answers: [], ticking: true });

    // Publish to students WITHOUT the correct answer, include deadline
    const publicMcq: PublicMCQ = {
      mcqId: mcq.mcqId,
      question: mcq.question,
      options: mcq.options,
      deadlineMs,
      roundMs: ROUND_MS,
    };
    bus.emit({ type: "mcq_published", code, mcq: publicMcq });

    // End the round when time is up (single-shot)
    setTimeout(finishRound, ROUND_MS + 50);
  }

  function finishRound() {
    setRound((r) => {
      if (!r.mcq) return r;
      const correct = r.mcq.correctOptionId;

      // Tally counts
      const countsMap = new Map<string, number>();
      r.mcq.options.forEach((o) => countsMap.set(o.id, 0));
      r.answers.forEach((a) => countsMap.set(a.optionId, (countsMap.get(a.optionId) || 0) + 1));
      const counts = r.mcq.options.map((o) => ({ optionId: o.id, count: countsMap.get(o.id) || 0 }));

      // Scoreboard: correctness + speed
      const byStudent = new Map<string, number>(); // delta score this round
      r.answers.forEach((a) => {
        const isCorrect = a.optionId === correct;
        let delta = 0;
        if (isCorrect) {
          const remaining = Math.max(0, r.deadlineMs - a.respondedAtMs);
          const bonus = Math.round((remaining / ROUND_MS) * SPEED_BONUS_MAX);
          delta = BASE_SCORE + bonus;
        }
        byStudent.set(a.student, (byStudent.get(a.student) || 0) + delta);
      });

      // Merge into global leaderboard
      setTop((prev) => {
        const next = new Map<string, number>(prev.map((x) => [x.name, x.score]));
        for (const [name, delta] of byStudent.entries()) {
          next.set(name, (next.get(name) || 0) + delta);
        }
        const sorted = Array.from(next.entries())
          .map(([name, score]) => ({ name, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        // broadcast
        bus.emit({ type: "leaderboard_update", code, top: sorted });
        return sorted;
      });

      // Broadcast round results (for chart)
      const results = {
        mcqId: r.mcq.mcqId,
        counts,
        correctOptionId: correct,
        top: top, // current top from state; fine for MVP
      } satisfies RoundResults;
      bus.emit({ type: "round_results", code, results });

      return { ...r, ticking: false };
    });
  }

  function endSession() {
    bus.emit({ type: "session_ended", code });
    router.push("/lecturer");
  }

  if (!code) {
    return <p className="text-red-700">Missing code. Go back to <a className="underline" href="/lecturer">Start</a>.</p>;
  }

  const timeLeft = Math.max(0, round.deadlineMs - Date.now());
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Draft questions</h3>
              <Badge>Code: {codeLabel}</Badge>
            </div>

            {drafts.length === 0 && <p className="mt-2 text-sm text-gray-500">No drafts (add more samples if needed).</p>}

            <ul className="mt-4 space-y-3">
              {drafts.map((mcq) => (
                <li key={mcq.mcqId} className="rounded-xl border p-4">
                  <p className="font-medium">{mcq.question}</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                    {mcq.options.map((o) => <li key={o.id}>{o.text}</li>)}
                  </ul>
                  <div className="mt-3">
                    <Button onClick={() => publish(mcq)}>Start 30s round</Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Live round status */}
        {round.mcq && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Round in progress</h3>
                <Badge>{secondsLeft}s left</Badge>
              </div>
              <p className="mt-2 font-medium">{round.mcq.question}</p>
              <p className="mt-1 text-sm text-gray-600">
                Answers received: <b>{round.answers.length}</b>
              </p>
            </CardBody>
          </Card>
        )}

        {/* History of published questions (optional) */}
        {published.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">Published (history)</h3>
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

      {/* Leaderboard */}
      <div className="space-y-6">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold">Leaderboard</h3>
            <ol className="mt-2 space-y-1 text-sm">
              {top.length === 0 && <li className="text-gray-500">Waiting for answers…</li>}
              {top.map((t) => <li key={t.name}>{t.name} — {t.score}</li>)}
            </ol>
          </CardBody>
        </Card>

        <Button variant="secondary" className="w-full" onClick={endSession}>End session</Button>
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
