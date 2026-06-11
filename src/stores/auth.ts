import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { AuthProvider, AuthUser } from "@/types";
import { AUTH_MOCK, fetchSession, logoutSession } from "@/api/auth";

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
  // mock: localStorage 즉시 / 실 OIDC: 백엔드 세션은 init()에서 비동기 복원
  const user = ref<AuthUser | null>(AUTH_MOCK ? load() : null);
  const ready = ref(AUTH_MOCK); // 실 모드는 /auth/me 응답 후 true

  const isAuthenticated = computed(() => user.value !== null);

  /** 앱 진입 시 1회 — 실 모드면 백엔드 세션 쿠키로 사용자 복원 */
  async function init() {
    if (AUTH_MOCK) {
      ready.value = true;
      return;
    }
    user.value = await fetchSession();
    ready.value = true;
  }

  /** mock 로그인 — 실 모드는 loginRedirect(@/api/auth)로 IdP에 위임 */
  function login(account: AuthUser, provider: AuthProvider) {
    user.value = { ...account, provider };
    localStorage.setItem(KEY, JSON.stringify(user.value));
  }

  async function logout() {
    if (!AUTH_MOCK) await logoutSession();
    user.value = null;
    localStorage.removeItem(KEY);
  }

  return { user, ready, isAuthenticated, init, login, logout };
});
