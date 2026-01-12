
import { VariantId, PromptTemplate, StoryConfig } from './types';

export const VARIANT_TEMPLATES: PromptTemplate[] = [
  { id: VariantId.V0, label: 'Zero-Shot', description: 'Plain instruction with no examples.' },
  { id: VariantId.V1, label: 'One-Shot', description: 'Instruction with a single high-quality example.' },
  { id: VariantId.V2, label: 'Few-Shot', description: 'Instruction with multiple varied examples.' },
  { id: VariantId.V3, label: 'Persona', description: 'Assigned role as a master novelist.' },
  { id: VariantId.V4, label: 'Structured Outline', description: 'Forces an outline creation before writing.' },
  { id: VariantId.V5, label: 'Decomposition', description: 'Breaks writing into sequential scenes.' },
  { id: VariantId.V6, label: 'Visual-Grounded', description: 'Instructional focus on textual visual cues.' },
  { id: VariantId.V7, label: 'Multi-Agent', description: 'Writer -> Critic -> Rewrite iterative process.' }
];

export const DEFAULT_STORY_CONFIG: StoryConfig = {
  idea: 'A time traveler repeatedly returns to the same night in Budapest and realizes the city remembers him even when people do not.',
  genre: 'Literary science fiction',
  style: 'Dark, introspective, poetic',
  pov: 'First person',
  tone: 'Melancholic',
  length: 900,
  includes: ['Danube river at night', 'morally difficult choice'],
  avoids: ['technical sci-fi jargon', 'happy endings'],
  temperature: 0.8,
  isDeterministic: false
};
