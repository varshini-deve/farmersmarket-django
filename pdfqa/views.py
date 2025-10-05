from __future__ import annotations

import io
from typing import Any, Dict, List

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt, csrf_protect

from .utils import chunk_text, embed_texts, select_relevant_chunks, llm_answer

try:
    from pypdf import PdfReader  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    PdfReader = None  # type: ignore


SESSION_KEY = "pdfqa_state"


def _get_state(request: HttpRequest) -> Dict[str, Any]:
    return request.session.get(SESSION_KEY, {"file_name": None, "chunks": [], "embeddings": []})


def _set_state(request: HttpRequest, state: Dict[str, Any]) -> None:
    request.session[SESSION_KEY] = state
    request.session.modified = True


@require_GET
@csrf_protect
def index(request: HttpRequest) -> HttpResponse:
    state = _get_state(request)
    return render(request, "pdfqa/index.html", {"state": state})


@require_POST
@csrf_protect
def upload_pdf(request: HttpRequest) -> JsonResponse:
    if "pdf" not in request.FILES:
        return JsonResponse({"ok": False, "error": "No PDF uploaded"}, status=400)

    if PdfReader is None:
        return JsonResponse({"ok": False, "error": "pypdf is not installed"}, status=500)

    file = request.FILES["pdf"]
    try:
        reader = PdfReader(file)
        pages_text: List[str] = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or "")
        full_text = "\n\n".join(pages_text)
    except Exception as e:
        return JsonResponse({"ok": False, "error": f"Failed to read PDF: {e}"}, status=500)

    chunks = chunk_text(full_text)
    embeddings = embed_texts(chunks)

    state = {
        "file_name": getattr(file, "name", "uploaded.pdf"),
        "chunks": chunks,
        "embeddings": embeddings,
    }
    _set_state(request, state)

    return JsonResponse({"ok": True, "file_name": state["file_name"], "num_chunks": len(chunks)})


@require_POST
@csrf_protect
def ask_question(request: HttpRequest) -> JsonResponse:
    state = _get_state(request)
    if not state.get("chunks") or not state.get("embeddings"):
        return JsonResponse({"ok": False, "error": "Please upload a PDF first."}, status=400)

    question = request.POST.get("question") or (request.headers.get("Content-Type", "").startswith("application/json") and _json_body(request).get("question"))
    if not question:
        return JsonResponse({"ok": False, "error": "No question provided."}, status=400)

    top = select_relevant_chunks(question, state["chunks"], state["embeddings"], top_k=4)
    answer = llm_answer(question, [t[0] for t in top])

    return JsonResponse({
        "ok": True,
        "answer": answer,
        "sources": [{"snippet": c, "score": s} for c, s in top],
    })


@require_POST
@csrf_protect
def reset_session(request: HttpRequest) -> JsonResponse:
    _set_state(request, {"file_name": None, "chunks": [], "embeddings": []})
    return JsonResponse({"ok": True})


def _json_body(request: HttpRequest) -> Dict[str, Any]:
    import json
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        return {}
