import type { AssistantMessage } from "@/types";
import { MOCK_ANSWER } from "@/api/mock";
// import { post } from "@/api/http";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";

/**
 * 질문을 백엔드(/v1/chat, LangGraph)로 보내 5요소 답변을 받는다.
 * 백엔드 미연동 단계에서는 mock 답변을 반환한다.
 */
export async function sendChat(query: string, model: string): Promise<AssistantMessage> {
  void model; // 실연동 시 LLM Selector로 전달
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 450));
    return MOCK_ANSWER as AssistantMessage;
  }
  // 실연동 (D Answer/chat_service 완성 후):
  // const raw = await post<ChatResponse>("/v1/chat", { query, model });
  // return mapToAssistantMessage(raw);
  throw new Error("백엔드 미연동 — VITE_USE_MOCK=true 로 두세요");
}
