import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteAsset, generateDraft } = vi.hoisted(() => ({
  deleteAsset: vi.fn(),
  generateDraft: vi.fn(),
}));

vi.mock("@/api/assets", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/assets")>();
  return {
    ...original,
    ASSET_MOCK_ENABLED: false,
    deleteAsset,
    generateDraft,
    listAssets: vi.fn().mockResolvedValue({
      items: [
        {
          id: "transcription-1",
          transcriptionId: "transcription-1",
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
      counts: { all: 1, processing: 1, draft: 0, deleting: 0, completed: 0, failed: 0 },
    }),
  };
});

import { useAssetsStore } from "@/stores/assets";

describe("assets store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    deleteAsset.mockReset();
    generateDraft.mockReset();
  });

  it("restores asset history from the server", async () => {
    const store = useAssetsStore();

    await store.loadHistory();

    expect(store.list).toHaveLength(1);
    expect(store.list[0]?.status).toBe("processing");
  });

  it("replaces processing history with the completed draft for the same transcription", async () => {
    const store = useAssetsStore();
    await store.loadHistory();
    generateDraft.mockResolvedValue({
      ...store.list[0],
      id: "report-1",
      transcriptionId: "transcription-1",
      status: "draft",
      title: "완성된 초안",
    });

    await store.createFromUpload(uploadForm());

    expect(store.list).toHaveLength(1);
    expect(store.list[0]?.id).toBe("report-1");
    expect(store.list[0]?.status).toBe("draft");
  });

  it("keeps the current selection when generation finishes in the background", async () => {
    const store = useAssetsStore();
    await store.loadHistory();
    let resolveDraft: ((value: (typeof store.list)[number]) => void) | undefined;
    generateDraft.mockReturnValue(
      new Promise((resolve) => {
        resolveDraft = resolve;
      }),
    );
    const generating = store.createFromUpload(uploadForm());

    store.select("transcription-1");
    resolveDraft?.({
      ...store.list[0]!,
      id: "report-1",
      transcriptionId: "transcription-2",
      status: "draft",
      title: "백그라운드 초안",
    });
    await generating;

    expect(store.activeId).toBe("transcription-1");
    expect(store.composing).toBe(false);
  });

  it("marks a draft as deleting immediately after the delete request", async () => {
    const store = useAssetsStore();
    await store.loadHistory();
    store.list[0]!.status = "draft";
    deleteAsset.mockResolvedValue({
      transcription_id: "transcription-1",
      status: "deleting",
    });

    await store.removeDraft(store.list[0]!);

    expect(store.list[0]?.status).toBe("deleting");
  });
});

function uploadForm() {
  return {
    fileName: "incident.m4a",
    fileSize: 4,
    file: new File(["test"], "incident.m4a"),
    incidentId: "INC-1",
    author: "홍길동",
    occurredAt: "2026-06-21",
    domain: "incident" as const,
    severity: "P1" as const,
  };
}
