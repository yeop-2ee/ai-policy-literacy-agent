from typing import AsyncGenerator

from app.models.policy import Policy
from app.prompts.summarize import build_summarize_prompt
from app.prompts.simplify import build_simplify_prompt
import app.utils.gemini as gemini


async def stream_summary(policy: Policy) -> AsyncGenerator[str, None]:
    """정책 내용을 3줄로 요약하여 SSE 스트리밍으로 반환 (폴백 포함)"""
    prompt = build_summarize_prompt(policy.title, policy.detail or policy.summary or "")
    for chunk in gemini.stream(prompt):
        yield chunk


async def stream_simplified(policy: Policy) -> AsyncGenerator[str, None]:
    """어려운 행정 용어를 쉬운 언어로 변환하여 SSE 스트리밍으로 반환 (폴백 포함)"""
    prompt = build_simplify_prompt(policy.title, policy.detail or policy.summary or "")
    for chunk in gemini.stream(prompt):
        yield chunk
