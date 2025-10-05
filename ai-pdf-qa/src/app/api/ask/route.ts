import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCollection } from "@/lib/store";
import { cosineSimilarity } from "@/lib/similarity";
import { openai, CHAT_MODEL } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  collectionId: z.string().min(1),
  question: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { collectionId, question } = parse.data;
  const collection = getCollection(collectionId);
  if (!collection) {
    return NextResponse.json({ error: "Invalid collectionId" }, { status: 404 });
    }

  // Embed the question and find top-k similar chunks
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: [question],
  });
  const queryEmbedding = embeddingResponse.data[0].embedding as number[];

  const scored = collection.chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5).map((s) => s.chunk.text);

  const systemPrompt = `You are a helpful assistant that answers questions about the provided PDF excerpts. Use only the context to answer. If the answer isn't in the context, say you don't know.

Context:\n\n${top.map((t, i) => `Excerpt ${i + 1}:\n${t}`).join("\n\n")}`;

  const chat = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.2,
  });

  const answer = chat.choices[0]?.message?.content ?? "";

  return NextResponse.json({ answer, usedExcerpts: top });
}
