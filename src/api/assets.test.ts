import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteAsset,
  fetchAssetHistory,
  mapAssetHistoryItem,
  mapReportResponse,
  uploadTranscription,
} from "@/api/assets";
import type { UploadForm } from "@/types";

const form: UploadForm = {
  fileName: "incident.m4a",
  fileSize: 4,
  file: new File(["test"], "incident.m4a", { type: "audio/mp4" }),
  incidentId: "INC-1",
  author: "홍길동",
  occurredAt: "2026-06-14 13:00",
  domain: "incident",
  severity: "P1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("STT asset API", () => {
  it("uploads through workflow, presigned URL, and upload-complete", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflow_id: "workflow-1",
            transcription_id: "transcription-1",
            status: "awaiting_upload",
            upload: {
              method: "PUT",
              url: "https://storage.test/source",
              headers: { "Content-Type": "audio/mp4" },
              expires_at: "2026-06-14T15:00:00Z",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { ETag: '"etag-1"' } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transcription_id: "transcription-1", status: "queued" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const transcriptionId = await uploadTranscription(form);

    expect(transcriptionId).toBe("transcription-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://storage.test/source");
    expect(fetchMock.mock.calls[1]?.[1]).not.toHaveProperty("credentials");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/v1/transcriptions/transcription-1/upload-complete");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ credentials: "include" });
  });

  it("maps database report response to the editor model", () => {
    const asset = mapReportResponse(
      {
        report_id: "report-1",
        title: "장애 보고서",
        report: {
          situation: "상황",
          cause: "원인",
          evidence: "근거",
          solution: "해결",
          infra_context: "환경",
        },
        category: "장애대응",
        status: "draft",
        confluence_url: "",
        created_at: "2026-06-14T13:00:00Z",
        updated_at: "2026-06-14T13:00:00Z",
      },
      form,
      "transcription-1",
    );

    expect(asset.id).toBe("report-1");
    expect(asset.transcriptionId).toBe("transcription-1");
    expect(asset.domain).toBe("incident");
    expect(asset.meta.incidentId).toBe("INC-1");
    expect(asset.five.solution).toBe("해결");
  });

  it("loads the signed-in user's asset history", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          counts: { all: 0, processing: 0, draft: 0, deleting: 0, completed: 0, failed: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await fetchAssetHistory();

    expect(response.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/assets"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("maps processing history without a report", () => {
    const asset = mapAssetHistoryItem({
      asset_id: "transcription-1",
      transcription_id: "transcription-1",
      report_id: null,
      title: "장애 대응 회의",
      category: "장애대응",
      status: "processing",
      workflow_status: "transcribing",
      confluence_url: "",
      created_at: "2026-06-21T09:00:00Z",
      updated_at: "2026-06-21T09:05:00Z",
      source: {
        filename: "incident.m4a",
        content_type: "audio/mp4",
        size_bytes: 1048576,
      },
      progress: {
        total_chunks: 10,
        completed_chunks: 4,
        failed_chunks: 0,
        percent: 40,
      },
      report: null,
    });

    expect(asset.status).toBe("processing");
    expect(asset.transcriptionId).toBe("transcription-1");
    expect(asset.progress?.percent).toBe(40);
    expect(asset.five).toEqual({
      situation: "",
      cause: "",
      evidence: "",
      solution: "",
      infra_context: "",
    });
  });

  it("requests permanent deletion by transcription id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ transcription_id: "transcription-1", status: "deleting" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await deleteAsset("transcription-1");

    expect(response.status).toBe("deleting");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/assets/transcription-1"),
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });
});
