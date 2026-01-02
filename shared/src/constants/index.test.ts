import { describe, it, expect } from 'vitest';
import {
  calculateQuestionDisplayTime,
  calculateAnswerTimeout,
  WORDS_PER_SECOND,
  MIN_QUESTION_DISPLAY_MS,
  MAX_QUESTION_DISPLAY_MS,
  MIN_ANSWER_TIMEOUT_MS,
  MAX_ANSWER_TIMEOUT_MS,
  POINTS_CORRECT,
  POINTS_WRONG,
  QUESTIONS_PER_SET,
  MAX_PLAYERS_PER_ROOM,
  JOIN_WINDOW_SECONDS,
} from './index';

describe('calculateQuestionDisplayTime', () => {
  it('returns minimum time for very short questions', () => {
    const result = calculateQuestionDisplayTime('Hi?', ['A', 'B']);
    expect(result).toBe(MIN_QUESTION_DISPLAY_MS);
  });

  it('returns maximum time for very long questions', () => {
    // Create a question with ~100 words
    const longQuestion = Array(50).fill('word').join(' ');
    const longOptions = Array(4).fill(Array(15).fill('word').join(' '));

    const result = calculateQuestionDisplayTime(longQuestion, longOptions);
    expect(result).toBe(MAX_QUESTION_DISPLAY_MS);
  });

  it('scales time based on word count', () => {
    const shortQuestion = 'What is the capital of France?'; // ~6 words
    const shortOptions = ['Paris', 'London', 'Berlin', 'Madrid']; // ~4 words
    // Total: ~10 words = 2.5 seconds reading + 1 second buffer = 3.5 seconds
    // But clamped to minimum of 4 seconds

    const result = calculateQuestionDisplayTime(shortQuestion, shortOptions);
    expect(result).toBe(MIN_QUESTION_DISPLAY_MS);

    // Medium question - enough words to exceed minimum
    const mediumQuestion = 'According to the periodic table of elements, what is the atomic symbol for the element gold?'; // ~15 words
    const mediumOptions = [
      'Au (from Latin aurum)',
      'Go (from English gold)',
      'Gd (from German Gold)',
      'Ag (from Latin argentum)',
    ]; // ~12 words total
    // Total: ~27 words / 4 words per second = 6.75 seconds + 1 buffer = 7.75 seconds

    const mediumResult = calculateQuestionDisplayTime(mediumQuestion, mediumOptions);
    expect(mediumResult).toBeGreaterThan(MIN_QUESTION_DISPLAY_MS);
    expect(mediumResult).toBeLessThan(MAX_QUESTION_DISPLAY_MS);
  });

  it('handles empty options array', () => {
    const result = calculateQuestionDisplayTime('What is two plus two?', []);
    expect(result).toBe(MIN_QUESTION_DISPLAY_MS);
  });

  it('returns a rounded number', () => {
    const result = calculateQuestionDisplayTime(
      'This is a question with some words to test rounding behavior',
      ['Option A', 'Option B', 'Option C', 'Option D']
    );
    expect(Number.isInteger(result)).toBe(true);
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
  it('has correct scoring values', () => {
    expect(POINTS_CORRECT).toBe(50);
    expect(POINTS_WRONG).toBe(-200);
  });

  it('has correct game configuration', () => {
    expect(QUESTIONS_PER_SET).toBe(20);
    expect(MAX_PLAYERS_PER_ROOM).toBe(20);
    expect(JOIN_WINDOW_SECONDS).toBe(60);
  });

  it('has valid timing ranges', () => {
    expect(MIN_QUESTION_DISPLAY_MS).toBeLessThan(MAX_QUESTION_DISPLAY_MS);
    expect(MIN_ANSWER_TIMEOUT_MS).toBeLessThan(MAX_ANSWER_TIMEOUT_MS);
  });

  it('has positive reading speed', () => {
    expect(WORDS_PER_SECOND).toBeGreaterThan(0);
  });
});
