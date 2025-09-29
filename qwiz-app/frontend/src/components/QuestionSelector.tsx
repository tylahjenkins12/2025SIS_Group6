"use client";
import React, { useState } from "react";
import { Button, Card, CardBody } from "@/components/ui";

interface Question {
  index: number;
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface QuestionSelectorProps {
  questions: Question[];
  transcriptChunk: string;
  chunkId: string;
  onQuestionSelect: (selectedIndex: number, chunkId: string) => void;
  onDismiss: () => void;
}

export function QuestionSelector({
  questions,
  transcriptChunk,
  chunkId,
  onQuestionSelect,
  onDismiss
}: QuestionSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelect = async () => {
    if (selectedIndex === null) return;

    setIsSelecting(true);
    try {
      await onQuestionSelect(selectedIndex, chunkId);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardBody className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Select Question to Release</h2>
            <Button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600"
              variant="ghost"
            >
              ✕
            </Button>
          </div>

          {/* Transcript chunk preview */}
          <div className="mb-6 p-3 bg-slate-100 rounded-md">
            <h3 className="text-sm font-medium text-slate-700 mb-2">From transcript:</h3>
            <p className="text-sm text-slate-600 italic">"{transcriptChunk}"</p>
          </div>

          {/* Question options */}
          <div className="space-y-4 mb-6">
            {questions.map((question, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedIndex === idx
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSelectedIndex(idx)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="question-selection"
                    checked={selectedIndex === idx}
                    onChange={() => setSelectedIndex(idx)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-2">
                      Option {idx + 1}: {question.question_text}
                    </h4>
                    <div className="space-y-1">
                      {question.options.map((option, optIdx) => (
                        <div
                          key={optIdx}
                          className={`text-sm px-2 py-1 rounded ${
                            option === question.correct_answer
                              ? "bg-green-100 text-green-800 font-medium"
                              : "text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {option}
                          {option === question.correct_answer && " ✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <Button onClick={onDismiss} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={selectedIndex === null || isSelecting}
            >
              {isSelecting ? "Releasing..." : "Release Question to Students"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}