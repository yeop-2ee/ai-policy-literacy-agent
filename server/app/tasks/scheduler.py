from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.tasks.policy_sync import sync_all_policies

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(
        sync_all_policies,
        trigger=CronTrigger(hour=2, minute=0),
        id="policy_sync",
        name="정책 데이터 동기화",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()
