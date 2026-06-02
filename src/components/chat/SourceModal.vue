<script setup lang="ts">
import type { SourceDoc } from "@/types";

defineProps<{ source: SourceDoc }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="fixed inset-0 bg-navy/40 backdrop-blur-[3px] grid place-items-center z-50" @click.self="$emit('close')">
    <div
      class="w-[560px] max-w-[92vw] max-h-[84vh] bg-surface rounded-2xl overflow-hidden flex flex-col shadow-[0_40px_90px_-34px_#16213e] rise"
    >
      <div class="px-[22px] py-[18px] border-b border-line flex items-center gap-3">
        <span class="font-geo text-base font-semibold text-navy">{{ source.title }}</span>
        <span class="font-mono text-[11px] text-[#0f9c84] font-semibold">{{ source.id }}</span>
        <button class="ml-auto text-faint text-lg hover:text-ink" @click="$emit('close')">✕</button>
      </div>

      <div class="flex gap-2 flex-wrap px-[22px] py-3 border-b border-line">
        <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]">{{ source.domain }}</span>
        <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate">공간 {{ source.space }}</span>
        <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate">수정 {{ source.updated }}</span>
        <span class="font-mono text-[11px] px-2.5 py-[3px] rounded-full border border-line2 text-slate"
          ><span class="text-ok">●</span> 유사도 {{ source.score.toFixed(2) }}</span
        >
      </div>

      <div class="px-[22px] py-5 overflow-auto text-sm leading-[1.7]">
        <template v-if="source.preview">
          <div v-for="(p, i) in source.preview" :key="i">
            <h4 class="font-geo text-sm font-semibold text-navy mt-3.5 mb-1.5">{{ p.heading }}</h4>
            <p class="whitespace-pre-line text-slate">{{ p.body }}</p>
          </div>
        </template>
        <p v-else class="text-faint">미리보기를 불러올 수 없습니다. Confluence 원문을 확인하세요.</p>
      </div>

      <div class="px-[22px] py-3.5 border-t border-line flex justify-end">
        <a
          href="#"
          class="inline-flex items-center gap-2 border border-line2 bg-surf2 px-3.5 py-2.5 rounded-[9px] text-[13px] hover:border-teal hover:text-[#0f9c84]"
          >Confluence에서 열기 ↗</a
        >
      </div>
    </div>
  </div>
</template>
