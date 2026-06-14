import { defineStore } from "pinia";
import { ref } from "vue";
import type { ChatMessage, LlmModel, SourceDoc } from "@/types";
import { INITIAL_CONVERSATION, MODELS } from "@/api/mock";
import { sendChat } from "@/api/chat";

export const useChatStore = defineStore("chat", () => {
  const messages = ref<ChatMessage[]>([...INITIAL_CONVERSATION]);
  const model = ref<LlmModel>(MODELS[0]);
  const activeSource = ref<SourceDoc | null>(null);
  const sending = ref(false);
  const error = ref<string | null>(null);

  async function send(text: string) {
    const query = text.trim();
    if (!query || sending.value) return;
    error.value = null;
    messages.value.push({ role: "user", text: query, time: hhmm() });
    sending.value = true;
    try {
      messages.value.push(await sendChat(query, model.value.id));
    } catch (e) {
      // 실 백엔드 실패(네트워크·5xx·LLM 오류)를 조용히 묻지 않고 표면화
      error.value = e instanceof Error ? e.message : "답변 생성에 실패했습니다.";
    } finally {
      sending.value = false;
    }
  }

  const clearError = () => (error.value = null);

  const setModel = (m: LlmModel) => (model.value = m);
  const openSource = (s: SourceDoc) => (activeSource.value = s);
  const closeSource = () => (activeSource.value = null);

  return { messages, model, activeSource, sending, error, send, setModel, openSource, closeSource, clearError };
});

function hhmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
