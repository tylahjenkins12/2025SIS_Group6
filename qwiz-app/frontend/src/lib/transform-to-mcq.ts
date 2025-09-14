import type { MCQ } from "@/types";

export function mapFirestoreQuestionToMCQ(q: {
  id?: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}): MCQ {
  const letters = ["a", "b", "c", "d"] as const;
  const opts = (q.options || []).slice(0, 4).map((text, i) => ({
    id: letters[i] || String(i),
    text,
  }));
  let correctId = opts[0]?.id || "a";
  const idx = opts.findIndex((o) => o.text === q.correctAnswer);
  if (idx >= 0 && opts[idx]) correctId = opts[idx].id;
  return {
    mcqId: q.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
    question: q.questionText,
    options: opts,
    correctOptionId: correctId,
  };
}
