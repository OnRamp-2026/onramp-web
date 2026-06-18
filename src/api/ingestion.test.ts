import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIngestionRun,
  getCurrentIngestionRun,
  isIngestionConflict,
  listIngestionRuns,
} from "@/api/ingestion";
import { HttpError } from "@/api/http";

afterEach(() => vi.restoreAllMocks());

describe("ingestion API", () => {
  it("creates a recent ingestion run", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ run_id: "run-1", mode: "incremental" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createIngestionRun("incremental");

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/ingestion/runs",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ mode: "incremental" }) }),
    );
  });

  it("reads current and recent runs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(null), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ runs: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    expect(await getCurrentIngestionRun()).toBeNull();
    expect(await listIngestionRuns()).toEqual([]);
  });

  it("recognizes an active-run conflict", () => {
    expect(isIngestionConflict(new HttpError("conflict", 409))).toBe(true);
  });
});
