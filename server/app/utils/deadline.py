"""apply_period 문자열에서 마감일(deadline) 추출 유틸리티"""
import re
from datetime import datetime
from typing import Optional


_DATE_RE = re.compile(r'(\d{4})[\.\-\s/년]?\s*(\d{1,2})[\.\-\s/월]?\s*(\d{1,2})')
_YYYYMMDD_RE = re.compile(r'(?<!\d)(\d{8})(?!\d)')
_MONTHDAY_RE = re.compile(r'(?<!\d)(\d{1,2})[\.\-\s/월]\s*(\d{1,2})')


def _try_date(y: int, m: int, d: int) -> Optional[datetime]:
    try:
        return datetime(y, m, d)
    except ValueError:
        return None


def _extract_all_dates(text: str) -> list:
    dates = []
    for m in _YYYYMMDD_RE.finditer(text):
        s = m.group(1)
        dt = _try_date(int(s[:4]), int(s[4:6]), int(s[6:8]))
        if dt:
            dates.append(dt)
    for m in _DATE_RE.finditer(text):
        dt = _try_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if dt:
            dates.append(dt)
    return dates


def parse_deadline(text: str) -> Optional[datetime]:
    """
    apply_period 문자열에서 마감일 추출.
    - 범위(A~B)이면 종료일(B) 사용
    - 단일 날짜이면 그 날짜 사용
    - 날짜 파싱 불가("연중", "상시", "수시" 등)이면 None 반환
    """
    if not text or not text.strip():
        return None

    text = text.strip()

    if '~' in text:
        before, after = text.split('~', 1)

        # 종료부분에서 YYYY 포함 날짜 추출 시도
        end_dates = _extract_all_dates(after)
        if end_dates:
            return min(end_dates)

        # 종료부분에 YYYY가 없으면 시작부분 연도 + 종료부분 MM.DD 조합
        start_dates = _extract_all_dates(before)
        if start_dates:
            start_year = start_dates[0].year
            m = _MONTHDAY_RE.search(after)
            if m:
                dt = _try_date(start_year, int(m.group(1)), int(m.group(2)))
                if dt:
                    # 종료월이 시작월보다 작으면 다음 해
                    if dt < start_dates[0]:
                        dt = _try_date(start_year + 1, int(m.group(1)), int(m.group(2)))
                    return dt

        # 종료부분 날짜 파싱 실패 → 시작부분 날짜 반환
        if start_dates:
            return max(start_dates)

    # 범위 없는 단일 날짜
    dates = _extract_all_dates(text)
    if dates:
        return max(dates)

    return None
