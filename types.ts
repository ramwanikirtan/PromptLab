
export enum VariantId {
  V0 = 'V0',
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
  V4 = 'V4',
  V5 = 'V5',
  V6 = 'V6',
  V7 = 'V7'
}

export interface StoryConfig {
  idea: string;
  genre: string;
  style: string;
  pov: string;
  tone: string;
  length: number;
  includes: string[];
  avoids: string[];
  temperature: number;
  isDeterministic: boolean;
}

export interface EvaluationMetrics {
  coherence: number;
  creativity: number;
  characterConsistency: number;
  styleMatch: number;
  endingStrength: number;
  avg: number;
}

export interface StoryResult {
  variantId: VariantId;
  variantLabel: string;
  promptUsed: string;
  storyText: string;
  rawModelResponse: string;
  evaluation: EvaluationMetrics;
  judgeRationale: string;
  judgeRawResponse: string;
}

export interface ExperimentRun {
  id: string;
  timestamp: number;
  config: StoryConfig;
  results: StoryResult[];
}

export interface PromptTemplate {
  id: VariantId;
  label: string;
  description: string;
}
