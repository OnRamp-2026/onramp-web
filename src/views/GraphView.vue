<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { SPH_NODES, SPH_EDGES, SOURCE_META, SOURCE_ORDER } from "@/api/graphReal";
import { createSphereGraph, type SInNode } from "@/composables/useSphereGraph";

const router = useRouter();
type Kind = "root" | "source" | "folder" | "page";
const colorOfSrc = (s: string) => (SOURCE_META[s] ?? SOURCE_META["기타"]).color;

interface Meta { title: string; group: string; color: string; kind: Kind; tags: string[]; count: number; sum: string; ver: number; mod: string }
const META = new Map<string, Meta>(
  SPH_NODES.map((n) => [n.id, { title: n.t, group: n.s, color: n.k === "root" ? "#dce6f7" : colorOfSrc(n.s), kind: n.k, tags: n.tg, count: n.d, sum: n.sum, ver: n.ver, mod: n.mod }]),
);
const metaOf = (id: string) => META.get(id)!;
const colorOf = (id: string) => metaOf(id).color;
const kindOf = (id: string) => metaOf(id).kind;

// 인접 (a=부모, b=자식)
const children = new Map<string, string[]>();
const parent = new Map<string, string>();
const adj = new Map<string, Set<string>>();
const add = (k: string, v: string) => (adj.get(k) ?? adj.set(k, new Set()).get(k)!).add(v);
for (const e of SPH_EDGES) { (children.get(e.a) ?? children.set(e.a, []).get(e.a)!).push(e.b); parent.set(e.b, e.a); add(e.a, e.b); add(e.b, e.a); }
const neighbors = (id: string) => adj.get(id) ?? new Set<string>();
const degOf = (id: string) => neighbors(id).size;

const PRESETS = [
  { label: "Pod 디버그", q: "debug pod application" },
  { label: "알럿 룰", q: "alert alerting rule" },
  { label: "mod_rewrite", q: "rewrite mod url" },
  { label: "대시보드", q: "dashboard widget graph" },
];

const canvasEl = ref<HTMLCanvasElement | null>(null);
let engine: ReturnType<typeof createSphereGraph> | null = null;
const selected = ref<string | null>(null);
const query = ref("");
const denseHits = ref<string[]>([]);
const expandedHits = ref<string[]>([]);
const queryActive = computed(() => denseHits.value.length > 0);
const rotating = ref(true);
type Role = "exec" | "mid" | "ops";
const role = ref<Role>("ops");
const ROLES: { key: Role; label: string }[] = [
  { key: "exec", label: "C레벨" },
  { key: "mid", label: "관리자" },
  { key: "ops", label: "실무자" },
];
function setRole(r: Role) { role.value = r; engine?.setRole(r); selected.value = null; }
const selectedMeta = computed(() => (selected.value ? metaOf(selected.value) : null));

// 레이더 차트 — 소스별 문서 분포 (상품성 시각화)
const radar = computed(() => {
  const items = SOURCE_ORDER.map((s) => ({ s, color: colorOfSrc(s), n: SPH_NODES.filter((x) => x.s === s && x.k === "page").length }));
  const max = Math.max(...items.map((i) => i.n));
  const cx = 70, cy = 66, R = 46;
  const pts = items.map((it, i) => {
    const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    const r = R * (0.18 + 0.82 * (it.n / max));
    return { ...it, ax: cx + Math.cos(a) * R, ay: cy + Math.sin(a) * R, px: cx + Math.cos(a) * r, py: cy + Math.sin(a) * r };
  });
  return { cx, cy, R, pts, poly: pts.map((p) => `${p.px},${p.py}`).join(" ") };
});

function expandOf(id: string): string[] {
  if (kindOf(id) === "page") { const par = parent.get(id); return par ? (children.get(par) ?? []).filter((x) => x !== id) : []; }
  return children.get(id) ?? [];
}
function runQuery(q: string) {
  query.value = q;
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return clearQuery();
  const scored = SPH_NODES.filter((n) => n.k === "page")
    .map((n) => { const hay = (n.t + " " + n.tg.join(" ") + " " + n.s).toLowerCase(); let s = 0; for (const t of toks) if (hay.includes(t)) s++; return { id: n.id, s }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) { denseHits.value = []; expandedHits.value = []; engine?.setHighlight([], []); return; }
  const dense = scored.slice(0, 3).map((x) => x.id);
  const exp = new Set<string>();
  for (const id of dense) for (const nb of expandOf(id)) if (!dense.includes(nb)) exp.add(nb);
  denseHits.value = dense; expandedHits.value = [...exp].slice(0, 5); selected.value = null;
  engine?.setHighlight(dense, expandedHits.value);
}
function clearQuery() { query.value = ""; denseHits.value = []; expandedHits.value = []; engine?.setHighlight([], []); }
function pickNeighbor(id: string) { selected.value = id; engine?.setSelected(id); }
function toggleRotate() { rotating.value = !rotating.value; engine?.setAutorotate(rotating.value); }

const legend = computed(() => SOURCE_ORDER.map((s) => ({ key: s, color: colorOfSrc(s), count: SPH_NODES.filter((n) => n.s === s && n.k === "page").length })));
const stats = computed(() => [
  { n: SPH_NODES.filter((n) => n.k === "page").length, l: "문서" },
  { n: SPH_NODES.filter((n) => n.k === "folder").length, l: "폴더" },
  { n: SOURCE_ORDER.length, l: "소스" },
]);

const route = useRoute();
onMounted(() => {
  engine = createSphereGraph(canvasEl.value!, {
    onSelect: (id) => { if (!query.value) selected.value = id; },
    onBgClick: () => { selected.value = null; },
  });
  const input: SInNode[] = SPH_NODES.map((n) => ({ id: n.id, group: n.s, parent: n.p, kind: n.k, title: n.t, color: n.k === "root" ? "#dce6f7" : colorOfSrc(n.s) }));
  engine.setData(input, SPH_EDGES.map((e) => ({ a: e.a, b: e.b, type: e.type })));
  const rq = route.query.role;
  if (rq === "exec" || rq === "mid") setRole(rq);
  const q = route.query.q;
  if (typeof q === "string" && q.trim()) setTimeout(() => runQuery(q), 80);
});
onBeforeUnmount(() => engine?.destroy());
</script>

<template>
  <main class="flex flex-col h-screen flex-1 overflow-hidden">
    <header class="flex items-center gap-3.5 px-[30px] py-3.5 border-b border-line bg-white/80 backdrop-blur z-10">
      <button
        class="flex items-center gap-1.5 text-[12px] font-medium text-slate hover:text-navy px-2 py-1 -ml-2 rounded-md hover:bg-navy/[0.05] transition"
        @click="router.push('/galaxy')"
      >
        ← 프로젝트 맵
      </button>
      <span class="font-geo text-base font-semibold text-navy">지식맵</span>
      <span class="font-mono text-[11px] text-faint">/ Knowledge Sphere</span>
      <div class="ml-3 flex items-center p-0.5 rounded-lg bg-navy/[0.06] text-[11px] font-medium">
        <button v-for="r in ROLES" :key="r.key" @click="setRole(r.key)" class="px-2.5 py-1 rounded-md transition" :class="role === r.key ? 'bg-white text-navy shadow-sm' : 'text-slate'">{{ r.label }}</button>
      </div>
      <span class="flex-1"></span>
      <div class="flex items-center gap-4 font-mono text-[11px] text-slate">
        <span v-for="s in stats" :key="s.l"><b class="text-navy">{{ s.n }}</b> {{ s.l }}</span>
      </div>
    </header>

    <div class="relative flex-1 overflow-hidden">
      <canvas ref="canvasEl" class="absolute inset-0 w-full h-full block touch-none"></canvas>

      <!-- 질의 -->
      <div class="absolute top-5 left-1/2 -translate-x-1/2 z-20 w-[min(600px,calc(100%-40px))]">
        <div class="glass rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-[0_18px_40px_-22px_#00102e]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" class="shrink-0 opacity-70"><circle cx="11" cy="11" r="7" stroke="#bcd3ee" stroke-width="2" /><path d="m20 20-3.2-3.2" stroke="#bcd3ee" stroke-width="2" stroke-linecap="round" /></svg>
          <input :value="query" @input="runQuery(($event.target as HTMLInputElement).value)" placeholder="질문하면 관련 뉴런이 앞으로 돌아옵니다" class="flex-1 bg-transparent outline-none text-[13.5px] text-[#eaf2ff] placeholder:text-[#7d93b5]" />
          <button v-if="query" @click="clearQuery" class="text-[#7d93b5] hover:text-white text-lg leading-none shrink-0">×</button>
        </div>
        <div class="flex items-center gap-1.5 mt-2.5 px-1 flex-wrap">
          <span class="font-mono text-[10px] text-[#6c83a8] mr-0.5">예시</span>
          <button v-for="p in PRESETS" :key="p.label" @click="runQuery(p.q)" class="font-mono text-[10.5px] px-2.5 py-1 rounded-full border transition" :class="query === p.q ? 'border-blue/60 bg-blue/15 text-[#bfe0ff]' : 'border-white/10 text-[#8ba2c6] hover:border-white/25 hover:text-[#cfe0f5]'">{{ p.label }}</button>
        </div>
      </div>

      <!-- 컨트롤 -->
      <div class="absolute top-5 right-5 z-20 flex gap-2">
        <button @click="toggleRotate" class="glass rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#cfe0f5] hover:text-white transition">{{ rotating ? '⏸ 회전 멈춤' : '▶ 회전' }}</button>
      </div>

      <!-- 범례 + 레이더 -->
      <div class="absolute bottom-5 left-5 z-20 flex flex-col gap-3 w-[200px]">
        <!-- 레이더 (C레벨에서 강조) -->
        <transition name="slide">
          <div v-if="role === 'exec'" class="glass rounded-xl px-4 py-3.5 text-[#cfe0f5]">
            <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-[#7d93b5] mb-1">지식 분포</div>
            <svg viewBox="0 0 140 132" class="w-full">
              <polygon v-for="ring in [1, 0.66, 0.33]" :key="ring" :points="radar.pts.map((p) => `${radar.cx + (p.ax - radar.cx) * ring},${radar.cy + (p.ay - radar.cy) * ring}`).join(' ')" fill="none" stroke="#ffffff14" />
              <line v-for="(p, i) in radar.pts" :key="'l' + i" :x1="radar.cx" :y1="radar.cy" :x2="p.ax" :y2="p.ay" stroke="#ffffff12" />
              <polygon :points="radar.poly" fill="#2bd4bd33" stroke="#2bd4bd" stroke-width="1.5" />
              <g v-for="(p, i) in radar.pts" :key="'p' + i">
                <circle :cx="p.px" :cy="p.py" r="2.5" :fill="p.color" />
                <text :x="p.ax + (p.ax - radar.cx) * 0.18" :y="p.ay + (p.ay - radar.cy) * 0.18 + 3" text-anchor="middle" class="font-mono" font-size="7.5" fill="#9fb6da">{{ p.n }}</text>
              </g>
            </svg>
          </div>
        </transition>
        <!-- 범례 -->
        <div class="glass rounded-xl px-4 py-3.5 text-[#cfe0f5]">
          <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-[#7d93b5] mb-2.5">소스 · 문서 수</div>
          <div class="flex flex-col gap-1.5">
            <div v-for="d in legend" :key="d.key" class="flex items-center gap-2.5 text-[12px]">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: d.color, boxShadow: `0 0 8px ${d.color}` }"></span>
              <span class="font-medium">{{ d.key }}</span><span class="ml-auto font-mono text-[10px] text-[#8ba2c6]">{{ d.count }}</span>
            </div>
          </div>
          <div class="border-t border-white/10 mt-3 pt-2.5 flex items-center gap-2 text-[11px] text-[#9fb6da]">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#2bd4bd" stroke-width="1.4" /></svg>
            <span>의미 연결 (온톨로지)</span>
          </div>
          <div class="font-mono text-[10px] text-[#6c83a8] mt-1.5">드래그=회전 · 스크롤=줌</div>
        </div>
      </div>

      <!-- 검색 경로 -->
      <transition name="slide">
        <div v-if="queryActive" class="absolute bottom-5 right-5 z-20 glass rounded-xl px-4 py-4 w-[290px] text-[#cfe0f5]">
          <div class="flex items-center gap-2 mb-3"><span class="w-[7px] h-[7px] rounded-full bg-teal pulse"></span><span class="font-geo text-[13px] font-semibold text-white">검색 경로</span><span class="ml-auto font-mono text-[10px] text-[#7d93b5]">GraphRAG</span></div>
          <div class="font-mono text-[10px] tracking-wide text-[#7d93b5] mb-1.5">① Dense 검색 · top {{ denseHits.length }}</div>
          <div class="flex flex-col gap-1 mb-3"><div v-for="id in denseHits" :key="id" class="flex items-center gap-2 text-[12px]"><span class="w-2 h-2 rounded-full shrink-0" :style="{ background: colorOf(id) }"></span><span class="truncate">{{ metaOf(id).title }}</span></div></div>
          <div class="font-mono text-[10px] tracking-wide text-teal mb-1.5">② + 그래프 1-hop 확장</div>
          <div class="flex flex-col gap-1 mb-3"><div v-for="id in expandedHits" :key="id" class="flex items-center gap-2 text-[12px]"><span class="w-2 h-2 rounded-full shrink-0 ring-1 ring-teal" :style="{ background: colorOf(id) }"></span><span class="truncate">{{ metaOf(id).title }}</span><span class="ml-auto font-mono text-[9px] text-teal">+graph</span></div><div v-if="!expandedHits.length" class="text-[11px] text-[#6c83a8]">연결 문서 없음</div></div>
          <p class="text-[11px] leading-relaxed text-[#9fb6da] border-t border-white/10 pt-2.5">Dense 검색이 놓친 <b class="text-teal">연결 문서</b>를 그래프가 끌어와 답변 근거를 넓힙니다.</p>
        </div>
      </transition>

      <!-- 상세 -->
      <transition name="slide">
        <aside v-if="selectedMeta && selected" class="absolute top-0 right-0 h-full z-30 w-[330px] bg-surface border-l border-line shadow-[-16px_0_40px_-28px_#16213e] flex flex-col">
          <div class="px-5 pt-5 pb-4 border-b border-line">
            <div class="flex items-center gap-2 mb-2.5">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: selectedMeta.color }"></span>
              <span class="font-mono text-[11px]" :style="{ color: selectedMeta.color }">{{ selectedMeta.group }}</span>
              <span class="font-mono text-[10px] text-faint">· {{ ({ root: '루트', source: '소스', folder: '폴더', page: '문서' })[selectedMeta.kind] }}</span>
              <button @click="selected = null" class="ml-auto text-faint hover:text-ink text-xl leading-none">×</button>
            </div>
            <h2 class="font-geo text-[16px] font-semibold text-navy leading-snug break-words">{{ selectedMeta.title }}</h2>
            <div class="flex items-center gap-2 mt-2 font-mono text-[10.5px] text-faint"><span v-if="selectedMeta.kind !== 'page'">하위 문서 {{ selectedMeta.count }}</span><span class="ml-auto">연결 {{ degOf(selected) }}</span></div>
          </div>
          <div class="px-5 py-4 overflow-auto flex-1">
            <!-- 자동 요약 (LLM) -->
            <div v-if="selectedMeta.sum" class="rounded-xl bg-gradient-to-br from-blue/[0.06] to-teal/[0.06] border border-line p-3 mb-4">
              <div class="flex items-center gap-1.5 mb-1.5"><span class="text-[12px]">✨</span><span class="font-mono text-[10px] tracking-wide uppercase text-blue">AI 자동 요약</span></div>
              <p class="text-[13px] leading-relaxed text-ink">{{ selectedMeta.sum }}</p>
            </div>
            <p v-else-if="selectedMeta.kind === 'page'" class="text-[12.5px] leading-relaxed text-slate">Confluence 실 문서 — 크롤러가 외부 제품 문서를 적재.</p>
            <!-- 추적성·히스토리 -->
            <div v-if="selectedMeta.mod" class="flex items-center gap-3 mt-1 mb-1 font-mono text-[10.5px] text-faint">
              <span class="px-1.5 py-0.5 rounded bg-navy/[0.05]">v{{ selectedMeta.ver }}</span>
              <span>최종 수정 {{ selectedMeta.mod }}</span>
            </div>
            <div v-if="selectedMeta.tags.length" class="flex flex-wrap gap-1.5 mt-3"><span v-for="t in selectedMeta.tags" :key="t" class="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-navy/[0.05] text-slate">#{{ t }}</span></div>
            <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mt-6 mb-2.5">연결된 {{ kindOf(selected) === 'page' ? '문서' : '하위' }} {{ neighbors(selected).size }}</div>
            <div class="flex flex-col gap-1">
              <button v-for="nb in [...neighbors(selected)].slice(0, 60)" :key="nb" @click="pickNeighbor(nb)" class="flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg hover:bg-navy/5 transition group">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: colorOf(nb) }"></span>
                <span class="text-[12.5px] text-ink truncate group-hover:text-navy">{{ metaOf(nb).title }}</span>
              </button>
            </div>
          </div>
          <div class="px-5 py-4 border-t border-line"><button class="w-full bg-grad text-white font-semibold text-[13px] py-2.5 rounded-xl hover:-translate-y-px transition shadow-[0_10px_24px_-12px_#2bb8c7]">이 문서로 챗봇에게 질문 →</button></div>
        </aside>
      </transition>
    </div>
  </main>
</template>

<style scoped>
.glass { background: rgba(13, 22, 46, 0.6); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.08); }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(16px); opacity: 0; }
</style>
