<script setup lang="ts">
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import AnswerCard from "@/components/chat/AnswerCard.vue";
import SourceModal from "@/components/chat/SourceModal.vue";
import ModelSelector from "@/components/chat/ModelSelector.vue";
import ChatComposer from "@/components/chat/ChatComposer.vue";

const chat = useChatStore();
const auth = useAuthStore();
</script>

<template>
  <main class="flex flex-col h-screen flex-1 overflow-hidden">
    <header class="flex items-center gap-3.5 px-[30px] py-3.5 border-b border-line bg-white/80 backdrop-blur">
      <span class="font-geo text-base font-semibold text-navy">장애 대응</span>
      <span class="font-mono text-[11px] text-faint">/ EKS Pod CrashLoopBackOff</span>
      <span class="flex-1"></span>
      <span
        v-if="auth.user"
        class="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]"
        title="질의는 소속 부서(테넌트) KB로 스코프됩니다"
      >
        ▣ {{ auth.user.tenant.label }} KB
      </span>
      <span class="flex items-center gap-1.5 font-mono text-[11px] text-slate">
        <span class="w-[7px] h-[7px] rounded-full bg-ok pulse"></span> 색인 최신 · 09:00
      </span>
      <ModelSelector />
    </header>

    <div class="flex-1 overflow-auto pt-[34px] pb-7">
      <div class="max-w-[768px] mx-auto px-[30px] flex flex-col gap-[30px]">
        <template v-for="(m, i) in chat.messages" :key="i">
          <div v-if="m.role === 'user'" class="self-end max-w-[78%]">
            <div class="bg-navy text-[#EAF1FA] px-4 py-3 rounded-[14px_14px_4px_14px] text-[15px] leading-[1.55]">{{ m.text }}</div>
            <div class="text-right font-mono text-[10px] text-faint mt-1.5">
              {{ m.time }}<span v-if="m.perm"> · {{ m.perm }}</span>
            </div>
          </div>
          <AnswerCard v-else :msg="m" @open-source="chat.openSource($event)" />
        </template>
      </div>
    </div>

    <ChatComposer />
  </main>

  <SourceModal v-if="chat.activeSource" :source="chat.activeSource" @close="chat.closeSource()" />
</template>
