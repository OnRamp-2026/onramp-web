import { get, HttpError, post } from "@/api/http";

export type IngestionMode = "incremental" | "full_scan";
export type IngestionStatus = "queued" | "running" | "success" | "failed";
export type IngestionStage = "queued" | "fetching" | "preparing" | "indexing" | "completed";

export interface IngestionRun {
  run_id: string;
  tenant_id: string;
  mode: IngestionMode;
  trigger: "cron" | "manual";
  status: IngestionStatus;
  stage: IngestionStage;
  pages_discovered: number;
  pages_processed: number;
  pages_indexed: number;
  pages_skipped: number;
  pages_failed: number;
  chunks_indexed: number;
  chunks_deleted: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
}

interface RunList {
  runs: IngestionRun[];
}

export function createIngestionRun(mode: IngestionMode): Promise<IngestionRun> {
  return post<IngestionRun>("/v1/ingestion/runs", { mode });
}

export function getCurrentIngestionRun(): Promise<IngestionRun | null> {
  return get<IngestionRun | null>("/v1/ingestion/runs/current");
}

export async function listIngestionRuns(limit = 10): Promise<IngestionRun[]> {
  return (await get<RunList>(`/v1/ingestion/runs?limit=${limit}`)).runs;
}

export function isIngestionConflict(error: unknown): boolean {
  return error instanceof HttpError && error.status === 409;
}
