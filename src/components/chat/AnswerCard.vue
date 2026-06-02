<script setup lang="ts">
import BrandLogo from "@/components/brand/BrandLogo.vue";
import type { AssistantMessage, FiveElements, SourceDoc } from "@/types";

defineProps<{ msg: AssistantMessage }>();
defineEmits<{ openSource: [src: SourceDoc] }>();

const ELEMENTS: { key: keyof FiveElements; num: string; label: string }[] = [
  { key: "situation", num: "01", label: "현재 상황" },
  { key: "cause", num: "02", label: "원인" },
  { key: "evidence", num: "03", label: "근거" },
  { key: "solution", num: "04", label: "해결" },
  { key: "infra", num: "05", label: "인프라 맥락" },
];
</script>

<template>
  <div class="flex flex-col gap-3.5 rise">
    <div class="flex items-center gap-2.5 flex-wrap">
      <span class="flex items-center gap-1.5 font-geo font-semibold text-sm text-navy"><BrandLogo :size="20" /> OnRamp</span>
      <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]">{{ msg.domain }}</span>
      <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate">
        <span class="text-ok">●</span> 신뢰도 {{ msg.confidence.toFixed(2) }}
      </span>
      <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate">근거 {{ msg.sources.length }}건</span>
    </div>

    <div class="bg-surface border border-line rounded-[14px] overflow-hidden shadow-[0_14px_34px_-26px_#16213e55]">
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

    <div class="flex flex-wrap gap-2 items-center">
      <span class="font-mono text-[11px] text-faint uppercase tracking-[0.08em]">출처</span>
      <button
        v-for="s in msg.sources"
        :key="s.id"
        @click="$emit('openSource', s)"
        class="inline-flex items-center gap-2 bg-surface border border-line2 px-[11px] py-[7px] rounded-[9px] max-w-[300px] hover:border-teal hover:-translate-y-px hover:shadow-[0_6px_16px_-10px_#1fc7ac] transition"
      >
        <span class="font-mono text-[11px] text-[#0f9c84] font-semibold">{{ s.id }}</span>
        <span class="text-[12.5px] truncate">{{ s.title }}</span>
        <span class="font-mono text-[10px] text-faint">{{ s.score.toFixed(2) }}</span>
      </button>
    </div>

    <div class="flex gap-1">
      <button class="px-2.5 py-1.5 rounded-lg text-[13px] text-faint hover:bg-navy/5 hover:text-ink">⭐ 자산화</button>
      <button class="px-2.5 py-1.5 rounded-lg text-[13px] text-faint hover:bg-navy/5 hover:text-ink">⧉ 복사</button>
      <button class="px-2.5 py-1.5 rounded-lg text-[13px] text-faint hover:bg-navy/5 hover:text-ink">👍</button>
      <button class="px-2.5 py-1.5 rounded-lg text-[13px] text-faint hover:bg-navy/5 hover:text-ink">👎</button>
    </div>
  </div>
</template>
