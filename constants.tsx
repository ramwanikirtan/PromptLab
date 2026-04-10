import { VariantId, PromptTemplate, StoryConfig, ModelId, ModelConfig } from './types';

export const AVAILABLE_MODELS: ModelConfig[] = [
  { id: ModelId.GPT4O_MINI, label: 'GPT-4o-mini', provider: 'openai', description: 'Fast and cost-effective OpenAI model' },
  { id: ModelId.GPT35_TURBO, label: 'GPT-3.5-turbo', provider: 'openai', description: 'Classic OpenAI chat model' },
  { id: ModelId.GEMINI_FLASH, label: 'Gemini 2.0 Flash', provider: 'google', description: 'Google\'s fast multimodal model' },
  { id: ModelId.MISTRAL_7B, label: 'Llama-3.2-3B', provider: 'mistral', description: 'Meta Llama 3.2 via Hugging Face' }
];

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
  isDeterministic: false,
  selectedModels: [ModelId.GPT4O_MINI],
  selectedVariants: []
};

// Add a default reference style for each variant (for demo, use config.style or a fallback)
VARIANT_TEMPLATES.forEach(t => {
  t.referenceStyle = DEFAULT_STORY_CONFIG.style || 'Dark, introspective, poetic';
});
