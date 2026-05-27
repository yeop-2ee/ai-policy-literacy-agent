from abc import ABC, abstractmethod
from typing import Any


class BaseCrawler(ABC):
    """공공 API 클라이언트 및 크롤러 공통 인터페이스"""

    @abstractmethod
    async def fetch_policies(self, page: int = 1, page_size: int = 100) -> list[dict[str, Any]]:
        """정책 목록을 가져와 공통 포맷으로 반환"""
        ...

    @abstractmethod
    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        """API별 응답을 Policy 모델 형식으로 정규화"""
        ...
