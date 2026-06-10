/**
 * 기업 지식 신경망 (3D) — 불규칙하게 흩어진 프로젝트 뉴런을 원근 투영으로 렌더.
 * 시냅스는 한 종류가 아니라 직선 · 곡선 · 다가닥 묶음 · 가지치기를 섞어 유기적으로 연결.
 * 자동 공전 + 드래그 궤도 회전 + 휠 줌. 노드 화면좌표는 screens 배열에 매 프레임 기록.
 */
export interface NetNode {
  color: string;
  locked: boolean;
  size: number;
  pos: [number, number, number];
}
export type Edge = [number, number];
export interface Screen {
  x: number;
  y: number;
  r: number;
  d: number;
}

type V3 = [number, number, number];
const TEAL = "#2bd4bd";
const RING = "#5f7bb0";

function rnd(s: number): number {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function add3(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scl3(a: V3, k: number): V3 { return [a[0] * k, a[1] * k, a[2] * k]; }
function cross(a: V3, b: V3): V3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit(v: V3): V3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function bez(p0: V3, c: V3, p1: V3, t: number): V3 {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1], u * u * p0[2] + 2 * u * t * c[2] + t * t * p1[2]];
}
function sample(p0: V3, c: V3, p1: V3, n: number): V3[] {
  const out: V3[] = [];
  for (let k = 0; k <= n; k++) out.push(bez(p0, c, p1, k / n));
  return out;
}

interface Strand { pts: V3[]; w: number; a: number }

/** 엣지 i를 다양한 시냅스 형태 중 하나로 — strands(3D 폴리라인) 생성 */
function buildSynapse(pa: V3, pb: V3, i: number): { strands: Strand[]; pulse: V3[] } {
  const mid = scl3(add3(pa, pb), 0.5);
  const out = unit(mid); // 바깥 방향
  const chord = sub3(pb, pa);
  const perp = unit(cross(chord, out.some((v) => v) ? out : [0, 1, 0]));
  const r = rnd(i * 1.7 + 0.3);
  const bul = (k: number): V3 => add3(mid, scl3(out, k)); // 바깥으로 부푼 제어점

  const strands: Strand[] = [];
  let pulse: V3[];

  if (r < 0.55) {
    // 직선
    const s = [pa, pb];
    strands.push({ pts: s, w: 1.1, a: 1 });
    pulse = s;
  } else if (r < 0.85) {
    // 완만한 곡선
    const s = sample(pa, bul(0.08 + rnd(i) * 0.08), pb, 14);
    strands.push({ pts: s, w: 1.1, a: 1 });
    pulse = s;
  } else {
    // 가벼운 2가닥 (직선 + 완만한 곡선)
    strands.push({ pts: [pa, pb], w: 0.7, a: 0.45 });
    const main = sample(pa, add3(bul(0.12), scl3(perp, 0.05)), pb, 14);
    strands.push({ pts: main, w: 1.05, a: 0.95 });
    pulse = main;
  }
  return { strands, pulse };
}

export function createNeuralNetwork(
  canvas: HTMLCanvasElement,
  nodes: NetNode[],
  edges: Edge[],
  screens: Screen[],
  getZoom?: () => number,
) {
  const ctx = canvas.getContext("2d")!;
  const balls = nodes.map((n) => buildBall(Math.min(52, Math.round(16 + n.size * 0.26))));

  const ed = edges.map((e, i) => {
    const hub = e[0] === 0 || e[1] === 0;
    const syn = buildSynapse(nodes[e[0]].pos, nodes[e[1]].pos, i);
    const pulses = Array.from({ length: hub ? 2 : 1 }, (_, k) => ({ t: (k / (hub ? 2 : 1) + i * 0.13) % 1, sp: 0.0022 + (i % 3) * 0.0006 }));
    return { e, hub, syn, pulses };
  });

  let raf = 0, last = 0, spin = 0, yaw = 0.2, pitch = -0.28, W = 0, H = 0;
  let cy_ = 0, sy_ = 0, cp_ = 0, sp_ = 0, R_ = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const F = 2.7; // 원근 강도(작을수록 입체감↑)
  function refreshCam() {
    cy_ = Math.cos(yaw); sy_ = Math.sin(yaw); cp_ = Math.cos(pitch); sp_ = Math.sin(pitch);
    R_ = Math.min(W, H) * 0.38 * (getZoom?.() ?? 1);
  }
  function proj(p: V3): [number, number, number, number] {
    const x1 = p[0] * cy_ + p[2] * sy_;
    const z1 = -p[0] * sy_ + p[2] * cy_;
    const y2 = p[1] * cp_ - z1 * sp_;
    const z2 = p[1] * sp_ + z1 * cp_;
    const s = Math.min(2.6, F / (F - z2));
    return [W / 2 + x1 * R_ * s, H / 2 + y2 * R_ * s, z2, s];
  }

  function drawBall(cx: number, cy: number, rad: number, color: string, locked: boolean, ball: Ball, fade: number) {
    const col = locked ? "#69799a" : color;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad * 1.5);
    g.addColorStop(0, rgba(col, (locked ? 0.12 : 0.28) * fade));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 1.5, 0, Math.PI * 2); ctx.fill();

    const tilt = -0.26;
    const pr = ball.pts.map((p): [number, number, number] => {
      const x = p[0] * Math.cos(spin) + p[2] * Math.sin(spin);
      let z = -p[0] * Math.sin(spin) + p[2] * Math.cos(spin);
      let y = p[1];
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      z = y * Math.sin(tilt) + z * Math.cos(tilt); y = y2;
      const sc = rad / (2.4 - z);
      return [cx + x * sc, cy + y * sc, (z + 1) / 2];
    });
    ctx.lineWidth = Math.max(0.4, rad * 0.012);
    for (const [i, j] of ball.edges) {
      const a = pr[i], b = pr[j];
      ctx.strokeStyle = rgba(col, (locked ? 0.1 : 0.24) * ((a[2] + b[2]) / 2) * fade);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    const order = pr.map((_, i) => i).sort((i, j) => pr[i][2] - pr[j][2]);
    const dotBase = rad * 0.075;
    for (const i of order) {
      const [x, y, d] = pr[i];
      ctx.beginPath(); ctx.arc(x, y, dotBase * (0.5 + d), 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, (locked ? 0.55 : 1) * (0.35 + d * 0.65) * fade);
      ctx.shadowBlur = locked ? 0 : 5 * d; ctx.shadowColor = col; ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function draw(now: number) {
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    spin += 0.0016; yaw += 0.0009;
    refreshCam();
    ctx.clearRect(0, 0, W, H);

    const P = nodes.map((n) => proj(n.pos));
    for (let i = 0; i < nodes.length; i++) {
      screens[i].x = P[i][0]; screens[i].y = P[i][1];
      screens[i].r = (nodes[i].size / 2) * P[i][3];
      screens[i].d = (P[i][2] + 1) / 2;
    }

    // 시냅스 (뒤→앞)
    const eOrder = ed.map((s, i) => ({ i, z: (P[s.e[0]][2] + P[s.e[1]][2]) / 2 })).sort((a, b) => a.z - b.z);
    for (const { i } of eOrder) {
      const seg = ed[i];
      const depth = ((P[seg.e[0]][2] + P[seg.e[1]][2]) / 2 + 1) / 2;
      const col = seg.hub ? TEAL : RING;
      for (const st of seg.syn.strands) {
        const pp = st.pts.map(proj);
        ctx.strokeStyle = rgba(col, (seg.hub ? 0.26 : 0.13) * st.a * (0.18 + depth * depth * 0.82));
        ctx.lineWidth = (seg.hub ? 1.3 : 0.95) * st.w * (0.6 + depth * 0.7);
        ctx.beginPath();
        ctx.moveTo(pp[0][0], pp[0][1]);
        for (let k = 1; k < pp.length; k++) ctx.lineTo(pp[k][0], pp[k][1]);
        ctx.stroke();
      }
      // 신호 임펄스 (메인 가닥 따라)
      const pcol = seg.hub ? TEAL : "#7fa6e0";
      const main = seg.syn.pulse;
      const N = main.length - 1;
      for (const pulse of seg.pulses) {
        pulse.t = (pulse.t + pulse.sp * (dt / 16)) % 1;
        const fi = pulse.t * N;
        const a = proj(main[Math.floor(fi)]), b = proj(main[Math.min(N, Math.ceil(fi))]);
        const fr = fi - Math.floor(fi);
        const x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr;
        const f = Math.sin(pulse.t * Math.PI) * (0.35 + depth * 0.65);
        ctx.beginPath(); ctx.arc(x, y, (seg.hub ? 2.5 : 1.8) * (0.6 + depth * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = rgba(pcol, (seg.hub ? 0.95 : 0.6) * f);
        ctx.shadowBlur = 9 * f; ctx.shadowColor = pcol; ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // 뉴런 (뒤→앞) — 깊이 대비 강하게(앞 또렷·뒤 흐릿)
    const nOrder = nodes.map((_, i) => i).sort((a, b) => P[a][2] - P[b][2]);
    for (const i of nOrder) {
      const d = (P[i][2] + 1) / 2;
      const fade = 0.22 + d * d * 0.78;
      drawBall(P[i][0], P[i][1], (nodes[i].size / 2) * P[i][3], nodes[i].color, nodes[i].locked, balls[i], fade);
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  window.addEventListener("resize", resize);

  return {
    orbit(dx: number, dy: number) {
      yaw += dx * 0.006;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.006));
    },
    reset() { yaw = 0.2; pitch = -0.28; },
    destroy() { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
  };
}

interface Ball { pts: V3[]; edges: [number, number][] }
function buildBall(count: number): Ball {
  const pts: V3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const d = pts.map((p, j) => [j, (p[0] - pts[i][0]) ** 2 + (p[1] - pts[i][1]) ** 2 + (p[2] - pts[i][2]) ** 2] as [number, number])
      .filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < 2; k++) {
      const j = d[k][0];
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
    }
  }
  return { pts, edges };
}

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${Math.max(0, a).toFixed(3)})`;
}
