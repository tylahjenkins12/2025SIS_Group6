export type MCQ = {
    mcqId: string;
    question: string;
    options: { id: string; text: string }[];
    correctOptionId: string; // kept client-side for MVP
  };
  
  export type BusEvent =
    | { type: "mcq_published"; code: string; mcq: Omit<MCQ, "correctOptionId"> } // students don’t see correct answer
    | { type: "leaderboard_update"; code: string; top: { name: string; score: number }[] }
    | { type: "answer_submitted"; code: string; student: string; mcqId: string; correct: boolean }
    | { type: "session_ended"; code: string };
  