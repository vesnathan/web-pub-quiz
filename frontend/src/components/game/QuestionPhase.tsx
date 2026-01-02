"use client";

import { Card, CardBody } from "@nextui-org/react";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { AnswerOptions } from "@/components/AnswerOptions";
import { Buzzer } from "@/components/Buzzer";
import { AnswerCountdown } from "@/components/AnswerCountdown";
import { useGameStore } from "@/stores/gameStore";

/**
 * Question phase component
 * Displays the question, buzzer, and answer options
 * Handles both mobile and desktop layouts
 */
export function QuestionPhase() {
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const questionIndex = useGameStore((state) => state.questionIndex);
  const totalQuestions = useGameStore((state) => state.totalQuestions);
  const buzzerEnabled = useGameStore((state) => state.buzzerEnabled);
  const buzzerWinner = useGameStore((state) => state.buzzerWinner);
  const buzzerWinnerName = useGameStore((state) => state.buzzerWinnerName);
  const answerDeadline = useGameStore((state) => state.answerDeadline);
  const selectedAnswer = useGameStore((state) => state.selectedAnswer);
  const revealedAnswer = useGameStore((state) => state.revealedAnswer);
  const isCorrect = useGameStore((state) => state.isCorrect);
  const leftTabDuringQuestion = useGameStore(
    (state) => state.leftTabDuringQuestion,
  );
  const player = useGameStore((state) => state.player);

  const isMyTurn = buzzerWinner === player?.id;
  const canBuzz = buzzerEnabled && !buzzerWinner && !leftTabDuringQuestion;
  const canAnswer =
    isMyTurn && answerDeadline !== null && !leftTabDuringQuestion;

  return (
    <div className="space-y-6">
      {/* Question Display */}
      <Card className="bg-gray-800/50 backdrop-blur">
        <CardBody className="p-4 md:p-6">
          <QuestionDisplay
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
          />
        </CardBody>
      </Card>

      {/* Mobile: Combined card */}
      <MobileQuestionUI
        isMyTurn={isMyTurn}
        buzzerWinner={buzzerWinner}
        buzzerWinnerName={buzzerWinnerName}
        answerDeadline={answerDeadline}
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        revealedAnswer={revealedAnswer}
        isCorrect={isCorrect}
        canAnswer={canAnswer}
        canBuzz={canBuzz}
        leftTabDuringQuestion={leftTabDuringQuestion}
      />

      {/* Desktop: Separate cards side by side */}
      <DesktopQuestionUI
        isMyTurn={isMyTurn}
        buzzerWinner={buzzerWinner}
        buzzerWinnerName={buzzerWinnerName}
        answerDeadline={answerDeadline}
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        revealedAnswer={revealedAnswer}
        isCorrect={isCorrect}
        canAnswer={canAnswer}
        canBuzz={canBuzz}
        leftTabDuringQuestion={leftTabDuringQuestion}
      />
    </div>
  );
}

interface QuestionUIProps {
  isMyTurn: boolean;
  buzzerWinner: string | null;
  buzzerWinnerName: string | null;
  answerDeadline: number | null;
  currentQuestion: { options: string[] } | null;
  selectedAnswer: number | null;
  revealedAnswer: number | null;
  isCorrect: boolean | null;
  canAnswer: boolean;
  canBuzz: boolean;
  leftTabDuringQuestion: boolean;
}

function MobileQuestionUI({
  isMyTurn,
  buzzerWinner,
  buzzerWinnerName,
  answerDeadline,
  currentQuestion,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  canBuzz,
  leftTabDuringQuestion,
}: QuestionUIProps) {
  return (
    <Card className="bg-gray-800/50 backdrop-blur md:hidden">
      <CardBody className="p-4 space-y-3">
        {/* Status messages */}
        {!isMyTurn && buzzerWinner && (
          <div className="text-center text-purple-400 text-sm">
            {buzzerWinnerName} is answering...
          </div>
        )}
        {isMyTurn && (
          <div className="text-center">
            <div className="text-xl font-bold text-primary-400 animate-pulse">
              Answer Now!
            </div>
            {answerDeadline && <AnswerCountdown deadline={answerDeadline} />}
          </div>
        )}

        {/* Answer Options */}
        <AnswerOptions
          options={currentQuestion?.options || []}
          selectedAnswer={selectedAnswer}
          revealedAnswer={revealedAnswer}
          isCorrect={isCorrect}
          canAnswer={canAnswer}
        />

        {/* Buzzer - only show when no one has buzzed */}
        {!buzzerWinner && (
          <>
            <Buzzer
              enabled={canBuzz}
              isWinner={isMyTurn}
              deadline={answerDeadline}
              otherPlayerBuzzed={null}
            />
            {leftTabDuringQuestion && (
              <div className="text-center text-red-400 text-xs">
                You left the tab. Cannot participate.
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function DesktopQuestionUI({
  isMyTurn,
  buzzerWinner,
  buzzerWinnerName,
  answerDeadline,
  currentQuestion,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  canBuzz,
  leftTabDuringQuestion,
}: QuestionUIProps) {
  return (
    <div className="hidden md:grid md:grid-cols-2 gap-6">
      {/* Buzzer Card */}
      <Card className="bg-gray-800/50 backdrop-blur">
        <CardBody className="p-6 flex flex-col items-center justify-center min-h-[200px]">
          {isMyTurn ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-400 animate-pulse mb-2">
                Answer Now!
              </div>
              {answerDeadline && <AnswerCountdown deadline={answerDeadline} />}
            </div>
          ) : (
            <>
              <Buzzer
                enabled={canBuzz}
                isWinner={isMyTurn}
                deadline={answerDeadline}
                otherPlayerBuzzed={
                  buzzerWinner && !isMyTurn ? buzzerWinnerName : null
                }
              />
              {leftTabDuringQuestion && (
                <div className="mt-4 text-center text-red-400 text-sm">
                  You left the tab during the question.
                  <br />
                  You cannot participate in this round.
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Answer Options Card */}
      <Card className="bg-gray-800/50 backdrop-blur">
        <CardBody className="p-6 min-h-[200px]">
          {!isMyTurn && buzzerWinner && (
            <div className="mb-4 text-center text-purple-400">
              {buzzerWinnerName} is answering...
            </div>
          )}
          <AnswerOptions
            options={currentQuestion?.options || []}
            selectedAnswer={selectedAnswer}
            revealedAnswer={revealedAnswer}
            isCorrect={isCorrect}
            canAnswer={canAnswer}
          />
        </CardBody>
      </Card>
    </div>
  );
}
