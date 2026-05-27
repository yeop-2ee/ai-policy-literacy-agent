from fastapi import APIRouter, HTTPException, Depends
import json
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.policy import Policy
import app.utils.gemini as gemini

router = APIRouter()


@router.post("/{policy_id}")
async def generate_guide(policy_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = int(policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    policy = await db.get(Policy, pid)
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")

    prompt = f"""다음 정책의 신청 절차를 단계별로 알려주세요.

정책명: {policy.title}
정책 내용: {policy.detail or policy.summary or ""}

JSON 형식으로 반환해주세요:
{{
  "steps": [
    {{
      "step": 1,
      "title": "단계 제목 (짧게)",
      "description": "이 단계에서 할 일 (쉬운 말로)",
      "icon": "이모지 1개",
      "tip": "도움말 (선택)"
    }}
  ]
}}"""

    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(None, gemini.generate, prompt)

    try:
        guide_data = json.loads(text)
    except json.JSONDecodeError:
        guide_data = {"steps": [], "raw": text}

    return guide_data
