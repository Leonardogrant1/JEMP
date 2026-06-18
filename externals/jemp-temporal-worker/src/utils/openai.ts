// externals/jemp-temporal-worker/src/utils/openai.ts
import OpenAI from 'openai'

export function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}
