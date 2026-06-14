import type { AssistantMessage, Domain, FiveElements, SourceDoc } from "@/types";
import { mockAnswerFor } from "@/api/mock";
import { post } from "@/api/http";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";

/** 백엔드 ChatResponse 계약 (onramp-api app/models/response.py) */
export interface ChatResponse {
  answer: FiveElements; // {situation, cause, evidence, solution, infra_context}
  sources: SourceDoc[]; // {title, url, space_key, content_snippet, score}
  answerability_status: AssistantMessage["answerability_status"];
  answerability_reason: string;
  domain: Domain; // 영문 classifier 키
  model_used: string;
}

/** 백엔드 ChatResponse → 화면 메시지. 영문 domain은 그대로 보관(표시는 DOMAIN_LABEL). */
export function mapToAssistantMessage(raw: ChatResponse): AssistantMessage {
  return {
    role: "assistant",
    domain: raw.domain,
    answerability_status: raw.answerability_status,
    answerability_reason: raw.answerability_reason ?? "",
    five: raw.answer,
    sources: raw.sources ?? [],
    model_used: raw.model_used,
  };
}

/**
 * 질문을 백엔드(/v1/chat, LangGraph)로 보내 5요소 답변을 받는다.
 * 백엔드 미연동 단계에서는 mock 답변을 반환한다.
 */
export async function sendChat(query: string, model: string): Promise<AssistantMessage> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 450));
    return mockAnswerFor(query);
  }
  // 백엔드 ChatRequest = {query, model}. model은 LLM Selector가 prefix로 provider 라우팅
  // (gpt-*→openai / 그 외 비공백→self_hosted). 빈 model이면 백엔드 config 기본값.
  const raw = await post<ChatResponse>("/v1/chat", { query, model });
  return mapToAssistantMessage(raw);
}
