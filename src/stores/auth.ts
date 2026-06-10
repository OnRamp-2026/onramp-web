import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { AuthProvider, AuthUser } from "@/types";

const KEY = "onramp.auth";

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(load());

  const isAuthenticated = computed(() => user.value !== null);
  /** 인가 Layer 2 — 자산 생산(검수·등록)은 Curator(작성 담당자)만 */
  const isCurator = computed(() => user.value?.role === "curator");

  /** mock 로그인 — 실연동 시 OIDC 토큰 claim → AuthUser 매핑으로 교체 */
  function login(account: AuthUser, provider: AuthProvider) {
    user.value = { ...account, provider };
    localStorage.setItem(KEY, JSON.stringify(user.value));
  }

  function logout() {
    user.value = null;
    localStorage.removeItem(KEY);
  }

  return { user, isAuthenticated, isCurator, login, logout };
});
