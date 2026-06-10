import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import ChatView from "@/views/ChatView.vue";
import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/types";

/** role 지정 시 해당 역할만 접근(인가 Layer 2). 미지정 = 전원(Reader) */
export const NAV: { path: string; icon: string; label: string; role?: UserRole }[] = [
  { path: "/chat", icon: "💬", label: "챗봇" },
  { path: "/galaxy", icon: "🌌", label: "프로젝트 맵" },
  { path: "/graph", icon: "🕸️", label: "지식맵" },
  { path: "/guide", icon: "🧭", label: "학습 가이드" },
  { path: "/assets", icon: "⭐", label: "자산화", role: "curator" },
  { path: "/settings", icon: "⚙️", label: "설정" },
];

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/chat" },
  { path: "/chat", name: "chat", component: ChatView },
  { path: "/galaxy", name: "galaxy", component: () => import("@/views/GalaxyView.vue") },
  { path: "/graph", name: "graph", component: () => import("@/views/GraphView.vue") },
  { path: "/guide", name: "guide", component: () => import("@/views/GuideView.vue") },
  { path: "/assets", name: "assets", component: () => import("@/views/AssetsView.vue"), meta: { role: "curator" } },
  { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
];

const router = createRouter({ history: createWebHistory(), routes });

/** 인가 Layer 2 — role 지정 라우트는 해당 역할만(직접 URL 접근 차단). 미인증 게이트는 App.vue. */
router.beforeEach((to) => {
  const role = to.meta.role as UserRole | undefined;
  if (!role) return true;
  const auth = useAuthStore();
  return auth.user?.role === role ? true : { path: "/chat" };
});

export default router;
