import correct100 from './correct-100';
import correct500 from './correct-500';
import correct1000 from './correct-1000';
import correct5000 from './correct-5000';
import correct10000 from './correct-10000';

export const totalCorrectBadges = [correct100, correct500, correct1000, correct5000, correct10000];

export const TOTAL_CORRECT_GROUP = {
  id: 'total_correct',
  name: 'Knowledge',
  description: 'Total correct answers',
  showHighestOnly: true,
};
