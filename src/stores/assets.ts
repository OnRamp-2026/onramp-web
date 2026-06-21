import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AssetReport, FiveElements, UploadForm } from "@/types";
import {
  ASSET_MOCK_ENABLED,
  MOCK_ASSETS,
  approveAsset,
  deleteAsset,
  generateDraft,
  listAssets,
  saveAsset,
} from "@/api/assets";

export const useAssetsStore = defineStore("assets", () => {
  const list = ref<AssetReport[]>(ASSET_MOCK_ENABLED ? [...MOCK_ASSETS] : []);
  const activeId = ref<string | null>(null);
  const composing = ref(true); // 기본 진입 = 업로드 화면 (단계 1)

  const generating = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const deletionError = ref("");
  const generationStatus = ref("");
  const generationError = ref("");
  const historyLoading = ref(false);
  const historyError = ref("");

  const active = computed(() => list.value.find((a) => a.id === activeId.value) ?? null);

  const select = (id: string) => {
    activeId.value = id;
    composing.value = false;
  };
  const startNew = () => {
    composing.value = true;
    activeId.value = null;
    generationStatus.value = "";
    generationError.value = "";
  };

  async function loadHistory() {
    if (historyLoading.value) return;
    historyLoading.value = true;
    historyError.value = "";
    try {
      const history = await listAssets();
      list.value = history.items;
    } catch (error) {
      historyError.value = error instanceof Error ? error.message : "자산화 이력을 불러오지 못했습니다";
    } finally {
      historyLoading.value = false;
    }
  }

  /** UC-08 — 업로드 → 5요소 초안 생성 */
  async function createFromUpload(form: UploadForm) {
    if (generating.value) return;
    generating.value = true;
    generationStatus.value = "업로드 준비 중";
    generationError.value = "";
    try {
      const shouldOpenDraft = composing.value && activeId.value === null;
      const draft = await generateDraft(form, (message) => {
        generationStatus.value = message;
      });
      const existingIndex = list.value.findIndex((asset) => asset.transcriptionId === draft.transcriptionId);
      if (existingIndex >= 0) {
        list.value.splice(existingIndex, 1, draft);
      } else {
        list.value.unshift(draft);
      }
      if (shouldOpenDraft && composing.value && activeId.value === null) {
        activeId.value = draft.id;
        composing.value = false;
      }
      generationStatus.value = "";
    } catch (error) {
      generationError.value = error instanceof Error ? error.message : "보고서 생성에 실패했습니다";
    } finally {
      generating.value = false;
    }
  }

  /** HITL 인라인 수정 — 첫 수정 시 draft→review 승격, published는 잠금 */
  function editField(key: keyof FiveElements, value: string) {
    const a = active.value;
    if (!a || !["draft", "review"].includes(a.status)) return;
    a.five[key] = value;
    a.edited[key] = true;
    if (a.status === "draft") a.status = "review";
  }

  function setTitle(title: string) {
    const a = active.value;
    if (a && ["draft", "review"].includes(a.status)) a.title = title;
  }

  async function save() {
    const a = active.value;
    if (!a || saving.value || !["draft", "review"].includes(a.status)) return;
    saving.value = true;
    try {
      Object.assign(a, await saveAsset(a));
    } finally {
      saving.value = false;
    }
  }

  async function publish() {
    const a = active.value;
    if (!a || publishing.value || !["draft", "review"].includes(a.status)) return;
    publishing.value = true;
    try {
      Object.assign(a, await approveAsset(a));
    } finally {
      publishing.value = false;
    }
  }

  async function removeDraft(asset: AssetReport) {
    if (!["draft", "review"].includes(asset.status)) return;
    deletionError.value = "";
    try {
      await deleteAsset(asset.transcriptionId);
      asset.status = "deleting";
      asset.workflowStatus = "deleting";
      scheduleDeletionRefresh(asset.transcriptionId);
    } catch (error) {
      deletionError.value = error instanceof Error ? error.message : "초안을 삭제하지 못했습니다";
    }
  }

  function scheduleDeletionRefresh(transcriptionId: string, attempt = 0) {
    if (attempt >= 60) return;
    globalThis.setTimeout(async () => {
      try {
        const wasActive = active.value?.transcriptionId === transcriptionId;
        const history = await listAssets();
        list.value = history.items;
        if (history.items.some((asset) => asset.transcriptionId === transcriptionId)) {
          scheduleDeletionRefresh(transcriptionId, attempt + 1);
        } else if (wasActive) {
          startNew();
        }
      } catch {
        scheduleDeletionRefresh(transcriptionId, attempt + 1);
      }
    }, 2000);
  }

  /** 작성된 5요소 개수 (완성도 미터) */
  const completeness = computed(() => {
    const a = active.value;
    if (!a) return 0;
    return (Object.values(a.five) as string[]).filter((v) => v.trim().length > 0).length;
  });

  /** 4단계 흐름 중 현재 단계 (1 업로드 · 2 생성 · 3 HITL · 4 등록) */
  const currentStep = computed(() => {
    if (generating.value) return 2;
    if (composing.value || !active.value) return 1;
    if (["processing", "deleting", "failed"].includes(active.value.status)) return 2;
    return active.value.status === "published" ? 4 : 3;
  });

  return {
    list,
    activeId,
    composing,
    generating,
    saving,
    publishing,
    deletionError,
    generationStatus,
    generationError,
    historyLoading,
    historyError,
    active,
    completeness,
    currentStep,
    select,
    startNew,
    loadHistory,
    createFromUpload,
    editField,
    setTitle,
    save,
    publish,
    removeDraft,
  };
});
