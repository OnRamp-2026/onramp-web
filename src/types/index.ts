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

/* ───────────── 자산화 (Knowledge Asset · HITL) ───────────── */

/** 초안(draft) → 검토중(review) → 등록됨(published, 잠금). 백엔드 approve 후 409 가드와 정합. */
export type AssetStatus = "draft" | "review" | "published";

/** 자산화 원천 — 녹취 또는 대화 */
export interface AssetSource {
  kind: "transcript" | "chat";
  title: string; // 예: "EKS 장애 대응 회고 (10/14 16:00)"
  meta: string; // 예: "녹취 18분 · 참석 4인"
  excerpt: string; // 원문 일부 (추적성)
}

/** 심각도 (P1 긴급 ~ P3 보통) */
export type Severity = "P1" | "P2" | "P3";

/** 메타데이터 — 검색·필터링에 사용 (업로드 진입 폼) */
export interface AssetMeta {
  incidentId: string; // 예: INC-2026-0521-EKS
  author: string; // 작성자
  occurredAt: string; // 발생 일시
  severity: Severity;
}

/** 자산화 보고서 — 5요소 구조화. 백엔드 AssetReport 계약과 정합. */
export interface AssetReport {
  id: string; // 예: AST-2041
  title: string;
  domain: Domain;
  space: string; // Confluence space, 예: OPS
  status: AssetStatus;
  createdAt: string; // 상대 시각 (mock)
  drafter: string; // 초안 생성 주체
  meta: AssetMeta; // 장애 ID·작성자·발생일시·심각도
  five: FiveElements;
  edited: Partial<Record<keyof FiveElements, boolean>>; // HITL 수정된 요소
  source: AssetSource;
  confluenceUrl?: string; // 등록 후 부여
}

/** 업로드 진입 폼 (단계 1) */
export interface UploadForm {
  fileName: string;
  fileSize: number; // bytes
  content: string; // 텍스트 원문
  incidentId: string;
  author: string;
  occurredAt: string;
  domain: Domain;
  severity: Severity;
}
