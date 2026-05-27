from typing import Any

import httpx

from app.config import settings
from app.crawlers.base_crawler import BaseCrawler
from app.utils.deadline import parse_deadline

# 온통청년 청년정책 API (youthcenter.go.kr — 별도 API 키 필요)
# 키 발급: https://www.youthcenter.go.kr/myPage/openapi 에서 신청
BASE_URL = "https://www.youthcenter.go.kr/go/ythip/getPlcy"

# lclsfNm (대분류) → 표준 service_field_label 변환
# 온통청년 API 실제 반환값 기반 (특수문자 포함, 복합값 포함)
_FIELD_NORMALIZE: dict[str, str] = {
    # 일자리 계열
    "일자리":             "일자리",
    "교육･직업훈련":      "일자리",
    # 주거
    "주거":               "주거",
    # 교육
    "교육":               "교육",
    # 복지·문화 계열 (다양한 표기 통합)
    "복지문화":           "생활지원",
    "복지·문화":          "생활지원",
    "금융복지문화":       "생활지원",
    "금융·복지·문화":     "생활지원",
    "금융･복지･문화":     "생활지원",   # 온통청년 fullwidth dot 표기
    # 참여·권리 계열
    "참여권리":           "문화·여가",
    "참여·권리":          "문화·여가",
    "참여･기반":          "문화·여가",
    "참여･권리":          "문화·여가",
    # 건강
    "건강":               "보건·의료",
    "보건의료":           "보건·의료",
}

# 시/도 이름 → 표준 지역 코드 (앞부분 매칭)
_SIDO_MAP: dict[str, str] = {
    "서울": "서울", "부산": "부산", "대구": "대구", "인천": "인천",
    "광주": "광주", "대전": "대전", "울산": "울산", "세종": "세종",
    "경기": "경기", "강원": "강원",
    "충청북도": "충북", "충청남도": "충남", "충북": "충북", "충남": "충남",
    "전라북도": "전북", "전라남도": "전남", "전북": "전북", "전남": "전남",
    "경상북도": "경북", "경상남도": "경남", "경북": "경북", "경남": "경남",
    "제주": "제주",
}


def _extract_region(inst_name: str) -> str:
    """기관명에서 시/도 추출. 예: '전라남도 광양시 교육보육국' → '전남'"""
    for key, code in _SIDO_MAP.items():
        if key in inst_name:
            return code
    return "전국"


class OnyouthApiCrawler(BaseCrawler):
    """온통청년 청년정책 API 클라이언트"""

    async def fetch_policies(self, page: int = 1, page_size: int = 100) -> list[dict[str, Any]]:
        if not settings.onyouth_api_key:
            print("[OnyouthApiCrawler] API 키가 설정되지 않았습니다. 건너뜁니다.")
            print("  → 키 발급: https://www.youthcenter.go.kr/myPage/openapi")
            return []

        params = {
            "apiKeyNm": settings.onyouth_api_key,
            "pageNum": page,
            "pageSize": page_size,
            "rtnType": "json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            result = data.get("result", {})
            # 실제 응답 키: youthPolicyList (구 API는 list 였음)
            items = result.get("youthPolicyList", result.get("list", []))
            if not isinstance(items, list):
                items = []
            return [self.normalize(item) for item in items]

    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        # 정책 분야: lclsfNm(대분류) 사용
        # 복합값(콤마/특수문자 구분) 처리: 첫 번째 값만 사용
        raw_field = raw.get("lclsfNm", "") or ""
        first_field = raw_field.split(",")[0].strip()
        # fullwidth 특수문자 제거 후 재시도
        clean_field = first_field.replace("･", "·")
        field_label = (
            _FIELD_NORMALIZE.get(first_field)
            or _FIELD_NORMALIZE.get(clean_field)
            or first_field
        )

        # 지역: 감독기관명에서 시/도 추출
        inst_name = raw.get("sprvsnInstCdNm", "") or raw.get("rgtrInstCdNm", "") or ""
        region = _extract_region(inst_name)

        # 지원 대상 텍스트: 자격조건 + 소득조건 합치기 (추천 키워드 검색용)
        target_parts = [
            raw.get("earnEtcCn", ""),          # 소득·자격 조건
            raw.get("addAplyQlfcCndCn", ""),   # 추가 신청 자격
            raw.get("ptcpPrpTrgtCn", ""),      # 참여 대상
        ]
        target = " ".join(p for p in target_parts if p).strip()

        # 신청 URL
        apply_url = raw.get("aplyUrlAddr", "") or raw.get("refUrlAddr1", "") or ""

        # 마감일: bizPrdEndYmd(YYYYMMDD) 우선, 없으면 bizPrdEtcCn 텍스트 파싱
        apply_period = raw.get("bizPrdEtcCn", "") or ""
        end_ymd = (raw.get("bizPrdEndYmd", "") or "").strip()
        deadline = parse_deadline(end_ymd) or parse_deadline(apply_period)

        return {
            "policy_id": f"onyouth_{raw.get('plcyNo', '')}",
            "source": "onyouth",
            "title": raw.get("plcyNm", ""),
            "summary": raw.get("plcyExplnCn", ""),
            "detail": raw.get("plcySprtCn", ""),
            "target": target,
            "lifecycle_label": "청년",
            "service_field_label": field_label,
            "region": region,
            "apply_url": apply_url,
            "apply_period": apply_period,
            "deadline": deadline,
        }
