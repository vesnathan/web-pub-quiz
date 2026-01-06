"use client";

import { Card, CardBody } from "@nextui-org/react";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { AnswerOptions } from "@/components/AnswerOptions";
import { useGameStore } from "@/stores/gameStore";

/**
 * Question phase component
 * Displays the question and answer options for multi-guess mode
 * Players can answer immediately - first correct answer wins
 * Wrong guesses incur escalating penalties
 */
export function QuestionPhase() {
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const selectedAnswer = useGameStore((state) => state.selectedAnswer);
  const revealedAnswer = useGameStore((state) => state.revealedAnswer);
  const isCorrect = useGameStore((state) => state.isCorrect);
  const leftTabDuringQuestion = useGameStore(
    (state) => state.leftTabDuringQuestion,
  );
  const wrongGuesses = useGameStore((state) => state.wrongGuesses);
  const questionWinner = useGameStore((state) => state.questionWinner);
  const questionWinnerName = useGameStore((state) => state.questionWinnerName);
  const lastPenalty = useGameStore((state) => state.lastPenalty);
  const player = useGameStore((state) => state.player);

  // Can answer if: not left tab, question not won yet
  const canAnswer = !leftTabDuringQuestion && !questionWinner;
  const isWinner = questionWinner === player?.id;

  return (
    <div className="space-y-6">
      {/* Question Display */}
      <Card className="bg-gray-800/50 backdrop-blur">
        <CardBody className="p-4 md:p-6">
          <QuestionDisplay question={currentQuestion} />
        </CardBody>
      </Card>

      {/* Mobile: Combined card */}
      <MobileQuestionUI
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        revealedAnswer={revealedAnswer}
        isCorrect={isCorrect}
        canAnswer={canAnswer}
        leftTabDuringQuestion={leftTabDuringQuestion}
        wrongGuesses={wrongGuesses}
        questionWinner={questionWinner}
        questionWinnerName={questionWinnerName}
        isWinner={isWinner}
        lastPenalty={lastPenalty}
      />

      {/* Desktop: Full width card */}
      <DesktopQuestionUI
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        revealedAnswer={revealedAnswer}
        isCorrect={isCorrect}
        canAnswer={canAnswer}
        leftTabDuringQuestion={leftTabDuringQuestion}
        wrongGuesses={wrongGuesses}
        questionWinner={questionWinner}
        questionWinnerName={questionWinnerName}
        isWinner={isWinner}
        lastPenalty={lastPenalty}
      />
    </div>
  );
}

interface QuestionUIProps {
  currentQuestion: { options: string[] } | null;
  selectedAnswer: number | null;
  revealedAnswer: number | null;
  isCorrect: boolean | null;
  canAnswer: boolean;
  leftTabDuringQuestion: boolean;
  wrongGuesses: number[];
  questionWinner: string | null;
  questionWinnerName: string | null;
  isWinner: boolean;
  lastPenalty: number | null;
}

function MobileQuestionUI({
  currentQuestion,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  leftTabDuringQuestion,
  wrongGuesses,
  questionWinner,
  questionWinnerName,
  isWinner,
  lastPenalty,
}: QuestionUIProps) {
  return (
    <Card className="bg-gray-800/50 backdrop-blur md:hidden">
      <CardBody className="p-4 space-y-3">
        {/* Status messages */}
        {questionWinner ? (
          <div className="text-center">
            <div
              className={`text-xl font-bold ${isWinner ? "text-green-400" : "text-purple-400"}`}
            >
              {isWinner ? "You got it!" : `${questionWinnerName} got it!`}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lg font-medium text-gray-300">
              Race to answer!
            </div>
          </div>
        )}

        {/* Answer Options */}
        <AnswerOptions
          options={currentQuestion?.options || []}
          selectedAnswer={selectedAnswer}
          revealedAnswer={revealedAnswer}
          isCorrect={isCorrect}
          canAnswer={canAnswer}
          wrongGuesses={wrongGuesses}
          lastPenalty={lastPenalty}
        />

        {leftTabDuringQuestion && !questionWinner && (
          <div className="text-center text-red-400 text-xs">
            You left the tab. Cannot participate.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DesktopQuestionUI({
  currentQuestion,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  leftTabDuringQuestion,
  wrongGuesses,
  questionWinner,
  questionWinnerName,
  isWinner,
  lastPenalty,
}: QuestionUIProps) {
  return (
    <Card className="hidden md:block bg-gray-800/50 backdrop-blur">
      <CardBody className="p-6">
        {/* Status message */}
        <div className="mb-4 text-center">
          {questionWinner ? (
            <div
              className={`text-2xl font-bold ${isWinner ? "text-green-400" : "text-purple-400"}`}
            >
              {isWinner ? "You got it!" : `${questionWinnerName} got it!`}
            </div>
          ) : leftTabDuringQuestion ? (
            <div className="text-red-400">
              You left the tab during the question. You cannot participate in
              this round.
            </div>
          ) : (
            <div className="text-xl font-medium text-gray-300">
              Race to answer! First correct answer wins.
            </div>
          )}
        </div>

        {/* Answer Options */}
        <AnswerOptions
          options={currentQuestion?.options || []}
          selectedAnswer={selectedAnswer}
          revealedAnswer={revealedAnswer}
          isCorrect={isCorrect}
          canAnswer={canAnswer}
          wrongGuesses={wrongGuesses}
          lastPenalty={lastPenalty}
        />
      </CardBody>
    </Card>
  );
}
