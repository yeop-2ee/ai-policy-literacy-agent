import asyncio
from datetime import datetime

from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.crawlers.bokjiro_api import BokjiroApiCrawler
from app.crawlers.bokjiro_local_api import BokjiroLocalApiCrawler
from app.crawlers.mois_api import MoisApiCrawler
from app.crawlers.onyouth_api import OnyouthApiCrawler
from app.models.policy import Policy

_PAGE_SIZE = 100
_MAX_PAGES = 200


async def sync_all_policies():
    print(f"[{datetime.now()}] 정책 데이터 동기화 시작")
    crawlers = [
        OnyouthApiCrawler(),
        MoisApiCrawler(),
        BokjiroApiCrawler(),
        BokjiroLocalApiCrawler(),
    ]
    tasks = [_sync_from_crawler(crawler) for crawler in crawlers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    print(f"[{datetime.now()}] 동기화 완료: {results}")
    return results


async def _sync_from_crawler(crawler):
    from app.db.database import AsyncSessionLocal

    name = crawler.__class__.__name__
    fetched_ids: set[str] = set()
    total_upserted = 0
    fetch_failed = False

    async with AsyncSessionLocal() as db:
        # ── 1단계: API 수집 & upsert ──────────────────────────────────
        for page in range(1, _MAX_PAGES + 1):
            try:
                policies = await crawler.fetch_policies(page=page, page_size=_PAGE_SIZE)
            except Exception as e:
                print(f"  [{name}] 페이지 {page} 오류 (중단): {e}")
                fetch_failed = True
                break

            if not policies:
                break

            try:
                for policy_data in policies:
                    policy_id = policy_data.pop("policy_id")
                    fetched_ids.add(policy_id)
                    policy_data["updated_at"] = datetime.utcnow()
                    policy_data.setdefault("created_at", datetime.utcnow())

                    stmt = pg_insert(Policy).values(policy_id=policy_id, **policy_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["policy_id"],
                        set_=policy_data,
                    )
                    await db.execute(stmt)

                await db.commit()
                total_upserted += len(policies)
            except Exception as e:
                await db.rollback()
                print(f"  [{name}] DB 저장 오류 페이지 {page}: {e}")

            if len(policies) < _PAGE_SIZE:
                break

        # ── 2단계: 사라진 정책 삭제 ────────────────────────────────────
        deleted = 0
        if not fetch_failed and fetched_ids:
            source = _get_source_name(crawler)
            result = await db.execute(
                select(Policy.policy_id).where(Policy.source == source)
            )
            db_ids = {row for row in result.scalars().all()}
            removed_ids = db_ids - fetched_ids
            if removed_ids:
                await db.execute(
                    delete(Policy).where(Policy.policy_id.in_(list(removed_ids)))
                )
                await db.commit()
                deleted = len(removed_ids)
                print(f"  [{name}] 만료된 정책 {deleted}건 삭제")

    suffix = f", 삭제 {deleted}건" if deleted else ""
    return f"{name}: {total_upserted}건 동기화{suffix}"


def _get_source_name(crawler) -> str:
    return {
        "OnyouthApiCrawler":      "onyouth",
        "MoisApiCrawler":         "mois",
        "BokjiroApiCrawler":      "bokjiro",
        "BokjiroLocalApiCrawler": "bokjiro_local",
    }.get(crawler.__class__.__name__, "")
