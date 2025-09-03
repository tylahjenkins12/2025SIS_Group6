// src/types.ts
export type MCQ = {
  mcqId: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string; // lecturer knows this
};

export type PublicMCQ = Omit<MCQ, "correctOptionId"> & {
  // when published, include a deadline so clients can show a countdown
  deadlineMs: number; // epoch ms when the round ends
  roundMs: number;    // e.g., 30000
};

export type LeaderboardRow = { name: string; score: number };

export type RoundResults = {
  mcqId: string;
  counts: { optionId: string; count: number }[];
  correctOptionId: string;
  top: LeaderboardRow[];
};

export type BusEvent =
  | { type: "mcq_published"; code: string; mcq: PublicMCQ }
  | {
      type: "answer_submitted";
      code: string;
      student: string;     // nickname
      mcqId: string;
      optionId: string;
      respondedAtMs: number; // client timestamp when they answered
    }
  | { type: "leaderboard_update"; code: string; top: LeaderboardRow[] }
  | { type: "round_results"; code: string; results: RoundResults }
  | { type: "session_ended"; code: string };
