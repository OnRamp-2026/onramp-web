import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AssetReport, FiveElements, UploadForm } from "@/types";
import { ASSET_MOCK_ENABLED, MOCK_ASSETS, generateDraft, saveAsset, approveAsset } from "@/api/assets";

export const useAssetsStore = defineStore("assets", () => {
  const list = ref<AssetReport[]>(ASSET_MOCK_ENABLED ? [...MOCK_ASSETS] : []);
  const activeId = ref<string | null>(null);
  const composing = ref(true); // 기본 진입 = 업로드 화면 (단계 1)

  const generating = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const generationStatus = ref("");
  const generationError = ref("");

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

  /** UC-08 — 업로드 → 5요소 초안 생성 */
  async function createFromUpload(form: UploadForm) {
    if (generating.value) return;
    generating.value = true;
    generationStatus.value = "업로드 준비 중";
    generationError.value = "";
    try {
      const draft = await generateDraft(form, (message) => {
        generationStatus.value = message;
      });
      list.value.unshift(draft);
      activeId.value = draft.id;
      composing.value = false;
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
    if (!a || a.status === "published") return;
    a.five[key] = value;
    a.edited[key] = true;
    if (a.status === "draft") a.status = "review";
  }

  function setTitle(title: string) {
    const a = active.value;
    if (a && a.status !== "published") a.title = title;
  }

  async function save() {
    const a = active.value;
    if (!a || saving.value || a.status === "published") return;
    saving.value = true;
    try {
      Object.assign(a, await saveAsset(a));
    } finally {
      saving.value = false;
    }
  }

  async function publish() {
    const a = active.value;
    if (!a || publishing.value || a.status === "published") return;
    publishing.value = true;
    try {
      Object.assign(a, await approveAsset(a));
    } finally {
      publishing.value = false;
    }
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
    return active.value.status === "published" ? 4 : 3;
  });

  return {
    list,
    activeId,
    composing,
    generating,
    saving,
    publishing,
    generationStatus,
    generationError,
    active,
    completeness,
    currentStep,
    select,
    startNew,
    createFromUpload,
    editField,
    setTitle,
    save,
    publish,
  };
});
