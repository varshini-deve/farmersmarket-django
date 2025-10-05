AI PDF Q&A Website
==================

This is an AI-powered PDF question-answering app built on Next.js App Router and Tailwind. Upload a PDF, then ask questions grounded in the document.

Getting Started
---------------

1) Create env file and set your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

2) Install and run dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and upload a PDF, then ask a question.

Notes
-----

- In-memory store: Uploaded embeddings live only in-memory and reset on server restart. Replace `src/lib/store.ts` with a persistent vector DB for production.
- Models: Uses `text-embedding-3-small` for embeddings and `gpt-4o-mini` for answers. Adjust in `src/lib/ai.ts`.
