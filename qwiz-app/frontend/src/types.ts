export type MCQ = {
  mcqId: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string; // lecturer knows this
  explanation?: string; // explanation for the correct answer
};

export type PublicMCQ = Omit<MCQ, "correctOptionId"> & {
  // when published, include a deadline so clients can show a countdown
  deadlineMs: number; // epoch ms when the round ends
  roundMs: number;    // e.g., 30000
  correctAnswer?: string; // included after student submits answer
};

export type LeaderboardRow = { name: string; score: number };

export type RoundResults = {
  mcqId: string;
  counts: { optionId: string; count: number }[];
  correctOptionId: string;
  top: LeaderboardRow[];
};
