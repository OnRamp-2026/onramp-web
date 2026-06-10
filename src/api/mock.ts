import type { AssistantMessage, ChatMessage, FiveElements, HistoryItem, LlmModel, SourceDoc } from "@/types";

export const MODELS: LlmModel[] = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini", note: "빠름" },
  { id: "gpt-4o", label: "GPT-4o", note: "정확" },
  { id: "sovereign", label: "Sovereign", note: "사내" },
];

export const HISTORY: HistoryItem[] = [
  { domain: "장애", title: "EKS Pod CrashLoopBackOff 원인", current: true },
  { domain: "운영", title: "Prometheus 알럿 룰 추가 절차" },
  { domain: "API", title: "결제 API 응답 필드 명세" },
  { domain: "회의", title: "지난 스프린트 회고 결정사항" },
  { domain: "운영", title: "ArgoCD 롤백 방법" },
];

const SRC_RUNBOOK: SourceDoc = {
  title: "EKS Pod 장애 대응 런북",
  url: "https://confluence.local/display/OPS/EKS-Pod-Runbook",
  space_key: "OPS",
  content_snippet:
    "증상: Pod가 기동 직후 반복 재시작되며 CrashLoopBackOff로 표시됨. 재시작 간격이 지수적으로 증가.\n점검 순서: 1) kubectl logs <pod> --previous — 종료 직전 스택트레이스 2) kubectl describe pod — Events에서 OOMKilled / probe 실패 확인 3) limits.memory 및 probe 임계값 점검\n후속 조치: 원인별 설정 수정 후 롤아웃, 재발 시 노드 capacity 검토.",
  score: 0.93,
  domain: "incident",
};

const SRC_RESOURCE: SourceDoc = {
  title: "컨테이너 리소스 설정 가이드",
  url: "https://confluence.local/display/OPS/Container-Resources",
  space_key: "OPS",
  content_snippet: "requests/limits 설정 기준과 OOMKilled 회피를 위한 메모리 한도 산정 방법.",
  score: 0.88,
  domain: "manual",
};

const SRC_PROBE: SourceDoc = {
  title: "probe 설정 트러블슈팅",
  url: "https://confluence.local/display/OPS/Probe-Troubleshooting",
  space_key: "OPS",
  content_snippet: "readiness/liveness probe 임계값 튜닝과 흔한 오설정 사례.",
  score: 0.81,
  domain: "manual",
};

const FIVE_EKS: FiveElements = {
  situation:
    "대상 Pod가 시작 직후 반복 종료되며 <code>CrashLoopBackOff</code> 상태로 재시작 백오프가 누적됩니다. <code>kubectl get pods</code>에서 재시작 횟수가 빠르게 증가합니다.",
  cause:
    "대부분 <span class='hl'>컨테이너 프로세스의 비정상 종료</span>입니다. 흔한 3가지 — ① 설정/환경변수 누락, ② <code>readiness/liveness probe</code> 실패, ③ 메모리 한도(OOMKilled) 초과.",
  evidence:
    "사내 런북 <code>[EKS-Pod-Runbook]</code> 장애 타임라인과 <code>[Container-Resources]</code> 리소스 설정 가이드에서 동일 증상의 후속 조치가 확인됩니다.",
  solution:
    "<code>kubectl logs &lt;pod&gt; --previous</code>로 종료 직전 로그 확인 → <code>kubectl describe</code> 이벤트에서 OOMKilled 여부 확인 → 한도 조정 또는 probe 임계값 완화 후 롤아웃.",
  infra_context:
    "현재 클러스터는 <code>t3.medium</code> 2노드로 메모리 여유가 크지 않습니다. 한도 상향 시 노드 capacity를 함께 확인하세요.",
};

const EMPTY_FIVE: FiveElements = { situation: "", cause: "", evidence: "", solution: "", infra_context: "" };

/** answerable — 근거 충분, 정상 5요소 답변 */
const ANSWERABLE: AssistantMessage = {
  role: "assistant",
  domain: "incident",
  answerability_status: "answerable",
  answerability_reason: "",
  five: FIVE_EKS,
  sources: [SRC_RUNBOOK, SRC_RESOURCE, SRC_PROBE],
  model_used: "gpt-4o-mini",
};

/** partially_answerable — 부분 근거, 한계 명시 답변 */
const PARTIAL: AssistantMessage = {
  ...ANSWERABLE,
  answerability_status: "partially_answerable",
  answerability_reason:
    "일부 근거(런북)만 확인되어 메모리 한도 권장값은 사내 표준 문서 부재로 확정하지 못했습니다. 아래 답변은 확인된 근거 기준입니다.",
  sources: [SRC_RUNBOOK],
};

/** not_enough_evidence — 근거 부족, 답변 보류 */
const NOT_ENOUGH: AssistantMessage = {
  role: "assistant",
  domain: "incident",
  answerability_status: "not_enough_evidence",
  answerability_reason:
    "질문에 해당하는 운영 문서를 충분히 찾지 못했습니다. 검색어를 구체화하거나 도메인(장애대응·운영매뉴얼 등)을 좁혀 다시 질문해 주세요.",
  five: EMPTY_FIVE,
  sources: [],
  model_used: "gpt-4o-mini",
};

/** conflicting_evidence — 동등 권위 문서 충돌, 버전 확인 요청 */
const CONFLICTING: AssistantMessage = {
  role: "assistant",
  domain: "manual",
  answerability_status: "conflicting_evidence",
  answerability_reason:
    "동등한 권위의 문서가 서로 다른 롤백 절차를 안내합니다(ArgoCD v2.8 / v2.10). 적용 대상 버전을 확인한 뒤 다시 질문해 주세요.",
  five: EMPTY_FIVE,
  sources: [
    { ...SRC_RUNBOOK, title: "ArgoCD 롤백 절차 (v2.8)", url: "https://confluence.local/display/OPS/ArgoCD-Rollback-28", score: 0.84, domain: "manual" },
    { ...SRC_RESOURCE, title: "ArgoCD 롤백 절차 (v2.10)", url: "https://confluence.local/display/OPS/ArgoCD-Rollback-210", score: 0.83, domain: "manual" },
  ],
};

/** outdated_evidence — 최신 문서 부재, 제한 답변 */
const OUTDATED: AssistantMessage = {
  ...ANSWERABLE,
  domain: "manual",
  answerability_status: "outdated_evidence",
  answerability_reason:
    "최신 문서가 확인되지 않아 2024년 기준 과거 문서로 제한적으로 답변합니다. 현재 환경과 차이가 있을 수 있습니다.",
  sources: [{ ...SRC_RESOURCE, content_snippet: "(2024-03 기준) requests/limits 설정 기준 — 이후 개정 문서 미확인." }],
};

/**
 * 백엔드 미연동 단계: 질의 키워드로 5종 answerability 상태를 데모한다.
 * (실연동 시 mapToAssistantMessage(ChatResponse)로 대체)
 */
export function mockAnswerFor(query: string): AssistantMessage {
  if (/충돌|conflict|버전\s*확인/i.test(query)) return CONFLICTING;
  if (/오래|예전|옛|deprecat|최신.*없/i.test(query)) return OUTDATED;
  if (/근거\s*없|보류|찾을\s*수\s*없|모르/i.test(query)) return NOT_ENOUGH;
  if (/부분|일부|partial/i.test(query)) return PARTIAL;
  return ANSWERABLE;
}

export const INITIAL_CONVERSATION: ChatMessage[] = [
  { role: "user", text: "EKS Pod가 자꾸 CrashLoopBackOff 상태로 죽는데 원인이랑 해결법 알려줘", time: "09:02", perm: "운영팀 권한" },
  ANSWERABLE,
];
