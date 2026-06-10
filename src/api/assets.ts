import type { AssetReport, Domain, FiveElements, Severity, UploadForm } from "@/types";
// import { post } from "@/api/http";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 5요소 라벨 — AnswerCard와 동일한 순서/번호 */
export const ELEMENTS: { key: keyof FiveElements; num: string; label: string; hint: string }[] = [
  { key: "situation", num: "01", label: "현재 상황", hint: "무슨 일이 있었는가" },
  { key: "cause", num: "02", label: "원인", hint: "근본 원인은 무엇인가" },
  { key: "evidence", num: "03", label: "근거", hint: "어떤 로그·지표·문서로 확인했는가" },
  { key: "solution", num: "04", label: "해결", hint: "어떻게 조치했는가" },
  { key: "infra", num: "05", label: "인프라 맥락", hint: "재발 방지·환경 특이사항" },
];

/** 도메인 5종 (분류 택소노미) */
export const DOMAINS: Domain[] = ["장애대응", "운영매뉴얼", "API명세", "회의록", "기획서"];

/** 심각도 P1~P3 */
export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "P1", label: "P1 · 긴급" },
  { value: "P2", label: "P2 · 높음" },
  { value: "P3", label: "P3 · 보통" },
];

/** 4단계 자동 흐름 (UC-07 → UC-09) */
export const FLOW_STEPS = [
  { n: 1, label: "파일 업로드", uc: "UC-07" },
  { n: 2, label: "5요소 보고서 초안", uc: "UC-08 자동" },
  { n: 3, label: "HITL 검토", uc: "UC-09 사용" },
  { n: 4, label: "Confluence 등록", uc: "UC-09 자동" },
] as const;

/* ───────────── mock 자산화 큐 ───────────── */

const ASSET_REVIEW: AssetReport = {
  id: "AST-2041",
  title: "EKS Pod CrashLoopBackOff 장애 대응",
  domain: "장애대응",
  space: "OPS",
  status: "review",
  createdAt: "12분 전",
  drafter: "AI 초안 · 양정우 검토",
  meta: { incidentId: "INC-2026-1014-EKS", author: "양정우", occurredAt: "2026-10-14 16:00", severity: "P1" },
  source: {
    kind: "transcript",
    title: "EKS 장애 대응 회고 (10/14 16:00)",
    meta: "incident-2026-1014.txt · 247 KB · UTF-8",
    excerpt:
      "…그래서 처음엔 배포 문제인 줄 알았는데, describe 찍어보니까 OOMKilled가 떠 있더라고요. limits.memory가 256Mi로 너무 빡빡하게 잡혀 있었고… probe 임계값도 5초라 기동 중에 죽은 거였어요. 일단 한도 올리고 롤아웃하니까 잡혔습니다.",
  },
  edited: { solution: true },
  five: {
    situation:
      "결제 서비스 Pod가 배포 직후 반복 종료되며 CrashLoopBackOff 상태에 진입했다. 재시작 백오프가 누적되어 약 20분간 결제 트래픽 일부가 실패했다.",
    cause:
      "메모리 한도(limits.memory 256Mi)가 실제 사용량 대비 과소 설정되어 컨테이너가 OOMKilled 되었고, liveness probe 임계값(5s)이 기동 시간보다 짧아 기동 중 종료가 가중되었다.",
    evidence:
      "kubectl describe pod 이벤트의 OOMKilled, kubectl logs --previous의 종료 직전 스택트레이스, Datadog 메모리 그래프의 한도 도달 구간으로 확인했다.",
    solution:
      "limits.memory를 512Mi로 상향하고 liveness probe initialDelay를 15s로 완화한 뒤 롤아웃하여 안정화했다. 노드 capacity 여유를 함께 확인했다.",
    infra:
      "클러스터가 t3.medium 2노드로 메모리 여유가 크지 않다. 동일 패턴 재발 방지를 위해 결제 워크로드의 request/limit 기준값을 운영 표준에 반영할 것.",
  },
};

const ASSET_PUBLISHED: AssetReport = {
  id: "AST-2038",
  title: "ArgoCD 동기화 실패 롤백 절차",
  domain: "운영매뉴얼",
  space: "OPS",
  status: "published",
  createdAt: "2일 전",
  drafter: "AI 초안 · 민지홍 검토",
  confluenceUrl: "https://confluence.internal/display/OPS/AST-2038",
  meta: { incidentId: "INC-2026-1012-ARGO", author: "민지홍", occurredAt: "2026-10-12 11:20", severity: "P2" },
  source: {
    kind: "chat",
    title: "ArgoCD 롤백 방법 (챗봇 대화)",
    meta: "대화 자산화 · 출처 3건",
    excerpt: "…OutOfSync 떴을 때 그냥 sync 누르지 말고 먼저 diff부터 보라고 했었죠. 이전 리비전으로 롤백하는 게…",
  },
  edited: {},
  five: {
    situation: "ArgoCD Application이 OutOfSync 상태로 멈춰 자동 동기화가 진행되지 않는 상황.",
    cause: "gitops 리포의 매니페스트와 클러스터 실제 상태가 충돌(수동 변경 흔적)하여 sync가 차단됨.",
    evidence: "ArgoCD UI의 diff 뷰, app-of-apps 상위 Application의 degraded 상태로 확인.",
    solution: "diff 확인 후 직전 정상 리비전으로 롤백(rollback to previous), 수동 변경분을 gitops에 역반영.",
    infra: "auto-sync는 selfHeal=false 유지. 긴급 롤백 권한은 운영팀으로 제한.",
  },
};

export const MOCK_ASSETS: AssetReport[] = [ASSET_REVIEW, ASSET_PUBLISHED];

/* ───────────── API (백엔드 미연동 단계는 mock) ───────────── */

let seq = 2043;

/** POST /v1/asset — 업로드(녹취/텍스트) → 5요소 초안 생성 (UC-08) */
export async function generateDraft(form: UploadForm): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(1400);
    const head = form.content.trim().split("\n")[0]?.slice(0, 40) || form.fileName.replace(/\.[^.]+$/, "");
    return {
      id: `AST-${seq++}`,
      title: head,
      domain: form.domain,
      space: "OPS",
      status: "draft",
      createdAt: "방금",
      drafter: "AI 초안",
      meta: {
        incidentId: form.incidentId,
        author: form.author,
        occurredAt: form.occurredAt,
        severity: form.severity,
      },
      source: {
        kind: "transcript",
        title: form.fileName,
        meta: `${(form.fileSize / 1024).toFixed(0)} KB · UTF-8 · 검증 OK`,
        excerpt: form.content.slice(0, 260),
      },
      edited: {},
      five: {
        situation: `(초안) ${head} — 입력 원문에서 추출한 상황 요약입니다. 검토 후 확정하세요.`,
        cause: "(초안) 추정 원인입니다. 근거와 함께 확정하세요.",
        evidence: "(초안) 확인에 사용한 로그·지표·문서를 채우세요.",
        solution: "(초안) 실제 조치 내용을 정리하세요.",
        infra: "(초안) 재발 방지·환경 특이사항을 정리하세요.",
      },
    };
  }
  // 실연동: return mapAsset(await post("/v1/asset", form));
  throw new Error("백엔드 미연동 — VITE_USE_MOCK=true 로 두세요");
}

/** PATCH /v1/asset/{id} — HITL 부분 수정 (published면 409) */
export async function saveAsset(asset: AssetReport): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(400);
    if (asset.status === "published") throw new Error("409: 등록된 자산은 수정할 수 없습니다");
    return { ...asset, status: asset.status === "draft" ? "review" : asset.status };
  }
  throw new Error("백엔드 미연동");
}

/** POST /v1/asset/{id}/approve — Confluence 등록 (UC-09) */
export async function approveAsset(asset: AssetReport): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(1100);
    return {
      ...asset,
      status: "published",
      confluenceUrl: `https://confluence.internal/display/${asset.space}/${asset.id}`,
    };
  }
  throw new Error("백엔드 미연동");
}
