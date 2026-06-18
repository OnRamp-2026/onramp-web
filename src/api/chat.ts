import type { AssistantMessage, Domain, FiveElements, SourceDoc } from "@/types";
import { mockAnswerFor } from "@/api/mock";
import { post } from "@/api/http";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";
/** 챗 mock 모드 여부 — 스토어가 초기 시드 대화(INITIAL_CONVERSATION) 표시 결정에 사용 */
export const CHAT_MOCK_ENABLED = USE_MOCK;

/** 백엔드 ChatResponse 계약 (onramp-api app/models/response.py) */
export interface ChatResponse {
  answer_format?: "structured" | "freeform"; // #191 — 렌더 분기 (없으면 structured 가정)
  answer: FiveElements; // {situation, cause, evidence, solution, infra_context}
  answer_text?: string; // freeform 산문 답변
  sources: SourceDoc[]; // {title, url, space_key, content_snippet, score}
  answerability_status: AssistantMessage["answerability_status"];
  answerability_reason: string;
  domain: Domain; // 영문 classifier 키
  model_used: string;
  conversation_id?: string; // 로그인 시 저장된 대화 ID (익명이면 "")
}

/** sendChat 결과 — 답변 메시지 + 저장된 대화 ID(이어가기/목록 동기화용) */
export interface ChatResult {
  message: AssistantMessage;
  conversationId: string;
}

/** 백엔드 ChatResponse → 화면 메시지. 영문 domain은 그대로 보관(표시는 DOMAIN_LABEL). */
export function mapToAssistantMessage(raw: ChatResponse): AssistantMessage {
  return {
    role: "assistant",
    domain: raw.domain,
    answerability_status: raw.answerability_status,
    answerability_reason: raw.answerability_reason ?? "",
    answer_format: raw.answer_format ?? "structured",
    answer_text: raw.answer_text ?? "",
    five: raw.answer,
    sources: raw.sources ?? [],
    model_used: raw.model_used,
  };
}

/**
 * 질문을 백엔드(/v1/chat, LangGraph)로 보내 5요소 답변 + 저장된 대화 ID를 받는다.
 * 백엔드 미연동 단계에서는 mock 답변을 반환한다(대화 ID 없음).
 * conversationId가 있으면 그 대화를 이어가고, 없으면 새 대화로 저장된다(로그인 시).
 */
export async function sendChat(query: string, model: string, conversationId = ""): Promise<ChatResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 450));
    return { message: mockAnswerFor(query), conversationId: "" };
  }
  // 백엔드 ChatRequest = {query, model, conversation_id}. model은 LLM Selector가 prefix로
  // provider 라우팅(gpt-*→openai / 그 외 비공백→self_hosted). 빈 model이면 백엔드 config 기본값.
  const raw = await post<ChatResponse>("/v1/chat", { query, model, conversation_id: conversationId });
  return { message: mapToAssistantMessage(raw), conversationId: raw.conversation_id ?? "" };
}
