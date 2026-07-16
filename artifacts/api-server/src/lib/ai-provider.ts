import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface AIReasoningOutput {
  programName: string;
  description: string;
  overallReasoning: string;
  exerciseReasons: Record<string, string>;
  dayReasons: Record<string, string>;
  progressionNote: string;
  adaptationNote: string;
}

/**
 * Call OpenAI to generate human-readable reasoning for a workout plan.
 * Returns null on failure — caller must handle gracefully with rule-based fallback.
 */
export async function generateWorkoutReasoning(
  prompt: string,
  maxTokens = 1500,
): Promise<AIReasoningOutput | null> {
  const client = getClient();
  if (!client) return null;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional strength and conditioning coach. Always respond with valid JSON only, no markdown, no code fences.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw) as AIReasoningOutput;
      return parsed;
    } catch (error) {
      attempts++;
      if (attempts >= 3) {
        console.error("[AI Provider] OpenAI call failed after 3 attempts:", error);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }
  return null;
}
