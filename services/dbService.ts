
import { ExperimentRun, ModelId, VariantId } from '../types';

const STORAGE_KEY = 'prompt_writer_experiments';

// Migration helper to add default modelId/modelLabel to old results
const migrateRun = (run: ExperimentRun): ExperimentRun => {
  return {
    ...run,
    config: {
      ...run.config,
      selectedModels: run.config.selectedModels || [ModelId.GPT4O_MINI],
      selectedVariants: run.config.selectedVariants || [VariantId.V0, VariantId.V1, VariantId.V2, VariantId.V3, VariantId.V4, VariantId.V5, VariantId.V6, VariantId.V7]
    },
    results: run.results.map(r => ({
      ...r,
      modelId: r.modelId || ModelId.GPT4O_MINI,
      modelLabel: r.modelLabel || 'GPT-4o-mini'
    }))
  };
};

export const dbService = {
  saveRun: (run: ExperimentRun): void => {
    const runs = dbService.getAllRuns();
    runs.unshift(run);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  },

  getAllRuns: (): ExperimentRun[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    const runs: ExperimentRun[] = data ? JSON.parse(data) : [];
    return runs.map(migrateRun);
  },

  getRunById: (id: string): ExperimentRun | undefined => {
    return dbService.getAllRuns().find(r => r.id === id);
  },

  deleteRun: (id: string): void => {
    const runs = dbService.getAllRuns().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }
};
