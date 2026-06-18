<script setup lang="ts">
import { computed, ref } from "vue";
import BrandLogo from "@/components/brand/BrandLogo.vue";
import type { AnswerabilityStatus, AssistantMessage, FiveElements, SourceDoc } from "@/types";
import { DOMAIN_LABEL } from "@/types";
import { renderMarkdown } from "@/utils/markdown";
import { sendFeedback } from "@/api/chat";

const props = defineProps<{ msg: AssistantMessage }>();
defineEmits<{ openSource: [src: SourceDoc] }>();

const copied = ref(false);
const voted = ref<"up" | "down" | null>(null);

/** 복사용 평문 — freeform이면 산문, structured면 5요소(태그 제거). */
function answerPlainText(): string {
  const m = props.msg;
  if (m.answer_format === "freeform") return m.answer_text;
  return ELEMENTS.map((e) => `[${e.label}] ${String(m.five[e.key]).replace(/<[^>]*>/g, "")}`).join("\n\n");
}
async function copyAnswer() {
  try {
    await navigator.clipboard.writeText(answerPlainText());
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch { /* 클립보드 차단 환경은 무시 */ }
}
async function vote(v: "up" | "down") {
  voted.value = v;
  try {
    await sendFeedback(props.msg.trace_id ?? "", v === "up" ? 1.0 : 0.0);
  } catch { /* 피드백 실패는 사용자 흐름을 막지 않음 */ }
}

const ELEMENTS: { key: keyof FiveElements; num: string; label: string }[] = [
  { key: "situation", num: "01", label: "현재 상황" },
  { key: "cause", num: "02", label: "원인" },
  { key: "evidence", num: "03", label: "근거" },
  { key: "solution", num: "04", label: "해결" },
  { key: "infra_context", num: "05", label: "인프라 맥락" },
];

/** answerability 상태별 표시 메타. hold=true면 5요소 대신 보류 화면을 보여준다. */
const STATUS_META: Record<AnswerabilityStatus, { label: string; hold: boolean; icon: string }> = {
  answerable: { label: "근거 충분", hold: false, icon: "●" },
  partially_answerable: { label: "부분 근거", hold: false, icon: "◐" },
  not_enough_evidence: { label: "근거 부족 · 보류", hold: true, icon: "⚠" },
  conflicting_evidence: { label: "문서 충돌", hold: true, icon: "⚠" },
  outdated_evidence: { label: "최신 문서 부재", hold: true, icon: "⏳" },
};

const status = computed(() => STATUS_META[props.msg.answerability_status]);
const domainLabel = computed(() => DOMAIN_LABEL[props.msg.domain] ?? props.msg.domain);
</script>

<template>
  <div class="flex flex-col gap-3.5 rise">
    <div class="flex items-center gap-2.5 flex-wrap">
      <span class="flex items-center gap-1.5 font-geo font-semibold text-sm text-navy"><BrandLogo :size="20" /> OnRamp</span>
      <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]">{{ domainLabel }}</span>
      <span
        class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border"
        :class="status.hold ? 'border-[#e7c46a] bg-[#fff8e8] text-[#9a6b00]' : 'border-line2 text-slate'"
      >
        <span :class="status.hold ? 'text-[#c08a00]' : 'text-ok'">{{ status.icon }}</span> {{ status.label }}
      </span>
      <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate">근거 {{ msg.sources.length }}건</span>
    </div>

    <!-- 보류: 근거 부족 / 문서 충돌 / 최신 부재 → 5요소 대신 사유·안내 -->
    <div
      v-if="status.hold"
      class="bg-[#fffdf6] border border-[#ecd9a0] rounded-[14px] px-[18px] py-[16px] flex flex-col gap-2.5"
    >
      <div class="flex items-center gap-2 font-geo text-sm font-semibold text-[#8a6100]">
        <span>{{ status.icon }}</span> {{ status.label }}
      </div>
      <p class="text-[14px] leading-[1.62] text-slate">{{ msg.answerability_reason }}</p>
    </div>

    <template v-else>
      <!-- 부분 근거: 한계 명시 배너 -->
      <div
        v-if="msg.answerability_status === 'partially_answerable' && msg.answerability_reason"
        class="bg-[#fffdf6] border border-[#ecd9a0] rounded-[12px] px-[14px] py-2.5 text-[13px] leading-[1.55] text-[#8a6100] flex items-start gap-2"
      >
        <span class="mt-px">◐</span><span>{{ msg.answerability_reason }}</span>
      </div>

      <!-- freeform: 산문 답변 (incident 외) — answer_text를 마크다운 렌더(살균 후 v-html) -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-if="msg.answer_format === 'freeform'"
        class="bg-surface border border-line rounded-[14px] px-[18px] py-[16px] text-[14.5px] leading-[1.62] text-ink prose-code shadow-[0_14px_34px_-26px_#16213e55]"
        v-html="renderMarkdown(msg.answer_text)"
      ></div>

      <!-- structured: 5요소 (incident) -->
      <div v-else class="bg-surface border border-line rounded-[14px] overflow-hidden shadow-[0_14px_34px_-26px_#16213e55]">
        <div
          v-for="(el, i) in ELEMENTS"
          :key="el.key"
          class="grid grid-cols-[128px_1fr]"
          :class="i > 0 ? 'border-t border-line' : ''"
        >
          <div class="font-mono text-[11px] text-slate px-4 py-[15px] bg-[#f3f7fb] border-r border-line flex items-start gap-1.5">
            <span class="text-teal font-semibold">{{ el.num }}</span> {{ el.label }}
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="px-[18px] py-[15px] text-[14.5px] leading-[1.62] prose-code" v-html="msg.five[el.key]"></div>
        </div>
      </div>
    </template>

    <!-- 출처 (보류여도 충돌/최신부재는 근거 문서가 있을 수 있음) -->
    <div v-if="msg.sources.length" class="flex flex-wrap gap-2 items-center">
      <span class="font-mono text-[11px] text-faint uppercase tracking-[0.08em]">출처</span>
      <button
        v-for="(s, i) in msg.sources"
        :key="s.url || i"
        @click="$emit('openSource', s)"
        class="inline-flex items-center gap-2 bg-surface border border-line2 px-[11px] py-[7px] rounded-[9px] max-w-[300px] hover:border-teal hover:-translate-y-px hover:shadow-[0_6px_16px_-10px_#1fc7ac] transition"
      >
        <span class="font-mono text-[11px] text-[#0f9c84] font-semibold">[{{ i + 1 }}]</span>
        <span class="text-[12.5px] truncate">{{ s.title }}</span>
        <span class="font-mono text-[10px] text-faint">{{ s.score.toFixed(2) }}</span>
      </button>
    </div>

    <div class="flex gap-1">
      <button @click="copyAnswer" class="px-2.5 py-1.5 rounded-lg text-[13px] text-faint hover:bg-navy/5 hover:text-ink">⧉ {{ copied ? "복사됨" : "복사" }}</button>
      <button @click="vote('up')" class="px-2.5 py-1.5 rounded-lg text-[13px] hover:bg-navy/5" :class="voted === 'up' ? 'text-[#0f9c84]' : 'text-faint hover:text-ink'">👍</button>
      <button @click="vote('down')" class="px-2.5 py-1.5 rounded-lg text-[13px] hover:bg-navy/5" :class="voted === 'down' ? 'text-[#b3344a]' : 'text-faint hover:text-ink'">👎</button>
    </div>
  </div>
</template>
