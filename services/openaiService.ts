import OpenAI from "openai";
import { VariantId, StoryConfig, StoryResult, EvaluationMetrics, ModelId } from "../types";
import { createPrompt, getJudgePrompt } from "./promptEngine";
import { VARIANT_TEMPLATES, AVAILABLE_MODELS } from "../constants";

// Mathematically computed - no LLM involved
function computeLexicalDiversity(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const N = words.length;
  if (N === 0) return 0;

  // Count word frequencies
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Yule's K
  const sumFiSquared = Object.values(freq).reduce((acc, f) => acc + f * f, 0);
  const yulesK = 10000 * (sumFiSquared - N) / (N * N);

  // MSTTR - split into 100-word segments
  const segmentSize = 100;
  const segments: string[][] = [];
  for (let i = 0; i < words.length; i += segmentSize) {
    segments.push(words.slice(i, i + segmentSize));
  }
  const msttr = segments.reduce((acc, seg) => {
    const unique = new Set(seg).size;
    return acc + unique / seg.length;
  }, 0) / segments.length;

  // Normalize to 0-10 scale for your existing chart
  // MSTTR is already 0-1, Yule's K needs inverting (lower = more diverse)
  const msttrScore = msttr * 10;
  const yulesKScore = Math.max(0, 10 - (yulesK / 20)); // invert and cap

  return Math.round(((msttrScore + yulesKScore) / 2) * 10) / 10;
}

// API Keys for different providers
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";

// User-friendly error message helper
function formatApiError(provider: string, error: any): string {
  const errorMessage = error?.message || error?.error?.message || String(error);
  const errorCode = error?.status || error?.code || error?.error?.code;
  
  // Common error patterns
  if (errorMessage.includes('API Key is missing') || errorMessage.includes('API key not valid')) {
    return `${provider} API key is missing or invalid. Please add a valid API key to your .env.local file (VITE_${provider.toUpperCase()}_API_KEY).`;
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorCode === 429) {
    return `${provider} rate limit exceeded. Please wait a moment and try again, or check your API usage limits.`;
  }
  
  if (errorMessage.includes('billing') || errorMessage.includes('payment')) {
    return `${provider} billing issue. Please check your ${provider} account billing settings and ensure you have available credits.`;
  }
  
  if (errorMessage.includes('model') && (errorMessage.includes('not found') || errorMessage.includes('does not exist'))) {
    return `${provider} model not available. The requested model may not be accessible with your API key or plan.`;
  }
  
  if (errorCode === 401 || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
    return `${provider} authentication failed. Please verify your API key is correct and has not expired.`;
  }
  
  if (errorCode === 403 || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
    return `${provider} access denied. Your API key may not have permission to use this model.`;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
    return `Unable to connect to ${provider}. Please check your internet connection and try again.`;
  }
  
  if (errorCode === 500 || errorCode === 502 || errorCode === 503) {
    return `${provider} service is temporarily unavailable. Please try again in a few moments.`;
  }
  
  // Default fallback with original message
  return `${provider} error: ${errorMessage}`;
}

async function retry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) {
        console.warn(`Attempt ${i + 1} failed. Retrying...`, e);
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function contentToString(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return (part as { text?: string }).text || "";
        }
        return "";
      })
      .join("")
      .trim();
  }
  return String(content);
}

// Provider-specific generation functions
async function generateWithOpenAI(
  modelId: string,
  prompt: string,
  temperature: number,
  isEvaluation: boolean = false
): Promise<{ text: string; raw: any }> {
  if (!OPENAI_API_KEY) {
    throw new Error(formatApiError('OpenAI', { message: 'API Key is missing' }));
  }
  
  try {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });
    
    const completion = await client.chat.completions.create({
      model: modelId,
      temperature: isEvaluation ? 0 : temperature,
      max_tokens: 2000,
      ...(isEvaluation ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { 
          role: "system", 
          content: isEvaluation 
            ? "Return only valid JSON matching the scoring schema. No explanations outside JSON."
            : "You are a creative fiction writer." 
        },
        { role: "user", content: prompt }
      ]
    });
    
    return {
      text: contentToString(completion.choices[0]?.message?.content) || "Model returned no text output.",
      raw: completion
    };
  } catch (error: any) {
    throw new Error(formatApiError('OpenAI', error));
  }
}

async function generateWithGemini(
  prompt: string,
  temperature: number,
  isEvaluation: boolean = false
): Promise<{ text: string; raw: any }> {
  if (!GOOGLE_API_KEY) {
    throw new Error(formatApiError('Google', { message: 'API Key is missing' }));
  }
  
  const systemPrompt = isEvaluation
    ? "Return only valid JSON matching the scoring schema. No explanations outside JSON."
    : "You are a creative fiction writer.";
  
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: isEvaluation ? 0 : temperature,
            maxOutputTokens: 2000,
            ...(isEvaluation ? { responseMimeType: "application/json" } : {})
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { ...error, status: response.status };
    }
    
    const data = await response.json();
    
    // Check for blocked content or safety filters
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked by Google safety filters: ${data.promptFeedback.blockReason}`);
    }
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Model returned no text output.";
    
    return { text, raw: data };
  } catch (error: any) {
    if (error.message?.startsWith('Google')) throw error; // Already formatted
    throw new Error(formatApiError('Google', error));
  }
}

async function generateWithMistral(
  prompt: string,
  temperature: number,
  isEvaluation: boolean = false
): Promise<{ text: string; raw: any }> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error(formatApiError('Hugging Face', { message: 'API Key is missing' }));
  }
  
  const systemPrompt = isEvaluation
    ? "Return only valid JSON matching the scoring schema. No explanations outside JSON."
    : "You are a creative fiction writer.";
  
  try {
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.2-3B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: isEvaluation ? 0.1 : temperature
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      // Handle model loading state
      if (error.error?.message?.includes('loading')) {
        throw new Error('Model is loading on Hugging Face. Please wait 20-30 seconds and try again.');
      }
      
      // Handle permission errors for new router API
      if (error.error?.message?.includes('permission') || error.error?.message?.includes('authentication')) {
        throw new Error('HuggingFace token lacks Inference Provider permissions. Go to huggingface.co/settings/tokens, create a new token with "Make calls to Inference Providers" permission enabled.');
      }
      
      throw { ...error, status: response.status };
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Model returned no text output.";
    
    return { text: text.trim(), raw: data };
  } catch (error: any) {
    if (error.message?.includes('Llama') || error.message?.includes('Hugging Face')) throw error;
    throw new Error(formatApiError('Hugging Face (Llama-3.2)', error));
  }
}

// Unified generation function
async function generateStory(
  modelId: ModelId,
  prompt: string,
  temperature: number
): Promise<{ text: string; raw: any }> {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  
  switch (model.provider) {
    case 'openai':
      return generateWithOpenAI(modelId, prompt, temperature);
    case 'google':
      return generateWithGemini(prompt, temperature);
    case 'mistral':
      return generateWithMistral(prompt, temperature);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

async function evaluateStory(
  modelId: ModelId,
  judgePrompt: string
): Promise<{ text: string; raw: any }> {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  
  switch (model.provider) {
    case 'openai':
      return generateWithOpenAI(modelId, judgePrompt, 0, true);
    case 'google':
      return generateWithGemini(judgePrompt, 0, true);
    case 'mistral':
      return generateWithMistral(judgePrompt, 0, true);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

export const openaiService = {
  async runExperiment(
    config: StoryConfig,
    onProgress: (variant: VariantId, status: string, modelId?: ModelId) => void
  ): Promise<StoryResult[]> {
    const selectedModels = config.selectedModels || [ModelId.GPT4O_MINI];
    const results: StoryResult[] = [];

    for (const modelId of selectedModels) {
      const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
      const modelLabel = modelConfig?.label || modelId;

      const selectedVariants = config.selectedVariants || VARIANT_TEMPLATES.map(t => t.id);
      const templatesToRun = VARIANT_TEMPLATES.filter(t => selectedVariants.includes(t.id));

      for (const template of templatesToRun) {
        const progressKey = `${template.id}-${modelId}`;
        onProgress(template.id, `[${modelLabel}] Generating story...`, modelId);

        try {
          const prompt = createPrompt(template.id, config);
          const temperature = config.isDeterministic ? 0 : config.temperature;

          const storyResult = await retry(async () => {
            return await generateStory(modelId, prompt, temperature);
          });

          const storyText = storyResult.text;

          onProgress(template.id, `[${modelLabel}] Evaluating story...`, modelId);

          const judgePrompt = getJudgePrompt(storyText);

          const evalResult = await retry(async () => {
            return await evaluateStory(modelId, judgePrompt);
          });

          let evaluation: EvaluationMetrics;
          let judgeRationale = "";
          try {
            const rawText = evalResult.text || "{}";
            const parsed = JSON.parse(rawText);
            const lexicalDiversity = computeLexicalDiversity(storyText);
            evaluation = {
              coherence: parsed.coherence || 0,
              creativity: parsed.creativity || 0,
              characterConsistency: parsed.characterConsistency || 0,
              styleMatch: parsed.styleMatch || 0,
              endingStrength: parsed.endingStrength || 0,
              lexicalDiversity,
              avg: (parsed.coherence + parsed.creativity + parsed.characterConsistency +
                    parsed.styleMatch + parsed.endingStrength + lexicalDiversity) / 6
            };
            judgeRationale = parsed.judgeRationale || "No rationale provided.";
          } catch (e) {
            console.error("Failed to parse evaluation JSON", e);
            evaluation = {
              coherence: 0,
              creativity: 0,
              characterConsistency: 0,
              styleMatch: 0,
              endingStrength: 0,
              lexicalDiversity: 0,
              avg: 0
            };
            judgeRationale = "Error parsing judge response.";
          }

          results.push({
            variantId: template.id,
            variantLabel: template.label,
            modelId,
            modelLabel,
            promptUsed: prompt,
            storyText,
            rawModelResponse: JSON.stringify(storyResult.raw, null, 2),
            evaluation,
            judgeRationale,
            judgeRawResponse: JSON.stringify(evalResult.raw, null, 2)
          });

          onProgress(template.id, `[${modelLabel}] Completed.`, modelId);
        } catch (error: any) {
          console.error(`Error in variant ${template.id} with model ${modelId}:`, error);
          const errorMessage = error.message || 'Unknown error occurred';
          onProgress(template.id, `[${modelLabel}] Failed`, modelId);
          results.push({
            variantId: template.id,
            variantLabel: template.label,
            modelId,
            modelLabel,
            promptUsed: "Error - generation was not attempted or failed",
            storyText: `⚠️ Generation Failed for ${modelLabel}\n\n${errorMessage}\n\n💡 Tip: Check your .env.local file and ensure the required API key is set correctly. You may need to restart the development server after updating environment variables.`,
            rawModelResponse: JSON.stringify({ error: errorMessage, details: error }, null, 2),
            evaluation: {
              coherence: 0,
              creativity: 0,
              characterConsistency: 0,
              styleMatch: 0,
              endingStrength: 0,
              lexicalDiversity: 0,
              avg: 0
            },
            judgeRationale: `Generation failed: ${errorMessage}`,
            judgeRawResponse: ""
          });
        }
      }
    }

    return results;
  }
};
