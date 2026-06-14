<script setup lang="ts">
import { ref, computed } from "vue";
import { useAssetsStore } from "@/stores/assets";
import { DOMAINS, SEVERITIES } from "@/api/assets";
import FlowStepper from "@/components/assets/FlowStepper.vue";
import type { Domain, Severity, UploadForm } from "@/types";
import { DOMAIN_LABEL } from "@/types";

const store = useAssetsStore();

// 파일 (음성 녹취)
const AUDIO_RE = /\.(wav|mp3|m4a|webm|flac|ogg|aac)$/i;
const MAX_BYTES = 100 * 1024 * 1024; // 100MB
const fileName = ref("");
const fileSize = ref(0);
const file = ref<File | null>(null);
const fileError = ref("");
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const hasFile = computed(() => !!fileName.value && !fileError.value);

// 메타데이터
const incidentId = ref("");
const author = ref("");
const occurredAt = ref("");
const domain = ref<Domain>("incident");
const severity = ref<Severity>("P1");

function pick() {
  fileInput.value?.click();
}
function handleFiles(files: FileList | null) {
  const f = files?.[0];
  if (!f) return;
  fileError.value = "";
  if (!AUDIO_RE.test(f.name) && !f.type.startsWith("audio/")) {
    fileError.value = "wav · mp3 · m4a 등 음성 파일만 업로드할 수 있습니다";
    return;
  }
  if (f.size > MAX_BYTES) {
    fileError.value = "최대 100MB까지 업로드할 수 있습니다 (긴 녹취는 mp3·m4a 압축 권장)";
    return;
  }
  // 음성은 텍스트로 읽지 않고 파일 객체를 보관 → 업로드(실연동 시 multipart)
  file.value = f;
  fileName.value = f.name;
  fileSize.value = f.size;
  // 파일명으로 장애 ID 힌트 자동 채움
  if (!incidentId.value) {
    const m = f.name.match(/[A-Za-z]+-\d{4}-\d{2,4}[-\w]*/);
    if (m) incidentId.value = m[0].toUpperCase();
  }
}
function onDrop(e: DragEvent) {
  dragging.value = false;
  handleFiles(e.dataTransfer?.files ?? null);
}
function clearFile() {
  fileName.value = "";
  fileSize.value = 0;
  file.value = null;
  fileError.value = "";
}

const canSubmit = computed(() => hasFile.value && incidentId.value.trim() && author.value.trim() && !store.generating);

function submit() {
  if (!canSubmit.value) return;
  const form: UploadForm = {
    fileName: fileName.value,
    fileSize: fileSize.value,
    file: file.value,
    incidentId: incidentId.value.trim(),
    author: author.value.trim(),
    occurredAt: occurredAt.value.trim() || "—",
    domain: domain.value,
    severity: severity.value,
  };
  store.createFromUpload(form);
}

const fieldCls =
  "w-full bg-surf2 border border-line rounded-lg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/15 transition placeholder:text-faint";
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div class="max-w-[1040px] mx-auto px-[34px] py-8">
      <!-- 타이틀 -->
      <div class="mb-6 rise">
        <h1 class="font-geo text-[26px] font-bold text-navy tracking-tight">회의 녹취 파일을 업로드하세요</h1>
        <p class="text-[14px] text-slate mt-1.5">
          회의실 토론 내용이 자동으로 <b class="text-ink">5요소 보고서</b>가 되어 Confluence에 등록됩니다.
        </p>
      </div>

      <!-- 2열: 드롭존 + 메타데이터 -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5 items-start">
        <!-- 드롭존 -->
        <div>
          <div
            class="relative rounded-2xl border-2 border-dashed transition px-6 py-11 text-center"
            :class="
              dragging
                ? 'border-teal bg-teal/[0.06] scale-[1.005]'
                : hasFile
                  ? 'border-teal/40 bg-teal/[0.03]'
                  : 'border-line2 bg-surf2 hover:border-blue/40 hover:bg-blue/[0.02]'
            "
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.flac,.ogg,.aac"
              class="hidden"
              @change="handleFiles(($event.target as HTMLInputElement).files)"
            />

            <div
              class="w-14 h-14 mx-auto mb-4 rounded-2xl grid place-items-center text-2xl transition"
              :class="hasFile ? 'bg-teal/15' : 'bg-navy/[0.05]'"
            >
              {{ hasFile ? "🎙" : "🗂" }}
            </div>
            <div class="font-geo text-[16px] font-semibold text-navy">
              {{ dragging ? "여기에 놓으세요" : "파일을 여기로 끌어다 놓으세요" }}
            </div>
            <div class="text-[12px] text-faint my-3">또는</div>
            <button
              class="inline-flex items-center gap-2 bg-grad text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_8px_20px_-10px_#2bb8c7] hover:-translate-y-px transition"
              @click="pick"
            >
              📁 파일 선택
            </button>
            <div class="font-mono text-[11px] text-faint mt-4">wav · mp3 · m4a · webm · 최대 100MB</div>
            <div class="font-mono text-[11px] text-blue/80 mt-1">업로드 후 STT 전사 → 5요소 보고서 자동 생성</div>
          </div>

          <!-- 검증 에러 -->
          <p v-if="fileError" class="mt-2.5 text-[12.5px] text-[#d4495f] flex items-center gap-1.5">
            <span>⚠</span> {{ fileError }}
          </p>

          <!-- 업로드된 파일 칩 -->
          <div
            v-if="hasFile"
            class="mt-3 flex items-center gap-3 bg-surface border border-line rounded-xl px-3.5 py-2.5 rise"
          >
            <span class="text-base">📎</span>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-medium text-ink truncate">{{ fileName }}</div>
              <div class="font-mono text-[10.5px] text-faint">
                {{ (fileSize / 1024 / 1024).toFixed(1) }} MB · 녹취 음성
              </div>
            </div>
            <span class="font-mono text-[11px] text-[#0f9c84] flex items-center gap-1 shrink-0">✓ 검증 OK</span>
            <button class="text-faint hover:text-ink text-lg leading-none shrink-0" @click="clearFile">×</button>
          </div>
        </div>

        <!-- 메타데이터 -->
        <div class="bg-surface border border-line rounded-2xl p-5 shadow-[0_18px_44px_-34px_#16213e]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[15px]">🏷</span>
            <h2 class="font-geo text-[15px] font-semibold text-navy">메타데이터</h2>
          </div>
          <p class="text-[11.5px] text-faint mb-4">검색·필터링에 사용됩니다</p>

          <div class="flex flex-col gap-3.5">
            <div>
              <label class="block text-[12px] font-medium text-slate mb-1.5"
                >장애 ID <span class="text-blue">*</span></label
              >
              <input v-model="incidentId" :class="fieldCls" placeholder="INC-2026-0521-EKS" />
            </div>
            <div>
              <label class="block text-[12px] font-medium text-slate mb-1.5"
                >작성자 <span class="text-blue">*</span></label
              >
              <input v-model="author" :class="fieldCls" placeholder="김인프라" />
            </div>
            <div>
              <label class="block text-[12px] font-medium text-slate mb-1.5">발생 일시</label>
              <input v-model="occurredAt" :class="fieldCls" placeholder="2026-05-21 14:00" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[12px] font-medium text-slate mb-1.5"
                  >도메인 <span class="text-blue">*</span></label
                >
                <select v-model="domain" :class="fieldCls">
                  <option v-for="d in DOMAINS" :key="d" :value="d">{{ DOMAIN_LABEL[d] }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[12px] font-medium text-slate mb-1.5">심각도</label>
                <select v-model="severity" :class="fieldCls">
                  <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 스테퍼 -->
      <div class="mt-6 bg-surface border border-line rounded-2xl px-5 py-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">업로드 후 자동 흐름</span>
          <span class="font-mono text-[10.5px] text-blue">단계 {{ store.currentStep }}/4</span>
        </div>
        <FlowStepper :current="store.currentStep" />
      </div>

      <!-- CTA -->
      <button
        class="mt-5 w-full flex items-center justify-center gap-2.5 bg-grad text-white font-bold text-[15px] py-4 rounded-2xl shadow-[0_18px_40px_-18px_#2bb8c7] hover:-translate-y-px disabled:opacity-40 disabled:hover:translate-y-0 transition"
        :disabled="!canSubmit"
        @click="submit"
      >
        <span
          v-if="store.generating"
          class="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
        ></span>
        {{ store.generating ? "STT 전사 → 5요소 보고서 생성 중…" : "🚀 업로드 + 5요소 보고서 자동 생성" }}
      </button>
      <p v-if="store.generating && store.generationStatus" class="text-center text-[12.5px] text-blue mt-3">
        {{ store.generationStatus }}
      </p>
      <p v-if="store.generationError" class="text-center text-[12.5px] text-[#d4495f] mt-3">
        {{ store.generationError }}
      </p>
      <p class="text-center text-[12px] text-faint mt-3">
        💡 녹취 길이에 따라 STT 전사에 수 분이 걸릴 수 있습니다. 초안 준비 후 HITL 검토를 거쳐 Confluence에 등록됩니다.
      </p>
    </div>
  </div>
</template>
