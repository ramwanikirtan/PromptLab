
import { VariantId, StoryConfig } from '../types';

export const createPrompt = (variant: VariantId, config: StoryConfig): string => {
  const baseConstraints = `
[CONSTRAINTS]
- IDEA: ${config.idea}
- GENRE: ${config.genre}
- STYLE: ${config.style}
- POV: ${config.pov}
- TONE: ${config.tone}
- LENGTH: ~${config.length} words
- MUST INCLUDE: ${config.includes.join(', ')}
- AVOID: ${config.avoids.join(', ')}
`.trim();

  switch (variant) {
    case VariantId.V0:
      return `### INSTRUCTION: Write a story based on these constraints.\n\n${baseConstraints}`;

    case VariantId.V1:
      return `### TASK: Write a story following the style and constraints provided.
### EXAMPLE OF EXCELLENCE:
"The Danube was a ribbon of black glass reflecting the dying embers of a forgotten century. Elias stepped into the cold, his coat a heavy shadow against the mist. In Budapest, the stones don't just sit; they listen."
### YOUR TURN:
${baseConstraints}`;

    case VariantId.V2:
      return `### INSTRUCTIONS: You will write a story. Study these three stylistic examples first.
Example 1: "Poetic melancholy drips from every spire in this city."
Example 2: "First person perspective focused on internal decay."
Example 3: "Literary science fiction that ignores the 'science' and embraces the 'fiction'."
### NOW WRITE:
${baseConstraints}`;

    case VariantId.V3:
      return `### ROLE: You are an award-winning literary novelist. You specialize in "Soft Sci-Fi" where the technology is a background for human suffering and wonder. Your prose is dense, rhythmic, and avoids all genre clichés.
### OBJECTIVE: Write a definitive story based on these constraints.
${baseConstraints}`;

    case VariantId.V4:
      return `### MULTI-STEP PROCESS:
1. Brainstorm an outline with 5 beats: The Return, The Uncanny Echo, The Discovery of the City's Memory, The Impossible Choice, and The Final Departure.
2. Write a full ${config.length} word narrative based strictly on that outline.
### CONSTRAINTS:
${baseConstraints}`;

    case VariantId.V5:
      return `### TASK DECOMPOSITION:
- Scene A: Focus on the sensory details of the Danube at night.
- Scene B: Focus on the first-person internal monologue regarding the moral choice.
- Scene C: Focus on the resolution of the time-travel paradox.
Merge these into a single fluid narrative.
### CONSTRAINTS:
${baseConstraints}`;

    case VariantId.V6:
      return `### VISUAL FOCUS: Prioritize "show, don't tell." Use cinematic language. Describe the flickering of the orange Parliament lights, the smell of damp stone, the sound of the tram on the tracks. The science fiction elements should be felt, not explained.
### CONSTRAINTS:
${baseConstraints}`;

    case VariantId.V7:
      return `### ITERATIVE REFINEMENT:
1. Create a "Rough Draft" focusing only on plot.
2. Rewrite the draft to add "Poetic Style" and "Dark Tone."
3. Edit the result for "Character Consistency."
Only provide the final, polished result of Step 3.
### CONSTRAINTS:
${baseConstraints}`;

    default:
      return `Write a story: ${baseConstraints}`;
  }
};

export const getJudgePrompt = (story: string): string => {
  return `
### ROLE: Academic Writing Examiner
Evaluate the following creative writing piece on a scale of 1-10 across five specific metrics. 
Be rigorous. A score of 10 is only for professional-grade literature. A score of 1 is for nonsensical output.

### METRICS:
1. COHERENCE (1-10): Logical flow and narrative structure.
2. CREATIVITY (1-10): Originality of imagery and subversion of sci-fi tropes.
3. CHARACTER CONSISTENCY (1-10): Is the first-person voice stable and authentic?
4. STYLE ADHERENCE (1-10): Does it match the "Poetic/Dark/Introspective" style specifically?
5. ENDING IMPACT (1-10): Thematic resonance of the conclusion.

### STORY:
"""
${story}
"""

### OUTPUT FORMAT:
You must respond with a raw JSON object only.
{
  "coherence": number,
  "creativity": number,
  "characterConsistency": number,
  "styleMatch": number,
  "endingStrength": number,
  "avg": number,
  "judgeRationale": "Detailed explanation of the strengths and weaknesses relative to the prompt variants."
}
`.trim();
};
