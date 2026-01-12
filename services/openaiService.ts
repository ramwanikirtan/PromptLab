import OpenAI from "openai";
import { VariantId, StoryConfig, StoryResult, EvaluationMetrics } from "../types";
import { createPrompt, getJudgePrompt } from "./promptEngine";
import { VARIANT_TEMPLATES } from "../constants";

const API_KEY = process.env.API_KEY || process.env.OPENAI_API_KEY || "";

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

export const openaiService = {
  async runExperiment(
    config: StoryConfig,
    onProgress: (variant: VariantId, status: string) => void
  ): Promise<StoryResult[]> {
    if (!API_KEY) throw new Error("API Key is missing. Please ensure process.env.OPENAI_API_KEY is set.");

    const client = new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
    const results: StoryResult[] = [];

    for (const template of VARIANT_TEMPLATES) {
      onProgress(template.id, "Generating story...");

      try {
        const prompt = createPrompt(template.id, config);
        const temperature = config.isDeterministic ? 0 : config.temperature;

        const storyCompletion = await retry(async () => {
          return await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature,
            max_tokens: 2000,
            messages: [
              { role: "system", content: "You are a creative fiction writer." },
              { role: "user", content: prompt }
            ]
          });
        });

        const storyText = contentToString(storyCompletion.choices[0]?.message?.content) ||
          "Model returned no text output.";

        onProgress(template.id, "Evaluating story...");

        const judgePrompt = getJudgePrompt(storyText);

        const evalCompletion = await retry(async () => {
          return await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Return only valid JSON matching the scoring schema. No explanations outside JSON."
              },
              { role: "user", content: judgePrompt }
            ]
          });
        });

        let evaluation: EvaluationMetrics;
        let judgeRationale = "";
        try {
          const rawText = contentToString(evalCompletion.choices[0]?.message?.content) || "{}";
          const parsed = JSON.parse(rawText);
          evaluation = {
            coherence: parsed.coherence || 0,
            creativity: parsed.creativity || 0,
            characterConsistency: parsed.characterConsistency || 0,
            styleMatch: parsed.styleMatch || 0,
            endingStrength: parsed.endingStrength || 0,
            avg: parsed.avg || 0
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
            avg: 0
          };
          judgeRationale = "Error parsing judge response.";
        }

        results.push({
          variantId: template.id,
          variantLabel: template.label,
          promptUsed: prompt,
          storyText,
          rawModelResponse: JSON.stringify(storyCompletion, null, 2),
          evaluation,
          judgeRationale,
          judgeRawResponse: JSON.stringify(evalCompletion, null, 2)
        });

        onProgress(template.id, "Completed.");
      } catch (error: any) {
        console.error(`Error in variant ${template.id}:`, error);
        onProgress(template.id, `Error: ${error.message}`);
        results.push({
          variantId: template.id,
          variantLabel: template.label,
          promptUsed: "Error in generation",
          storyText: `Generation failed after retries: ${error.message}`,
          rawModelResponse: JSON.stringify(error, null, 2),
          evaluation: {
            coherence: 0,
            creativity: 0,
            characterConsistency: 0,
            styleMatch: 0,
            endingStrength: 0,
            avg: 0
          },
          judgeRationale: "N/A - Generation Failed",
          judgeRawResponse: ""
        });
      }
    }

    return results;
  }
};
