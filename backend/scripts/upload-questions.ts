import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

const QUESTIONS_DIR = path.join(__dirname, '../..', 'questions');
const MANIFEST_FILE = path.join(QUESTIONS_DIR, 'uploaded-manifest.json');
const TABLE_NAME = process.env.TABLE_NAME || 'quiz-night-live-datatable-prod';
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ============================================================================
// Types
// ============================================================================

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  detailedExplanation?: string;
  citationUrl?: string;
  citationTitle?: string;
}

interface Manifest {
  uploadedIds: string[];
  lastUploadedAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function hashText(text: string): string {
  return createHash('md5').update(text.toLowerCase().trim()).digest('hex');
}

function mapTopicToCategory(topic: string): string {
  const mapping: Record<string, string> = {
    'Science': 'science',
    'History': 'history',
    'Geography': 'geography',
    'Entertainment': 'entertainment',
    'Sports': 'sports',
    'Arts': 'arts',
    'Literature': 'literature',
    'General Knowledge': 'general',
    'Music': 'entertainment',
    'Film': 'entertainment',
    'Television': 'entertainment',
    'Food and Drink': 'general',
    'Nature': 'science',
    'Technology': 'science',
    'Politics': 'history',
    'Mythology': 'history',
    'Religion': 'history',
  };
  return mapping[topic] || 'general';
}

// ============================================================================
// Manifest Management
// ============================================================================

function loadManifest(): Set<string> {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      const content = fs.readFileSync(MANIFEST_FILE, 'utf-8');
      const manifest: Manifest = JSON.parse(content);
      console.log(`📋 Loaded manifest with ${manifest.uploadedIds.length} previously uploaded IDs`);
      return new Set(manifest.uploadedIds);
    }
  } catch (error) {
    console.error('⚠️ Failed to load manifest, starting fresh:', error);
  }
  return new Set();
}

function saveManifest(uploadedIds: Set<string>): void {
  const manifest: Manifest = {
    uploadedIds: Array.from(uploadedIds).sort(),
    lastUploadedAt: new Date().toISOString(),
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`📋 Saved manifest with ${uploadedIds.size} total uploaded IDs`);
}

// ============================================================================
// Load Questions from JSON Files
// ============================================================================

function loadQuestionsFromFiles(alreadyUploaded: Set<string>): Question[] {
  console.log('\n📂 Loading questions from JSON files...');

  const questions: Question[] = [];
  const seenHashes = new Set<string>();
  let skippedCount = 0;

  // Walk through questions directory
  function walkDir(dir: string, topic: string = '') {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Use directory name as topic if at first level
        const newTopic = topic || entry.name;
        walkDir(fullPath, newTopic);
      } else if (entry.name.endsWith('.json') && entry.name !== 'uploaded-manifest.json') {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(content);

          // Handle both array format and single question format
          const questionsInFile = Array.isArray(data) ? data : [data];

          for (const q of questionsInFile) {
            // Skip if already uploaded
            if (alreadyUploaded.has(q.id)) {
              skippedCount++;
              continue;
            }

            // Create hash to check for duplicates
            const hash = hashText(q.text);
            if (seenHashes.has(hash)) {
              continue; // Skip duplicate
            }
            seenHashes.add(hash);

            // Determine category from topic or question data
            const category = q.category || mapTopicToCategory(topic);

            questions.push({
              id: q.id,
              text: q.text,
              options: q.options,
              correctIndex: q.correctIndex,
              category,
              difficulty: q.difficulty || 'medium',
              explanation: q.explanation,
              detailedExplanation: q.detailedExplanation,
              citationUrl: q.citationUrl,
              citationTitle: q.citationTitle,
            });
          }
        } catch (error) {
          console.error(`  Failed to load ${fullPath}:`, error);
        }
      }
    }
  }

  walkDir(QUESTIONS_DIR);

  console.log(`✅ Found ${questions.length} new questions to upload (${skippedCount} already uploaded)`);
  return questions;
}

// ============================================================================
// Upload Questions to DynamoDB
// ============================================================================

async function uploadQuestions(questions: Question[], uploadedIds: Set<string>): Promise<number> {
  if (questions.length === 0) {
    console.log('\n✅ No new questions to upload!');
    return 0;
  }

  console.log(`\n📤 Uploading ${questions.length} new questions to DynamoDB...`);

  const now = new Date().toISOString();
  let uploadedCount = 0;
  let errorCount = 0;

  for (const question of questions) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `QUESTION#${question.id}`,
            SK: 'METADATA',
            GSI1PK: `QUESTION#unused#${question.category}`,
            GSI1SK: `${question.difficulty}#${now}`,
            id: question.id,
            text: question.text,
            textHash: hashText(question.text),
            options: question.options,
            correctIndex: question.correctIndex,
            category: question.category,
            difficulty: question.difficulty,
            explanation: question.explanation,
            detailedExplanation: question.detailedExplanation,
            citationUrl: question.citationUrl,
            citationTitle: question.citationTitle,
            // Tracking fields
            timesAsked: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
            // Metadata
            source: 'ai',
            createdAt: now,
            lastUsedAt: null,
          },
        })
      );

      // Mark as uploaded
      uploadedIds.add(question.id);
      uploadedCount++;

      if (uploadedCount % 100 === 0) {
        console.log(`  Uploaded ${uploadedCount}/${questions.length} questions...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  Failed to upload question ${question.id}:`, error);
    }
  }

  console.log(`✅ Uploaded ${uploadedCount} questions (${errorCount} errors)`);
  return uploadedCount;
}

// ============================================================================
// Summary
// ============================================================================

async function printSummary(): Promise<void> {
  console.log('\n📊 Question Summary by Category (in DynamoDB):');

  const categories = ['science', 'history', 'geography', 'entertainment', 'sports', 'arts', 'literature', 'general'];

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
      console.log(`  ${category}: ${result.Count || 0} questions`);
    } catch (error) {
      console.log(`  ${category}: Error counting`);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('============================================================');
  console.log('QUESTION UPLOAD SCRIPT (Incremental)');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Questions Dir: ${QUESTIONS_DIR}`);
  console.log('============================================================');

  // Step 1: Load manifest of already-uploaded questions
  const uploadedIds = loadManifest();

  // Step 2: Load new questions from files (skipping already uploaded)
  const questions = loadQuestionsFromFiles(uploadedIds);

  // Step 3: Upload new questions
  const uploadedCount = await uploadQuestions(questions, uploadedIds);

  // Step 4: Save updated manifest
  if (uploadedCount > 0) {
    saveManifest(uploadedIds);
  }

  // Step 5: Print summary
  await printSummary();

  console.log('\n✅ Done!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
