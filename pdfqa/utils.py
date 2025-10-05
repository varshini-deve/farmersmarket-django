import os
import math
from typing import List, Tuple

from typing import Optional
import math

try:
    import numpy as np  # type: ignore
    _NP_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    np = None  # type: ignore
    _NP_AVAILABLE = False

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency at import time
    OpenAI = None  # type: ignore


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []

    for para in paragraphs:
        if len(para) <= chunk_size:
            chunks.append(para)
            continue
        start = 0
        while start < len(para):
            end = start + chunk_size
            chunk = para[start:end]
            chunks.append(chunk)
            start = max(end - overlap, start + 1)
    return chunks


def _vector_norm(vec: List[float]) -> float:
    return math.sqrt(sum(v * v for v in vec))


def _dot(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if _NP_AVAILABLE:
        a_np = np.array(a, dtype=float)
        b_np = np.array(b, dtype=float)
        if a_np.size == 0 or b_np.size == 0:
            return 0.0
        denom = (np.linalg.norm(a_np) * np.linalg.norm(b_np))
        if denom == 0:
            return 0.0
        return float(np.dot(a_np, b_np) / denom)
    # Pure-Python fallback
    if not a or not b:
        return 0.0
    denom = _vector_norm(a) * _vector_norm(b)
    if denom == 0:
        return 0.0
    return _dot(a, b) / denom


def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    return OpenAI()


def embed_texts(texts: List[str]) -> List[List[float]]:
    client = get_openai_client()
    if client is None:
        # Fallback: use a naive hashing-based embedding for demo without API key
        return [naive_hash_embedding(t) for t in texts]

    model = "text-embedding-3-small"
    # OpenAI client supports batching
    response = client.embeddings.create(model=model, input=texts)
    return [d.embedding for d in response.data]


def naive_hash_embedding(text: str, dim: int = 256) -> List[float]:
    # Very rough deterministic embedding so the app still works offline
    vec = np.zeros(dim, dtype=np.float32)
    for i, ch in enumerate(text):
        vec[(i + ord(ch)) % dim] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.astype(float).tolist()


def select_relevant_chunks(question: str, chunks: List[str], chunk_embeddings: List[List[float]], top_k: int = 4) -> List[Tuple[str, float]]:
    question_vec = list(embed_texts([question])[0])
    scored: List[Tuple[str, float]] = []
    for chunk, emb in zip(chunks, chunk_embeddings):
        score = cosine_similarity(question_vec, list(emb))
        scored.append((chunk, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]


def llm_answer(question: str, context_chunks: List[str]) -> str:
    client = get_openai_client()
    context = "\n\n".join(context_chunks)

    if client is None:
        # Fallback: heuristic answer from context when no API key
        return simple_context_answer(question, context)

    system = (
        "You are a helpful assistant answering questions strictly using the provided document context. "
        "If the answer is not in the context, say you don't know."
    )
    user = (
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        "Answer concisely."
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    return resp.choices[0].message.content or ""


def simple_context_answer(question: str, context: str) -> str:
    # Very naive: return top few lines containing overlap
    q = question.lower().strip()
    lines = [ln for ln in context.splitlines() if ln.strip()]
    hits = [ln for ln in lines if any(token in ln.lower() for token in q.split())]
    if not hits:
        return "I don't know based on the uploaded PDF."
    preview = "\n".join(hits[:5])
    return f"Based on the document, relevant snippets are:\n{preview}"
