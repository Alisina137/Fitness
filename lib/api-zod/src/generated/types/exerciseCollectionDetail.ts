import type { Exercise } from './exercise';

export type ExerciseCollectionDetail = {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  exercises: Exercise[];
  createdAt: string;
};
