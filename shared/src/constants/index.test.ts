import { describe, it, expect } from 'vitest';
import {
  calculateQuestionDisplayTime,
  calculateAnswerTimeout,
  WORDS_PER_SECOND,
  MIN_ANSWER_TIMEOUT_MS,
  MAX_ANSWER_TIMEOUT_MS,
  DIFFICULTY_POINTS,
  QUESTIONS_PER_SET,
  MAX_PLAYERS_PER_ROOM,
  QUESTION_DURATION_MS,
  MIN_QUESTION_DISPLAY_MS,
  MAX_QUESTION_DISPLAY_MS,
} from './index';

describe('calculateQuestionDisplayTime', () => {
  it('returns fixed 10 seconds for any question', () => {
    const result = calculateQuestionDisplayTime('Hi?', ['A', 'B']);
    expect(result).toBe(QUESTION_DURATION_MS);
    expect(result).toBe(10000);
  });

  it('returns same duration regardless of question length', () => {
    const shortResult = calculateQuestionDisplayTime('Hi?', ['A', 'B']);
    const longQuestion = Array(50).fill('word').join(' ');
    const longOptions = Array(4).fill(Array(15).fill('word').join(' '));
    const longResult = calculateQuestionDisplayTime(longQuestion, longOptions);

    expect(shortResult).toBe(longResult);
    expect(shortResult).toBe(10000);
  });
});

describe('calculateAnswerTimeout', () => {
  it('adds reading time on top of base minimum time', () => {
    // Even short options get reading time added to the base minimum
    // ['A', 'B', 'C', 'D'] = 4 words / (4 * 1.5) words per second = 0.667 seconds
    // Total = 4000 + 667 = 4667ms
    const result = calculateAnswerTimeout(['A', 'B', 'C', 'D']);
    expect(result).toBeGreaterThan(MIN_ANSWER_TIMEOUT_MS);
    expect(result).toBeLessThanOrEqual(MIN_ANSWER_TIMEOUT_MS + 1000); // Small reading time
  });

  it('returns only base minimum for empty options', () => {
    // With no options, reading time is 0, so just base minimum
    const result = calculateAnswerTimeout([]);
    expect(result).toBe(MIN_ANSWER_TIMEOUT_MS);
  });

  it('returns maximum time for very long options', () => {
    // Create options with many words
    const longOptions = Array(4).fill(Array(20).fill('word').join(' '));

    const result = calculateAnswerTimeout(longOptions);
    expect(result).toBe(MAX_ANSWER_TIMEOUT_MS);
  });

  it('scales time based on option word count', () => {
    const shortOptions = ['Yes', 'No', 'Maybe', 'Never'];
    const mediumOptions = [
      'The answer is definitely yes',
      'The answer is definitely no',
      'The answer could be maybe',
      'The answer is never correct',
    ];

    const shortResult = calculateAnswerTimeout(shortOptions);
    const mediumResult = calculateAnswerTimeout(mediumOptions);

    // Medium options should take longer than short options
    expect(mediumResult).toBeGreaterThanOrEqual(shortResult);
  });

  it('returns a rounded number', () => {
    const result = calculateAnswerTimeout([
      'This is option A with some text',
      'This is option B with some text',
      'This is option C with some text',
      'This is option D with some text',
    ]);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('Constants', () => {
  it('has correct scoring values by difficulty', () => {
    // Easy: high penalty for wrong, low reward for correct
    expect(DIFFICULTY_POINTS.easy.correct).toBe(50);
    expect(DIFFICULTY_POINTS.easy.wrong).toBe(-200);

    // Medium: balanced
    expect(DIFFICULTY_POINTS.medium.correct).toBe(75);
    expect(DIFFICULTY_POINTS.medium.wrong).toBe(-100);

    // Hard: low penalty for wrong, high reward for correct
    expect(DIFFICULTY_POINTS.hard.correct).toBe(100);
    expect(DIFFICULTY_POINTS.hard.wrong).toBe(-50);
  });

  it('has correct game configuration', () => {
    expect(QUESTIONS_PER_SET).toBe(20);
    expect(MAX_PLAYERS_PER_ROOM).toBe(20);
  });

  it('has valid timing ranges', () => {
    expect(MIN_QUESTION_DISPLAY_MS).toBeLessThan(MAX_QUESTION_DISPLAY_MS);
    expect(MIN_ANSWER_TIMEOUT_MS).toBeLessThan(MAX_ANSWER_TIMEOUT_MS);
  });

  it('has positive reading speed', () => {
    expect(WORDS_PER_SECOND).toBeGreaterThan(0);
  });
});
