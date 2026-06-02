export type Domain = "장애대응" | "운영매뉴얼" | "API명세" | "회의록" | "기획서";

/** 5요소 구조화 답변 (백엔드 FiveElements 계약과 동일) */
export interface FiveElements {
  situation: string; // 현재 상황
  cause: string; // 원인
  evidence: string; // 근거
  solution: string; // 해결
  infra: string; // 인프라 맥락
}

/** 출처 문서 (백엔드 SourceDocument 매핑) */
export interface SourceDoc {
  id: string; // 예: KB-1042
  title: string;
  score: number; // rerank/유사도
  domain: Domain;
  space: string;
  updated: string;
  preview?: { heading: string; body: string }[];
}

export interface UserMessage {
  role: "user";
  text: string;
  time: string;
  perm?: string;
}

export interface AssistantMessage {
  role: "assistant";
  domain: Domain;
  confidence: number;
  five: FiveElements;
  sources: SourceDoc[];
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface LlmModel {
  id: string;
  label: string;
  note: string;
}

export interface HistoryItem {
  domain: string;
  title: string;
  current?: boolean;
}
