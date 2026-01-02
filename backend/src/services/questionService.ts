import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TableNames } from '../config/dynamodb';
import type { OrchestratorQuestion as Question, QuestionCategory } from '@quiz/shared';
import { v4 as uuidv4 } from 'uuid';

export async function getUnusedQuestions(count: number): Promise<Question[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableNames.QUESTIONS,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'unused',
      },
      Limit: count,
    })
  );

  return (result.Items || []) as Question[];
}

export async function markQuestionsUsed(questionIds: string[]): Promise<void> {
  await Promise.all(
    questionIds.map((id) =>
      docClient.send(
        new UpdateCommand({
          TableName: TableNames.QUESTIONS,
          Key: { id },
          UpdateExpression: 'SET #status = :status, usedAt = :usedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'used',
            ':usedAt': new Date().toISOString(),
          },
        })
      )
    )
  );
}

export async function saveQuestion(question: Omit<Question, 'id'>): Promise<Question> {
  const id = uuidv4();
  const fullQuestion: Question & { status: string } = {
    ...question,
    id,
    status: 'unused',
  };

  await docClient.send(
    new PutCommand({
      TableName: TableNames.QUESTIONS,
      Item: fullQuestion,
    })
  );

  return fullQuestion;
}

export async function saveQuestionBatch(questions: Omit<Question, 'id'>[]): Promise<Question[]> {
  const saved = await Promise.all(questions.map(saveQuestion));
  return saved;
}

export async function getQuestionCount(): Promise<{ total: number; unused: number }> {
  // This is a simplified version - in production you'd use a counter or scan
  const unusedResult = await docClient.send(
    new QueryCommand({
      TableName: TableNames.QUESTIONS,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'unused',
      },
      Select: 'COUNT',
    })
  );

  const usedResult = await docClient.send(
    new QueryCommand({
      TableName: TableNames.QUESTIONS,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'used',
      },
      Select: 'COUNT',
    })
  );

  return {
    total: (unusedResult.Count || 0) + (usedResult.Count || 0),
    unused: unusedResult.Count || 0,
  };
}
