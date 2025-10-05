import { openai, EMBEDDING_MODEL } from "@/lib/ai";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // The OpenAI API supports batching multiple inputs
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map((d) => d.embedding as number[]);
}
