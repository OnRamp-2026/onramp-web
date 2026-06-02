<script setup lang="ts">
import BrandLogo from "@/components/brand/BrandLogo.vue";
import { NAV } from "@/router";
import { HISTORY } from "@/api/mock";

const idle = "text-slate hover:bg-navy/5 hover:text-ink";
const active = "bg-blue/10 text-[#1668b3] font-semibold";
</script>

<template>
  <aside class="w-[266px] shrink-0 bg-surface border-r border-line flex flex-col px-4 py-5">
    <div class="flex items-center gap-2 px-1.5 pb-4">
      <BrandLogo :size="34" />
      <span class="font-geo font-bold text-[21px] tracking-tight text-navy">OnRamp</span>
      <span class="ml-auto font-mono text-[10px] text-faint">v0</span>
    </div>

    <button
      class="flex items-center gap-2.5 w-full bg-grad text-white font-semibold text-sm px-3.5 py-3 rounded-xl mb-4 shadow-[0_8px_20px_-10px_#2bb8c7] hover:-translate-y-px transition"
    >
      <span class="text-[17px] leading-none">＋</span> 새 질문
    </button>

    <nav class="flex flex-col gap-0.5 mb-5">
      <RouterLink v-for="n in NAV" :key="n.path" :to="n.path" custom v-slot="{ isActive, navigate }">
        <a
          @click="navigate"
          class="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition"
          :class="isActive ? active : idle"
        >
          <span class="w-[18px] text-center text-[15px]">{{ n.icon }}</span>{{ n.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="font-mono text-[10px] tracking-[0.1em] uppercase text-faint px-2.5 pb-2">최근 대화</div>
    <div class="flex flex-col gap-px overflow-auto flex-1 -mx-1 px-1">
      <div
        v-for="(h, i) in HISTORY"
        :key="i"
        class="px-2.5 py-2 rounded-lg cursor-pointer text-[13px] truncate"
        :class="h.current ? 'bg-navy/[0.06] text-ink font-medium' : 'text-slate hover:bg-navy/5 hover:text-ink'"
      >
        <span class="font-mono text-[10px] text-teal mr-1.5">[{{ h.domain }}]</span>{{ h.title }}
      </div>
    </div>

    <div class="border-t border-line pt-3 mt-2 flex items-center gap-2.5">
      <div class="w-[30px] h-[30px] rounded-[9px] bg-grad text-white grid place-items-center font-bold text-[13px]">정</div>
      <div>
        <div class="text-[13px] font-semibold">양정우</div>
        <div class="text-[11px] text-faint font-mono">신규 입사 · 2일차</div>
      </div>
    </div>
  </aside>
</template>
