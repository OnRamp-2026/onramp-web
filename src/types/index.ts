/** 도메인 — 백엔드 classifier 영문 키(Domain enum)와 1:1. 화면 표시는 DOMAIN_LABEL 사용. */
export type Domain = "incident" | "manual" | "api_reference" | "meeting_note" | "planning";

/** 영문 도메인 키 → 한글 표시 라벨 (UX는 한글 유지) */
export const DOMAIN_LABEL: Record<Domain, string> = {
  incident: "장애대응",
  manual: "운영매뉴얼",
  api_reference: "API명세",
  meeting_note: "회의록",
  planning: "기획서",
};

/** 드롭다운 등 선택 옵션 (영문 값 + 한글 라벨) */
export const DOMAIN_OPTIONS: { value: Domain; label: string }[] = (
  Object.keys(DOMAIN_LABEL) as Domain[]
).map((value) => ({ value, label: DOMAIN_LABEL[value] }));

/** 답변 가능성 상태 — 백엔드 AnswerabilityStatus enum과 동일 */
export type AnswerabilityStatus =
  | "answerable" // 근거 충분 → 일반 답변
  | "partially_answerable" // 부분 근거 → 한계 명시 답변
  | "not_enough_evidence" // 근거 부족 → 보류 + 추가 검색 안내
  | "conflicting_evidence" // 문서 충돌 → 버전 확인 요청
  | "outdated_evidence"; // 최신 문서 부재 → 제한 답변

/** 5요소 구조화 답변 (백엔드 FiveElementsResponse 계약과 동일) */
export interface FiveElements {
  situation: string; // 현재 상황
  cause: string; // 원인
  evidence: string; // 근거
  solution: string; // 해결
  infra_context: string; // 인프라 맥락
}

/** 출처 문서 — 백엔드 SourceDoc 계약과 동일 */
export interface SourceDoc {
  title: string;
  url: string; // Confluence 원문 URL
  space_key: string; // Confluence space, 예: OPS
  content_snippet: string; // 본문 일부 (추적성)
  score: number; // rerank/유사도
  site?: string; // 출처 사이트 (apache/kubernetes/…, 백엔드 #108 버전 계보 메타)
  product_version?: string; // 문서 버전 (v1.33/2.4/latest, 버전 무관 문서는 "")
  domain?: Domain; // 표시 보조 (백엔드 ChatResponse는 source별 domain 미제공)
}

export interface UserMessage {
  role: "user";
  text: string;
  time: string;
  perm?: string;
}

/** 챗봇 답변 — 백엔드 ChatResponse 계약과 정합 */
export interface AssistantMessage {
  role: "assistant";
  domain: Domain; // 영문 키 (표시는 DOMAIN_LABEL)
  answerability_status: AnswerabilityStatus;
  answerability_reason: string;
  answer_format: "structured" | "freeform"; // 렌더 분기 (#191) — freeform이면 answer_text 사용
  answer_text: string; // freeform 산문 답변 (structured면 "")
  five: FiveElements;
  sources: SourceDoc[];
  model_used?: string;
  trace_id?: string; // Langfuse trace — 👍/👎 피드백(/v1/chat/feedback) 참조용
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

/** 업로드 진입 폼 (단계 1) — 음성 녹취 파일 업로드 → STT 전사 → 5요소 보고서 */
export interface UploadForm {
  fileName: string;
  fileSize: number; // bytes
  file: File | null; // 녹취 음성 파일 (오브젝트 스토리지 업로드 → onramp-stt-api 전사)
  incidentId: string;
  author: string;
  occurredAt: string;
  domain: Domain;
  severity: Severity;
}

/* ───────────── 인증 · 인가 (IdP 위임 · 테넌트(회사)) ─────────────
 * 인가 = 테넌트(회사) 격리 + Confluence 접근 권한 위임. 별도 역할(Reader/Curator) 층 없음(6/11). */

/** 로그인에 사용한 IdP (슬랙 우선, 회사 SSO로 교체 가능) */
export type AuthProvider = "sso" | "slack";

/** 테넌트 = 회사(고객사). 슬랙 team_id/org claim → 이 회사의 KB만 조회(인가 Layer 1). */
export interface AuthTenant {
  id: string; // 예: nuri (슬랙 워크스페이스/회사)
  label: string; // 예: 누리클라우드
}

/** 로그인 사용자 — IdP 토큰 claim에서 매핑(비밀번호 미보관) */
export interface AuthUser {
  id: string; // IdP sub / slack user_id
  name: string;
  email: string;
  initial: string; // 아바타 글자
  tenant: AuthTenant; // 회사(테넌트)
  tenure: string; // 표시용 (예: "신규 입사 · 2일차")
  provider: AuthProvider;
}
