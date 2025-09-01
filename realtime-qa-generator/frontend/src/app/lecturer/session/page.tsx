"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MCQ } from "@/types";
import { bus } from "@/lib/bus";

// Sample drafts for the MVP (no backend yet)
const SAMPLE_DRAFTS: MCQ[] = [
  {
    mcqId: "m1",
    question: "Which GCP service runs containers without managing servers?",
    options: [
      { id: "a", text: "Cloud Run" },
      { id: "b", text: "Compute Engine" },
      { id: "c", text: "Bare metal" },
      { id: "d", text: "Filestore" },
    ],
    correctOptionId: "a",
  },
  {
    mcqId: "m2",
    question: "Where should ephemeral session state live in our MVP?",
    options: [
      { id: "a", text: "Memorystore (Redis)" },
      { id: "b", text: "Long-term SQL" },
      { id: "c", text: "Student phones" },
      { id: "d", text: "CSV files" },
    ],
    correctOptionId: "a",
  },
];

export default function LecturerSessionPage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";

  const [drafts, setDrafts] = useState<MCQ[]>(SAMPLE_DRAFTS);
  const [published, setPublished] = useState<MCQ[]>([]);
  const [top, setTop] = useState<{ name: string; score: number }[]>([]);

  // Listen for answers to update the leaderboard
  useEffect(() => {
    if (!code) return;

    const off = bus.on((e) => {
      if (e.type === "answer_submitted" && e.code === code) {
        setTop((prev) => {
          const next = [...prev];
          const i = next.findIndex((x) => x.name === e.student);
          if (i >= 0) {
            next[i] = { ...next[i], score: next[i].score + (e.correct ? 10 : 0) };
          } else {
            next.push({ name: e.student, score: e.correct ? 10 : 0 });
          }
          return next.sort((a, b) => b.score - a.score).slice(0, 10);
        });
      }
    });

    // ✅ Return a function that returns void, not a boolean
    return () => {
      off();
    };
  }, [code]);

  const codeLabel = useMemo(() => code || "N/A", [code]);

  function approve(mcq: MCQ) {
    setDrafts((d) => d.filter((x) => x.mcqId !== mcq.mcqId));
    setPublished((p) => [mcq, ...p]);

    // Publish to students WITHOUT the correctOptionId
    const { correctOptionId, ...publicMcq } = mcq as any;
    bus.emit({ type: "mcq_published", code, mcq: publicMcq });
  }

  function endSession() {
    bus.emit({ type: "session_ended", code });
    router.push("/lecturer");
  }

  if (!code) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Lecturer Session</h2>
        <p className="text-red-700">
          Missing code. Go back to <a className="underline" href="/lecturer">Start a session</a>.
        </p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Left: Drafts and Published */}
      <section className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Draft questions</h3>
          <div className="rounded border px-3 py-1 text-sm">
            Code: <b>{codeLabel}</b>
          </div>
        </div>

        {drafts.length === 0 && (
          <p className="text-sm text-gray-500">No drafts (in a real build, AI drafts will appear here).</p>
        )}

        <ul className="space-y-3">
          {drafts.map((mcq) => (
            <li key={mcq.mcqId} className="rounded-md border p-4">
              <p className="font-medium">{mcq.question}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                {mcq.options.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(mcq)}
                  className="rounded-md bg-black px-3 py-1.5 text-white"
                >
                  Approve & publish
                </button>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-lg font-semibold">Published (what students see)</h3>
        {published.length === 0 && (
          <p className="text-sm text-gray-500">Nothing published yet.</p>
        )}
        <ol className="space-y-3">
          {published.map((mcq) => (
            <li key={mcq.mcqId} className="rounded-md border p-4">
              <p className="font-medium">{mcq.question}</p>
              <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700">
                {mcq.options.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {/* Right: Leaderboard + End */}
      <aside className="space-y-3">
        <h3 className="text-lg font-semibold">Leaderboard</h3>
        <ol className="space-y-1 text-sm">
          {top.length === 0 && <li className="text-gray-500">Waiting for answers…</li>}
          {top.map((t) => (
            <li key={t.name}>
              {t.name} — {t.score}
            </li>
          ))}
        </ol>

        <button onClick={endSession} className="mt-6 w-full rounded-md border px-3 py-2">
          End session
        </button>
      </aside>
    </div>
  );
}
