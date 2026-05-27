import xml.etree.ElementTree as ET
from typing import Any

import httpx

from app.config import settings
from app.crawlers.base_crawler import BaseCrawler
from app.utils.deadline import parse_deadline

# 한국사회보장정보원_중앙부처복지서비스 API (data.go.kr)
BASE_URL = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001"

LIFECYCLE_MAP: dict[str, str] = {
    "001": "영유아",
    "002": "아동",
    "003": "청소년",
    "004": "청년",
    "005": "중장년",
    "006": "노인",
    "007": "장애인",
    "008": "임산부",
    "009": "다문화",
}

FIELD_MAP: dict[str, str] = {
    "019001": "생계지원",
    "019002": "주거지원",
    "019003": "의료지원",
    "019004": "교육지원",
    "019005": "고용지원",
    "019006": "문화·여가",
    "019007": "안전·위기",
    "019008": "임신·출산",
    "019009": "보육",
    "019010": "가족지원",
    "019011": "돌봄서비스",
    "019012": "서민금융",
}

_REGION_KEYWORDS = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]


class BokjiroApiCrawler(BaseCrawler):
    """복지로 중앙부처복지서비스 API 클라이언트 (XML 응답)"""

    async def fetch_policies(self, page: int = 1, page_size: int = 100) -> list[dict[str, Any]]:
        if not settings.bokjiro_api_key:
            print("[BokjiroApiCrawler] API 키가 설정되지 않았습니다. 건너뜁니다.")
            return []

        params = {
            "serviceKey": settings.bokjiro_api_key,
            "callTp": "L",
            "pageNo": page,
            "numOfRows": page_size,
            "srchKeyCode": "001",  # 필수 파라미터 (001: 제목 기준)
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()

            root = ET.fromstring(response.text)
            items = root.findall(".//servList")  # 태그명: servList
            return [self.normalize(_xml_to_dict(item)) for item in items]

    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        # lifeArray: 한글 텍스트 (예: "영유아,아동,청소년")
        life_raw = raw.get("lifeArray", "")
        lifecycle_label = life_raw.split(",")[0].strip() if life_raw else ""

        # intrsThemaArray: 관심주제 (예: "보육,보호·돌봄")
        field_raw = raw.get("intrsThemaArray", "")
        field_label = field_raw.split(",")[0].strip() if field_raw else ""

        jur_nm = raw.get("jurMnofNm", "")
        region = next((kw for kw in _REGION_KEYWORDS if kw in jur_nm), "전국")

        apply_period = raw.get("sprtCycNm", "") or ""
        return {
            "policy_id": f"bokjiro_{raw.get('servId', '')}",
            "source": "bokjiro",
            "title": raw.get("servNm", ""),
            "summary": raw.get("servDgst", ""),
            "detail": raw.get("servCont", ""),
            "target": raw.get("trgterIndvdlArray", ""),
            "lifecycle_label": lifecycle_label,
            "service_field_label": field_label,
            "region": region,
            "apply_url": raw.get("servDtlLink", ""),
            "apply_period": apply_period,
            "deadline": parse_deadline(apply_period),
        }


def _xml_to_dict(element: ET.Element) -> dict[str, str]:
    """XML element를 dict로 변환"""
    return {child.tag: (child.text or "").strip() for child in element}
