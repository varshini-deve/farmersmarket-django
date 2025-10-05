export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitIntoChunks(
  rawText: string,
  maxChars: number = 1200,
  overlap: number = 200
): string[] {
  const text = normalizeWhitespace(rawText);
  if (!text) return [];

  const paragraphs = text.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    // Slice long paragraph into overlapping sub-chunks
    const step = Math.max(1, maxChars - overlap);
    for (let i = 0; i < paragraph.length; i += step) {
      const slice = paragraph.slice(i, i + maxChars);
      if (slice.trim()) chunks.push(slice.trim());
    }
  }

  if (current) chunks.push(current);

  // Final cleanup and safety cap
  return chunks
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 2000);
}
