<script setup lang="ts">
import BrandLogo from "@/components/brand/BrandLogo.vue";
import { NAV } from "@/router";
import { HISTORY } from "@/api/mock";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
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

    <!-- 로그인 사용자 (인증 위임 결과) -->
    <div v-if="auth.user" class="border-t border-line pt-3 mt-2">
      <div class="flex items-center gap-2.5">
        <div class="w-[30px] h-[30px] rounded-[9px] bg-grad text-white grid place-items-center font-bold text-[13px]">
          {{ auth.user.initial }}
        </div>
        <div class="min-w-0">
          <div class="text-[13px] font-semibold truncate">{{ auth.user.name }}</div>
          <div class="text-[11px] text-faint font-mono truncate">{{ auth.user.tenure }}</div>
        </div>
        <button
          class="ml-auto text-faint hover:text-ink text-[15px] shrink-0"
          title="로그아웃"
          @click="auth.logout()"
        >
          ⏻
        </button>
      </div>
      <!-- 인가 Layer 1 — 이 사용자가 보는 KB(테넌트) -->
      <div class="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-slate bg-navy/[0.03] rounded-lg px-2 py-1.5">
        <span class="text-teal">▣</span> KB: {{ auth.user.tenant.label }}
        <span class="ml-auto text-faint">via {{ auth.user.provider === "slack" ? "Slack" : "SSO" }}</span>
      </div>
    </div>
  </aside>
</template>
