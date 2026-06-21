<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAssetsStore } from "@/stores/assets";
import { ELEMENTS } from "@/api/assets";
import AssetField from "@/components/assets/AssetField.vue";
import UploadEntry from "@/components/assets/UploadEntry.vue";
import FlowStepper from "@/components/assets/FlowStepper.vue";
import type { AssetStatus, Severity } from "@/types";
import { DOMAIN_LABEL } from "@/types";

const store = useAssetsStore();

// 제목 input 자동 포커스
const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const STATUS: Record<AssetStatus, { label: string; dot: string; soft: string }> = {
  processing: { label: "처리중", dot: "bg-blue", soft: "bg-blue/10 text-[#1668b3]" },
  draft: { label: "초안", dot: "bg-faint", soft: "bg-navy/[0.05] text-slate" },
  review: { label: "검토 중", dot: "bg-blue", soft: "bg-blue/10 text-[#1668b3]" },
  published: { label: "완료", dot: "bg-ok", soft: "bg-teal/10 text-[#0f9c84]" },
  failed: { label: "실패", dot: "bg-[#d4495f]", soft: "bg-[#fdecef] text-[#d4495f]" },
};

const SEV: Record<Severity, { label: string; cls: string }> = {
  P1: { label: "P1 · 긴급", cls: "bg-[#fdecef] text-[#d4495f]" },
  P2: { label: "P2 · 높음", cls: "bg-[#fff3e3] text-[#b76e00]" },
  P3: { label: "P3 · 보통", cls: "bg-navy/[0.05] text-slate" },
};

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "draft", label: "초안" },
  { key: "processing", label: "처리중" },
  { key: "published", label: "완료" },
] as const;
const filter = ref<(typeof FILTERS)[number]["key"]>("all");
const filtered = computed(() => {
  if (filter.value === "all") return store.list;
  if (filter.value === "draft") return store.list.filter((a) => a.status === "draft" || a.status === "review");
  return store.list.filter((a) => a.status === filter.value);
});
const counts = computed(() => ({
  all: store.list.length,
  draft: store.list.filter((a) => a.status === "draft" || a.status === "review").length,
  processing: store.list.filter((a) => a.status === "processing").length,
  published: store.list.filter((a) => a.status === "published").length,
}));

// 제목 인라인 편집
const editingTitle = ref(false);
const titleDraft = ref("");
function openTitle() {
  if (!store.active || !["draft", "review"].includes(store.active.status)) return;
  titleDraft.value = store.active?.title ?? "";
  editingTitle.value = true;
}
function commitTitle() {
  editingTitle.value = false;
  if (titleDraft.value.trim()) store.setTitle(titleDraft.value.trim());
}

const sourceOpen = ref(true);

const confirmPublish = ref(false);
watch(
  () => store.activeId,
  () => {
    confirmPublish.value = false;
    editingTitle.value = false;
  },
);
async function doPublish() {
  await store.publish();
  confirmPublish.value = false;
}

onMounted(() => {
  void store.loadHistory();
});
</script>

<template>
  <main class="flex h-screen flex-1 overflow-hidden">
    <!-- ───────── 좌측: 자산화 큐 ───────── -->
    <section class="w-[268px] shrink-0 border-r border-line bg-surf2 flex flex-col">
      <div class="px-4 pt-5 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-[15px]">⭐</span>
          <h1 class="font-geo text-base font-semibold text-navy">베테랑 경험치 자산화</h1>
        </div>
        <p class="text-[11.5px] text-faint mt-1 leading-snug">회의 녹취 → 5요소 보고서 → Confluence 등록</p>
        <button
          class="mt-3 flex items-center justify-center gap-2 w-full bg-grad text-white font-semibold text-[13px] px-3 py-2.5 rounded-xl shadow-[0_8px_20px_-10px_#2bb8c7] hover:-translate-y-px transition"
          :class="store.composing ? 'ring-2 ring-teal/40' : ''"
          @click="store.startNew()"
        >
          <span class="text-[15px] leading-none">＋</span> 새 자산화
        </button>
      </div>

      <div class="flex gap-1 px-4 pb-2.5">
        <button
          v-for="f in FILTERS"
          :key="f.key"
          class="font-mono text-[10.5px] px-2 py-1 rounded-full border transition"
          :class="
            filter === f.key
              ? 'border-navy/15 bg-navy/[0.06] text-ink font-medium'
              : 'border-transparent text-faint hover:text-slate'
          "
          @click="filter = f.key"
        >
          {{ f.label }} {{ counts[f.key] }}
        </button>
      </div>

      <div class="flex-1 overflow-auto px-2.5 pb-3 flex flex-col gap-1">
        <p v-if="store.historyLoading" class="text-center text-[12px] text-faint py-4">이력을 불러오는 중입니다</p>
        <p v-else-if="store.historyError" class="mx-2 mb-2 text-[11px] text-[#d4495f]">
          {{ store.historyError }}
        </p>
        <button
          v-for="a in filtered"
          :key="a.id"
          class="text-left px-3 py-2.5 rounded-xl border transition"
          :class="
            a.id === store.activeId && !store.composing
              ? 'border-blue/30 bg-blue/[0.06] shadow-[0_6px_16px_-12px_#3e9be9]'
              : 'border-transparent hover:bg-navy/[0.03]'
          "
          @click="store.select(a.id)"
        >
          <div class="flex items-center gap-1.5">
            <span class="w-[7px] h-[7px] rounded-full shrink-0" :class="STATUS[a.status].dot"></span>
            <span class="font-mono text-[10px] text-teal">[{{ DOMAIN_LABEL[a.domain] }}]</span>
            <span class="ml-auto font-mono text-[10px] text-faint">{{ a.createdAt }}</span>
          </div>
          <div class="text-[13px] font-medium text-ink mt-1 leading-snug line-clamp-2">{{ a.title }}</div>
          <div class="flex items-center gap-1.5 mt-1.5">
            <span class="font-mono text-[9.5px] px-1.5 py-px rounded-full" :class="STATUS[a.status].soft">{{
              STATUS[a.status].label
            }}</span>
            <span class="font-mono text-[9.5px] text-faint">{{ a.id }}</span>
          </div>
        </button>
        <p v-if="!filtered.length" class="text-center text-[12px] text-faint py-8">해당 상태의 자산이 없습니다</p>
      </div>
    </section>

    <!-- ───────── 우측 ───────── -->
    <section class="flex-1 flex flex-col overflow-hidden">
      <!-- 단계 1·2: 업로드 진입 -->
      <UploadEntry v-if="store.composing || store.generating" />

      <!-- 빈 상태 -->
      <div v-else-if="!store.active" class="flex-1 grid place-items-center">
        <div class="text-center">
          <div class="text-3xl mb-3">⭐</div>
          <div class="font-geo text-lg font-semibold text-navy">자산을 선택하세요</div>
          <p class="text-sm text-faint mt-1">왼쪽 큐에서 항목을 고르거나 새 자산화를 시작하세요.</p>
        </div>
      </div>

      <!-- 서버 처리 상태 -->
      <div
        v-else-if="store.active.status === 'processing' || store.active.status === 'failed'"
        class="flex-1 grid place-items-center bg-surf2/50 px-8"
      >
        <div
          class="w-full max-w-[560px] bg-white border border-line rounded-2xl p-6 shadow-[0_18px_50px_-36px_#16213e66]"
        >
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :class="STATUS[store.active.status].dot"></span>
            <span class="font-mono text-[11px]" :class="STATUS[store.active.status].soft">
              {{ STATUS[store.active.status].label }}
            </span>
          </div>
          <h2 class="font-geo text-xl font-semibold text-navy mt-3">{{ store.active.title }}</h2>
          <p class="text-sm text-slate mt-2">
            {{
              store.active.status === "failed"
                ? "STT 또는 보고서 생성 중 오류가 발생했습니다."
                : "STT 전사와 5요소 보고서 생성을 진행하고 있습니다."
            }}
          </p>
          <div class="mt-5">
            <div class="flex justify-between font-mono text-[11px] text-faint mb-2">
              <span>{{ store.active.workflowStatus }}</span>
              <span>{{ store.active.progress?.percent ?? 0 }}%</span>
            </div>
            <div class="h-2 rounded-full bg-navy/[0.07] overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="store.active.status === 'failed' ? 'bg-[#d4495f]' : 'bg-grad'"
                :style="{ width: `${store.active.progress?.percent ?? 0}%` }"
              ></div>
            </div>
          </div>
          <div class="mt-5 pt-4 border-t border-line flex items-center justify-between">
            <span class="font-mono text-[10.5px] text-faint">{{ store.active.source.title }}</span>
            <button
              class="text-[12px] px-3 py-2 rounded-xl border border-line2 text-slate hover:text-ink"
              @click="store.loadHistory()"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      <!-- 단계 3·4: HITL 에디터 -->
      <template v-else>
        <header class="flex items-start gap-3 px-[30px] py-3.5 border-b border-line bg-white/80 backdrop-blur z-10">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="font-mono text-[11px] px-2 py-[3px] rounded-full flex items-center gap-1.5"
                :class="STATUS[store.active.status].soft"
              >
                <span class="w-[6px] h-[6px] rounded-full" :class="STATUS[store.active.status].dot"></span>
                {{ STATUS[store.active.status].label }}
              </span>
              <span class="font-mono text-[11px] px-2 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]">{{
                DOMAIN_LABEL[store.active.domain]
              }}</span>
              <span class="font-mono text-[11px] text-faint">{{ store.active.id }} · {{ store.active.space }}</span>
            </div>
            <input
              v-if="editingTitle"
              v-model="titleDraft"
              v-focus
              class="w-full font-geo text-lg font-semibold text-navy bg-surf2 border border-blue/40 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue/15"
              @keydown.enter.prevent="commitTitle"
              @keydown.esc="editingTitle = false"
              @blur="commitTitle"
            />
            <h2
              v-else
              class="font-geo text-lg font-semibold text-navy truncate"
              :class="['draft', 'review'].includes(store.active.status) ? 'cursor-text hover:text-ink/80' : ''"
              :title="['draft', 'review'].includes(store.active.status) ? '클릭해 제목 수정' : ''"
              @click="openTitle"
            >
              {{ store.active.title }}
            </h2>
          </div>

          <div class="shrink-0 text-right">
            <div class="font-mono text-[10px] text-faint mb-1">완성도 {{ store.completeness }}/5</div>
            <div class="flex gap-1 justify-end">
              <span
                v-for="i in 5"
                :key="i"
                class="w-5 h-1.5 rounded-full transition"
                :class="i <= store.completeness ? 'bg-teal' : 'bg-navy/[0.08]'"
              ></span>
            </div>
            <div class="font-mono text-[10px] text-faint mt-1.5">{{ store.active.drafter }}</div>
          </div>
        </header>

        <!-- 메타데이터 + 단계 스테퍼 바 -->
        <div class="px-[30px] py-2.5 border-b border-line bg-surf2/70 flex items-center gap-x-4 gap-y-1.5 flex-wrap">
          <span class="font-mono text-[11px] text-slate flex items-center gap-1.5">
            <span class="text-faint">🆔</span>{{ store.active.meta.incidentId }}
          </span>
          <span class="font-mono text-[11px] text-slate flex items-center gap-1.5">
            <span class="text-faint">👤</span>{{ store.active.meta.author }}
          </span>
          <span class="font-mono text-[11px] text-slate flex items-center gap-1.5">
            <span class="text-faint">🕘</span>{{ store.active.meta.occurredAt }}
          </span>
          <span
            class="font-mono text-[10.5px] px-2 py-[3px] rounded-full"
            :class="SEV[store.active.meta.severity].cls"
            >{{ SEV[store.active.meta.severity].label }}</span
          >
          <span class="flex-1"></span>
          <FlowStepper :current="store.currentStep" compact />
        </div>

        <div class="flex-1 overflow-auto">
          <div class="max-w-[860px] mx-auto px-[30px] py-6 flex flex-col gap-4">
            <div
              v-if="store.active.status === 'published'"
              class="flex items-center gap-3 bg-teal/[0.07] border border-teal/25 rounded-xl px-4 py-3 rise"
            >
              <span class="text-lg">✓</span>
              <div class="flex-1 min-w-0">
                <div class="text-[13.5px] font-semibold text-[#0f7d6a]">Confluence에 등록됨</div>
                <a
                  :href="store.active.confluenceUrl"
                  target="_blank"
                  class="font-mono text-[11px] text-[#0f9c84] hover:underline break-all"
                  >{{ store.active.confluenceUrl }}</a
                >
              </div>
              <span class="font-mono text-[10.5px] text-[#0f9c84] shrink-0">🔒 수정 잠금</span>
            </div>

            <!-- 출처(추적성) -->
            <div class="bg-surface border border-line rounded-xl overflow-hidden">
              <button
                class="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-navy/[0.02] transition"
                @click="sourceOpen = !sourceOpen"
              >
                <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-navy/[0.06] text-slate">{{
                  store.active.source.kind === "transcript" ? "녹취" : "대화"
                }}</span>
                <span class="text-[13px] font-medium text-ink truncate">{{ store.active.source.title }}</span>
                <span class="font-mono text-[10.5px] text-faint hidden sm:inline">{{ store.active.source.meta }}</span>
                <span class="ml-auto text-faint text-xs transition" :class="sourceOpen ? 'rotate-90' : ''">▸</span>
              </button>
              <div v-if="sourceOpen" class="px-4 pb-3.5 -mt-0.5">
                <p
                  class="text-[12.5px] leading-[1.65] text-slate whitespace-pre-wrap border-l-2 border-line2 pl-3 italic"
                >
                  {{ store.active.source.excerpt }}
                </p>
              </div>
            </div>

            <!-- 5요소 에디터 -->
            <div>
              <div class="flex items-center gap-2 mb-2 px-0.5">
                <span class="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">5요소 보고서</span>
                <span class="text-[11px] text-faint">— 각 항목을 클릭해 검수·수정</span>
              </div>
              <div
                class="bg-surface border border-line rounded-[14px] overflow-hidden shadow-[0_14px_34px_-26px_#16213e55]"
              >
                <AssetField
                  v-for="el in ELEMENTS"
                  :key="el.key"
                  :num="el.num"
                  :label="el.label"
                  :hint="el.hint"
                  :value="store.active.five[el.key]"
                  :edited="store.active.edited[el.key]"
                  :locked="store.active.status === 'published'"
                  @update="store.editField(el.key, $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 액션 바 -->
        <footer class="border-t border-line bg-white/85 backdrop-blur px-[30px] py-3 flex items-center gap-3">
          <span class="font-mono text-[11px] text-faint">
            <template v-if="store.active.status === 'published'">등록 완료 · 수정하려면 새 버전을 만드세요</template>
            <template v-else>HITL 검수 후 Confluence에 등록됩니다</template>
          </span>
          <span class="flex-1"></span>

          <template v-if="store.active.status !== 'published'">
            <button
              class="flex items-center gap-1.5 text-[13px] px-3.5 py-2 rounded-xl border border-line2 text-slate hover:border-navy/30 hover:text-ink disabled:opacity-40 transition"
              :disabled="store.saving"
              @click="store.save()"
            >
              <span
                v-if="store.saving"
                class="w-3 h-3 rounded-full border-2 border-slate/30 border-t-slate animate-spin"
              ></span>
              임시 저장
            </button>

            <div v-if="confirmPublish" class="flex items-center gap-2 rise">
              <span class="text-[12px] text-slate">등록하면 수정 불가.</span>
              <button
                class="flex items-center gap-1.5 bg-grad text-white font-semibold text-[13px] px-4 py-2 rounded-xl shadow-[0_8px_20px_-10px_#2bb8c7] disabled:opacity-50"
                :disabled="store.publishing"
                @click="doPublish"
              >
                <span
                  v-if="store.publishing"
                  class="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                ></span>
                {{ store.publishing ? "등록 중…" : "확인, 등록" }}
              </button>
              <button
                class="text-[12px] px-2.5 py-2 rounded-xl text-slate hover:bg-navy/5"
                @click="confirmPublish = false"
              >
                취소
              </button>
            </div>
            <button
              v-else
              class="flex items-center gap-1.5 bg-grad text-white font-semibold text-[13px] px-4 py-2 rounded-xl shadow-[0_8px_20px_-10px_#2bb8c7] hover:-translate-y-px transition"
              @click="confirmPublish = true"
            >
              ⤴ Confluence 등록
            </button>
          </template>

          <a
            v-else
            :href="store.active.confluenceUrl"
            target="_blank"
            class="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-xl border border-teal/30 text-[#0f9c84] hover:bg-teal/5 transition"
          >
            ↗ Confluence에서 보기
          </a>
        </footer>
      </template>
    </section>
  </main>
</template>
