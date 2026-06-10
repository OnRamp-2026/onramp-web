import type { AuthProvider, AuthUser } from "@/types";

/**
 * 인증은 회사 IdP(Keycloak/Entra/Slack 등)에 OIDC 위임 — OnRamp는 비밀번호를 저장하지 않는다.
 * 본 모듈은 데모용 mock: 실배포 시 OIDC callback의 토큰 claim → AuthUser 매핑으로 교체.
 */

export const PROVIDERS: { id: AuthProvider; label: string; sub: string; icon: string }[] = [
  { id: "sso", label: "회사 SSO로 로그인", sub: "OIDC · Keycloak / Entra ID", icon: "🔐" },
  { id: "slack", label: "Slack으로 로그인", sub: "Slack 계정 · 이중 로그인 없음", icon: "💬" },
];

/** 데모 계정 — IdP가 돌려줄 신원을 흉내. 테넌트(부서)·역할이 서로 다름을 시연. */
export const DEMO_ACCOUNTS: AuthUser[] = [
  {
    id: "U-2025-114",
    name: "김신입",
    email: "newbie@corp.local",
    initial: "신",
    tenant: { id: "platform-ops", label: "플랫폼운영팀" },
    role: "reader",
    tenure: "신규 입사 · 2일차",
    provider: "sso",
  },
  {
    id: "U-2019-007",
    name: "박운영",
    email: "ops.lead@corp.local",
    initial: "운",
    tenant: { id: "platform-ops", label: "플랫폼운영팀" },
    role: "curator",
    tenure: "운영 담당 · 6년차",
    provider: "sso",
  },
  {
    id: "U-2021-051",
    name: "이데이터",
    email: "data.eng@corp.local",
    initial: "데",
    tenant: { id: "data-platform", label: "데이터플랫폼팀" },
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
