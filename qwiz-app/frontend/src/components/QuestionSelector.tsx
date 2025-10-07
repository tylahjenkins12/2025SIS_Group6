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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        <CardBody className="p-0">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 p-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  🎯 Review AI Generated Questions
                </h2>
                <p className="text-sm text-slate-600">Select the best question to release to your students</p>
              </div>
              <Button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* Transcript chunk preview */}
            <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-start gap-2 mb-2">
                <div className="text-indigo-600 text-sm">🗣️</div>
                <h3 className="text-sm font-semibold text-indigo-700">Generated from your transcript:</h3>
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">"{transcriptChunk}"</p>
            </div>

            {/* Question options */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                ⚡ AI Generated Questions
                <span className="text-sm font-normal text-slate-500">({questions.length} options)</span>
              </h3>
              {questions.map((question, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                    selectedIndex === idx
                      ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg transform scale-[1.02]"
                      : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedIndex === idx
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300"
                      }`}>
                        {selectedIndex === idx && <div className="w-3 h-3 bg-white rounded-full"></div>}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-slate-900 text-lg leading-tight">
                          {question.question_text}
                        </h4>
                        <div className="flex-shrink-0 ml-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            Option {idx + 1}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {question.options.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
                              option === question.correct_answer
                                ? "bg-green-100 text-green-800 font-medium border border-green-200"
                                : "bg-slate-50 text-slate-700 border border-slate-200"
                            }`}
                          >
                            <span className="font-semibold text-xs text-slate-500">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {option === question.correct_answer &&
                              <span className="text-green-600 font-bold">✓ Correct</span>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-600">
                {selectedIndex !== null ? (
                  <span className="text-green-600 font-medium">✓ Question {selectedIndex + 1} selected</span>
                ) : (
                  <span>Select a question to release to students</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={onDismiss} variant="outline" className="px-6">
                  Cancel
                </Button>
                <Button
                  onClick={handleSelect}
                  disabled={selectedIndex === null || isSelecting}
                  className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {isSelecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Releasing...
                    </>
                  ) : (
                    "🚀 Release to Students"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}