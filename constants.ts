import { Exercise, DailyStat } from './types';

export const MOCK_EXERCISES: Exercise[] = [
  {
    id: '1',
    title: 'Seated Marching',
    duration: '5 mins',
    difficulty: 'Easy',
    description: 'A gentle cardio exercise performed while seated to improve circulation.',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    category: 'Cardio'
  },
  {
    id: '2',
    title: 'Wall Push-ups',
    duration: '10 mins',
    difficulty: 'Moderate',
    description: 'Build upper body strength safely using a wall for support.',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    category: 'Strength'
  },
  {
    id: '3',
    title: 'Chair Yoga Flow',
    duration: '15 mins',
    difficulty: 'Easy',
    description: 'Relaxing stretches to improve flexibility and reduce stiffness.',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    category: 'Flexibility'
  },
  {
    id: '4',
    title: 'Single Leg Balance',
    duration: '5 mins',
    difficulty: 'Moderate',
    description: 'Stand near a chair and lift one foot to improve stability.',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    category: 'Balance'
  }
];

export const WEEKLY_STATS: DailyStat[] = [
  { day: 'Mon', steps: 3400, calories: 180, activeMinutes: 20 },
  { day: 'Tue', steps: 4200, calories: 210, activeMinutes: 35 },
  { day: 'Wed', steps: 3100, calories: 150, activeMinutes: 15 },
  { day: 'Thu', steps: 5000, calories: 250, activeMinutes: 45 },
  { day: 'Fri', steps: 4800, calories: 230, activeMinutes: 40 },
  { day: 'Sat', steps: 5500, calories: 280, activeMinutes: 50 },
  { day: 'Sun', steps: 3900, calories: 190, activeMinutes: 25 },
];