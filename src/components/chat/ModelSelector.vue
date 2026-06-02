<script setup lang="ts">
import { ref } from "vue";
import { MODELS } from "@/api/mock";
import { useChatStore } from "@/stores/chat";

const chat = useChatStore();
const open = ref(false);
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-2 bg-surface border border-line2 px-3 py-[7px] rounded-[9px] font-mono text-xs hover:border-teal"
      @click="open = !open"
    >
      <span class="w-2 h-2 rounded-full bg-grad"></span>{{ chat.model.label }}<span class="text-faint text-[10px]">▾</span>
    </button>
    <div
      v-if="open"
      class="absolute top-[42px] right-0 bg-surface border border-line2 rounded-[11px] shadow-[0_16px_40px_-20px_#16213e66] p-1.5 w-[210px] z-30"
    >
      <div
        v-for="m in MODELS"
        :key="m.id"
        @click="chat.setModel(m); open = false"
        class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] hover:bg-navy/5"
        :class="m.id === chat.model.id ? 'bg-teal/10' : ''"
      >
        <span class="w-2 h-2 rounded-full bg-grad"></span>
        <span class="font-medium">{{ m.label }}</span>
        <span class="ml-auto font-mono text-[10px] text-faint">{{ m.note }}</span>
      </div>
    </div>
  </div>
</template>
