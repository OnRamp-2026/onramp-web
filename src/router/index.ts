import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import ChatView from "@/views/ChatView.vue";

/** 전 메뉴 전원 접근 — 인가는 테넌트(회사) + Confluence 권한으로, 별도 역할 게이트 없음(6/11). */
export const NAV: { path: string; icon: string; label: string }[] = [
  { path: "/chat", icon: "💬", label: "챗봇" },
  // 지식맵 = 진입은 프로젝트맵(/galaxy), OnRamp 노드 클릭 시 문서 지식맵(/graph)으로 드릴인
  { path: "/galaxy", icon: "🕸️", label: "지식맵" },
  { path: "/assets", icon: "⭐", label: "자산화" },
  { path: "/settings", icon: "⚙️", label: "설정" },
];

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/chat" },
  { path: "/chat", name: "chat", component: ChatView },
  { path: "/galaxy", name: "galaxy", component: () => import("@/views/GalaxyView.vue") },
  { path: "/graph", name: "graph", component: () => import("@/views/GraphView.vue") },
  { path: "/assets", name: "assets", component: () => import("@/views/AssetsView.vue") },
  { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
];

export default createRouter({ history: createWebHistory(), routes });
