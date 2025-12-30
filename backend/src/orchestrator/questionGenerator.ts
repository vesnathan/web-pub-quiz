import Anthropic from '@anthropic-ai/sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionCategory } from '@quiz/shared';

// DynamoDB setup
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || 'wpq-datatable-prod';

// Secrets Manager for Anthropic API key
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
let anthropicClient: Anthropic | null = null;
let anthropicKeyFetched = false;

/**
 * Get or create Anthropic client (lazy initialization to save costs)
 */
async function getAnthropicClient(): Promise<Anthropic> {
  if (anthropicClient) return anthropicClient;

  if (anthropicKeyFetched) {
    throw new Error('Anthropic API key not available');
  }

  try {
    console.log('🔑 Fetching Anthropic API key from Secrets Manager...');
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: 'quiz-app/anthropic-api-key' })
    );

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    anthropicClient = new Anthropic({ apiKey: response.SecretString });
    anthropicKeyFetched = true;
    console.log('✅ Anthropic client initialized');
    return anthropicClient;
  } catch (error) {
    anthropicKeyFetched = true; // Don't retry on failure
    console.error('❌ Failed to get Anthropic API key:', error);
    throw error;
  }
}

/**
 * Stored question in DynamoDB
 */
interface StoredQuestion extends Question {
  answeredCorrectly: boolean;
  createdAt: string;
  usedInSets: string[]; // Track which sets have used this question
  flaggedForReview?: boolean;
  validationNotes?: string;
}

/**
 * Fetch unused questions from DynamoDB
 * Returns questions that have NOT been answered correctly
 */
async function fetchUnusedQuestions(
  category: QuestionCategory,
  limit: number,
  excludeIds: Set<string>
): Promise<Question[]> {
  try {
    console.log(`📚 Fetching unused ${category} questions from DDB (limit: ${limit})...`);

    // Query for unanswered questions in this category
    // Using GSI: GSI1PK = QUESTION#unanswered#{category}
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `QUESTION#unanswered#${category}`,
        },
        Limit: limit + excludeIds.size + 10, // Fetch extra to account for exclusions
      })
    );

    const questions: Question[] = [];
    for (const item of result.Items || []) {
      // Skip questions already used in this set
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
 * Generate questions using Claude API
 */
async function generateQuestionsFromAI(
  category: QuestionCategory,
  count: number
): Promise<Question[]> {
  console.log(`🤖 Generating ${count} ${category} questions via Claude...`);

  const client = await getAnthropicClient();

  const prompt = `Generate ${count} pub quiz trivia questions for the category: ${category}.

REQUIREMENTS:
1. All questions must be ${category === 'general' ? 'general knowledge' : category} related
2. Medium difficulty - challenging but fair for a pub quiz
3. Each question must have exactly 4 options with ONE correct answer
4. Include a short explanation (1-2 sentences) for why the answer is correct
5. Include a detailed explanation (1 paragraph) for learning
6. If applicable, include a citation URL and title for fact-checking
7. Self-validate: flag any questions that might be ambiguous, outdated, or have multiple valid answers

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "questions": [
    {
      "text": "Question text ending with a question mark?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Short explanation of the answer.",
      "detailedExplanation": "Longer explanation with more context and interesting facts...",
      "citationUrl": "https://example.com/source",
      "citationTitle": "Source Title",
      "flaggedForReview": false,
      "validationNotes": ""
    }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON response
  interface RawQuestion {
    text?: string;
    options?: string[];
    correctIndex?: number;
    category?: string;
    explanation?: string;
    detailedExplanation?: string;
    citationUrl?: string;
    citationTitle?: string;
  }

  let parsed: { questions: RawQuestion[] };
  try {
    parsed = JSON.parse(content.text);
  } catch (e) {
    console.error('❌ Failed to parse Claude response:', content.text.substring(0, 500));
    throw new Error('Invalid JSON response from Claude');
  }

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Invalid response structure from Claude');
  }

  // Validate and transform questions
  const questions: Question[] = [];
  for (const q of parsed.questions) {
    // Validate required fields
    if (!q.text || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== 'number') {
      console.warn('⚠️ Skipping malformed question:', q.text?.substring(0, 50));
      continue;
    }

    questions.push({
      id: uuidv4(),
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      category,
      difficulty: 'medium' as const,
      explanation: q.explanation || 'No explanation provided.',
      detailedExplanation: q.detailedExplanation,
      citationUrl: q.citationUrl,
      citationTitle: q.citationTitle,
    });
  }

  console.log(`✅ Generated ${questions.length} valid questions`);
  return questions;
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
            // GSI for querying unanswered questions by category
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
 * This removes it from the unanswered pool (updates GSI1PK)
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
          ':answered': 'QUESTION#answered', // Move out of unanswered index
        },
      })
    );
    console.log(`✅ Marked question ${questionId} as answered correctly`);
  } catch (error) {
    console.error(`❌ Failed to mark question as answered:`, error);
  }
}

/**
 * Get questions for a set.
 * 1. First tries to fetch unused questions from DDB
 * 2. If not enough, generates new ones via Claude
 * 3. Stores any new questions in DDB
 *
 * @param category - Question category (e.g., 'general')
 * @param count - Number of questions needed
 * @param excludeIds - Question IDs already used in this set (to prevent repeats)
 */
export async function getQuestionsForSet(
  category: QuestionCategory,
  count: number,
  excludeIds: Set<string> = new Set()
): Promise<Question[]> {
  console.log(`\n📋 Getting ${count} ${category} questions for set...`);

  // Step 1: Try to fetch from DDB first (saves API costs!)
  const cachedQuestions = await fetchUnusedQuestions(category, count, excludeIds);

  if (cachedQuestions.length >= count) {
    console.log(`✅ Using ${count} cached questions (no API call needed)`);
    return cachedQuestions.slice(0, count);
  }

  // Step 2: Need more questions - generate via Claude
  const needed = count - cachedQuestions.length;
  console.log(`📊 Have ${cachedQuestions.length} cached, need ${needed} more`);

  try {
    const newQuestions = await generateQuestionsFromAI(category, needed);

    // Store new questions in DDB for future use
    if (newQuestions.length > 0) {
      await storeQuestions(newQuestions, category);
    }

    // Combine cached + new
    const allQuestions = [...cachedQuestions, ...newQuestions];
    return allQuestions.slice(0, count);
  } catch (error) {
    console.error('❌ Failed to generate questions:', error);

    // Fallback: use whatever cached questions we have
    if (cachedQuestions.length > 0) {
      console.log(`⚠️ Using ${cachedQuestions.length} cached questions as fallback`);
      return cachedQuestions;
    }

    // Last resort: return empty (orchestrator should handle this)
    console.error('❌ No questions available!');
    return [];
  }
}

/**
 * Pre-warm the question cache for a category.
 * Called when first player joins to avoid delays at set start.
 */
export async function prewarmQuestionCache(
  category: QuestionCategory,
  targetCount: number = 40 // Generate 2 sets worth
): Promise<void> {
  console.log(`🔥 Pre-warming question cache for ${category}...`);

  // Check how many we already have
  const existing = await fetchUnusedQuestions(category, targetCount, new Set());

  if (existing.length >= targetCount) {
    console.log(`✅ Cache already has ${existing.length} questions`);
    return;
  }

  const needed = targetCount - existing.length;
  console.log(`📊 Have ${existing.length}, generating ${needed} more...`);

  try {
    const newQuestions = await generateQuestionsFromAI(category, needed);
    await storeQuestions(newQuestions, category);
    console.log(`✅ Cache pre-warmed with ${newQuestions.length} new questions`);
  } catch (error) {
    console.error('❌ Failed to pre-warm cache:', error);
  }
}
