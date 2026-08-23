import { RepsRecord } from './types';

export function totalReps(record: RepsRecord): number {
  return record.sets.reduce((sum, s) => sum + s.reps, 0);
}
