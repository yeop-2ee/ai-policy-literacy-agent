import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.simulator_service import get_ai_reply, SCENARIOS

router = APIRouter()


@router.websocket("/simulator/{session_id}")
async def simulator_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()

    messages: list[dict] = []
    scenario = "주민센터"

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            # 시나리오 선택 메시지
            if payload.get("type") == "select_scenario":
                scenario = payload.get("scenario", "주민센터")
                if scenario not in SCENARIOS:
                    await websocket.send_text(json.dumps({"error": "지원하지 않는 시나리오입니다."}))
                    continue
                messages = []
                await websocket.send_text(json.dumps({
                    "type": "scenario_started",
                    "scenario": scenario,
                    "message": f"{scenario} 시뮬레이터를 시작합니다. 무엇을 도와드릴까요?",
                }))
                continue

            # 일반 대화 메시지
            user_message = payload.get("message", "")
            if not user_message:
                continue

            messages.append({"role": "user", "content": user_message})
            reply = get_ai_reply(scenario, messages)
            messages.append({"role": "assistant", "content": reply})

            await websocket.send_text(json.dumps({
                "type": "message",
                "role": "assistant",
                "content": reply,
            }))

    except WebSocketDisconnect:
        pass
