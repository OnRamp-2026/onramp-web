<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BrandLogo from "@/components/brand/BrandLogo.vue";
import { useAuthStore } from "@/stores/auth";
import { AUTH_MOCK, DEMO_ACCOUNTS, loginRedirect, PROVIDERS, ROLE_META } from "@/api/auth";
import type { AuthProvider } from "@/types";

const auth = useAuthStore();
const router = useRouter();

// 단계: provider 선택 → mock IdP 계정 선택
const provider = ref<AuthProvider | null>(null);
const chosen = computed(() => PROVIDERS.find((p) => p.id === provider.value));
const accounts = computed(() => DEMO_ACCOUNTS); // 실연동 시 IdP가 단일 신원 반환

/** mock: 계정 선택 화면으로 / 실 OIDC: 백엔드 RP로 redirect(Keycloak 위임) */
function onProvider(provId: AuthProvider) {
  if (AUTH_MOCK) provider.value = provId;
  else loginRedirect(provId);
}
function signIn(accountId: string) {
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId);
  if (!account || !provider.value) return;
  auth.login(account, provider.value);
  router.replace("/chat");
}

/* ── 배경: 지식 네트워크(제품 예고) — 결정론적 nearest-neighbor 그래프 ── */
const RAW: [number, number][] = [
  [8, 20], [20, 12], [16, 44], [11, 70], [28, 80], [31, 30], [42, 58],
  [40, 18], [52, 38], [49, 76], [60, 20], [62, 62], [58, 88], [72, 44],
  [70, 78], [82, 28], [86, 60], [80, 84], [92, 46], [93, 16],
];
const NODES = RAW.map(([x, y], i) => ({ x, y, i, r: 0.6 + ((i * 7) % 5) * 0.18 }));
const EDGES: { x1: number; y1: number; x2: number; y2: number; sig: boolean }[] = (() => {
  const seen = new Set<string>();
  const out: { x1: number; y1: number; x2: number; y2: number; sig: boolean }[] = [];
  NODES.forEach((a) => {
    NODES.filter((b) => b.i !== a.i)
      .map((b) => ({ b, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .forEach(({ b }) => {
        const key = [Math.min(a.i, b.i), Math.max(a.i, b.i)].join("-");
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, sig: (out.length + 1) % 4 === 0 });
      });
  });
  return out;
})();
</script>

<template>
  <div class="lr-root">
    <!-- 아틀라스 배경 -->
    <div class="lr-mesh" />
    <svg class="lr-net" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g class="lr-drift">
        <line
          v-for="(e, i) in EDGES"
          :key="'e' + i"
          :x1="e.x1"
          :y1="e.y1"
          :x2="e.x2"
          :y2="e.y2"
          :class="e.sig ? 'lr-edge lr-edge--sig' : 'lr-edge'"
          :style="e.sig ? { animationDelay: (i % 6) * 0.5 + 's' } : undefined"
        />
        <circle
          v-for="n in NODES"
          :key="'n' + n.i"
          :cx="n.x"
          :cy="n.y"
          :r="n.r"
          class="lr-node"
          :style="{ animationDelay: (n.i % 7) * 0.4 + 's' }"
        />
      </g>
    </svg>
    <div class="lr-onramp" />
    <div class="lr-grain" />

    <!-- 콘텐츠 -->
    <div class="lr-stage">
      <div class="lr-brand lr-rise">
        <BrandLogo :size="46" />
        <div>
          <div class="lr-word">OnRamp</div>
          <div class="lr-tag">사내 지식 온보딩 · 베테랑 경험 자산화</div>
        </div>
      </div>

      <div class="lr-card lr-rise lr-d1">
        <span class="lr-edge-top" />

        <!-- 1단계: IdP 선택 -->
        <template v-if="!provider">
          <div class="lr-head">
            <span class="lr-kicker">SIGN IN<span v-if="AUTH_MOCK" class="lr-demo">demo · mock IdP</span></span>
            <h1>로그인</h1>
            <p>회사 IdP에 위임됩니다 — 비밀번호는 저장하지 않습니다.</p>
          </div>
          <button
            v-for="(p, i) in PROVIDERS"
            :key="p.id"
            class="lr-prov lr-rise"
            :style="{ animationDelay: 0.18 + i * 0.07 + 's' }"
            @click="onProvider(p.id)"
          >
            <span class="lr-prov-ic">{{ p.icon }}</span>
            <span class="lr-prov-txt">
              <span class="lr-prov-label">{{ p.label }}</span>
              <span class="lr-prov-sub">{{ p.sub }}</span>
            </span>
            <span class="lr-prov-go">→</span>
          </button>
        </template>

        <!-- 2단계: mock IdP 계정 선택 -->
        <template v-else>
          <button class="lr-back" @click="provider = null">‹ 다른 방법</button>
          <div class="lr-head lr-head--idp">
            <span class="lr-idp-ic">{{ chosen?.icon }}</span>
            <h1>{{ chosen?.label }}</h1>
            <p><span class="lr-mock">MOCK IdP</span> 데모 계정을 선택하세요 — 실배포 시 회사 SSO가 단일 신원을 반환합니다.</p>
          </div>
          <button
            v-for="(a, i) in accounts"
            :key="a.id"
            class="lr-acc lr-rise"
            :style="{ animationDelay: 0.1 + i * 0.06 + 's' }"
            @click="signIn(a.id)"
          >
            <span class="lr-avatar">{{ a.initial }}</span>
            <span class="lr-acc-txt">
              <span class="lr-acc-top">
                <span class="lr-acc-name">{{ a.name }}</span>
                <span class="lr-role" :class="a.role === 'curator' ? 'lr-role--cur' : ''">{{ ROLE_META[a.role].label }}</span>
              </span>
              <span class="lr-acc-meta">{{ a.tenant.label }} · {{ a.tenure }}</span>
            </span>
            <span class="lr-prov-go">→</span>
          </button>
        </template>
      </div>

      <div class="lr-foot lr-rise lr-d2">
        <span><b>인증</b> IdP 위임(OIDC)</span>
        <span class="lr-dot" />
        <span><b>인가</b> 테넌트(회사 KB) × 역할(Reader/Curator)</span>
        <span class="lr-dot" />
        <span>인증 서버 없음</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lr-root {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #0c1428;
  font-family: "Pretendard", sans-serif;
}
/* 그라데이션 메시(네이비 + 블루/틸 글로우) */
.lr-mesh {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(40% 40% at 18% 22%, rgba(62, 155, 233, 0.28), transparent 70%),
    radial-gradient(44% 44% at 84% 30%, rgba(31, 199, 172, 0.22), transparent 70%),
    radial-gradient(60% 60% at 70% 90%, rgba(34, 64, 124, 0.4), transparent 70%),
    linear-gradient(160deg, #0d1730 0%, #101c3a 45%, #0b1326 100%);
  animation: lr-breathe 16s ease-in-out infinite;
}
/* 지식 네트워크 */
.lr-net {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.9;
}
.lr-drift {
  animation: lr-drift 26s ease-in-out infinite;
  transform-origin: 50% 50%;
}
.lr-edge {
  stroke: rgba(120, 170, 220, 0.16);
  stroke-width: 0.12;
}
.lr-edge--sig {
  stroke: rgba(31, 199, 172, 0.7);
  stroke-width: 0.18;
  stroke-dasharray: 3 120;
  animation: lr-signal 3.4s linear infinite;
}
.lr-node {
  fill: #8fd6ff;
  filter: drop-shadow(0 0 1.2px rgba(120, 200, 255, 0.8));
  animation: lr-pulse 4.5s ease-in-out infinite;
}
/* 온램프 모티프 — 수렴하는 대각선 */
.lr-onramp {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(108deg, transparent 49.7%, rgba(62, 155, 233, 0.13) 49.85%, transparent 50%),
    linear-gradient(100deg, transparent 64.7%, rgba(31, 199, 172, 0.11) 64.85%, transparent 65%);
  mask: linear-gradient(to top, #000, transparent 60%);
}
.lr-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* 콘텐츠 */
.lr-stage {
  position: relative;
  width: 416px;
  max-width: calc(100vw - 40px);
}
.lr-brand {
  display: flex;
  align-items: center;
  gap: 13px;
  justify-content: center;
  margin-bottom: 26px;
}
.lr-word {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 30px;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #fff;
}
.lr-tag {
  font-size: 12px;
  color: rgba(208, 222, 240, 0.62);
  margin-top: 4px;
  letter-spacing: 0.01em;
}

.lr-card {
  position: relative;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  padding: 28px 26px 24px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 40px 90px -38px rgba(4, 10, 28, 0.85),
    0 10px 30px -20px rgba(31, 199, 172, 0.4);
  backdrop-filter: blur(4px);
}
.lr-edge-top {
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #3e9be9, #22cbb0);
  opacity: 0.95;
}

.lr-head {
  margin-bottom: 18px;
}
.lr-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: #1fc7ac;
  font-weight: 600;
}
.lr-demo {
  letter-spacing: 0.04em;
  font-weight: 500;
  color: #93a1b3;
  background: rgba(22, 33, 62, 0.06);
  padding: 1px 7px;
  border-radius: 999px;
}
.lr-head h1 {
  font-family: "Poppins", sans-serif;
  font-size: 21px;
  font-weight: 600;
  color: #16213e;
  margin: 3px 0 5px;
}
.lr-head p {
  font-size: 12.5px;
  line-height: 1.5;
  color: #566579;
}
.lr-head--idp {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas: "ic h" "ic p";
  column-gap: 11px;
  align-items: center;
}
.lr-idp-ic {
  grid-area: ic;
  font-size: 26px;
  align-self: center;
}
.lr-head--idp h1 {
  grid-area: h;
  font-size: 17px;
  margin: 0;
  align-self: end;
}
.lr-head--idp p {
  grid-area: p;
  margin-top: 2px;
}
.lr-mock {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(22, 33, 62, 0.07);
  color: #16213e;
}

/* provider 버튼 */
.lr-prov {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  text-align: left;
  border: 1px solid #d4deea;
  border-radius: 14px;
  padding: 14px 15px;
  margin-bottom: 10px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.lr-prov:hover {
  transform: translateY(-2px);
  border-color: #1fc7ac;
  background: linear-gradient(180deg, #fff, #f7fdfb);
  box-shadow: 0 14px 30px -18px rgba(31, 199, 172, 0.65);
}
.lr-prov-ic {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  font-size: 18px;
  background: linear-gradient(135deg, rgba(62, 155, 233, 0.14), rgba(31, 199, 172, 0.14));
  flex-shrink: 0;
}
.lr-prov-txt {
  display: flex;
  flex-direction: column;
}
.lr-prov-label {
  font-size: 14px;
  font-weight: 600;
  color: #16213e;
}
.lr-prov-sub {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: #93a1b3;
  margin-top: 2px;
}
.lr-prov-go {
  margin-left: auto;
  color: #93a1b3;
  font-size: 16px;
  transition: transform 0.18s, color 0.18s;
}
.lr-prov:hover .lr-prov-go,
.lr-acc:hover .lr-prov-go {
  transform: translateX(3px);
  color: #1fc7ac;
}

.lr-back {
  font-size: 12px;
  color: #93a1b3;
  margin-bottom: 13px;
  cursor: pointer;
  transition: color 0.15s;
}
.lr-back:hover {
  color: #16213e;
}

/* 계정 카드 */
.lr-acc {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  border: 1px solid #e6ecf4;
  border-radius: 13px;
  padding: 11px 13px;
  margin-bottom: 9px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.16s, border-color 0.16s, background 0.16s;
}
.lr-acc:hover {
  transform: translateY(-1px);
  border-color: #3e9be9;
  background: rgba(62, 155, 233, 0.04);
}
.lr-avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: linear-gradient(135deg, #3e9be9, #22cbb0);
  flex-shrink: 0;
}
.lr-acc-txt {
  min-width: 0;
  flex: 1;
}
.lr-acc-top {
  display: flex;
  align-items: center;
  gap: 7px;
}
.lr-acc-name {
  font-size: 14px;
  font-weight: 600;
  color: #16213e;
}
.lr-role {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid #d4deea;
  color: #566579;
}
.lr-role--cur {
  border-color: transparent;
  background: rgba(31, 199, 172, 0.12);
  color: #0f9c84;
}
.lr-acc-meta {
  display: block;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: #93a1b3;
  margin-top: 2px;
}

/* 푸터 */
.lr-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
  font-family: "JetBrains Mono", monospace;
  font-size: 10.5px;
  color: rgba(208, 222, 240, 0.5);
}
.lr-foot b {
  color: rgba(31, 199, 172, 0.95);
  font-weight: 600;
}
.lr-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(208, 222, 240, 0.3);
}

/* 등장 */
.lr-rise {
  opacity: 0;
  animation: lr-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.lr-d1 {
  animation-delay: 0.1s;
}
.lr-d2 {
  animation-delay: 0.26s;
}

@keyframes lr-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes lr-drift {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-1.4%, 1.1%) scale(1.015);
  }
}
@keyframes lr-pulse {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.95;
  }
}
@keyframes lr-signal {
  from {
    stroke-dashoffset: 123;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes lr-breathe {
  0%, 100% {
    transform: scale(1) translate(0, 0);
  }
  50% {
    transform: scale(1.05) translate(1%, -1%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lr-rise,
  .lr-drift,
  .lr-node,
  .lr-edge--sig,
  .lr-mesh {
    animation: none;
  }
  .lr-rise {
    opacity: 1;
  }
}
</style>
