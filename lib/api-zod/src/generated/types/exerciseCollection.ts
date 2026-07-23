export type ExerciseCollection = {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  exerciseCount: number;
  createdAt: string;
};
