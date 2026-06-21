import type { AssetReport, Domain, FiveElements, Severity, UploadForm } from "@/types";
import { DOMAIN_LABEL } from "@/types";
import { del, get, patch, post } from "@/api/http";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";
export const ASSET_MOCK_ENABLED = USE_MOCK;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 5요소 라벨 — AnswerCard와 동일한 순서/번호 */
export const ELEMENTS: { key: keyof FiveElements; num: string; label: string; hint: string }[] = [
  { key: "situation", num: "01", label: "현재 상황", hint: "무슨 일이 있었는가" },
  { key: "cause", num: "02", label: "원인", hint: "근본 원인은 무엇인가" },
  { key: "evidence", num: "03", label: "근거", hint: "어떤 로그·지표·문서로 확인했는가" },
  { key: "solution", num: "04", label: "해결", hint: "어떻게 조치했는가" },
  { key: "infra_context", num: "05", label: "인프라 맥락", hint: "재발 방지·환경 특이사항" },
];

/** 도메인 5종 (분류 택소노미) — 영문 키, 화면 표시는 DOMAIN_LABEL */
export const DOMAINS: Domain[] = ["incident", "manual", "api_reference", "meeting_note", "planning"];

/** 심각도 P1~P3 */
export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "P1", label: "P1 · 긴급" },
  { value: "P2", label: "P2 · 높음" },
  { value: "P3", label: "P3 · 보통" },
];

/** 4단계 자동 흐름 (UC-07 → UC-09) */
export const FLOW_STEPS = [
  { n: 1, label: "녹취 파일 업로드", uc: "UC-07" },
  { n: 2, label: "STT 전사 → 5요소 초안", uc: "UC-08 자동" },
  { n: 3, label: "HITL 검토", uc: "UC-09 사용" },
  { n: 4, label: "Confluence 등록", uc: "UC-09 자동" },
] as const;

/* ───────────── mock 자산화 큐 ───────────── */

const ASSET_REVIEW: AssetReport = {
  id: "AST-2041",
  transcriptionId: "AST-2041",
  title: "EKS Pod CrashLoopBackOff 장애 대응",
  domain: "incident",
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
    infra_context:
      "클러스터가 t3.medium 2노드로 메모리 여유가 크지 않다. 동일 패턴 재발 방지를 위해 결제 워크로드의 request/limit 기준값을 운영 표준에 반영할 것.",
  },
};

const ASSET_PUBLISHED: AssetReport = {
  id: "AST-2038",
  transcriptionId: "AST-2038",
  title: "ArgoCD 동기화 실패 롤백 절차",
  domain: "manual",
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
    infra_context: "auto-sync는 selfHeal=false 유지. 긴급 롤백 권한은 운영팀으로 제한.",
  },
};

export const MOCK_ASSETS: AssetReport[] = [ASSET_REVIEW, ASSET_PUBLISHED];

/* ───────────── API (백엔드 미연동 단계는 mock) ───────────── */

let seq = 2043;

interface UploadInstruction {
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  expires_at: string;
}

interface TranscriptionCreateResponse {
  workflow_id: string;
  transcription_id: string;
  status: string;
  upload: UploadInstruction | null;
}

interface TranscriptionStatusResponse {
  transcription_id: string;
  status: string;
  progress: {
    total_chunks: number;
    completed_chunks: number;
    failed_chunks: number;
    percent: number;
  };
  report: {
    status: string;
    report_id: string | null;
  };
  updated_at: string;
}

export interface AssetHistoryItemResponse {
  asset_id: string;
  transcription_id: string;
  report_id: string | null;
  title: string;
  category: string;
  status: "processing" | "draft" | "deleting" | "completed" | "failed";
  workflow_status: string;
  confluence_url: string;
  created_at: string;
  updated_at: string;
  source: {
    filename: string;
    content_type: string;
    size_bytes: number;
  };
  progress: {
    total_chunks: number;
    completed_chunks: number;
    failed_chunks: number;
    percent: number;
  };
  report: FiveElements | null;
}

interface AssetHistoryListResponse {
  items: AssetHistoryItemResponse[];
  counts: {
    all: number;
    processing: number;
    draft: number;
    deleting: number;
    completed: number;
    failed: number;
  };
}

export interface AssetHistory {
  items: AssetReport[];
  counts: AssetHistoryListResponse["counts"];
}

export interface ReportResponse {
  report_id: string;
  title: string;
  report: FiveElements;
  category: string;
  status: "draft" | "published";
  confluence_url: string;
  created_at: string;
  updated_at: string;
}

export type GenerationProgress = (message: string) => void;

const FAILED_STATUSES = new Set(["transcription_failed", "correction_failed", "report_failed", "cancelled"]);
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_STT_POLL_INTERVAL_MS ?? 2000);
const POLL_TIMEOUT_MS = Number(import.meta.env.VITE_STT_POLL_TIMEOUT_MS ?? 30 * 60 * 1000);

function idempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function contentType(file: File): string {
  return file.type || "application/octet-stream";
}

export async function uploadTranscription(form: UploadForm): Promise<string> {
  if (!form.file) throw new Error("업로드할 음성 파일이 없습니다");
  const created = await post<TranscriptionCreateResponse>(
    "/v1/transcriptions",
    {
      filename: form.file.name,
      content_type: contentType(form.file),
      size_bytes: form.file.size,
      title: form.file.name.replace(/\.[^.]+$/, ""),
      language: "ko-KR",
      category: DOMAIN_LABEL[form.domain],
    },
    { "Idempotency-Key": idempotencyKey() },
  );
  if (!created.upload) {
    if (created.status !== "awaiting_upload") return created.transcription_id;
    throw new Error("업로드 URL을 발급받지 못했습니다");
  }

  const uploadResponse = await fetch(created.upload.url, {
    method: created.upload.method,
    headers: created.upload.headers,
    body: form.file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`음성 파일 업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }
  const etag = uploadResponse.headers.get("ETag");
  if (!etag) {
    throw new Error("오브젝트 스토리지 응답의 ETag를 읽을 수 없습니다. CORS ExposeHeaders에 ETag를 추가하세요.");
  }
  await post(`/v1/transcriptions/${created.transcription_id}/upload-complete`, {
    etag,
    size_bytes: form.file.size,
  });
  return created.transcription_id;
}

async function waitForReport(transcriptionId: string, onProgress?: GenerationProgress): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await get<TranscriptionStatusResponse>(`/v1/transcriptions/${transcriptionId}`);
    if (FAILED_STATUSES.has(status.status)) {
      throw new Error(`처리 실패: ${status.status}`);
    }
    if (status.report.report_id && ["draft", "published"].includes(status.report.status)) {
      return status.report.report_id;
    }
    if (status.status === "report_processing" || status.status === "report_queued") {
      onProgress?.("STT 완료 · 5요소 보고서 생성 중");
    } else if (status.status === "correcting" || status.status === "correction_completed") {
      onProgress?.("전사 완료 · 용어 교정 중");
    } else {
      onProgress?.(`STT 전사 중 · ${status.progress.percent.toFixed(0)}%`);
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error("보고서 생성 대기 시간이 초과되었습니다");
}

function domainFromCategory(category: string, fallback: Domain): Domain {
  const matched = (Object.keys(DOMAIN_LABEL) as Domain[]).find((domain) => DOMAIN_LABEL[domain] === category);
  return matched ?? fallback;
}

const EMPTY_FIVE: FiveElements = {
  situation: "",
  cause: "",
  evidence: "",
  solution: "",
  infra_context: "",
};

export function mapAssetHistoryItem(raw: AssetHistoryItemResponse): AssetReport {
  const createdAt = new Date(raw.created_at).toLocaleString();
  const status = raw.status === "completed" ? "published" : raw.status;
  return {
    id: raw.report_id ?? raw.asset_id,
    transcriptionId: raw.transcription_id,
    title: raw.title,
    domain: domainFromCategory(raw.category, "incident"),
    space: "OPS",
    status,
    createdAt,
    drafter: raw.report ? "AI 초안" : raw.status === "failed" ? "처리 실패" : "AI 처리 중",
    meta: {
      incidentId: raw.transcription_id,
      author: "현재 사용자",
      occurredAt: createdAt,
      severity: "P3",
    },
    source: {
      kind: "transcript",
      title: raw.source.filename,
      meta: `${(raw.source.size_bytes / 1024 / 1024).toFixed(1)} MB · 녹취 음성`,
      excerpt:
        raw.status === "failed"
          ? "STT 또는 보고서 생성 중 오류가 발생했습니다."
          : raw.report
            ? "교정된 STT 전사문을 기반으로 생성된 보고서입니다."
            : "STT 및 보고서 생성을 처리하고 있습니다.",
    },
    edited: {},
    five: raw.report ?? { ...EMPTY_FIVE },
    confluenceUrl: raw.confluence_url || undefined,
    workflowStatus: raw.workflow_status,
    progress: {
      totalChunks: raw.progress.total_chunks,
      completedChunks: raw.progress.completed_chunks,
      failedChunks: raw.progress.failed_chunks,
      percent: raw.progress.percent,
    },
  };
}

/** GET /v1/assets — 로그인 사용자의 자산화 처리 이력 */
export async function fetchAssetHistory(): Promise<AssetHistory> {
  const response = await get<AssetHistoryListResponse>("/v1/assets");
  return {
    items: response.items.map(mapAssetHistoryItem),
    counts: response.counts,
  };
}

export async function listAssets(): Promise<AssetHistory> {
  if (USE_MOCK) {
    return {
      items: [...MOCK_ASSETS],
      counts: {
        all: MOCK_ASSETS.length,
        processing: 0,
        draft: MOCK_ASSETS.filter((asset) => asset.status === "draft").length,
        deleting: 0,
        completed: MOCK_ASSETS.filter((asset) => asset.status === "published").length,
        failed: 0,
      },
    };
  }
  return fetchAssetHistory();
}

export function mapReportResponse(raw: ReportResponse, form: UploadForm, transcriptionId: string): AssetReport {
  return {
    id: raw.report_id,
    transcriptionId,
    title: raw.title,
    domain: domainFromCategory(raw.category, form.domain),
    space: "OPS",
    status: raw.status,
    createdAt: new Date(raw.created_at).toLocaleString(),
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
      meta: `${(form.fileSize / 1024 / 1024).toFixed(1)} MB · 녹취 음성 · STT 완료`,
      excerpt: "교정된 STT 전사문을 기반으로 생성된 보고서입니다.",
    },
    edited: {},
    five: raw.report,
    confluenceUrl: raw.confluence_url || undefined,
  };
}

/** POST /v1/transcriptions → presigned PUT → 보고서 초안 조회 (UC-08) */
export async function generateDraft(form: UploadForm, onProgress?: GenerationProgress): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(1400);
    const head = form.fileName.replace(/\.[^.]+$/, "");
    const mockId = seq++;
    return {
      id: `AST-${mockId}`,
      transcriptionId: `mock-${mockId}`,
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
        meta: `${(form.fileSize / 1024 / 1024).toFixed(1)} MB · 녹취 음성 · STT 전사`,
        excerpt:
          "(음성 STT 전사 결과가 여기에 표시됩니다 — mock. 실연동 시 onramp-stt-api 전사 원문 일부가 들어갑니다.)",
      },
      edited: {},
      five: {
        situation: `(초안) ${head} — STT 전사 원문에서 추출한 상황 요약입니다. 검토 후 확정하세요.`,
        cause: "(초안) 추정 원인입니다. 근거와 함께 확정하세요.",
        evidence: "(초안) 확인에 사용한 로그·지표·문서를 채우세요.",
        solution: "(초안) 실제 조치 내용을 정리하세요.",
        infra_context: "(초안) 재발 방지·환경 특이사항을 정리하세요.",
      },
    };
  }
  onProgress?.("업로드 URL 발급 중");
  const transcriptionId = await uploadTranscription(form);
  onProgress?.("업로드 완료 · STT 작업 대기 중");
  const reportId = await waitForReport(transcriptionId, onProgress);
  const report = await get<ReportResponse>(`/v1/reports/${reportId}`);
  return mapReportResponse(report, form, transcriptionId);
}

export interface AssetDeletionResponse {
  transcription_id: string;
  status: "deleting";
}

export function deleteAsset(transcriptionId: string): Promise<AssetDeletionResponse> {
  return del<AssetDeletionResponse>(`/v1/assets/${transcriptionId}`);
}

/** PATCH /v1/reports/{id} — HITL 부분 수정 (published면 409) */
export async function saveAsset(asset: AssetReport): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(400);
    if (asset.status === "published") throw new Error("409: 등록된 자산은 수정할 수 없습니다");
    return { ...asset, status: asset.status === "draft" ? "review" : asset.status };
  }
  const raw = await patch<ReportResponse>(`/v1/reports/${asset.id}`, {
    title: asset.title,
    category: DOMAIN_LABEL[asset.domain],
    ...asset.five,
  });
  return {
    ...asset,
    title: raw.title,
    domain: domainFromCategory(raw.category, asset.domain),
    status: raw.status,
    five: raw.report,
    confluenceUrl: raw.confluence_url || undefined,
  };
}

/** POST /v1/reports/{id}/approve — Confluence 등록 (UC-09) */
export async function approveAsset(asset: AssetReport): Promise<AssetReport> {
  if (USE_MOCK) {
    await delay(1100);
    return {
      ...asset,
      status: "published",
      confluenceUrl: `https://confluence.internal/display/${asset.space}/${asset.id}`,
    };
  }
  const approved = await post<{ report_id: string; status: "published"; confluence_url: string }>(
    `/v1/reports/${asset.id}/approve`,
  );
  return {
    ...asset,
    status: approved.status,
    confluenceUrl: approved.confluence_url,
  };
}
