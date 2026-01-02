import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic();

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

// Detailed subtopics for each category - ensures unique questions by being specific
const TOPIC_SUBTOPICS: Record<string, string[]> = {
  'Science': [
    'Human anatomy and physiology',
    'Chemistry elements and compounds',
    'Physics laws and principles',
    'Space exploration milestones',
    'Famous scientists and discoveries',
    'Animal kingdom classifications',
    'Plant biology and botany',
    'Geology and earth sciences',
    'Weather and meteorology',
    'Ocean science and marine life',
    'Genetics and DNA',
    'Evolution and natural selection',
    'Medical breakthroughs',
    'Scientific instruments',
    'Periodic table facts',
  ],
  'History': [
    'Ancient Egypt civilization',
    'Roman Empire events',
    'Medieval Europe',
    'Renaissance period',
    'World War I events',
    'World War II battles and figures',
    'American Revolution',
    'French Revolution',
    'Industrial Revolution inventions',
    'Cold War events',
    'Ancient Greece',
    'Chinese dynasties',
    'British monarchy history',
    'Civil rights movements',
    'Famous historical speeches',
  ],
  'Geography': [
    'World capitals',
    'Mountain ranges and peaks',
    'Rivers and lakes',
    'Deserts of the world',
    'Island nations',
    'Landlocked countries',
    'National flags',
    'Famous landmarks',
    'Climate zones',
    'Ocean currents and seas',
    'Country borders and neighbors',
    'Population statistics',
    'Natural wonders',
    'Volcanoes and earthquakes',
    'Geographic records (largest, smallest)',
  ],
  'Entertainment': [
    'Oscar-winning films',
    'Classic Hollywood movies',
    'TV sitcoms of the 90s',
    'Modern streaming shows',
    'Disney animated films',
    'Marvel Cinematic Universe',
    'James Bond franchise',
    'Star Wars universe',
    'Harry Potter series',
    'Broadway musicals',
    'Reality TV shows',
    'Animated TV series',
    'Horror movie classics',
    'Romantic comedies',
    'Science fiction films',
  ],
  'Music': [
    'Rock and roll legends',
    'Classical composers',
    'Pop music 2000s-2020s',
    'Hip hop artists and albums',
    'Country music stars',
    'Jazz musicians',
    'British Invasion bands',
    'Grammy Award winners',
    'One-hit wonders',
    'Music festivals',
    'Album cover art',
    'Musical instruments',
    'Opera and classical vocals',
    'Electronic and EDM music',
    'Song lyrics and titles',
  ],
  'Sports': [
    'Olympic Games history',
    'FIFA World Cup',
    'NBA basketball legends',
    'NFL Super Bowl',
    'Tennis Grand Slams',
    'Golf majors and players',
    'Formula 1 racing',
    'Boxing champions',
    'Cricket world cups',
    'Rugby tournaments',
    'Baseball Hall of Fame',
    'Ice hockey NHL',
    'Athletic world records',
    'Extreme sports',
    'Sports team mascots and stadiums',
  ],
  'Politics': [
    'US Presidents',
    'British Prime Ministers',
    'World leaders current and historical',
    'Political systems and ideologies',
    'International organizations (UN, NATO)',
    'Historic elections',
    'Constitutional amendments',
    'Political scandals',
    'Supreme Court cases',
    'Revolutionary leaders',
    'Peace treaties and agreements',
    'Political parties worldwide',
    'Diplomatic relations',
    'Government structures',
    'Famous political quotes',
  ],
  'Food & Drink': [
    'World cuisines and dishes',
    'Wine regions and varieties',
    'Beer types and brewing',
    'Coffee origins and types',
    'Cheese varieties',
    'Spices and seasonings',
    'Famous chefs',
    'Restaurant history',
    'Food origins and history',
    'Cocktails and mixology',
    'Chocolate and desserts',
    'Fast food chains',
    'Vegetarian and vegan cuisine',
    'Food festivals and traditions',
    'Kitchen tools and techniques',
  ],
  'Technology': [
    'Computer history and pioneers',
    'Internet milestones',
    'Smartphone evolution',
    'Social media platforms',
    'Video game history',
    'Programming languages',
    'Tech company founders',
    'Artificial intelligence',
    'Space technology',
    'Robotics',
    'Cybersecurity',
    'Virtual reality',
    'Electric vehicles',
    'Consumer electronics',
    'Tech innovations by decade',
  ],
  'Literature': [
    'Shakespeare plays and sonnets',
    'Classic novels 19th century',
    'Modern fiction bestsellers',
    'Poetry and poets',
    'Nobel Prize in Literature',
    'Fantasy book series',
    'Mystery and thriller authors',
    'Children\'s literature',
    'Science fiction classics',
    'American literature',
    'British literature',
    'World mythology in books',
    'Famous opening lines',
    'Literary awards',
    'Book-to-film adaptations',
  ],
  'Art': [
    'Renaissance painters',
    'Impressionist movement',
    'Modern art movements',
    'Famous sculptures',
    'Art museum collections',
    'Photography pioneers',
    'Street art and graffiti',
    'Art auction records',
    'Ancient art history',
    'Art techniques and mediums',
    'Architectural styles',
    'Fashion designers',
    'Graphic design history',
    'Art forgeries and mysteries',
    'Self-portraits and iconic works',
  ],
  'Nature & Animals': [
    'Endangered species',
    'Animal migration patterns',
    'Rainforest ecosystems',
    'Arctic and Antarctic wildlife',
    'Insect world',
    'Reptiles and amphibians',
    'Bird species and behavior',
    'Marine mammals',
    'Predator and prey relationships',
    'Animal intelligence',
    'Pet breeds and history',
    'Animal records (fastest, largest)',
    'Nocturnal animals',
    'Animal communication',
    'Conservation efforts',
  ],
  'Mythology & Religion': [
    'Greek mythology gods',
    'Norse mythology',
    'Egyptian gods and myths',
    'Hindu deities',
    'Buddhist teachings',
    'Biblical stories',
    'Islamic history and figures',
    'Celtic mythology',
    'Japanese mythology',
    'Native American legends',
    'Creation myths worldwide',
    'Mythical creatures',
    'Religious holidays',
    'Sacred texts',
    'Ancient temples and sites',
  ],
  'Business & Economics': [
    'Stock market history',
    'Famous entrepreneurs',
    'Economic theories',
    'Currency and money history',
    'Global financial crises',
    'Fortune 500 companies',
    'Marketing and advertising',
    'Trade agreements',
    'Banking history',
    'Cryptocurrency',
    'Business mergers',
    'Economic indicators',
    'Labor movements',
    'Investment strategies',
    'Retail and e-commerce',
  ],
};

const OUTPUT_DIR = path.join(__dirname, '../../questions');
const PROGRESS_FILE = path.join(__dirname, '../../questions-progress.json');
const QUESTIONS_PER_BATCH = 8;
const TARGET_PER_FILE = 20; // Target questions per subtopic/difficulty combo
const TARGET_TOTAL = 10000;
const DELAY_BETWEEN_BATCHES_MS = 800;

function getOutputPath(topic: string, subtopic: string, difficulty: string): string {
  const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safeSubtopic = subtopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return path.join(OUTPUT_DIR, safeTopic, safeSubtopic, `${difficulty}.json`);
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface Progress {
  totalGenerated: number;
  currentTopicIndex: number;
  currentSubtopicIndex: number;
  currentDifficultyIndex: number;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('Starting fresh');
  }
  return { totalGenerated: 0, currentTopicIndex: 0, currentSubtopicIndex: 0, currentDifficultyIndex: 0 };
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadQuestionsForFile(filePath: string): Question[] {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    // File doesn't exist yet
  }
  return [];
}

function saveQuestionsToFile(questions: Question[], filePath: string): void {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
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

function loadAllExistingTexts(): Set<string> {
  const texts = new Set<string>();
  const files = findAllJsonFiles(OUTPUT_DIR);

  for (const file of files) {
    try {
      const questions: Question[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      for (const q of questions) {
        texts.add(q.text.toLowerCase().trim());
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return texts;
}

function countAllQuestions(): number {
  let total = 0;
  const files = findAllJsonFiles(OUTPUT_DIR);

  for (const file of files) {
    try {
      const questions: Question[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      total += questions.length;
    } catch (e) {
      // Skip invalid files
    }
  }
  return total;
}

interface FileStatus {
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  path: string;
  count: number;
  needed: number;
}

function getFilesNeedingQuestions(): FileStatus[] {
  const needed: FileStatus[] = [];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (const [topic, subtopics] of Object.entries(TOPIC_SUBTOPICS)) {
    for (const subtopic of subtopics) {
      for (const difficulty of difficulties) {
        const filePath = getOutputPath(topic, subtopic, difficulty);
        const existing = loadQuestionsForFile(filePath);
        const count = existing.length;

        if (count < TARGET_PER_FILE) {
          needed.push({
            topic,
            subtopic,
            difficulty,
            path: filePath,
            count,
            needed: TARGET_PER_FILE - count,
          });
        }
      }
    }
  }

  return needed;
}

async function generateQuestionBatch(
  topic: string,
  subtopic: string,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  console.log(`  → API call: ${count} ${difficulty} questions...`);
  const startTime = Date.now();

  const prompt = `Generate ${count} unique pub quiz trivia questions specifically about "${subtopic}" (category: ${topic}) at ${difficulty} difficulty.

Requirements:
- 4 multiple choice options each
- Factually accurate and verifiable
- Engaging for a pub quiz audience
- Each question must be distinctly different

Return ONLY valid JSON array:
[{"text":"Question?","options":["A","B","C","D"],"correctIndex":0,"explanation":"Short answer explanation.","detailedExplanation":"Detailed paragraph with context.","citationUrl":"https://en.wikipedia.org/wiki/Topic","citationTitle":"Wikipedia: Topic"}]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  → Completed in ${elapsed}s`);

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Bad response');

  let jsonText = content.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```json?\n?/, '').replace(/```$/, '');
  }

  const rawQuestions = JSON.parse(jsonText.trim());

  const categoryMap: Record<string, string> = {
    'Science': 'science',
    'History': 'history',
    'Geography': 'geography',
    'Entertainment': 'entertainment',
    'Music': 'entertainment',
    'Sports': 'sports',
    'Politics': 'general',
    'Food & Drink': 'general',
    'Technology': 'science',
    'Literature': 'literature',
    'Art': 'arts',
    'Nature & Animals': 'science',
    'Mythology & Religion': 'general',
    'Business & Economics': 'general',
  };

  return rawQuestions.map((q: Omit<Question, 'id' | 'category' | 'difficulty'>) => ({
    id: uuidv4(),
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    category: categoryMap[topic] || 'general',
    difficulty,
    explanation: q.explanation,
    detailedExplanation: q.detailedExplanation,
    citationUrl: q.citationUrl,
    citationTitle: q.citationTitle,
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const topics = Object.keys(TOPIC_SUBTOPICS);
  const totalSubtopics = topics.reduce((sum, t) => sum + TOPIC_SUBTOPICS[t].length, 0);

  console.log('='.repeat(60));
  console.log('BULK QUESTION GENERATOR');
  console.log(`Topics: ${topics.length}, Subtopics: ${totalSubtopics}`);
  console.log(`Target: ${TARGET_PER_FILE} questions per file`);
  console.log(`Output: ${OUTPUT_DIR}/<topic>/<subtopic>/<difficulty>.json`);
  console.log('='.repeat(60));

  const existingTexts = loadAllExistingTexts();
  const totalInFiles = countAllQuestions();

  console.log(`\nExisting: ${totalInFiles} questions, ${existingTexts.size} unique texts`);

  // Get files that need more questions
  let filesNeeded = getFilesNeedingQuestions();
  console.log(`Files needing questions: ${filesNeeded.length}`);

  if (filesNeeded.length === 0) {
    console.log('\n✓ All files have reached target. Nothing to do.');
    return;
  }

  let processed = 0;
  for (const file of filesNeeded) {
    const { topic, subtopic, difficulty, path: filePath, count, needed } = file;

    console.log(`\n[${processed + 1}/${filesNeeded.length}] ${topic}/${subtopic}/${difficulty}`);
    console.log(`  Current: ${count}, Need: ${needed}`);

    // Generate in batches until we reach target (max 3 retries with no progress)
    let remaining = needed;
    let noProgressCount = 0;
    const MAX_NO_PROGRESS = 2;

    while (remaining > 0 && noProgressCount < MAX_NO_PROGRESS) {
      const batchSize = Math.min(QUESTIONS_PER_BATCH, remaining);

      try {
        const newQuestions = await generateQuestionBatch(topic, subtopic, batchSize, difficulty);

        // Deduplicate
        const unique = newQuestions.filter(q => {
          const key = q.text.toLowerCase().trim();
          if (existingTexts.has(key)) {
            return false;
          }
          existingTexts.add(key);
          return true;
        });

        if (unique.length === 0) {
          noProgressCount++;
          console.log(`  ⚠ All duplicates (attempt ${noProgressCount}/${MAX_NO_PROGRESS})`);
        } else {
          noProgressCount = 0; // Reset on progress

          // Load existing and append
          const fileQuestions = loadQuestionsForFile(filePath);
          fileQuestions.push(...unique);
          saveQuestionsToFile(fileQuestions, filePath);

          remaining -= unique.length;
          console.log(`  ✓ Added ${unique.length} (now ${fileQuestions.length}/${TARGET_PER_FILE})`);
        }

        await sleep(DELAY_BETWEEN_BATCHES_MS);
      } catch (error) {
        console.error(`  ✗ Error:`, error instanceof Error ? error.message : error);
        await sleep(5000);
        break; // Move to next file on error
      }
    }

    if (noProgressCount >= MAX_NO_PROGRESS) {
      console.log(`  → Moving on (too many duplicates)`);
    }

    processed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`COMPLETE: ${countAllQuestions()} total questions`);

  // Show breakdown by topic
  const topicCounts: Record<string, number> = {};
  const files = findAllJsonFiles(OUTPUT_DIR);
  for (const f of files) {
    const parts = f.replace(OUTPUT_DIR + '/', '').split('/');
    const topic = parts[0];
    const questions = loadQuestionsForFile(f);
    topicCounts[topic] = (topicCounts[topic] || 0) + questions.length;
  }

  console.log('\nBy topic:');
  for (const [topic, count] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${topic}: ${count}`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
