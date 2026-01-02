"use client";

import { useEffect, useState } from "react";

interface AnswerCountdownProps {
  deadline: number;
}

export function AnswerCountdown({ deadline }: AnswerCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className="text-lg text-gray-400">Time remaining: {timeLeft}s</div>
  );
}
