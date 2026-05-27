from app.models.user import User

_INCOME_LABEL = {
    "기초생활수급자": "기초생활수급자",
    "차상위계층":     "중위소득 50% 이하 (차상위계층)",
    "중위소득75":    "중위소득 75% 이하",
    "중위소득100":   "중위소득 100% 이하",
    "중위소득150":   "중위소득 150% 이하",
    "제한없음":      "소득 기준 없음 (제한 없음)",
}

# 소득 수준 비교용 순서 (낮을수록 낮은 소득)
_INCOME_RANK = {
    "기초생활수급자": 0,
    "차상위계층": 1,
    "중위소득75": 2,
    "중위소득100": 3,
    "중위소득150": 4,
    "제한없음": 5,
}


def build_user_profile_text(user: User) -> str:
    lines = []
    if user.age:
        lines.append(f"나이: 만 {user.age}세")
    elif user.birth_date:
        lines.append(f"생년월일: {user.birth_date} (나이 미계산)")
    if user.gender:
        lines.append(f"성별: {user.gender}")
    if user.region:
        loc = user.region + (f" {user.district}" if user.district else "")
        lines.append(f"거주지: {loc}")
    if user.employment_status:
        lines.append(f"현재 상황: {user.employment_status}")
    if user.household_income:
        lines.append(f"소득수준: {_INCOME_LABEL.get(user.household_income, user.household_income)}")
    if user.interests:
        lines.append(f"관심분야: {', '.join(user.interests)}")
    if getattr(user, "marital_status", None):
        lines.append(f"혼인여부: {user.marital_status}")
    if getattr(user, "military_status", None):
        lines.append(f"병역: {user.military_status}")

    specials = []
    if user.disability:        specials.append("장애인")
    if user.multicultural:     specials.append("다문화가정")
    if user.is_single_parent:  specials.append("한부모가정")
    if getattr(user, "is_pregnant", False): specials.append("임산부")

    children_ages = getattr(user, "children_ages", []) or []
    if children_ages:
        specials.append(f"자녀 {len(children_ages)}명 (만 {', '.join(str(a) for a in children_ages)}세)")
    elif user.children_count and user.children_count > 0:
        specials.append(f"자녀 {user.children_count}명 (나이 미입력)")

    lines.append(f"특수조건: {', '.join(specials) if specials else '없음'}")
    return "\n".join(f"  {l}" for l in lines)


def build_exclusion_rules(user: User) -> str:
    """사용자 값에 기반한 구체적 제외 규칙 생성"""
    rules = []

    # 나이 기반
    if user.age:
        rules.append(
            f"· 연령 조건: 만 {user.age}세가 벗어나는 연령 조건(예: '만 65세 이상', '만 18세 이하' 등)이 "
            f"명시된 정책은 제외"
        )

    # 지역 기반
    if user.region:
        rules.append(
            f"· 지역 조건: '{user.region}' 이외의 특정 시·도 전용 정책은 제외 "
            f"(전국, 지역 미지정은 포함)"
        )

    # 소득 기반
    user_rank = _INCOME_RANK.get(user.household_income or "", 99)
    if user.household_income and user.household_income != "제한없음":
        rules.append(
            f"· 소득 조건: 사용자 소득({_INCOME_LABEL.get(user.household_income, user.household_income)})이 "
            f"정책 소득 조건을 충족하지 못하면 제외. "
            f"단, 소득 조건이 미기재된 정책은 포함 가능"
        )
    elif user.household_income == "제한없음":
        rules.append(
            f"· 소득 조건: 사용자는 소득 기준 없음(고소득). "
            f"기초생활수급자·차상위계층 전용 정책은 제외"
        )

    # 성별 기반
    if user.gender:
        opp = "남성" if user.gender == "여성" else "여성"
        rules.append(f"· 성별 조건: '{opp}' 전용으로 명시된 정책은 제외")

    # 특수 대상 기반
    excl_special = []
    if not user.disability:      excl_special.append("장애인")
    if not user.multicultural:   excl_special.append("다문화가정·결혼이민자")
    if not user.is_single_parent: excl_special.append("한부모가정")
    if not getattr(user, "is_pregnant", False): excl_special.append("임산부·산모")
    if excl_special:
        rules.append(f"· 특수 대상: {', '.join(excl_special)} 전용 정책은 제외 (사용자 해당 없음)")

    # 자녀 없음
    children_ages = getattr(user, "children_ages", []) or []
    children_count = user.children_count or 0
    if not children_ages and not children_count:
        rules.append("· 자녀 조건: 사용자에게 자녀 없음 → 영유아·아동 양육 전용 지원은 제외")

    return "\n".join(rules) if rules else "  (프로필 정보 부족 — 관련성 높은 정책 위주로 선별)"


def build_recommend_prompt(user: User, candidates: list) -> str:
    profile_text = build_user_profile_text(user)
    exclusion_rules = build_exclusion_rules(user)

    policy_lines = []
    for i, p in enumerate(candidates, 1):
        lifecycle = p.lifecycle_label or "제한없음"
        field     = p.service_field_label or "기타"
        region    = p.region or "전국"
        target    = (p.target or "")[:350].replace("\n", " ")
        summary   = (p.easy_summary or p.summary or "")[:300].replace("\n", " ")
        detail    = (p.detail or "")[:200].replace("\n", " ")

        line = f"[{i}] {p.title}"
        line += f"\n   대상연령={lifecycle} | 분야={field} | 지역={region}"
        if target:
            line += f"\n   지원대상: {target}"
        if summary:
            line += f"\n   주요내용: {summary}"
        if detail and detail not in summary:
            line += f"\n   상세: {detail}"
        policy_lines.append(line)

    policy_text = "\n\n".join(policy_lines)

    return f"""당신은 한국 복지·정책 안내 전문가입니다.
아래 사용자 프로필을 파악한 뒤, 후보 정책 각각이 이 사용자와 관련 있는지 판단하세요.

━━━ 사용자 프로필 ━━━
{profile_text}

━━━ 명확히 제외할 조건 (이것만 제외) ━━━
{exclusion_rules}

━━━ 포함 원칙 (관대하게 적용) ━━━
· 위 제외 규칙에 명확히 해당하는 경우만 제외하세요
· 자격 조건이 불명확하거나 모호한 정책은 포함하세요 (사용자가 직접 확인 가능)
· 사용자의 상황·관심분야와 조금이라도 관련된 정책은 포함하세요
· 내용이 거의 동일한 중복 정책은 가장 적합한 1개만 유지하세요
· 제외 기준이 애매하면 포함하는 쪽으로 판단하세요

━━━ 후보 정책 ({len(candidates)}건) ━━━
{policy_text}

━━━ 출력 형식 ━━━
이 사용자와 관련 있는 정책 번호를 관련성 높은 순서로 나열하세요.
다른 텍스트 없이 JSON만 출력:

{{"indices": [번호, ...]}}"""
