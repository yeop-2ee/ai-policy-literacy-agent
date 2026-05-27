from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.models.bookmark import Bookmark

router = APIRouter()


@router.post("/{policy_id}")
async def toggle_bookmark(
    policy_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        pid = int(policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")

    policy = await db.get(Policy, pid)
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")

    result = await db.execute(
        select(Bookmark).where(
            Bookmark.user_id == current_user.id,
            Bookmark.policy_id == policy.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()
        return {"saved": False}
    else:
        bm = Bookmark(user_id=current_user.id, policy_id=policy.id)
        db.add(bm)
        await db.commit()
        return {"saved": True}


@router.get("")
async def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id)
    )
    bookmarks = result.scalars().all()

    policy_ids = [bm.policy_id for bm in bookmarks]
    if not policy_ids:
        return {"policies": [], "total": 0}

    result = await db.execute(select(Policy).where(Policy.id.in_(policy_ids)))
    policies = result.scalars().all()

    from app.api.v1.policies import _policy_to_dict
    return {"policies": [_policy_to_dict(p) for p in policies], "total": len(policies)}


@router.get("/status")
async def get_bookmark_statuses(
    policy_ids: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    id_list = [pid.strip() for pid in policy_ids.split(",") if pid.strip()]
    int_ids = []
    for pid in id_list:
        try:
            int_ids.append(int(pid))
        except ValueError:
            pass

    if not int_ids:
        return {pid: False for pid in id_list}

    result = await db.execute(
        select(Bookmark.policy_id).where(
            Bookmark.user_id == current_user.id,
            Bookmark.policy_id.in_(int_ids),
        )
    )
    saved_ids = {str(row) for row in result.scalars().all()}
    return {pid: (pid in saved_ids) for pid in id_list}
