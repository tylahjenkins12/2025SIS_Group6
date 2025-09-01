"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusEvent } from "@/types";
import { bus } from "@/lib/bus";

type PublicMCQ = {
  mcqId: string;
  question: string;
  options: { id: string; text: string }[];
};

export default function StudentPlayPage() {
  const code = useMemo(() => sessionStorage.getItem("mvp_code") ?? "", []);
  const name = useMemo(() => sessionStorage.getItem("mvp_name") ?? "Anon", []);

  const [current, setCurrent] = useState<PublicMCQ | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (!code) return;

    // Subscribe to bus events
    const off = bus.on((e: BusEvent) => {
      if (e.type === "mcq_published" && e.code === code) {
        setCurrent(e.mcq);
        setPicked(null);
        setResult(null);
      } else if (e.type === "session_ended" && e.code === code) {
        setCurrent(null);
        alert("Session ended");
      }
    });

    // ✅ Cleanup properly
    return () => {
      off();
    };
  }, [code]);

  function submit(optId: string) {
    if (!current || picked) return;

    setPicked(optId);

    // In this MVP we simulate correctness (random ~60%)
    const correct = Math.random() < 0.6;
    setResult(correct ? "correct" : "wrong");

    bus.emit({
      type: "answer_submitted",
      code,
      student: name,
      mcqId: current.mcqId,
      correct,
    });
  }

  if (!code) {
    return <p className="text-red-700">No session code — go back and join first.</p>;
  }

  return (
    <section className="max-w-2xl space-y-4">
      <div className="rounded border p-3 text-sm">
        You are <b>{name}</b> in session <b>{code}</b>
      </div>

      {!current && (
        <p className="text-gray-600">Waiting for the lecturer to publish a question…</p>
      )}

      {current && (
        <div className="rounded-md border p-4">
          <p className="font-medium">{current.question}</p>
          <ul className="mt-4 space-y-2">
            {current.options.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => submit(o.id)}
                  disabled={!!picked}
                  className={`w-full rounded-md border px-3 py-2 text-left ${
                    picked === o.id ? "bg-gray-100" : ""
                  }`}
                >
                  {o.text}
                </button>
              </li>
            ))}
          </ul>
          {result && (
            <p
              className={`mt-3 text-sm ${
                result === "correct" ? "text-green-700" : "text-red-700"
              }`}
            >
              {result === "correct" ? "✅ Correct!" : "❌ Not quite."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
