<script setup lang="ts">
import { FLOW_STEPS } from "@/api/assets";

defineProps<{ current: number; compact?: boolean }>();
</script>

<template>
  <div class="flex items-stretch" :class="compact ? 'gap-1.5' : 'gap-2.5'">
    <template v-for="(s, i) in FLOW_STEPS" :key="s.n">
      <!-- 연결선 -->
      <div v-if="i > 0" class="flex items-center shrink-0" :class="compact ? 'w-3' : 'flex-1 min-w-3'">
        <div class="h-px w-full transition" :class="s.n <= current ? 'bg-teal/50' : 'bg-line2'"></div>
      </div>

      <!-- 스텝 -->
      <div
        class="flex items-center gap-2.5 rounded-xl border transition"
        :class="[
          compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5 flex-1',
          s.n === current
            ? 'border-blue/40 bg-blue/[0.06] shadow-[0_8px_20px_-16px_#3e9be9]'
            : s.n < current
              ? 'border-teal/30 bg-teal/[0.05]'
              : 'border-line bg-surf2',
        ]"
      >
        <span
          class="grid place-items-center rounded-full font-mono font-semibold shrink-0 transition"
          :class="[
            compact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[11px]',
            s.n < current
              ? 'bg-teal text-white'
              : s.n === current
                ? 'bg-blue text-white'
                : 'bg-navy/[0.07] text-faint',
          ]"
        >
          <span v-if="s.n < current">✓</span>
          <span v-else>{{ s.n }}</span>
        </span>
        <div v-if="!compact" class="min-w-0">
          <div class="text-[12.5px] font-medium leading-tight" :class="s.n <= current ? 'text-ink' : 'text-faint'">
            {{ s.label }}
          </div>
          <div class="font-mono text-[9.5px] text-faint mt-0.5">{{ s.uc }}</div>
        </div>
        <div v-else class="text-[11px] font-medium" :class="s.n <= current ? 'text-ink' : 'text-faint'">
          {{ s.label }}
        </div>
      </div>
    </template>
  </div>
</template>
