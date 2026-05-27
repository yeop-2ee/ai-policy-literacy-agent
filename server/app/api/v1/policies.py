from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional
import json
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.services.recommendation_service import get_recommendations
from app.tasks.policy_sync import sync_all_policies
from app.utils.deadline import parse_deadline
from app.prompts.summarize import build_summarize_prompt
import app.utils.gemini as gemini

router = APIRouter()


async def _generate_easy_summary(policy: Policy) -> str:
    content = policy.detail or policy.summary or policy.target or ""
    if not content.strip():
        return ""
    prompt = build_summarize_prompt(policy.title, content)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, gemini.generate, prompt)


async def _backfill_deadlines():
    from datetime import datetime
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Policy).where(
                Policy.deadline.is_(None),
                Policy.apply_period.isnot(None),
                Policy.apply_period != "",
            )
        )
        policies = result.scalars().all()
        updated = 0
        for policy in policies:
            dl = parse_deadline(policy.apply_period or "")
            if dl:
                policy.deadline = dl
                policy.updated_at = datetime.utcnow()
                updated += 1
        await db.commit()
    print(f"[deadline backfill] {updated}건 업데이트")


def _policy_to_dict(p: Policy) -> dict:
    return {
        "id": p.id,
        "policy_id": p.policy_id,
        "source": p.source,
        "title": p.title,
        "summary": p.summary,
        "detail": p.detail,
        "target": p.target,
        "lifecycle_code": p.lifecycle_code,
        "service_field_code": p.service_field_code,
        "lifecycle_label": p.lifecycle_label,
        "service_field_label": p.service_field_label,
        "region": p.region,
        "apply_url": p.apply_url,
        "apply_period": p.apply_period,
        "deadline": p.deadline,
        "easy_summary": p.easy_summary,
        "simplified_content": p.simplified_content,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.post("/sync")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(sync_all_policies)
    return {"message": "동기화가 시작되었습니다. 완료까지 수 분이 소요될 수 있습니다."}


@router.post("/backfill-deadlines")
async def backfill_deadlines(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(_backfill_deadlines)
    return {"message": "마감일 업데이트가 시작되었습니다."}


@router.get("/recommendations")
async def recommend_policies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.onboarding_completed:
        return {"message": "프로필을 먼저 만들어주세요.", "policies": [], "no_profile": True}
    policies, profile_complete = await get_recommendations(current_user, db)
    return {
        "policies": [_policy_to_dict(p) for p in policies],
        "no_match": len(policies) == 0,
        "profile_complete": profile_complete,
    }


@router.get("/")
async def list_policies(
    lifecycle: Optional[str] = None,
    service_field: Optional[str] = None,
    region: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if lifecycle:
        conditions.append(Policy.lifecycle_label.ilike(f"%{lifecycle}%"))
    if service_field:
        conditions.append(Policy.service_field_label.ilike(f"%{service_field}%"))
    if region:
        conditions.append(or_(Policy.region == region, Policy.region == "전국"))
    if keyword:
        conditions.append(or_(
            Policy.title.ilike(f"%{keyword}%"),
            Policy.summary.ilike(f"%{keyword}%"),
        ))

    base_query = select(Policy)
    if conditions:
        from sqlalchemy import and_
        base_query = base_query.where(and_(*conditions))

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar()

    result = await db.execute(base_query.offset(offset).limit(limit))
    policies = result.scalars().all()
    return {"policies": [_policy_to_dict(p) for p in policies], "total": total}


@router.get("/{policy_id}/eligibility")
async def check_eligibility(
    policy_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    policy = await db.get(Policy, int(policy_id))
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")

    profile_parts = []
    if current_user.age is not None:
        profile_parts.append(f"- 나이: {current_user.age}세")
    if current_user.gender:
        profile_parts.append(f"- 성별: {current_user.gender}")
    if current_user.region:
        region_str = current_user.region
        if current_user.district:
            region_str += f" {current_user.district}"
        profile_parts.append(f"- 거주지: {region_str}")
    if current_user.employment_status:
        profile_parts.append(f"- 취업 상태: {current_user.employment_status}")
    if current_user.disability is not None:
        profile_parts.append(f"- 장애 여부: {'있음' if current_user.disability else '없음'}")
    if current_user.multicultural is not None:
        profile_parts.append(f"- 다문화 가정: {'예' if current_user.multicultural else '아니오'}")
    if current_user.household_income:
        profile_parts.append(f"- 가구 소득: {current_user.household_income}")
    if current_user.military_status:
        profile_parts.append(f"- 병역 상태: {current_user.military_status}")
    if current_user.marital_status:
        profile_parts.append(f"- 혼인 상태: {current_user.marital_status}")
    if current_user.children_count is not None:
        profile_parts.append(f"- 자녀 수: {current_user.children_count}명")

    profile_text = "\n".join(profile_parts) if profile_parts else "- 프로필 정보 없음"
    policy_target = policy.target or ""
    policy_detail = policy.detail or ""

    prompt = f"""다음 사용자 프로필과 정책 정보를 바탕으로 자격 적합도를 분석해 주세요.

[사용자 프로필]
{profile_text}

[정책명]
{policy.title}

[지원 대상]
{policy_target}

[정책 상세]
{policy_detail[:1000] if policy_detail else '없음'}

위 정보를 바탕으로 아래 JSON 형식으로만 응답해 주세요. 마크다운 없이 순수 JSON만 출력하세요.

규칙:
- 정책이 실제로 요건을 명시하는 항목만 checks에 포함하세요.
- status는 "pass"(충족), "fail"(미충족), "unknown"(판단 불가) 중 하나.
- reason은 30자 이내로 간결하게.
- summary는 25자 이내로 한 줄 판정 요약.
- eligible은 모든 checks가 pass면 "yes", 하나라도 fail이면 "no", 그 외 "partial".

{{
  "eligible": "yes" | "partial" | "no",
  "summary": "한 줄 판정 요약 (25자 이내)",
  "checks": [
    {{ "category": "카테고리명", "status": "pass" | "fail" | "unknown", "reason": "상세 이유 (30자 이내)" }}
  ]
}}"""

    fallback = {"eligible": "unknown", "summary": "분석 결과를 가져올 수 없습니다.", "checks": []}

    try:
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, gemini.generate, prompt)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception:
        return fallback


@router.get("/{policy_id}")
async def get_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = int(policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    policy = await db.get(Policy, pid)
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")

    if not policy.easy_summary and (policy.detail or policy.summary):
        try:
            easy = await _generate_easy_summary(policy)
            if easy:
                policy.easy_summary = easy.strip()
                await db.commit()
                await db.refresh(policy)
        except Exception:
            pass

    return _policy_to_dict(policy)
