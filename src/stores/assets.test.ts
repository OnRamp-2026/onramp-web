import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/assets", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/assets")>();
  return {
    ...original,
    ASSET_MOCK_ENABLED: false,
    listAssets: vi.fn().mockResolvedValue({
      items: [
        {
          id: "transcription-1",
          title: "처리중 회의",
          domain: "incident",
          space: "OPS",
          status: "processing",
          createdAt: "2026. 6. 21.",
          drafter: "AI 처리 중",
          meta: {
            incidentId: "transcription-1",
            author: "현재 사용자",
            occurredAt: "2026. 6. 21.",
            severity: "P3",
          },
          source: {
            kind: "transcript",
            title: "incident.m4a",
            meta: "1.0 MB · 녹취 음성",
            excerpt: "STT 및 보고서 생성을 처리하고 있습니다.",
          },
          edited: {},
          five: {
            situation: "",
            cause: "",
            evidence: "",
            solution: "",
            infra_context: "",
          },
          workflowStatus: "transcribing",
          progress: {
            totalChunks: 10,
            completedChunks: 4,
            failedChunks: 0,
            percent: 40,
          },
        },
      ],
      counts: { all: 1, processing: 1, draft: 0, completed: 0, failed: 0 },
    }),
  };
});

import { useAssetsStore } from "@/stores/assets";

describe("assets store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("restores asset history from the server", async () => {
    const store = useAssetsStore();

    await store.loadHistory();

    expect(store.list).toHaveLength(1);
    expect(store.list[0]?.status).toBe("processing");
  });
});
