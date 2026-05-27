from app.prompts.simulator import get_system_prompt
import app.utils.gemini as gemini

SCENARIOS = {
    "주민센터": "주민등록 관련 서류 발급, 전입신고 등 주민센터 업무",
    "고용센터": "실업급여 신청, 취업 지원 상담 등 고용센터 업무",
    "은행": "통장 개설, 대출 상담 등 은행 업무",
}


def get_ai_reply(scenario: str, messages: list[dict]) -> str:
    """대화 히스토리를 받아 Gemini로부터 담당자 응답 생성 (폴백 포함)"""
    system_prompt = get_system_prompt(scenario)

    history = []
    for m in messages[:-1]:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [m["content"]]})

    last_msg = messages[-1]["content"]
    return gemini.chat(system_prompt, history, last_msg, max_output_tokens=150)
