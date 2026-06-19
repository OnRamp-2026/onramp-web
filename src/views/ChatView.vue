<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { DOMAIN_LABEL } from "@/types";
import AnswerCard from "@/components/chat/AnswerCard.vue";
import SourceModal from "@/components/chat/SourceModal.vue";
import ModelSelector from "@/components/chat/ModelSelector.vue";
import ChatComposer from "@/components/chat/ChatComposer.vue";

const chat = useChatStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// 헤더 브레드크럼 — 실제 대화 상태 기반 (대화 없으면 중립 라벨, 하드코딩 제거)
const headerDomain = computed(() => {
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (m.role === "assistant") return DOMAIN_LABEL[m.domain] ?? "챗봇";
  }
  return "챗봇";
});
const headerTitle = computed(
  () => chat.conversations.find((c) => c.conversation_id === chat.activeId)?.title ?? ""
);

// 지식맵 등에서 ?ask=… 로 진입하면 해당 질문을 자동 전송 (기존 RAG /v1/chat 그대로 사용).
onMounted(() => {
  const ask = route.query.ask;
  if (typeof ask === "string" && ask.trim()) {
    router.replace({ query: {} }); // 새로고침 시 재전송 방지
    chat.send(ask.trim());
  }
});
</script>

<template>
  <main class="flex flex-col h-screen flex-1 overflow-hidden">
    <header class="flex items-center gap-3.5 px-[30px] py-3.5 border-b border-line bg-white/80 backdrop-blur">
      <span class="font-geo text-base font-semibold text-navy">{{ headerDomain }}</span>
      <span v-if="headerTitle" class="font-mono text-[11px] text-faint">/ {{ headerTitle }}</span>
      <span class="flex-1"></span>
      <span
        v-if="auth.user"
        class="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-[3px] rounded-full bg-teal/10 text-[#0f9c84]"
        title="질의는 소속 회사(테넌트) KB로 스코프됩니다"
      >
        ▣ {{ auth.user.tenant.label }} KB
      </span>
      <ModelSelector />
    </header>

    <div class="flex-1 overflow-auto pt-[34px] pb-7">
      <div class="max-w-[768px] mx-auto px-[30px] flex flex-col gap-[30px]">
        <!-- 빈 상태 (실연동 모드 진입 시) -->
        <div v-if="!chat.messages.length && !chat.sending" class="pt-[12vh] text-center">
          <div class="text-[40px] mb-3">💬</div>
          <h2 class="font-geo text-[20px] font-bold text-navy">무엇을 도와드릴까요?</h2>
          <p class="text-[14px] text-slate mt-2">운영 매뉴얼·장애 대응·API 문서를 물어보세요.</p>
        </div>

        <template v-for="(m, i) in chat.messages" :key="i">
          <div v-if="m.role === 'user'" class="self-end max-w-[78%]">
            <div class="bg-navy text-[#EAF1FA] px-4 py-3 rounded-[14px_14px_4px_14px] text-[15px] leading-[1.55]">{{ m.text }}</div>
            <div class="text-right font-mono text-[10px] text-faint mt-1.5">
              {{ m.time }}<span v-if="m.perm"> · {{ m.perm }}</span>
            </div>
          </div>
          <AnswerCard v-else :msg="m" @open-source="chat.openSource($event)" />
        </template>

        <div
          v-if="chat.error"
          class="flex items-start gap-2.5 bg-[#fdecef] border border-[#f3c2cc] text-[#b3344a] rounded-xl px-4 py-3 text-[13px]"
        >
          <span class="shrink-0">⚠</span>
          <div class="flex-1">답변 생성에 실패했습니다 — {{ chat.error }}</div>
          <button class="shrink-0 text-[#b3344a]/60 hover:text-[#b3344a] leading-none" @click="chat.clearError()">×</button>
        </div>
      </div>
    </div>

    <ChatComposer />
  </main>

  <SourceModal v-if="chat.activeSource" :source="chat.activeSource" @close="chat.closeSource()" />
</template>
