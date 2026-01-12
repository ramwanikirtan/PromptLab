
import { ExperimentRun } from '../types';

const STORAGE_KEY = 'prompt_writer_experiments';

export const dbService = {
  saveRun: (run: ExperimentRun): void => {
    const runs = dbService.getAllRuns();
    runs.unshift(run);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  },

  getAllRuns: (): ExperimentRun[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getRunById: (id: string): ExperimentRun | undefined => {
    return dbService.getAllRuns().find(r => r.id === id);
  },

  deleteRun: (id: string): void => {
    const runs = dbService.getAllRuns().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }
};
