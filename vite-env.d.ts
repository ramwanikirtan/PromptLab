/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly OPENAI_API_KEY: string;
    readonly GOOGLE_API_KEY: string;
    readonly HUGGINGFACE_API_KEY: string;
  }
}
