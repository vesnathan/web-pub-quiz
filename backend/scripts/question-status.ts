import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../../questions');
const TARGET_PER_FILE = 20;

interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: string;
}

function findAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  console.log('='.repeat(60));
  console.log('QUESTION GENERATION STATUS');
  console.log('='.repeat(60));

  const files = findAllJsonFiles(OUTPUT_DIR);

  if (files.length === 0) {
    console.log('\nNo question files found yet.');
    return;
  }

  // Gather stats
  let totalQuestions = 0;
  let completeFiles = 0;
  let incompleteFiles = 0;
  const topicStats: Record<string, { questions: number; files: number; complete: number }> = {};
  const difficultyStats: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

  for (const file of files) {
    try {
      const questions: Question[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const count = questions.length;
      totalQuestions += count;

      // Parse path: questions/<topic>/<subtopic>/<difficulty>.json
      const relativePath = file.replace(OUTPUT_DIR + '/', '');
      const parts = relativePath.split('/');
      const topic = parts[0];
      const difficulty = parts[2]?.replace('.json', '') || 'unknown';

      // Topic stats
      if (!topicStats[topic]) {
        topicStats[topic] = { questions: 0, files: 0, complete: 0 };
      }
      topicStats[topic].questions += count;
      topicStats[topic].files += 1;
      if (count >= TARGET_PER_FILE) {
        topicStats[topic].complete += 1;
        completeFiles++;
      } else {
        incompleteFiles++;
      }

      // Difficulty stats
      if (difficultyStats[difficulty] !== undefined) {
        difficultyStats[difficulty] += count;
      }
    } catch (e) {
      // Skip invalid files
    }
  }

  // Summary
  console.log(`\nTotal Questions: ${totalQuestions}`);
  console.log(`Total Files: ${files.length}`);
  console.log(`Complete (${TARGET_PER_FILE}+): ${completeFiles}`);
  console.log(`Incomplete: ${incompleteFiles}`);
  console.log(`Progress: ${((completeFiles / files.length) * 100).toFixed(1)}%`);

  // By difficulty
  console.log('\n--- By Difficulty ---');
  for (const [diff, count] of Object.entries(difficultyStats)) {
    console.log(`  ${diff}: ${count}`);
  }

  // By topic
  console.log('\n--- By Topic ---');
  const sortedTopics = Object.entries(topicStats).sort((a, b) => b[1].questions - a[1].questions);
  for (const [topic, stats] of sortedTopics) {
    const pct = ((stats.complete / stats.files) * 100).toFixed(0);
    console.log(`  ${topic}: ${stats.questions} questions, ${stats.complete}/${stats.files} files complete (${pct}%)`);
  }

  // Estimated total when complete
  const expectedFiles = 210 * 3; // 210 subtopics × 3 difficulties
  const expectedTotal = expectedFiles * TARGET_PER_FILE;
  console.log(`\n--- Target ---`);
  console.log(`Expected files: ${expectedFiles}`);
  console.log(`Expected total: ${expectedTotal} questions`);
  console.log(`Current progress: ${((totalQuestions / expectedTotal) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(60));
}

main();
