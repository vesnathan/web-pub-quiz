import * as fs from 'fs';
import * as path from 'path';

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

const INPUT_FILE = path.join(__dirname, '../../questions-bulk.json');
const OUTPUT_DIR = path.join(__dirname, '../../questions');

// Keywords to match questions to subtopics
const SUBTOPIC_KEYWORDS: Record<string, Record<string, string[]>> = {
  science: {
    'human-anatomy-and-physiology': ['bone', 'muscle', 'organ', 'blood', 'heart', 'brain', 'lung', 'cell', 'body', 'insulin', 'nerve'],
    'chemistry-elements-and-compounds': ['element', 'chemical', 'atom', 'molecule', 'periodic', 'gold', 'silver', 'oxygen', 'hydrogen', 'carbon'],
    'physics-laws-and-principles': ['gravity', 'force', 'energy', 'light', 'speed', 'newton', 'einstein', 'quantum', 'wave', 'particle'],
    'space-exploration-milestones': ['planet', 'moon', 'star', 'sun', 'mars', 'jupiter', 'nasa', 'astronaut', 'rocket', 'galaxy', 'solar'],
    'animal-kingdom-classifications': ['animal', 'mammal', 'bird', 'fish', 'reptile', 'insect', 'species', 'whale', 'elephant', 'lion'],
    'genetics-and-dna': ['dna', 'gene', 'chromosome', 'genetic', 'hereditary', 'mutation'],
    'weather-and-meteorology': ['weather', 'climate', 'temperature', 'rain', 'storm', 'hurricane', 'tornado', 'atmosphere'],
    'geology-and-earth-sciences': ['rock', 'mineral', 'volcano', 'earthquake', 'plate', 'tectonic', 'fossil'],
    'ocean-science-and-marine-life': ['ocean', 'sea', 'marine', 'coral', 'reef', 'underwater'],
  },
  history: {
    'world-war-ii-battles-and-figures': ['world war ii', 'wwii', 'hitler', 'nazi', 'allied', '1940s', 'normandy', 'd-day'],
    'world-war-i-events': ['world war i', 'wwi', '1914', '1918', 'trench', 'versailles'],
    'ancient-egypt-civilization': ['egypt', 'pharaoh', 'pyramid', 'nile', 'sphinx', 'cleopatra', 'tutankhamun'],
    'roman-empire-events': ['rome', 'roman', 'caesar', 'emperor', 'gladiator', 'colosseum'],
    'ancient-greece': ['greece', 'greek', 'athens', 'sparta', 'alexander', 'aristotle', 'plato'],
    'american-revolution': ['american revolution', '1776', 'washington', 'independence', 'colonial'],
    'civil-rights-movements': ['civil rights', 'mlk', 'segregation', 'equality', 'rosa parks'],
  },
  geography: {
    'world-capitals': ['capital', 'city'],
    'mountain-ranges-and-peaks': ['mountain', 'peak', 'everest', 'alps', 'andes', 'himalaya'],
    'rivers-and-lakes': ['river', 'lake', 'nile', 'amazon', 'mississippi'],
    'deserts-of-the-world': ['desert', 'sahara', 'gobi', 'arid'],
    'island-nations': ['island', 'archipelago'],
    'country-borders-and-neighbors': ['border', 'neighbor', 'country', 'nation'],
  },
  entertainment: {
    'oscar-winning-films': ['oscar', 'academy award', 'best picture'],
    'marvel-cinematic-universe': ['marvel', 'avengers', 'iron man', 'thor', 'captain america', 'spider-man'],
    'star-wars-universe': ['star wars', 'jedi', 'sith', 'skywalker', 'darth'],
    'disney-animated-films': ['disney', 'pixar', 'animated', 'animation'],
    'tv-sitcoms': ['sitcom', 'friends', 'seinfeld', 'office', 'comedy series'],
  },
  sports: {
    'olympic-games-history': ['olympic', 'olympics', 'gold medal'],
    'fifa-world-cup': ['world cup', 'fifa', 'soccer', 'football'],
    'nba-basketball-legends': ['nba', 'basketball', 'lebron', 'jordan', 'lakers'],
    'tennis-grand-slams': ['tennis', 'wimbledon', 'us open', 'french open'],
  },
  general: {
    'mixed-general-knowledge': ['general'],
  },
  arts: {
    'renaissance-painters': ['renaissance', 'da vinci', 'michelangelo', 'raphael'],
    'impressionist-movement': ['monet', 'renoir', 'impressionist'],
    'modern-art-movements': ['picasso', 'modern art', 'abstract'],
  },
  literature: {
    'shakespeare-plays-and-sonnets': ['shakespeare', 'hamlet', 'macbeth', 'romeo'],
    'classic-novels-19th-century': ['dickens', 'austen', 'twain', 'tolstoy'],
  },
};

function inferSubtopic(question: Question): string {
  const category = question.category.toLowerCase();
  const textLower = (question.text + ' ' + (question.explanation || '')).toLowerCase();

  const categoryKeywords = SUBTOPIC_KEYWORDS[category];
  if (!categoryKeywords) {
    return 'mixed-general-knowledge';
  }

  for (const [subtopic, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        return subtopic;
      }
    }
  }

  // Default subtopic for category
  const defaults: Record<string, string> = {
    science: 'general-science',
    history: 'general-history',
    geography: 'general-geography',
    entertainment: 'general-entertainment',
    sports: 'general-sports',
    general: 'mixed-general-knowledge',
    arts: 'general-arts',
    literature: 'general-literature',
  };

  return defaults[category] || 'mixed-general-knowledge';
}

function main() {
  console.log('Splitting questions into nested folder structure...\n');

  // Load existing questions
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('No input file found:', INPUT_FILE);
    return;
  }

  const questions: Question[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${questions.length} questions from ${INPUT_FILE}`);

  // Group questions by category/subtopic/difficulty
  const groups: Record<string, Question[]> = {};

  for (const q of questions) {
    const subtopic = inferSubtopic(q);
    const key = `${q.category}/${subtopic}/${q.difficulty}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(q);
  }

  // Write each group to nested folder structure
  let totalWritten = 0;
  for (const [key, groupQuestions] of Object.entries(groups)) {
    const [category, subtopic, difficulty] = key.split('/');
    const dirPath = path.join(OUTPUT_DIR, category, subtopic);
    const filepath = path.join(dirPath, `${difficulty}.json`);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Load existing if present
    let existing: Question[] = [];
    if (fs.existsSync(filepath)) {
      existing = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }

    // Merge, avoiding duplicates
    const existingIds = new Set(existing.map(q => q.id));
    const newQuestions = groupQuestions.filter(q => !existingIds.has(q.id));
    const merged = [...existing, ...newQuestions];

    fs.writeFileSync(filepath, JSON.stringify(merged, null, 2));
    console.log(`  ${category}/${subtopic}/${difficulty}.json: ${merged.length} questions`);
    totalWritten += newQuestions.length;
  }

  console.log(`\nDone! Split ${totalWritten} questions.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
