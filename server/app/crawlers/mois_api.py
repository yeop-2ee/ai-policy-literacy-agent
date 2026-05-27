from typing import Any

import httpx

from app.config import settings
from app.crawlers.base_crawler import BaseCrawler
from app.utils.deadline import parse_deadline

# 행정안전부_대한민국 공공서비스(혜택) 정보 - 정부24 API (api.odcloud.kr)
BASE_URL = "https://api.odcloud.kr/api/gov24/v3/serviceList"

LIFECYCLE_MAP: dict[str, str] = {
    "영유아": "영유아",
    "아동": "아동",
    "청소년": "청소년",
    "청년": "청년",
    "중장년": "중장년",
    "노인": "노인",
    "장애인": "장애인",
    "다문화": "다문화",
    "저소득": "저소득",
}

FIELD_MAP: dict[str, str] = {
    "복지": "복지",
    "보건": "보건·의료",
    "주거": "주거·환경",
    "고용": "고용·창업",
    "창업": "고용·창업",
    "교육": "교육",
    "문화": "문화·여가",
    "안전": "안전",
}


class MoisApiCrawler(BaseCrawler):
    """행정안전부 정부24 공공서비스 목록 API 클라이언트"""

    async def fetch_policies(self, page: int = 1, page_size: int = 100) -> list[dict[str, Any]]:
        if not settings.mois_api_key:
            print("[MoisApiCrawler] API 키가 설정되지 않았습니다. 건너뜁니다.")
            return []

        params = {
            "page": page,
            "perPage": page_size,
            "serviceKey": settings.mois_api_key,
        }
        headers = {"Authorization": f"Infuser {settings.mois_api_key}"}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(BASE_URL, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            items = data.get("data", [])
            return [self.normalize(item) for item in items if item]

    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        title: str = raw.get("서비스명", "") or raw.get("svcNm", "")
        lifecycle_label = _match_map(raw.get("생애주기", "") or raw.get("지원대상", ""), LIFECYCLE_MAP)
        field_label = _match_map(raw.get("서비스분야", "") or raw.get("소관기관명", ""), FIELD_MAP)

        apply_period = raw.get("신청기한", "") or raw.get("aplyPrdCn", "") or ""
        return {
            "policy_id": f"mois_{raw.get('서비스ID', '') or raw.get('svcId', '')}",
            "source": "mois",
            "title": title,
            "summary": raw.get("서비스요약", "") or raw.get("svcDgst", ""),
            "detail": raw.get("지원내용", "") or raw.get("svcCont", ""),
            "target": raw.get("지원대상", "") or raw.get("trgterIndvdlCd", ""),
            "lifecycle_label": lifecycle_label,
            "service_field_label": field_label,
            "region": raw.get("소관기관명", "전국"),
            "apply_url": raw.get("신청URL", "") or raw.get("svcDtlLink", ""),
            "apply_period": apply_period,
            "deadline": parse_deadline(apply_period),
        }


def _match_map(text: str, mapping: dict[str, str]) -> str:
    """텍스트에서 매핑 키워드를 찾아 레이블 반환"""
    for key, label in mapping.items():
        if key in text:
            return label
    return ""
