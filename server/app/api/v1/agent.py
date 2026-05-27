from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.policy import Policy
from app.services.agent_service import stream_summary, stream_simplified

router = APIRouter()


def _sse_generator(async_gen):
    async def generate():
        async for chunk in async_gen:
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    return generate()


@router.get("/summarize/{policy_id}")
async def summarize_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = int(policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    policy = await db.get(Policy, pid)
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    return StreamingResponse(
        _sse_generator(stream_summary(policy)),
        media_type="text/event-stream",
    )


@router.get("/simplify/{policy_id}")
async def simplify_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = int(policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    policy = await db.get(Policy, pid)
    if not policy:
        raise HTTPException(status_code=404, detail="정책을 찾을 수 없습니다.")
    return StreamingResponse(
        _sse_generator(stream_simplified(policy)),
        media_type="text/event-stream",
    )
