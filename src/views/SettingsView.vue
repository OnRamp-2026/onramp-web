<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  createIngestionRun,
  getCurrentIngestionRun,
  isIngestionConflict,
  listIngestionRuns,
  type IngestionMode,
  type IngestionRun,
} from "@/api/ingestion";

const active = ref<IngestionRun | null>(null);
const history = ref<IngestionRun[]>([]);
const loading = ref(true);
const submitting = ref(false);
const message = ref("");
let timer: ReturnType<typeof setInterval> | undefined;

const isRunning = computed(() => active.value?.status === "queued" || active.value?.status === "running");
const progress = computed(() => {
  const run = active.value;
  if (!run?.pages_discovered) return 0;
  return Math.min(100, Math.round((run.pages_processed / run.pages_discovered) * 100));
});

function modeLabel(mode: IngestionMode) {
  return mode === "full_scan" ? "전체 문서 확인" : "최근 24시간 수집";
}

function statusLabel(run: IngestionRun) {
  if (run.status === "queued") return "대기 중";
  if (run.status === "running") return run.stage === "fetching" ? "페이지 조회 중" : "수집 중";
  if (run.status === "success") return "완료";
  return "실패";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function refresh() {
  try {
    const [current, runs] = await Promise.all([getCurrentIngestionRun(), listIngestionRuns()]);
    active.value = current;
    history.value = runs;
  } catch {
    message.value = "수집 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  } finally {
    loading.value = false;
  }
}

async function start(mode: IngestionMode) {
  submitting.value = true;
  message.value = "";
  try {
    active.value = await createIngestionRun(mode);
    await refresh();
  } catch (error) {
    if (isIngestionConflict(error)) {
      message.value = "이미 실행 중인 수집 작업을 표시합니다.";
      await refresh();
    } else {
      message.value = error instanceof Error ? error.message : "수집 작업을 시작하지 못했습니다.";
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await refresh();
  timer = setInterval(refresh, 2000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-4xl mx-auto">
      <header class="mb-6">
        <p class="font-mono text-[11px] tracking-[0.12em] uppercase text-teal">Knowledge Operations</p>
        <h1 class="font-geo text-2xl font-semibold text-navy mt-1">설정</h1>
        <p class="text-sm text-slate mt-1">Confluence 지식 수집 실행과 최근 처리 결과를 관리합니다.</p>
      </header>

      <section class="bg-surface border border-line rounded-2xl p-6 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-geo text-lg font-semibold text-navy">지식 수집</h2>
            <p class="text-sm text-slate mt-1">자동 수집은 매일 오전 2시(KST), 최근 24시간 변경분을 확인합니다.</p>
          </div>
          <span class="font-mono text-[10px] text-teal bg-teal/10 rounded-full px-3 py-1.5">NEXT 02:00 KST</span>
        </div>

        <div class="flex flex-wrap gap-3 mt-5">
          <button
            class="bg-grad text-white text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-45 disabled:cursor-not-allowed"
            :disabled="loading || submitting || isRunning"
            @click="start('incremental')"
          >
            최근 24시간 수집
          </button>
          <button
            class="border border-line2 bg-white text-navy text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-surf2 disabled:opacity-45 disabled:cursor-not-allowed"
            :disabled="loading || submitting || isRunning"
            @click="start('full_scan')"
          >
            전체 문서 확인
          </button>
        </div>

        <p v-if="message" class="text-sm text-slate mt-4">{{ message }}</p>

        <div v-if="active" class="mt-6 bg-surf2 border border-line rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-semibold text-navy">{{ modeLabel(active.mode) }}</span>
              <span class="ml-2 text-xs text-teal">{{ statusLabel(active) }}</span>
            </div>
            <span v-if="active.pages_discovered" class="font-mono text-xs text-slate">{{ progress }}%</span>
          </div>

          <div class="h-2 rounded-full bg-navy/[0.07] overflow-hidden mt-3">
            <div
              class="h-full bg-grad rounded-full transition-all duration-500"
              :class="{ 'w-1/3 animate-pulse': !active.pages_discovered }"
              :style="active.pages_discovered ? { width: `${progress}%` } : undefined"
            />
          </div>

          <p class="text-sm text-slate mt-3">
            <template v-if="active.pages_discovered">
              {{ active.pages_processed }} / {{ active.pages_discovered }} 페이지 처리
            </template>
            <template v-else>Confluence 페이지를 조회하고 있습니다.</template>
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div class="rounded-lg bg-white border border-line p-3">
              <div class="font-mono text-lg text-navy">{{ active.pages_indexed }}</div>
              <div class="text-xs text-faint">신규·변경</div>
            </div>
            <div class="rounded-lg bg-white border border-line p-3">
              <div class="font-mono text-lg text-navy">{{ active.pages_skipped }}</div>
              <div class="text-xs text-faint">중복 건너뜀</div>
            </div>
            <div class="rounded-lg bg-white border border-line p-3">
              <div class="font-mono text-lg text-navy">{{ active.pages_failed }}</div>
              <div class="text-xs text-faint">실패</div>
            </div>
            <div class="rounded-lg bg-white border border-line p-3">
              <div class="font-mono text-lg text-navy">{{ active.chunks_indexed }}</div>
              <div class="text-xs text-faint">적재 청크</div>
            </div>
          </div>
          <p v-if="active.error_message" class="mt-3 text-sm text-[#b3344a]">{{ active.error_message }}</p>
        </div>
      </section>

      <section class="mt-6 bg-surface border border-line rounded-2xl p-6 shadow-sm">
        <h2 class="font-geo text-lg font-semibold text-navy">최근 실행</h2>
        <div v-if="!history.length" class="text-sm text-faint mt-4">아직 실행 이력이 없습니다.</div>
        <div v-else class="divide-y divide-line mt-3">
          <div v-for="run in history" :key="run.run_id" class="py-3 flex items-center gap-4">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-navy">{{ modeLabel(run.mode) }}</div>
              <div class="text-xs text-faint mt-0.5">
                {{ dateLabel(run.started_at) }} · {{ run.trigger === "cron" ? "자동" : "수동" }}
              </div>
            </div>
            <div class="text-right">
              <div :class="run.status === 'failed' ? 'text-[#b3344a]' : 'text-teal'" class="text-xs font-semibold">
                {{ statusLabel(run) }}
              </div>
              <div class="font-mono text-[10px] text-faint mt-1">
                변경 {{ run.pages_indexed }} · 중복 {{ run.pages_skipped }} · 실패 {{ run.pages_failed }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
