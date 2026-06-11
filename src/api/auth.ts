import type { AuthProvider, AuthUser } from "@/types";

/**
 * 인증은 회사 IdP(Keycloak/Entra/Slack 등)에 OIDC 위임 — OnRamp는 비밀번호를 저장하지 않는다.
 * VITE_AUTH_MOCK=true(기본): mock 시연 / false: 백엔드 OIDC 클라이언트(RP) 실 연동.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
/** mock 시연 토글. false면 백엔드 /auth/* (Keycloak 위임)로 실 redirect. */
export const AUTH_MOCK = (import.meta.env.VITE_AUTH_MOCK ?? "true") === "true";

/** 실 OIDC: 백엔드 RP(/auth/login)로 이동 → Keycloak authorize로 이어짐. (RP는 onramp-api, 인증 서버 아님) */
export function loginRedirect(provider: AuthProvider) {
  const ret = encodeURIComponent(location.pathname + location.search);
  window.location.href = `${BASE}/auth/login?provider=${provider}&redirect=${ret}`;
}

/** 실 OIDC: 백엔드 세션 쿠키 기준 현재 사용자 복원(callback 복귀·새로고침 시). */
export async function fetchSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
    return res.ok ? ((await res.json()) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** 실 OIDC: 백엔드 세션 종료(IdP 세션은 IdP 정책에 따름). */
export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    /* 무시 — 로컬 세션은 store에서 비움 */
  }
}

export const PROVIDERS: { id: AuthProvider; label: string; sub: string; icon: string }[] = [
  { id: "sso", label: "회사 SSO로 로그인", sub: "OIDC · Keycloak / Entra ID", icon: "🔐" },
  { id: "slack", label: "Slack으로 로그인", sub: "Slack 계정 · 이중 로그인 없음", icon: "💬" },
];

/** 데모 계정 — IdP가 돌려줄 신원을 흉내. 테넌트(회사)·역할이 서로 다름을 시연.
 *  누리클라우드: Reader(김신입)·Curator(박운영) / 한별테크: Reader(이데이터) — 회사 간 KB 격리. */
export const DEMO_ACCOUNTS: AuthUser[] = [
  {
    id: "U-2025-114",
    name: "김신입",
    email: "newbie@corp.local",
    initial: "신",
    tenant: { id: "nuri", label: "누리클라우드" },
    role: "reader",
    tenure: "신규 입사 · 2일차",
    provider: "sso",
  },
  {
    id: "U-2019-007",
    name: "박운영",
    email: "ops.lead@corp.local",
    initial: "운",
    tenant: { id: "nuri", label: "누리클라우드" },
    role: "curator",
    tenure: "운영 담당 · 6년차",
    provider: "sso",
  },
  {
    id: "U-2021-051",
    name: "이데이터",
    email: "data.eng@corp.local",
    initial: "데",
    tenant: { id: "hanbyeol", label: "한별테크" },
    role: "reader",
    tenure: "데이터팀 · 3년차",
    provider: "slack",
  },
];

/** 역할 표시 메타 */
export const ROLE_META: Record<AuthUser["role"], { label: string; hint: string }> = {
  reader: { label: "Reader", hint: "검색·열람 (소비)" },
  curator: { label: "Curator", hint: "자산 검수·등록 (생산)" },
};
