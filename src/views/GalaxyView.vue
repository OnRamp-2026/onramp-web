<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { createNeuralNetwork, type Edge, type Screen } from "@/composables/useNeuralNetwork";

const router = useRouter();
type V3 = [number, number, number];

interface Project {
  id: string;
  name: string;
  team: string;
  docs: number;
  domains: number;
  size: number;
  locked: boolean;
  mine?: boolean;
  lobe: string;
  source: string;
  domainColor: string;
  sourceColor: string;
  color: string;
  pos: V3;
}

const ME = { name: "양정우", team: "Cloud Platform팀" };

const META: Record<string, { name: string; team: string; docs: number; domains: number }> = {
  onramp: { name: "OnRamp", team: "Cloud Platform팀", docs: 864, domains: 5 },
  payments: { name: "결제 플랫폼", team: "결제팀", docs: 512, domains: 4 },
  order: { name: "주문 관리", team: "주문팀", docs: 402, domains: 4 },
  inventory: { name: "재고 관리", team: "SCM팀", docs: 274, domains: 3 },
  settle: { name: "정산 시스템", team: "정산팀", docs: 364, domains: 4 },
  promo: { name: "쿠폰·프로모션", team: "마케팅팀", docs: 218, domains: 3 },
  opentraum: { name: "OpenTraum", team: "티켓팅 플랫폼팀", docs: 430, domains: 4 },
  datalake: { name: "데이터 레이크", team: "데이터플랫폼팀", docs: 640, domains: 5 },
  feature: { name: "피처 스토어", team: "ML플랫폼팀", docs: 226, domains: 3 },
  mlops: { name: "MLOps 파이프라인", team: "MLOps팀", docs: 248, domains: 3 },
  abtest: { name: "A/B 실험", team: "실험플랫폼팀", docs: 142, domains: 2 },
  catalog: { name: "데이터 카탈로그", team: "거버넌스팀", docs: 184, domains: 3 },
  tally: { name: "Tally", team: "Engineering Intelligence", docs: 298, domains: 3 },
  ads: { name: "광고 플랫폼", team: "광고팀", docs: 396, domains: 4 },
  reco: { name: "추천 엔진", team: "추천팀", docs: 354, domains: 4 },
  search: { name: "검색 플랫폼", team: "검색팀", docs: 472, domains: 4 },
  notify: { name: "알림 허브", team: "메시징팀", docs: 208, domains: 3 },
  csbot: { name: "고객지원 봇", team: "CS팀", docs: 188, domains: 3 },
  logistics: { name: "물류 트래킹", team: "물류팀", docs: 286, domains: 3 },
  geo: { name: "지도·위치", team: "위치플랫폼팀", docs: 156, domains: 3 },
  media: { name: "영상 스트리밍", team: "미디어팀", docs: 332, domains: 4 },
  risk: { name: "리스크 엔진", team: "리스크팀", docs: 318, domains: 4 },
  gateway: { name: "API 게이트웨이", team: "플랫폼팀", docs: 296, domains: 3 },
  observ: { name: "모니터링", team: "SRE팀", docs: 408, domains: 4 },
  iam: { name: "ID·인증", team: "보안인증팀", docs: 244, domains: 3 },
  sentinel: { name: "Sentinel", team: "GPU 인프라팀", docs: 176, domains: 3 },
};

// 지식 보관처(소스 툴) — 부서마다 다름 (백정렬 교수 멘토링 근거)
const TOOLS: Record<string, string> = {
  Confluence: "#4F9DFF",
  OneDrive: "#34D399",
  Jira: "#A78BFA",
  Notion: "#E5E7EB",
  SharePoint: "#22D3EE",
  Slack: "#F472B6",
  "Google Drive": "#FBBF24",
};
const SOURCE: Record<string, string> = {
  onramp: "Confluence", payments: "Confluence", order: "Jira", inventory: "SharePoint", settle: "OneDrive",
  promo: "Notion", opentraum: "Confluence", datalake: "Confluence", feature: "Notion", mlops: "Notion",
  abtest: "Notion", catalog: "SharePoint", tally: "Confluence", ads: "Google Drive", reco: "Notion",
  search: "Confluence", notify: "Slack", csbot: "Slack", logistics: "SharePoint", geo: "Confluence",
  media: "Google Drive", risk: "OneDrive", gateway: "Confluence", observ: "Jira", iam: "SharePoint", sentinel: "Confluence",
};

const LOBES = [
  { name: "커머스", color: "#fb7185", center: [1.5, -0.15, 0.5] as V3, members: ["payments", "order", "inventory", "settle", "promo", "opentraum"] },
  { name: "데이터·ML", color: "#8b7cf6", center: [-1.45, 0.4, 0.55] as V3, members: ["datalake", "feature", "mlops", "abtest", "catalog", "tally"] },
  { name: "그로스", color: "#f5a524", center: [0.5, 1.35, -0.5] as V3, members: ["ads", "reco", "search", "notify"] },
  { name: "고객·운영", color: "#34d399", center: [-0.5, -1.15, -0.7] as V3, members: ["csbot", "logistics", "geo", "media", "risk"] },
  { name: "플랫폼·인프라", color: "#3E9BE9", center: [0.35, -0.5, 1.4] as V3, members: ["gateway", "observ", "iam", "sentinel"] },
];

const TEAL = "#1FC7AC";
function fibDir(k: number, n: number): V3 {
  const y = n === 1 ? 0 : 1 - (k / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const a = Math.PI * (3 - Math.sqrt(5)) * k;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}
const szOf = (docs: number) => Math.min(100, Math.round(76 + docs * 0.028));
const mk = (id: string, lobe: string, dcol: string, pos: V3, mine = false): Project => {
  const m = META[id], src = SOURCE[id];
  return { id, name: m.name, team: m.team, docs: m.docs, domains: m.domains, size: mine ? 140 : szOf(m.docs), locked: !mine, mine, lobe, source: src, domainColor: mine ? TEAL : dcol, sourceColor: TOOLS[src], color: mine ? TEAL : dcol, pos };
};

const projects: Project[] = [mk("onramp", "플랫폼·인프라", TEAL, [0, 0, 0], true)];
for (const L of LOBES) {
  const n = L.members.length;
  L.members.forEach((id, k) => {
    const d = fibDir(k, n);
    projects.push(mk(id, L.name, L.color, [L.center[0] + d[0] * 0.42, L.center[1] + d[1] * 0.42, L.center[2] + d[2] * 0.42]));
  });
}
const POS = projects.map((p) => p.pos);

const EDGES: Edge[] = (() => {
  const set = new Set<string>();
  const add = (a: number, b: number) => { if (a !== b) set.add(a < b ? `${a}-${b}` : `${b}-${a}`); };
  const d2 = (p: V3, q: V3) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  const idx = new Map(projects.map((p, i) => [p.id, i]));
  const memIdx = LOBES.map((L) => L.members.map((id) => idx.get(id)!));
  memIdx.forEach((M) => {
    for (const a of M) {
      const near = M.filter((b) => b !== a).map((b) => [b, d2(POS[a], POS[b])] as [number, number]).sort((x, y) => x[1] - y[1]);
      for (let k = 0; k < Math.min(2, near.length); k++) add(a, near[k][0]);
    }
  });
  memIdx.forEach((M) => {
    let best = M[0], bd = Infinity;
    for (const m of M) { const dd = d2(POS[0], POS[m]); if (dd < bd) { bd = dd; best = m; } }
    add(0, best);
  });
  projects.map((p, i) => [i, d2(POS[0], POS[i])] as [number, number]).filter(([i]) => i !== 0).sort((a, b) => a[1] - b[1]).slice(0, 4).forEach(([i]) => add(0, i));
  const pairs: [number, number][] = [[0, 1], [1, 4], [2, 0], [3, 4], [2, 3], [0, 4], [1, 3]];
  pairs.forEach(([x, y]) => {
    let ba = memIdx[x][0], bb = memIdx[y][0], bd = Infinity;
    for (const a of memIdx[x]) for (const b of memIdx[y]) { const dd = d2(POS[a], POS[b]); if (dd < bd) { bd = dd; ba = a; bb = b; } }
    add(ba, bb);
  });
  return [...set].map((s) => s.split("-").map(Number) as Edge);
})();

const totalDocs = projects.reduce((s, p) => s + p.docs, 0);
const toolsPresent = computed(() => {
  const m = new Map<string, number>();
  projects.forEach((p) => m.set(p.source, (m.get(p.source) ?? 0) + 1));
  return [...m].map(([name, n]) => ({ name, n, color: TOOLS[name] })).sort((a, b) => b.n - a.n);
});
const toolCount = computed(() => new Set(projects.map((p) => p.source)).size);

// 색 기준: 도메인 엽 ↔ 보관처
const colorBy = ref<"domain" | "source">("domain");
function applyColors() {
  for (const p of projects) {
    p.color = colorBy.value === "domain" ? (p.mine ? TEAL : p.domainColor) : p.sourceColor;
  }
}
applyColors();
watch(colorBy, applyColors);

const screens = reactive<Screen[]>(projects.map(() => ({ x: -300, y: -300, r: 0, d: 0 })));
const zoom = ref(1);
const netBg = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let net: ReturnType<typeof createNeuralNetwork> | null = null;

let down = false, lastX = 0, lastY = 0;
const dragDist = ref(0);
const panning = ref(false);

function onDown(e: PointerEvent) { down = true; panning.value = true; lastX = e.clientX; lastY = e.clientY; dragDist.value = 0; }
function onMove(e: PointerEvent) {
  if (!down) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  dragDist.value += Math.hypot(dx, dy);
  net?.orbit(dx, dy);
}
function onUp() { down = false; panning.value = false; }
function onWheel(e: WheelEvent) {
  e.preventDefault();
  zoom.value = Math.max(0.55, Math.min(2.6, zoom.value * Math.exp(-e.deltaY * 0.0012)));
}
function resetView() { zoom.value = 1; net?.reset(); }

onMounted(() => {
  net = createNeuralNetwork(canvasEl.value!, projects, EDGES, screens, () => zoom.value);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
});
onBeforeUnmount(() => {
  net?.destroy();
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
});

const requested = ref<Set<string>>(new Set());
const modal = ref<Project | null>(null);
const hover = ref<string | null>(null);

function onOrb(p: Project) {
  if (dragDist.value > 5) return;
  if (!p.locked) router.push("/graph");
  else modal.value = p;
}
const requestAccess = (p: Project) => requested.value.add(p.id);
const isRequested = (id: string) => requested.value.has(id);
const segActive = "bg-white/90 text-navy";
const segIdle = "text-[#9fb6da] hover:text-white";
</script>

<template>
  <main class="flex flex-col h-screen flex-1 overflow-hidden">
    <header class="flex items-center gap-3.5 px-[30px] py-3.5 border-b border-line bg-white/80 backdrop-blur z-10">
      <span class="font-geo text-base font-semibold text-navy">기업 지식 신경망</span>
      <span class="font-mono text-[11px] text-faint">/ Enterprise Knowledge Network</span>
      <span class="flex-1"></span>
      <div class="flex items-center gap-4 font-mono text-[11px] text-slate">
        <span><b class="text-navy">{{ projects.length }}</b> 프로젝트</span>
        <span><b class="text-navy">{{ toolCount }}</b> 보관처</span>
        <span><b class="text-navy">{{ totalDocs.toLocaleString() }}</b> 문서</span>
        <span class="flex items-center gap-2">
          <span class="w-[26px] h-[26px] rounded-lg bg-grad text-white grid place-items-center font-bold text-[11px]">정</span>
          {{ ME.name }}
        </span>
      </div>
    </header>

    <div
      ref="netBg"
      class="relative flex-1 overflow-hidden net-bg select-none"
      :class="panning ? 'cursor-grabbing' : 'cursor-grab'"
      @pointerdown="onDown"
      @wheel="onWheel"
    >
      <div v-for="s in 56" :key="'s' + s" class="star" :style="{ left: ((s * 97) % 100) + '%', top: ((s * 53) % 100) + '%', animationDelay: (s % 7) * 0.4 + 's' }"></div>

      <canvas ref="canvasEl" class="absolute inset-0 w-full h-full block"></canvas>

      <!-- 노드 오버레이 — 자식 z는 이 컨테이너(z-10) 안에서만 경쟁 → 모달/컨트롤 밑 -->
      <div class="absolute inset-0 pointer-events-none" style="z-index: 10">
      <template v-for="(p, i) in projects" :key="p.id">
        <button
          class="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full pointer-events-auto"
          :style="{ left: screens[i].x + 'px', top: screens[i].y + 'px', width: screens[i].r * 2 + 'px', height: screens[i].r * 2 + 'px', zIndex: Math.round(screens[i].d * 100) }"
          @click="onOrb(p)"
          @mouseenter="hover = p.id"
          @mouseleave="hover = null"
        >
          <span v-if="!p.locked" class="absolute rounded-full border ring-pulse pointer-events-none" :style="{ inset: screens[i].r * 0.18 + 'px', borderColor: p.color + (hover === p.id ? 'cc' : '66') }"></span>
          <span
            v-else
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b1430]/75 border border-white/15 grid place-items-center backdrop-blur-sm transition pointer-events-none"
            :style="{ width: Math.max(20, screens[i].r * 0.6) + 'px', height: Math.max(20, screens[i].r * 0.6) + 'px', fontSize: Math.max(10, screens[i].r * 0.3) + 'px', opacity: 0.4 + screens[i].d * 0.6 }"
            :class="hover === p.id ? 'scale-110 border-white/30' : ''"
            >🔒</span
          >
        </button>

        <div
          class="absolute -translate-x-1/2 text-center select-none pointer-events-none"
          :style="{ left: screens[i].x + 'px', top: screens[i].y + screens[i].r + 5 + 'px', zIndex: Math.round(screens[i].d * 100), opacity: Math.max(0, (screens[i].d - 0.25) / 0.75), width: '132px' }"
        >
          <div class="flex items-center justify-center gap-1.5">
            <span class="font-geo font-semibold text-[12.5px]" :class="p.locked ? 'text-[#9fb1cf]' : 'text-white'">{{ p.name }}</span>
            <span v-if="p.mine" class="font-mono text-[8.5px] px-1.5 py-px rounded-full bg-teal/20 text-teal">내 프로젝트</span>
            <span v-else-if="isRequested(p.id)" class="font-mono text-[8.5px] px-1.5 py-px rounded-full bg-[#f5a52426] text-[#f5b733]">요청됨</span>
          </div>
          <div v-if="screens[i].d > 0.55" class="mt-0.5 flex items-center justify-center gap-1 font-mono text-[9px] text-[#8aa0c4]">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: p.sourceColor }"></span>{{ p.source }}
          </div>
        </div>
      </template>
      </div>

      <!-- 컨트롤 -->
      <div class="absolute top-5 right-5 z-30 flex items-center gap-2">
        <div class="glass rounded-lg p-0.5 flex items-center text-[11px] font-medium">
          <button class="px-2.5 py-1 rounded-md transition" :class="colorBy === 'domain' ? segActive : segIdle" @click="colorBy = 'domain'">도메인 엽</button>
          <button class="px-2.5 py-1 rounded-md transition" :class="colorBy === 'source' ? segActive : segIdle" @click="colorBy = 'source'">보관처</button>
        </div>
        <button class="glass rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#cfe0f5] hover:text-white transition" @click="resetView">⤾ 정면</button>
      </div>

      <!-- 범례 -->
      <div class="absolute bottom-5 left-5 z-30 glass rounded-xl px-4 py-3 text-[#cfe0f5] w-[238px]">
        <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-[#7d93b5] mb-2">{{ colorBy === 'domain' ? '도메인 엽 (Lobe)' : '지식 보관처 (Source)' }}</div>
        <div class="flex flex-col gap-1.5">
          <template v-if="colorBy === 'domain'">
            <div v-for="L in LOBES" :key="L.name" class="flex items-center gap-2.5 text-[12px]">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: L.color, boxShadow: `0 0 8px ${L.color}` }"></span>
              <span class="font-medium">{{ L.name }}</span>
              <span class="ml-auto font-mono text-[10px] text-[#8ba2c6]">{{ L.members.length }}</span>
            </div>
          </template>
          <template v-else>
            <div v-for="t in toolsPresent" :key="t.name" class="flex items-center gap-2.5 text-[12px]">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: t.color, boxShadow: `0 0 8px ${t.color}` }"></span>
              <span class="font-medium">{{ t.name }}</span>
              <span class="ml-auto font-mono text-[10px] text-[#8ba2c6]">{{ t.n }}</span>
            </div>
          </template>
        </div>
        <p class="text-[10.5px] leading-snug text-[#7d93b5] mt-2.5 pt-2.5 border-t border-white/10">
          부서마다 보관처가 달라도(Confluence·Slack·OneDrive…) <b class="text-teal">하나의 신경망</b>으로 통합.
        </p>
      </div>
    </div>

    <!-- 권한 요청 모달 -->
    <transition name="fade">
      <div v-if="modal" class="absolute inset-0 z-40 grid place-items-center bg-[#06102a]/55 backdrop-blur-sm" @click.self="modal = null">
        <div class="w-[400px] rounded-2xl bg-surface border border-line shadow-[0_30px_80px_-30px_#06102a] overflow-hidden pop">
          <div class="px-6 pt-6 pb-5 text-center border-b border-line">
            <div class="w-16 h-16 mx-auto rounded-2xl grid place-items-center mb-3 text-2xl" :style="{ background: modal.domainColor + '1a', boxShadow: `0 0 26px -6px ${modal.domainColor}66` }">🔒</div>
            <h2 class="font-geo text-lg font-bold text-navy">{{ modal.name }}</h2>
            <p class="font-mono text-[11px] text-faint mt-1">{{ modal.lobe }} 엽 · {{ modal.team }} · 문서 {{ modal.docs }}</p>
          </div>
          <div class="px-6 py-5">
            <!-- 보관처 -->
            <div class="flex items-center gap-2.5 bg-navy/[0.03] border border-line rounded-xl px-3.5 py-2.5 mb-3">
              <span class="text-base">📦</span>
              <span class="text-[12.5px] text-slate">지식 보관처</span>
              <span class="ml-auto flex items-center gap-1.5 font-mono text-[12px] font-medium text-ink">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: modal.sourceColor }"></span>{{ modal.source }}
              </span>
            </div>
            <template v-if="!isRequested(modal.id)">
              <div class="flex items-start gap-2.5 bg-navy/[0.03] border border-line rounded-xl px-3.5 py-3">
                <span class="text-lg">🔑</span>
                <p class="text-[13px] leading-relaxed text-slate">
                  이 팀 지식은 <b class="text-ink">{{ modal.source }}</b>에 보관돼 있고 <b class="text-ink">{{ modal.team }}</b> 소유입니다.
                  OnRamp 신경망에 연결해 열람하려면 <b class="text-ink">접근 권한 승인</b>이 필요합니다.
                </p>
              </div>
              <button class="mt-4 w-full bg-grad text-white font-semibold text-[14px] py-3 rounded-xl shadow-[0_12px_28px_-12px_#2bb8c7] hover:-translate-y-px transition" @click="requestAccess(modal)">
                🔑 접근 권한 요청
              </button>
            </template>
            <template v-else>
              <div class="flex items-start gap-2.5 bg-teal/[0.07] border border-teal/25 rounded-xl px-3.5 py-3">
                <span class="text-lg">✓</span>
                <p class="text-[13px] leading-relaxed text-[#0f7d6a]"><b>요청을 전송했습니다.</b> 승인되면 {{ modal.source }}의 지식이 신경망에 색인·통합됩니다.</p>
              </div>
            </template>
            <button class="mt-2.5 w-full text-[13px] py-2.5 rounded-xl text-slate hover:bg-navy/5 transition" @click="modal = null">닫기</button>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.net-bg { background: radial-gradient(circle at 50% 48%, #18294f 0%, #0d1a38 47%, #050b1c 100%); }
.glass { background: rgba(13, 22, 46, 0.6); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.08); }
.star { position: absolute; width: 2px; height: 2px; border-radius: 9999px; background: #cfe0f5; opacity: 0.3; animation: twinkle 3.6s ease-in-out infinite; }
@keyframes twinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.5; } }
.ring-pulse { animation: ringpulse 2.8s ease-in-out infinite; }
@keyframes ringpulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.05); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.22s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pop { animation: pop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes pop { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
</style>
