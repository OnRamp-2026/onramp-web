import { defineStore } from "pinia";
import { ref } from "vue";
import type { ChatMessage, LlmModel, SourceDoc } from "@/types";
import { INITIAL_CONVERSATION, MODELS } from "@/api/mock";
import { sendChat, CHAT_MOCK_ENABLED } from "@/api/chat";
import {
  deleteConversation as apiDeleteConversation,
  getConversationMessages,
  listConversations,
  toChatMessage,
  type ConversationSummary,
} from "@/api/conversations";

export const useChatStore = defineStore("chat", () => {
  // 실연동(mock=false)이면 빈 채팅으로 시작 — 데모 시드 대화는 mock 모드에서만
  const messages = ref<ChatMessage[]>(CHAT_MOCK_ENABLED ? [...INITIAL_CONVERSATION] : []);
  const model = ref<LlmModel>(MODELS[0]);
  const activeSource = ref<SourceDoc | null>(null);
  const sending = ref(false);
  const error = ref<string | null>(null);

  // 사이드바 '최근 대화' — 로그인 사용자별 (실연동 시 백엔드, mock이면 비움)
  const conversations = ref<ConversationSummary[]>([]);
  const activeId = ref<string>(""); // 현재 보고 있는 대화 ID ("" = 아직 저장 안 된 새 대화)

  async function send(text: string) {
    const query = text.trim();
    if (!query || sending.value) return;
    error.value = null;
    messages.value.push({ role: "user", text: query, time: hhmm() });
    sending.value = true;
    try {
      const { message, conversationId } = await sendChat(query, model.value.id, activeId.value);
      messages.value.push(message);
      if (conversationId) {
        activeId.value = conversationId;
        // 새 대화 생성/제목·정렬 갱신 반영 — 목록 새로고침(실패는 무시, 답변엔 영향 없음)
        void loadConversations();
      }
    } catch (e) {
      // 실 백엔드 실패(네트워크·5xx·LLM 오류)를 조용히 묻지 않고 표면화
      error.value = e instanceof Error ? e.message : "답변 생성에 실패했습니다.";
    } finally {
      sending.value = false;
    }
  }

  async function loadConversations() {
    if (CHAT_MOCK_ENABLED) return; // mock 모드는 백엔드 미연동
    try {
      conversations.value = await listConversations();
    } catch {
      // 미인증/네트워크 실패 시 조용히 빈 목록 유지 (로그인 게이트가 별도 처리)
    }
  }

  async function selectConversation(id: string) {
    if (!id || id === activeId.value || sending.value) return;
    try {
      const dtos = await getConversationMessages(id);
      messages.value = dtos.map(toChatMessage);
      activeId.value = id;
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "대화를 불러오지 못했습니다.";
    }
  }

  function newConversation() {
    messages.value = [];
    activeId.value = "";
    error.value = null;
  }

  async function deleteConversation(id: string) {
    if (!id) return;
    try {
      await apiDeleteConversation(id);
      conversations.value = conversations.value.filter((c) => c.conversation_id !== id);
      if (id === activeId.value) newConversation(); // 보던 대화면 빈 화면으로
    } catch (e) {
      error.value = e instanceof Error ? e.message : "대화를 삭제하지 못했습니다.";
    }
  }

  const clearError = () => (error.value = null);
  const setModel = (m: LlmModel) => (model.value = m);
  const openSource = (s: SourceDoc) => (activeSource.value = s);
  const closeSource = () => (activeSource.value = null);

  return {
    messages,
    model,
    activeSource,
    sending,
    error,
    conversations,
    activeId,
    send,
    loadConversations,
    selectConversation,
    newConversation,
    deleteConversation,
    setModel,
    openSource,
    closeSource,
    clearError,
  };
});

function hhmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
