import json
import asyncio
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.user import User
from app.models.policy import Policy
from app.prompts.recommend import build_recommend_prompt
import app.utils.gemini as gemini

from datetime import datetime, timedelta
_rec_cache: dict[str, tuple[list, datetime]] = {}
_CACHE_TTL = timedelta(minutes=30)


def invalidate_recommendation_cache(user_id: str) -> None:
    _rec_cache.pop(user_id, None)


# ── 레이블 매핑 ──────────────────────────────────────────────────────

AGE_TO_LIFECYCLE: list[tuple[tuple[int, int], list[str]]] = [
    ((0, 8),    ["영유아"]),
    ((9, 18),   ["아동", "청소년", "아동청소년"]),
    ((19, 34),  ["청년"]),
    ((35, 64),  ["중장년"]),
    ((65, 999), ["노인", "노년"]),
]

INTEREST_TO_FIELD: dict[str, list[str]] = {
    "취업·창업": ["고용·창업", "일자리", "고용지원"],
    "집·주거":   ["주거", "주거·환경", "주거지원"],
    "복지":      ["보육", "보호·돌봄", "생활지원", "서민금융", "임신·출산", "입양·위탁",
                  "생계지원", "돌봄서비스", "가족지원"],
    "교육":      ["교육", "교육지원"],
    "건강·의료": ["보건·의료", "신체건강", "정신건강", "의료지원"],
    "문화·여가": ["문화·여가", "참여·권리"],
}

EMPLOYMENT_TO_FIELD: dict[str, list[str]] = {
    "학생":       ["교육", "교육지원"],
    "취업준비생": ["고용·창업", "일자리", "고용지원"],
    "직장인":     ["고용·창업", "고용지원"],
    "자영업자":   ["고용·창업", "일자리", "서민금융"],
    "무직":       ["생활지원", "생계지원", "고용·창업", "일자리"],
}

EMPLOYMENT_TO_LIFECYCLE: dict[str, list[str]] = {
    "학생":       ["아동", "청소년", "아동청소년", "청년"],
    "취업준비생": ["청년", "중장년"],
    "직장인":     ["청년", "중장년"],
    "자영업자":   ["청년", "중장년"],
    "무직":       ["청년", "중장년", "노인", "노년"],
}

_SPECIAL_LIFECYCLE: dict[str, str] = {
    "장애인":     "disability",
    "한부모":     "is_single_parent",
    "한부모가정":  "is_single_parent",
    "한부모가족":  "is_single_parent",
    "다문화":     "multicultural",
    "다문화가정":  "multicultural",
    "다문화가족":  "multicultural",
    "임산부":     "is_pregnant",
}

_MALE_ONLY_KW   = ["현역병", "현역병사", "입영", "병역의무자", "군복무중인"]
_FEMALE_ONLY_KW = ["산모"]

_CONTENT_SPECIAL_KW: list[tuple[list[str], str]] = [
    (["한부모가정", "한부모가족", "한부모 가정", "한부모 가족"], "is_single_parent"),
    (["장애인"],                                                "disability"),
    (["다문화가족", "다문화가정", "결혼이민자"],                  "multicultural"),
]

_INCOME_RANK = {
    "기초생활수급자": 0, "차상위계층": 1,
    "중위소득75": 2, "중위소득100": 3, "중위소득150": 4, "제한없음": 5,
}


def _get_lifecycle_labels(age: int) -> list[str]:
    for (min_age, max_age), labels in AGE_TO_LIFECYCLE:
        if min_age <= age <= max_age:
            return labels
    return []


def _is_hard_excluded(
    policy: Policy,
    excluded_lifecycle: set,
    gender: Optional[str],
    user_attrs: dict,
    user_income_rank: int,
) -> bool:
    if policy.lifecycle_label and policy.lifecycle_label in excluded_lifecycle:
        return True

    title  = policy.title  or ""
    target = policy.target or ""
    check  = f"{title} {target}"

    if gender == "여성" and any(kw in check for kw in _MALE_ONLY_KW):
        return True
    if gender == "남성" and any(kw in check for kw in _FEMALE_ONLY_KW):
        return True

    for keywords, attr in _CONTENT_SPECIAL_KW:
        if not user_attrs.get(attr):
            if any(kw in title or kw in target for kw in keywords):
                return True

    if user_income_rank >= 3:
        if any(kw in check for kw in ["기초생활수급자만", "수급자 전용"]):
            return True

    return False


def _is_profile_complete(user: User) -> bool:
    return all([
        bool(user.age or user.birth_date),
        bool(user.region),
        bool(user.employment_status),
        bool(user.interests),
        bool(user.household_income),
    ])


def _ai_filter_sync(user: User, candidates: list) -> list:
    prompt = build_recommend_prompt(user, candidates)
    text = gemini.generate(prompt).strip()
    if not text:
        return candidates  # AI 오류 시 원본 반환
    if "```" in text:
        text = text.split("```")[1].lstrip("json").strip()
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        return candidates
    indices = result.get("indices", [])
    return [candidates[i - 1] for i in indices if isinstance(i, int) and 1 <= i <= len(candidates)]


async def get_recommendations(user: User, db: AsyncSession) -> tuple[list[Policy], bool]:
    profile_complete = _is_profile_complete(user)

    region = user.region

    lifecycle_labels: list[str] = []
    if user.age:
        lifecycle_labels.extend(_get_lifecycle_labels(user.age))
    elif user.employment_status:
        for lc in EMPLOYMENT_TO_LIFECYCLE.get(user.employment_status, []):
            if lc not in lifecycle_labels:
                lifecycle_labels.append(lc)

    if user.disability:
        lifecycle_labels.append("장애인")
    if user.multicultural:
        lifecycle_labels.extend(["다문화가정", "다문화"])
    if user.is_single_parent:
        lifecycle_labels.extend(["한부모", "한부모가정"])
    if getattr(user, "is_pregnant", False):
        lifecycle_labels.extend(["임산부", "임신·출산"])

    children_ages = getattr(user, "children_ages", []) or []
    if children_ages:
        for child_age in children_ages:
            for lc in _get_lifecycle_labels(child_age):
                if lc not in lifecycle_labels:
                    lifecycle_labels.append(lc)
    elif user.children_count and user.children_count > 0:
        if "영유아" not in lifecycle_labels:
            lifecycle_labels.append("영유아")

    gender = getattr(user, "gender", None)
    if gender == "여성":
        lifecycle_labels.append("여성")
    elif gender == "남성":
        lifecycle_labels.append("남성")

    field_labels: list[str] = []
    if user.interests:
        for interest in user.interests:
            for f in INTEREST_TO_FIELD.get(interest, []):
                if f not in field_labels:
                    field_labels.append(f)

    if getattr(user, "is_pregnant", False) or children_ages or (user.children_count and user.children_count > 0):
        for f in ["임신·출산", "보육", "보호·돌봄", "돌봄서비스", "가족지원"]:
            if f not in field_labels:
                field_labels.append(f)

    emp_field_labels: list[str] = []
    if user.employment_status:
        for f in EMPLOYMENT_TO_FIELD.get(user.employment_status, []):
            if f not in emp_field_labels and f not in field_labels:
                emp_field_labels.append(f)

    all_field_labels = list(set(field_labels + emp_field_labels))

    user_attrs = {
        "disability":       bool(user.disability),
        "is_single_parent": bool(user.is_single_parent),
        "multicultural":    bool(user.multicultural),
        "is_pregnant":      bool(getattr(user, "is_pregnant", False)),
    }
    excluded_lifecycle: set[str] = set()
    for label, attr in _SPECIAL_LIFECYCLE.items():
        if not user_attrs.get(attr, False):
            excluded_lifecycle.add(label)
    if gender != "여성":
        excluded_lifecycle.update(["여성", "임산부"])
    if gender != "남성":
        excluded_lifecycle.add("남성")

    user_income_rank = _INCOME_RANK.get(user.household_income or "", 99)

    _AI_LIMIT = 20
    print(f"[추천] 검색 조건 — 지역:{region} 생애주기:{lifecycle_labels} 분야:{all_field_labels}")

    seen_ids: set = set()
    candidates: list = []

    async def _collect(query, label: str):
        result = await db.execute(query)
        new = [p for p in result.scalars().all() if p.id not in seen_ids]
        for p in new:
            seen_ids.add(p.id)
        candidates.extend(new)
        print(f"[추천] {label}: +{len(new)}건 (누계 {len(candidates)}건)")

    def _excl_cond():
        if excluded_lifecycle:
            return [or_(Policy.lifecycle_label.is_(None),
                        ~Policy.lifecycle_label.in_(list(excluded_lifecycle)))]
        return []

    def _region_cond():
        if region:
            return [or_(Policy.region == region, Policy.region == "전국",
                        Policy.region.is_(None), Policy.region == "")]
        return []

    # 1순위: 생애주기 + 분야 + 지역
    if lifecycle_labels and all_field_labels and region:
        await _collect(
            select(Policy).where(and_(
                *_excl_cond(), *_region_cond(),
                Policy.lifecycle_label.in_(lifecycle_labels),
                Policy.service_field_label.in_(all_field_labels),
            )),
            "생애주기+분야+지역",
        )

    # 2순위: 생애주기 + 분야
    if len(candidates) < _AI_LIMIT and lifecycle_labels and all_field_labels:
        await _collect(
            select(Policy).where(and_(
                *_excl_cond(),
                Policy.lifecycle_label.in_(lifecycle_labels),
                Policy.service_field_label.in_(all_field_labels),
            )),
            "생애주기+분야",
        )

    # 3순위: 분야 + 지역
    if len(candidates) < _AI_LIMIT and all_field_labels and region:
        await _collect(
            select(Policy).where(and_(
                *_excl_cond(), *_region_cond(),
                Policy.service_field_label.in_(all_field_labels),
            )),
            "분야+지역",
        )

    # 4순위: 분야만
    if len(candidates) < _AI_LIMIT and all_field_labels:
        await _collect(
            select(Policy).where(and_(
                *_excl_cond(),
                Policy.service_field_label.in_(all_field_labels),
            )),
            "분야만",
        )

    # 5순위: 생애주기만
    if len(candidates) < _AI_LIMIT and lifecycle_labels:
        await _collect(
            select(Policy).where(and_(
                *_excl_cond(),
                Policy.lifecycle_label.in_(lifecycle_labels),
            )),
            "생애주기만",
        )

    print(f"[추천] DB 조회 완료: {len(candidates)}건")

    if not candidates:
        return [], profile_complete

    candidates = [
        p for p in candidates
        if not _is_hard_excluded(p, excluded_lifecycle, gender, user_attrs, user_income_rank)
    ]
    print(f"[추천] 하드 제외 후: {len(candidates)}건")
    candidates = candidates[:_AI_LIMIT]

    if not candidates:
        return [], profile_complete

    # 캐시 확인
    cache_key = str(user.id)
    if cache_key in _rec_cache:
        cached_policies, cached_at = _rec_cache[cache_key]
        if datetime.utcnow() - cached_at < _CACHE_TTL:
            return cached_policies, profile_complete

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _ai_filter_sync, user, candidates)
        print(f"[추천] AI 검증 후: {len(result)}건")
        _rec_cache[cache_key] = (result, datetime.utcnow())
    except Exception as e:
        print(f"[AI 추천 오류] {e}")
        result = candidates  # AI 실패 시 원본 반환

    return result, profile_complete
