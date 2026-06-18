import type { AssistantMessage, ChatMessage, Domain, FiveElements, SourceDoc } from "@/types";
import { del, get } from "@/api/http";

/** GET /v1/conversations 항목 (onramp-api ConversationSummary) */
export interface ConversationSummary {
  conversation_id: string;
  title: string;
  updated_at: string;
}

/** GET /v1/conversations/{id}/messages 항목 (onramp-api ConversationMessage) */
export interface ConversationMessageDto {
  role: "user" | "assistant";
  content: string;
  answer: FiveElements | null;
  answer_format?: "structured" | "freeform";
  answer_text?: string;
  sources: SourceDoc[];
  domain: Domain | "";
  answerability_status: AssistantMessage["answerability_status"] | "";
  answerability_reason: string;
  model_used: string;
  created_at: string;
}

export function listConversations(): Promise<ConversationSummary[]> {
  return get<ConversationSummary[]>("/v1/conversations");
}

export function getConversationMessages(id: string): Promise<ConversationMessageDto[]> {
  return get<ConversationMessageDto[]>(`/v1/conversations/${id}/messages`);
}

export function deleteConversation(id: string): Promise<void> {
  return del(`/v1/conversations/${id}`);
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 백엔드 저장 메시지 → 화면 ChatMessage 복원 */
export function toChatMessage(dto: ConversationMessageDto): ChatMessage {
  if (dto.role === "user") {
    return { role: "user", text: dto.content, time: hhmm(dto.created_at) };
  }
  return {
    role: "assistant",
    domain: (dto.domain || "manual") as Domain,
    answerability_status: dto.answerability_status || "answerable",
    answerability_reason: dto.answerability_reason ?? "",
    answer_format: dto.answer_format ?? "structured",
    answer_text: dto.answer_text ?? "",
    five: dto.answer ?? { situation: "", cause: "", evidence: "", solution: "", infra_context: "" },
    sources: dto.sources ?? [],
    model_used: dto.model_used,
  };
}
