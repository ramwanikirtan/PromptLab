# PromptWriter Pro

AI-powered thesis experiment platform for testing and comparing multiple prompt engineering variants with automated evaluation.

## Features

- 🎯 **8 Prompt Variants**: Zero-shot, One-shot, Few-shot, Persona, Structured Outline, Decomposition, Visual-Grounded, and Multi-Agent
- 📊 **Automated Evaluation**: Multi-metric scoring (coherence, creativity, character consistency, style match, ending strength)
- 📈 **Visual Analytics**: Interactive charts and side-by-side comparison views
- 💾 **Experiment History**: Save and review past experiments with local storage
- 🔄 **OpenAI Integration**: Powered by GPT-4o-mini for generation and evaluation

## Run Locally

**Prerequisites:** Node.js 16+

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ramwanikirtan/PromptLab.git
   cd PromptLab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser** at `http://localhost:3000` (or the port shown in terminal)
