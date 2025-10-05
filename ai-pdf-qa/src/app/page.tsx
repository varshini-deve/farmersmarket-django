"use client";

import { useState } from "react";

export default function Home() {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [usedExcerpts, setUsedExcerpts] = useState<string[]>([]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setAnswer(null);
    setUsedExcerpts([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setCollectionId(json.collectionId);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function ask() {
    if (!collectionId || !question.trim()) return;
    setLoadingAnswer(true);
    setAnswer(null);
    setUsedExcerpts([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, question }),
      });
      if (!res.ok) throw new Error("Ask failed");
      const json = await res.json();
      setAnswer(json.answer);
      setUsedExcerpts(json.usedExcerpts || []);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoadingAnswer(false);
    }
  }

  return (
    <div className="font-sans max-w-3xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">AI PDF Q&A</h1>

      <div className="border rounded p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">1) Upload a PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3"
        />
        <button
          disabled={!file || uploading}
          onClick={handleUpload}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {collectionId && (
          <p className="text-sm text-gray-600 mt-2">Collection: {collectionId}</p>
        )}
      </div>

      <div className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">2) Ask a question</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the uploaded PDF..."
          className="w-full border rounded p-2 h-24 mb-3 text-black"
        />
        <button
          disabled={!collectionId || !question.trim() || loadingAnswer}
          onClick={ask}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loadingAnswer ? "Thinking..." : "Ask"}
        </button>

        {answer && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Answer</h3>
            <div className="whitespace-pre-wrap bg-gray-50 text-black rounded p-3">{answer}</div>
          </div>
        )}

        {usedExcerpts.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Top context excerpts</h3>
            <ol className="list-decimal list-inside space-y-2">
              {usedExcerpts.map((ex, i) => (
                <li key={i} className="text-sm text-gray-800 whitespace-pre-wrap">
                  {ex}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
