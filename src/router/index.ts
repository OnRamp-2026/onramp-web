import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import ChatView from "@/views/ChatView.vue";

/** 전 메뉴 전원 접근 — 인가는 테넌트(회사) + Confluence 권한으로, 별도 역할 게이트 없음(6/11). */
export const NAV: { path: string; icon: string; label: string }[] = [
  { path: "/chat", icon: "💬", label: "챗봇" },
  { path: "/galaxy", icon: "🌌", label: "프로젝트 맵" },
  { path: "/graph", icon: "🕸️", label: "지식맵" },
  { path: "/guide", icon: "🧭", label: "학습 가이드" },
  { path: "/assets", icon: "⭐", label: "자산화" },
  { path: "/settings", icon: "⚙️", label: "설정" },
];

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/chat" },
  { path: "/chat", name: "chat", component: ChatView },
  { path: "/galaxy", name: "galaxy", component: () => import("@/views/GalaxyView.vue") },
  { path: "/graph", name: "graph", component: () => import("@/views/GraphView.vue") },
  { path: "/guide", name: "guide", component: () => import("@/views/GuideView.vue") },
  { path: "/assets", name: "assets", component: () => import("@/views/AssetsView.vue") },
  { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
];

export default createRouter({ history: createWebHistory(), routes });
