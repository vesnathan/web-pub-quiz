import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { OrchestratorQuestion as Question, QuestionCategory } from '@quiz/shared';

// ============================================================================
// API Category Mappings
// ============================================================================

// The Trivia API (primary) - https://the-trivia-api.com
const TRIVIA_API_CATEGORIES: Record<QuestionCategory, string[]> = {
  general: ['general_knowledge'],
  science: ['science'],
  history: ['history'],
  geography: ['geography'],
  entertainment: ['film_and_tv', 'music'],
  sports: ['sport_and_leisure'],
  arts: ['arts_and_literature'],
  literature: ['arts_and_literature'],
};

// Open Trivia DB (fallback) - https://opentdb.com
const OPENTDB_CATEGORIES: Record<QuestionCategory, number[]> = {
  general: [9],
  science: [17, 18, 19, 30],
  history: [23],
  geography: [22],
  entertainment: [11, 12, 14, 15, 16],
  sports: [21],
  arts: [25],
  literature: [10], // Books
};

// ============================================================================
// API Response Types
// ============================================================================

// The Trivia API response
interface TriviaAPIQuestion {
  id: string;
  category: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  question: { text: string };
  difficulty: string;
}

// Open Trivia DB response
interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTDBResponse {
  response_code: number;
  results: OpenTDBQuestion[];
}

// ============================================================================
// DynamoDB Setup
// ============================================================================

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || 'quiz-night-live-datatable-prod';

// ============================================================================
// Wikipedia API (for explanations)
// ============================================================================

interface WikipediaSearchResult {
  query?: {
    search?: Array<{
      title: string;
      snippet: string;
      pageid: number;
    }>;
  };
}

interface WikipediaExtractResult {
  query?: {
    pages?: Record<string, {
      title: string;
      extract?: string;
      fullurl?: string;
    }>;
  };
}

/**
 * Fetch explanation from Wikipedia for a given answer
 */
async function fetchWikipediaExplanation(
  answer: string,
  questionText: string
): Promise<{ explanation: string; detailedExplanation?: string; citationUrl?: string; citationTitle?: string }> {
  try {
    // Search Wikipedia for the answer
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(answer)}&format=json&origin=*&srlimit=1`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      return { explanation: `The correct answer is ${answer}.` };
    }

    const searchData: WikipediaSearchResult = await searchResponse.json();
    const searchResult = searchData.query?.search?.[0];

    if (!searchResult) {
      return { explanation: `The correct answer is ${answer}.` };
    }

    // Get the extract (summary) for the page
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${searchResult.pageid}&prop=extracts|info&exintro=true&explaintext=true&inprop=url&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) {
      return { explanation: `The correct answer is ${answer}.` };
    }

    const extractData: WikipediaExtractResult = await extractResponse.json();
    const page = extractData.query?.pages?.[String(searchResult.pageid)];

    if (!page?.extract) {
      return { explanation: `The correct answer is ${answer}.` };
    }

    // Clean up the extract
    let extract = page.extract
      .replace(/\s+/g, ' ')
      .trim();

    // Get first 2-3 sentences for short explanation
    const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
    const shortExplanation = sentences.slice(0, 2).join(' ').trim() || `The correct answer is ${answer}.`;

    // Get first paragraph (up to 500 chars) for detailed explanation
    const detailedExplanation = extract.length > 500
      ? extract.substring(0, 500) + '...'
      : extract;

    return {
      explanation: shortExplanation,
      detailedExplanation,
      citationUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(searchResult.title)}`,
      citationTitle: `Wikipedia: ${searchResult.title}`,
    };
  } catch (error) {
    console.warn(`⚠️ Wikipedia lookup failed for "${answer}":`, error);
    return { explanation: `The correct answer is ${answer}.` };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Decode HTML entities from API responses
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&iacute;/g, 'í')
    .replace(/&ntilde;/g, 'ñ');
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// The Trivia API (Primary Source)
// ============================================================================

/**
 * Fetch questions from The Trivia API (free, no key needed)
 */
async function fetchFromTriviaAPI(
  category: QuestionCategory,
  count: number
): Promise<Question[]> {
  const categories = TRIVIA_API_CATEGORIES[category];
  const categoryParam = categories.join(',');

  const url = `https://the-trivia-api.com/v2/questions?limit=${count}&categories=${categoryParam}&difficulties=medium`;

  console.log(`🌐 Fetching from The Trivia API: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: TriviaAPIQuestion[] = await response.json();

    // Create base questions first
    const baseQuestions = data.map((q) => {
      const allOptions = shuffleArray([q.correctAnswer, ...q.incorrectAnswers]);
      const correctIndex = allOptions.indexOf(q.correctAnswer);
      const correctAnswer = decodeHtmlEntities(q.correctAnswer);

      return {
        id: uuidv4(),
        text: decodeHtmlEntities(q.question.text),
        options: allOptions.map(decodeHtmlEntities),
        correctIndex,
        category,
        difficulty: 'medium' as const,
        correctAnswer, // Temp field for Wikipedia lookup
      };
    });

    // Fetch Wikipedia explanations in parallel
    console.log(`📚 Fetching Wikipedia explanations for ${baseQuestions.length} questions...`);
    const questionsWithExplanations = await Promise.all(
      baseQuestions.map(async (q) => {
        const wiki = await fetchWikipediaExplanation(q.correctAnswer, q.text);
        return {
          id: q.id,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          explanation: wiki.explanation,
          detailedExplanation: wiki.detailedExplanation,
          citationUrl: wiki.citationUrl,
          citationTitle: wiki.citationTitle,
        } as Question;
      })
    );

    console.log(`✅ Got ${questionsWithExplanations.length} questions from The Trivia API with Wikipedia explanations`);
    return questionsWithExplanations;
  } catch (error) {
    console.error('❌ The Trivia API failed:', error);
    return [];
  }
}

// ============================================================================
// Open Trivia DB (Fallback Source)
// ============================================================================

/**
 * Fetch questions from Open Trivia DB (free, no key needed)
 */
async function fetchFromOpenTDB(
  category: QuestionCategory,
  count: number
): Promise<Question[]> {
  const categoryIds = OPENTDB_CATEGORIES[category];
  const categoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];

  const url = `https://opentdb.com/api.php?amount=${count}&category=${categoryId}&difficulty=medium&type=multiple`;

  console.log(`🌐 Fetching from Open Trivia DB: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OpenTDBResponse = await response.json();

    if (data.response_code !== 0) {
      console.warn(`⚠️ Open Trivia DB response code: ${data.response_code}`);
      return [];
    }

    // Create base questions first
    const baseQuestions = data.results.map((q) => {
      const allOptions = shuffleArray([q.correct_answer, ...q.incorrect_answers]);
      const correctIndex = allOptions.indexOf(q.correct_answer);
      const correctAnswer = decodeHtmlEntities(q.correct_answer);

      return {
        id: uuidv4(),
        text: decodeHtmlEntities(q.question),
        options: allOptions.map(decodeHtmlEntities),
        correctIndex,
        category,
        difficulty: 'medium' as const,
        correctAnswer, // Temp field for Wikipedia lookup
      };
    });

    // Fetch Wikipedia explanations in parallel
    console.log(`📚 Fetching Wikipedia explanations for ${baseQuestions.length} questions...`);
    const questionsWithExplanations = await Promise.all(
      baseQuestions.map(async (q) => {
        const wiki = await fetchWikipediaExplanation(q.correctAnswer, q.text);
        return {
          id: q.id,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          explanation: wiki.explanation,
          detailedExplanation: wiki.detailedExplanation,
          citationUrl: wiki.citationUrl,
          citationTitle: wiki.citationTitle,
        } as Question;
      })
    );

    console.log(`✅ Got ${questionsWithExplanations.length} questions from Open Trivia DB with Wikipedia explanations`);
    return questionsWithExplanations;
  } catch (error) {
    console.error('❌ Open Trivia DB failed:', error);
    return [];
  }
}

// ============================================================================
// DynamoDB Operations
// ============================================================================

/**
 * Fetch unused questions from DynamoDB cache
 */
async function fetchUnusedQuestions(
  category: QuestionCategory,
  limit: number,
  excludeIds: Set<string>
): Promise<Question[]> {
  try {
    console.log(`📚 Fetching unused ${category} questions from DDB (limit: ${limit})...`);

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `QUESTION#unanswered#${category}`,
        },
        Limit: limit + excludeIds.size + 10,
      })
    );

    const questions: Question[] = [];
    for (const item of result.Items || []) {
      if (excludeIds.has(item.id)) continue;

      questions.push({
        id: item.id,
        text: item.text,
        options: item.options,
        correctIndex: item.correctIndex,
        category: item.category,
        difficulty: item.difficulty,
        explanation: item.explanation,
        detailedExplanation: item.detailedExplanation,
        citationUrl: item.citationUrl,
        citationTitle: item.citationTitle,
      });

      if (questions.length >= limit) break;
    }

    console.log(`📚 Found ${questions.length} unused questions in DDB`);
    return questions;
  } catch (error) {
    console.error('❌ Failed to fetch questions from DDB:', error);
    return [];
  }
}

/**
 * Store questions in DynamoDB
 */
async function storeQuestions(
  questions: Question[],
  category: QuestionCategory
): Promise<void> {
  console.log(`💾 Storing ${questions.length} questions in DDB...`);

  const now = new Date().toISOString();

  for (const question of questions) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `QUESTION#${question.id}`,
            SK: 'METADATA',
            GSI1PK: `QUESTION#unanswered#${category}`,
            GSI1SK: now,
            id: question.id,
            text: question.text,
            options: question.options,
            correctIndex: question.correctIndex,
            category: question.category,
            difficulty: question.difficulty,
            explanation: question.explanation,
            detailedExplanation: question.detailedExplanation,
            citationUrl: question.citationUrl,
            citationTitle: question.citationTitle,
            answeredCorrectly: false,
            createdAt: now,
            usedInSets: [],
            source: 'api', // Track that this came from free API
          },
        })
      );
    } catch (error) {
      console.error(`❌ Failed to store question ${question.id}:`, error);
    }
  }

  console.log(`✅ Stored ${questions.length} questions`);
}

/**
 * Mark a question as answered correctly
 */
export async function markQuestionAnsweredCorrectly(questionId: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QUESTION#${questionId}`, SK: 'METADATA' },
        UpdateExpression: 'SET answeredCorrectly = :true, GSI1PK = :answered',
        ExpressionAttributeValues: {
          ':true': true,
          ':answered': 'QUESTION#answered',
        },
      })
    );
    console.log(`✅ Marked question ${questionId} as answered correctly`);
  } catch (error) {
    console.error(`❌ Failed to mark question as answered:`, error);
  }
}

// ============================================================================
// Main API - Get Questions
// ============================================================================

/**
 * Get questions for a set.
 * Priority:
 * 1. DynamoDB cache (free, instant)
 * 2. The Trivia API (free, primary)
 * 3. Open Trivia DB (free, fallback)
 */
export async function getQuestionsForSet(
  category: QuestionCategory,
  count: number,
  excludeIds: Set<string> = new Set()
): Promise<Question[]> {
  console.log(`\n📋 Getting ${count} ${category} questions for set...`);

  // Step 1: Try DynamoDB cache first
  const cachedQuestions = await fetchUnusedQuestions(category, count, excludeIds);

  if (cachedQuestions.length >= count) {
    console.log(`✅ Using ${count} cached questions (no API call needed)`);
    return cachedQuestions.slice(0, count);
  }

  // Step 2: Need more - try The Trivia API first
  const needed = count - cachedQuestions.length;
  console.log(`📊 Have ${cachedQuestions.length} cached, need ${needed} more`);

  let newQuestions = await fetchFromTriviaAPI(category, needed);

  // Step 3: If Trivia API failed or not enough, try Open Trivia DB
  if (newQuestions.length < needed) {
    const stillNeeded = needed - newQuestions.length;
    console.log(`📊 Trivia API gave ${newQuestions.length}, trying Open Trivia DB for ${stillNeeded} more...`);
    const fallbackQuestions = await fetchFromOpenTDB(category, stillNeeded);
    newQuestions = [...newQuestions, ...fallbackQuestions];
  }

  // Store new questions in DDB for future use
  if (newQuestions.length > 0) {
    await storeQuestions(newQuestions, category);
  }

  // Combine cached + new
  const allQuestions = [...cachedQuestions, ...newQuestions];

  if (allQuestions.length < count) {
    console.warn(`⚠️ Only got ${allQuestions.length}/${count} questions`);
  }

  return allQuestions.slice(0, count);
}

/**
 * Pre-warm the question cache for a category.
 */
export async function prewarmQuestionCache(
  category: QuestionCategory,
  targetCount: number = 40
): Promise<void> {
  console.log(`🔥 Pre-warming question cache for ${category}...`);

  const existing = await fetchUnusedQuestions(category, targetCount, new Set());

  if (existing.length >= targetCount) {
    console.log(`✅ Cache already has ${existing.length} questions`);
    return;
  }

  const needed = targetCount - existing.length;
  console.log(`📊 Have ${existing.length}, fetching ${needed} more...`);

  // Try The Trivia API first
  let newQuestions = await fetchFromTriviaAPI(category, needed);

  // Fallback to Open Trivia DB if needed
  if (newQuestions.length < needed) {
    const stillNeeded = needed - newQuestions.length;
    const fallbackQuestions = await fetchFromOpenTDB(category, stillNeeded);
    newQuestions = [...newQuestions, ...fallbackQuestions];
  }

  if (newQuestions.length > 0) {
    await storeQuestions(newQuestions, category);
    console.log(`✅ Cache pre-warmed with ${newQuestions.length} new questions`);
  } else {
    console.warn(`⚠️ Could not fetch any new questions`);
  }
}

// ============================================================================
// AI Generation (Disabled - Enable when revenue supports it)
// ============================================================================

/*
// Uncomment this section when you have paying users to cover AI costs

import Anthropic from '@anthropic-ai/sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
let anthropicClient: Anthropic | null = null;

async function getAnthropicClient(): Promise<Anthropic> {
  if (anthropicClient) return anthropicClient;

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: 'quiz-app/anthropic-api-key' })
  );

  anthropicClient = new Anthropic({ apiKey: response.SecretString! });
  return anthropicClient;
}

async function generateQuestionsFromAI(category: QuestionCategory, count: number): Promise<Question[]> {
  const client = await getAnthropicClient();
  // ... AI generation logic ...
}
*/
