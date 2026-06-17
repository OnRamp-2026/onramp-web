<script setup lang="ts">
import { ref } from "vue";
import { useChatStore } from "@/stores/chat";

const chat = useChatStore();
const draft = ref("");

function submit() {
  if (chat.sending || !draft.value.trim()) return;
  chat.send(draft.value);
  draft.value = "";
}

// 한글 IME 조합 중 엔터는 마지막 음절이 commit되기 전이라 전송 시 끝 글자가 잘림 → 조합 중엔 무시.
function onEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return; // IME 조합 중
  if (e.shiftKey) return; // Shift+Enter = 줄바꿈 허용
  e.preventDefault();
  submit();
}
</script>

<template>
  <div class="px-[30px] pb-[22px] pt-3.5 bg-gradient-to-t from-bg to-transparent">
    <div
      class="max-w-[768px] mx-auto bg-surface border border-line2 rounded-2xl pl-4 pr-2 py-2 flex flex-col gap-2 focus-within:border-teal shadow-[0_16px_40px_-28px_#16213e]"
    >
      <textarea
        v-model="draft"
        rows="1"
        placeholder="사내 지식에 무엇이든 물어보세요  —  예: '어제 결제 장애 정리해줘'"
        class="border-none outline-none resize-none text-[15px] leading-[1.5] bg-transparent pt-2 pb-0.5 w-full max-h-[120px] placeholder:text-faint"
        @keydown.enter="onEnter"
      ></textarea>
      <div class="flex items-center gap-2.5">
        <span
          class="flex items-center gap-1.5 font-mono text-[11px] text-slate border border-line rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-teal hover:text-[#0f9c84]"
          >＃ 도메인: 자동 라우팅</span
        >
        <span class="flex-1"></span>
        <button
          @click="submit"
          :disabled="chat.sending"
          class="w-[38px] h-[38px] rounded-[11px] bg-grad text-white text-[17px] grid place-items-center hover:-translate-y-px shadow-[0_8px_18px_-10px_#2bb8c7] disabled:opacity-50"
        >
          {{ chat.sending ? "…" : "↑" }}
        </button>
      </div>
    </div>
    <div class="max-w-[768px] mx-auto mt-2 text-center font-mono text-[10.5px] text-faint">
      OnRamp는 사내 Confluence 지식만 근거로 답합니다 · 출처를 항상 확인하세요
    </div>
  </div>
</template>
