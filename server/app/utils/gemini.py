"""로컬 LLM 유틸리티 (Ollama + Gemma).
기존 Gemini 인터페이스를 유지하여 호출 코드 변경을 최소화합니다.
"""
import json
import httpx
from app.config import settings

_BASE = settings.ollama_base_url
_MODEL = settings.ollama_model


def generate(prompt: str) -> str:
    """단순 텍스트 생성."""
    try:
        resp = httpx.post(
            f"{_BASE}/api/generate",
            json={"model": _MODEL, "prompt": prompt, "stream": False},
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json().get("response", "")
    except Exception as e:
        print(f"[LLM] generate 오류: {e}")
        return ""


def stream(prompt: str):
    """스트리밍 생성."""
    try:
        with httpx.stream(
            "POST",
            f"{_BASE}/api/generate",
            json={"model": _MODEL, "prompt": prompt, "stream": True},
            timeout=120.0,
        ) as r:
            for line in r.iter_lines():
                if line:
                    data = json.loads(line)
                    chunk = data.get("response", "")
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        break
    except Exception as e:
        print(f"[LLM] stream 오류: {e}")
        yield f"[오류: LLM 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요: {e}]"


def chat(system_instruction: str, history: list[dict], message: str,
         max_output_tokens: int = 512) -> str:
    """시스템 프롬프트 + 대화 히스토리 기반 채팅."""
    messages = [{"role": "system", "content": system_instruction}]
    for m in history:
        role = "user" if m.get("role") == "user" else "assistant"
        # Gemini 형식(parts) → OpenAI 형식(content) 변환
        content = m["parts"][0] if m.get("parts") else m.get("content", "")
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        resp = httpx.post(
            f"{_BASE}/api/chat",
            json={
                "model": _MODEL,
                "messages": messages,
                "stream": False,
                "options": {"num_predict": max_output_tokens},
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]
    except Exception as e:
        print(f"[LLM] chat 오류: {e}")
        return "죄송합니다, 응답을 생성할 수 없습니다."
