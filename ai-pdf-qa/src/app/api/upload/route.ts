import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pdfToText } from "@/lib/pdf";
import { splitIntoChunks } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { createCollection } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Edge safety, ignored locally

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

const ContentTypeSchema = z.string().regex(/^multipart\/form-data/i);

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!ContentTypeSchema.safeParse(contentType).success) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const text = await pdfToText(buffer);
  if (!text) {
    return NextResponse.json({ error: "No text extracted" }, { status: 400 });
  }

  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No chunks created" }, { status: 400 });
  }

  const embeddings = await embedTexts(chunks);
  const items = chunks.map((text, idx) => ({ id: `${idx}`, text, embedding: embeddings[idx] }));
  const collectionId = createCollection(items);

  return NextResponse.json({ collectionId, chunkCount: chunks.length });
}
