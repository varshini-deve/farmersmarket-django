import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function pdfToText(fileBuffer: Buffer): Promise<string> {
  // pdfjs expects Uint8Array for binary data
  const data = new Uint8Array(fileBuffer);
  const loadingTask = getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    let allText = "";
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false,
      });
      const items = (content.items as Array<{ str?: unknown; hasEOL?: boolean }>);
      const pageText = items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .filter((s) => s.length > 0)
        .join(" ");
      allText += pageText + "\n\n";
      page.cleanup();
    }
    return allText.trim();
  } finally {
    await doc.destroy();
  }
}
