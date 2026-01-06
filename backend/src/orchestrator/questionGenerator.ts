import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { OrchestratorQuestion as Question, QuestionCategory } from '@quiz/shared';

// ============================================================================
// DynamoDB Setup
// ============================================================================

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || 'quiz-night-live-datatable-prod';

// ============================================================================
// Helper Functions
// ============================================================================

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
// DynamoDB Operations
// ============================================================================

/**
 * Fetch unused questions from DynamoDB
 * Questions are stored with GSI1PK = QUESTION#unused#${category}
 * GSI1SK = ${difficulty}#${timestamp}
 */
async function fetchUnusedQuestions(
  category: QuestionCategory,
  limit: number,
  excludeIds: Set<string>,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  try {
    const difficultyLabel = difficulty || 'any';
    console.log(`📚 Fetching unused ${category} (${difficultyLabel}) questions from DDB (limit: ${limit})...`);

    // Build query - filter by difficulty if specified using GSI1SK prefix
    const queryParams: QueryCommandInput = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: difficulty
        ? 'GSI1PK = :pk AND begins_with(GSI1SK, :diffPrefix)'
        : 'GSI1PK = :pk',
      ExpressionAttributeValues: difficulty
        ? {
            ':pk': `QUESTION#unused#${category}`,
            ':diffPrefix': `${difficulty}#`,
          }
        : {
            ':pk': `QUESTION#unused#${category}`,
          },
      Limit: limit + excludeIds.size + 20,
    };

    const result = await docClient.send(new QueryCommand(queryParams));

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
 * Mark a question as asked (increment timesAsked and move to used bucket)
 */
export async function markQuestionAsked(questionId: string, category: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QUESTION#${questionId}`, SK: 'METADATA' },
        UpdateExpression: 'SET timesAsked = if_not_exists(timesAsked, :zero) + :one, lastUsedAt = :now, GSI1PK = :usedPk',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': now,
          ':usedPk': `QUESTION#used#${category}`,
        },
      })
    );
    console.log(`✅ Marked question ${questionId} as used`);
  } catch (error) {
    console.error(`❌ Failed to mark question as asked:`, error);
  }
}

/**
 * Record a correct answer for a question
 */
export async function markQuestionAnsweredCorrectly(questionId: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QUESTION#${questionId}`, SK: 'METADATA' },
        UpdateExpression: 'SET timesCorrect = if_not_exists(timesCorrect, :zero) + :one',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
        },
      })
    );
    console.log(`✅ Recorded correct answer for question ${questionId}`);
  } catch (error) {
    console.error(`❌ Failed to record correct answer:`, error);
  }
}

/**
 * Record an incorrect answer for a question
 */
export async function markQuestionAnsweredIncorrectly(questionId: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QUESTION#${questionId}`, SK: 'METADATA' },
        UpdateExpression: 'SET timesIncorrect = if_not_exists(timesIncorrect, :zero) + :one',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
        },
      })
    );
    console.log(`✅ Recorded incorrect answer for question ${questionId}`);
  } catch (error) {
    console.error(`❌ Failed to record incorrect answer:`, error);
  }
}

// ============================================================================
// Main API - Get Questions
// ============================================================================

/**
 * Get questions for a set from DynamoDB.
 * All questions come from the pre-loaded AI-generated question pool.
 * No external API fallback - questions must be uploaded first.
 */
export async function getQuestionsForSet(
  category: QuestionCategory,
  count: number,
  excludeIds: Set<string> = new Set()
): Promise<Question[]> {
  console.log(`\n📋 Getting ${count} ${category} questions for set...`);

  const questions = await fetchUnusedQuestions(category, count, excludeIds);

  if (questions.length < count) {
    console.warn(`⚠️ Only got ${questions.length}/${count} questions for ${category}. Upload more questions!`);
  }

  // Shuffle to randomize order
  return shuffleArray(questions).slice(0, count);
}

/**
 * Get questions for a mixed category set.
 * Fetches random questions filtered by difficulty.
 * Only queries categories that have questions.
 */
export async function getQuestionsForMixedSet(
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  excludeIds: Set<string> = new Set()
): Promise<Question[]> {
  console.log(`\n📋 Getting ${count} ${difficulty} questions for set...`);

  // Only query categories that have questions
  const categories: QuestionCategory[] = [
    'science',
    'history',
    'geography',
    'entertainment',
  ];

  // Fetch more than needed from each category, then shuffle and pick
  const fetchPerCategory = Math.ceil(count / categories.length) + 5;
  let allQuestions: Question[] = [];

  for (const category of categories) {
    const categoryQuestions = await fetchUnusedQuestions(
      category,
      fetchPerCategory,
      excludeIds,
      difficulty
    );
    allQuestions.push(...categoryQuestions);
  }

  // If not enough, reset used questions and retry
  if (allQuestions.length < count) {
    console.warn(`⚠️ Only got ${allQuestions.length}/${count} ${difficulty} questions. Resetting used questions...`);
    await resetAllUsedQuestions();

    allQuestions = [];
    for (const category of categories) {
      const categoryQuestions = await fetchUnusedQuestions(
        category,
        fetchPerCategory,
        excludeIds,
        difficulty
      );
      allQuestions.push(...categoryQuestions);
    }

    if (allQuestions.length < count) {
      console.error(`❌ Only got ${allQuestions.length}/${count} ${difficulty} questions. Need more questions!`);
    }
  }

  // Shuffle and return requested count
  return shuffleArray(allQuestions).slice(0, count);
}

/**
 * Get count of available questions per category.
 */
export async function getQuestionCounts(): Promise<Record<string, number>> {
  const categories = ['science', 'history', 'geography', 'entertainment', 'sports', 'arts', 'literature', 'general'];
  const counts: Record<string, number> = {};

  for (const category of categories) {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `QUESTION#unused#${category}`,
          },
          Select: 'COUNT',
        })
      );
      counts[category] = result.Count || 0;
    } catch (error) {
      console.error(`❌ Failed to count ${category} questions:`, error);
      counts[category] = 0;
    }
  }

  return counts;
}

/**
 * Reset all used questions in a category back to unused.
 * Called when we run out of unused questions.
 */
async function resetCategoryQuestions(category: string): Promise<number> {
  console.log(`🔄 Resetting used questions for ${category}...`);

  try {
    // Query all used questions in this category
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `QUESTION#used#${category}`,
        },
        ProjectionExpression: 'PK, SK',
      })
    );

    const items = result.Items || [];
    if (items.length === 0) {
      console.log(`  No used questions to reset for ${category}`);
      return 0;
    }

    // Reset each question back to unused
    let resetCount = 0;
    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: item.PK, SK: item.SK },
            UpdateExpression: 'SET GSI1PK = :unusedPk',
            ExpressionAttributeValues: {
              ':unusedPk': `QUESTION#unused#${category}`,
            },
          })
        );
        resetCount++;
      } catch (err) {
        console.error(`  Failed to reset question ${item.PK}:`, err);
      }
    }

    console.log(`✅ Reset ${resetCount} questions for ${category}`);
    return resetCount;
  } catch (error) {
    console.error(`❌ Failed to reset questions for ${category}:`, error);
    return 0;
  }
}

/**
 * Reset all used questions across all categories back to unused.
 */
export async function resetAllUsedQuestions(): Promise<void> {
  const categories = ['science', 'history', 'geography', 'entertainment', 'sports', 'arts', 'literature', 'general'];

  console.log('\n🔄 Resetting all used questions back to unused...');
  let totalReset = 0;

  for (const category of categories) {
    const count = await resetCategoryQuestions(category);
    totalReset += count;
  }

  console.log(`✅ Total questions reset: ${totalReset}\n`);
}
