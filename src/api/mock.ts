import type { ChatMessage, HistoryItem, LlmModel, SourceDoc } from "@/types";

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

const KB1042: SourceDoc = {
  id: "KB-1042",
  title: "EKS Pod 장애 대응 런북",
  score: 0.93,
  domain: "장애대응",
  space: "OPS",
  updated: "2일 전",
  preview: [
    { heading: "증상", body: "Pod가 기동 직후 반복 재시작되며 CrashLoopBackOff로 표시됨. 재시작 간격이 지수적으로 증가." },
    {
      heading: "점검 순서",
      body: "1. kubectl logs <pod> --previous — 종료 직전 스택트레이스\n2. kubectl describe pod — Events에서 OOMKilled / probe 실패 확인\n3. limits.memory 및 probe 임계값 점검",
    },
    { heading: "후속 조치", body: "원인별 설정 수정 후 롤아웃, 재발 시 노드 capacity 검토." },
  ],
};

/** 백엔드 미연동 단계: 항상 반환되는 mock 답변 */
export const MOCK_ANSWER: ChatMessage = {
  role: "assistant",
  domain: "장애대응",
  confidence: 0.91,
  five: {
    situation:
      "대상 Pod가 시작 직후 반복 종료되며 <code>CrashLoopBackOff</code> 상태로 재시작 백오프가 누적됩니다. <code>kubectl get pods</code>에서 재시작 횟수가 빠르게 증가합니다.",
    cause:
      "대부분 <span class='hl'>컨테이너 프로세스의 비정상 종료</span>입니다. 흔한 3가지 — ① 설정/환경변수 누락, ② <code>readiness/liveness probe</code> 실패, ③ 메모리 한도(OOMKilled) 초과.",
    evidence:
      "사내 런북 <code>[KB-1042]</code> 장애 타임라인과 <code>[KB-0876]</code> 리소스 설정 가이드에서 동일 증상의 후속 조치가 확인됩니다.",
    solution:
      "<code>kubectl logs &lt;pod&gt; --previous</code>로 종료 직전 로그 확인 → <code>kubectl describe</code> 이벤트에서 OOMKilled 여부 확인 → 한도 조정 또는 probe 임계값 완화 후 롤아웃.",
    infra:
      "현재 클러스터는 <code>t3.medium</code> 2노드로 메모리 여유가 크지 않습니다. 한도 상향 시 노드 capacity를 함께 확인하세요.",
  },
  sources: [
    KB1042,
    { id: "KB-0876", title: "컨테이너 리소스 설정 가이드", score: 0.88, domain: "운영매뉴얼", space: "OPS", updated: "5일 전" },
    { id: "KB-0311", title: "probe 설정 트러블슈팅", score: 0.81, domain: "운영매뉴얼", space: "OPS", updated: "2주 전" },
  ],
};

export const INITIAL_CONVERSATION: ChatMessage[] = [
  { role: "user", text: "EKS Pod가 자꾸 CrashLoopBackOff 상태로 죽는데 원인이랑 해결법 알려줘", time: "09:02", perm: "운영팀 권한" },
  MOCK_ANSWER,
];
