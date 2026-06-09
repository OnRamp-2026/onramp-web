// 3D 뉴런 구체(brain orb) 엔진 — 노드를 구 표면에 고정 배치하고 강체 회전.
// force 시뮬 없음(꿈틀거림 X). 천천히 회전 + 드래그 회전 + 줌 + 검색 시 해당 뉴런이 앞으로.

export interface SInNode { id: string; group: string; parent: string | null; kind: string; title: string; color: string }
export interface SInEdge { a: string; b: string; type?: "s" }

type V3 = [number, number, number];
type Role = "exec" | "mid" | "ops";
interface N { id: string; dir: V3; rad: number; r: number; color: string; kind: string; title: string;
  sx: number; sy: number; depth: number; persp: number; alpha: number; scale: number }

interface Opts { onHover?: (id: string | null) => void; onSelect?: (id: string | null) => void; onBgClick?: () => void }

const GA = 2.39996323;
const norm = (v: V3): V3 => { const m = Math.hypot(...v) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// (0,0,1) 로컬을 axis 방향으로 회전시키는 기저로 변환
function capDirs(axis: V3, count: number, capAngle: number): V3[] {
  const ref: V3 = Math.abs(axis[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
  const u = norm(cross(ref, axis));
  const v = cross(axis, u);
  const out: V3[] = [];
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const cz = 1 - t * (1 - Math.cos(capAngle));
    const sz = Math.sqrt(Math.max(0, 1 - cz * cz));
    const phi = i * GA;
    const lx = sz * Math.cos(phi), ly = sz * Math.sin(phi), lz = cz;
    out.push([
      lx * u[0] + ly * v[0] + lz * axis[0],
      lx * u[1] + ly * v[1] + lz * axis[1],
      lx * u[2] + ly * v[2] + lz * axis[2],
    ]);
  }
  return out;
}

export function createSphereGraph(canvas: HTMLCanvasElement, opts: Opts = {}) {
  const ctx = canvas.getContext("2d")!;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let cw = 0, ch = 0;
  const R = 250;

  let nodes: N[] = [];
  const byId = new Map<string, N>();
  let edges: { a: N; b: N; sem: boolean }[] = [];
  const adj = new Map<string, Set<string>>();
  let role: Role = "ops";

  let rotY = 0.4, rotX = -0.15;
  let tgt = { y: rotY, x: rotX, on: false };
  let zoom = 1;
  let autorotate = true;

  let hover: string | null = null;
  let selected: string | null = null;
  let dragging = false, downMoved = 0, lastX = 0, lastY = 0;

  let dense = new Set<string>(), expanded = new Set<string>(), hlActive = false;
  let raf = 0; const t0 = performance.now(); let last = t0;

  // 뉴런 스프라이트
  const sprites = new Map<string, HTMLCanvasElement>();
  function sprite(color: string) {
    let s = sprites.get(color); if (s) return s;
    const S = 96; s = document.createElement("canvas"); s.width = s.height = S;
    const c = s.getContext("2d")!; const cx = S / 2, core = S * 0.22;
    const g = c.createRadialGradient(cx, cx, core * 0.3, cx, cx, S / 2);
    g.addColorStop(0, hexA(color, 0.5)); g.addColorStop(0.45, hexA(color, 0.12)); g.addColorStop(1, hexA(color, 0));
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    const sp = c.createRadialGradient(cx - core * 0.4, cx - core * 0.4, core * 0.1, cx, cx, core);
    sp.addColorStop(0, mix(color, "#ffffff", 0.7)); sp.addColorStop(0.5, color); sp.addColorStop(1, mix(color, "#0a1430", 0.4));
    c.beginPath(); c.arc(cx, cx, core, 0, 7); c.fillStyle = sp; c.fill();
    sprites.set(color, s); return s;
  }

  function setData(inN: SInNode[], inE: SInEdge[]) {
    // 그룹(소스) 방향 — 피보나치 분산
    const groups = [...new Set(inN.filter((n) => n.kind !== "root").map((n) => n.group))];
    const gdir = new Map<string, V3>();
    groups.forEach((g, i) => {
      const y = 1 - 2 * (i + 0.5) / groups.length;
      const rr = Math.sqrt(Math.max(0, 1 - y * y)); const th = i * GA;
      gdir.set(g, norm([rr * Math.cos(th), y, rr * Math.sin(th)]));
    });
    // 폴더 방향 — 소스 캡 안에
    const foldersByG = new Map<string, SInNode[]>();
    for (const n of inN) if (n.kind === "folder") (foldersByG.get(n.group) ?? foldersByG.set(n.group, []).get(n.group)!).push(n);
    const fdir = new Map<string, V3>();
    for (const [g, fs] of foldersByG) {
      const cap = Math.min(1.05, 0.45 + fs.length * 0.03);
      const dirs = capDirs(gdir.get(g)!, fs.length, cap);
      fs.forEach((f, i) => fdir.set(f.id, dirs[i]));
    }
    // 페이지 방향 — 부모 폴더 캡 안에
    const pagesByP = new Map<string, SInNode[]>();
    for (const n of inN) if (n.kind === "page") (pagesByP.get(n.parent ?? "_") ?? pagesByP.set(n.parent ?? "_", []).get(n.parent ?? "_")!).push(n);
    const pdir = new Map<string, V3>();
    for (const [par, ps] of pagesByP) {
      const axis = fdir.get(par) ?? gdir.get(par.replace("SRC::", "")) ?? [0, 0, 1];
      const cap = Math.min(0.5, 0.1 + Math.sqrt(ps.length) * 0.035);
      const dirs = capDirs(axis as V3, ps.length, cap);
      ps.forEach((p, i) => pdir.set(p.id, dirs[i]));
    }

    nodes = inN.map((n) => {
      let dir: V3 = [0, 0, 0]; let rad = R; let r = 1.6;
      if (n.kind === "root") { dir = [0, 0, 0]; rad = 0; r = 7; }
      else if (n.kind === "source") { dir = gdir.get(n.group)!; r = 5.2; }
      else if (n.kind === "folder") { dir = fdir.get(n.id)!; r = 2.4; rad = R * 0.97; }
      else { dir = pdir.get(n.id) ?? [0, 0, 1]; r = 1.5; rad = R * (0.9 + ((hashId(n.id) % 100) / 100) * 0.1); }
      return { id: n.id, dir, rad, r, color: n.color, kind: n.kind, title: n.title, sx: 0, sy: 0, depth: 0, persp: 1, alpha: 1, scale: 1 };
    });
    byId.clear(); adj.clear();
    for (const n of nodes) { byId.set(n.id, n); adj.set(n.id, new Set()); }
    edges = [];
    for (const e of inE) { const a = byId.get(e.a), b = byId.get(e.b); if (a && b) { edges.push({ a, b, sem: e.type === "s" }); adj.get(a.id)!.add(b.id); adj.get(b.id)!.add(a.id); } }
    hover = selected = null; dense.clear(); expanded.clear(); hlActive = false; resetView();
  }

  function neighborsOf(id: string | null) { if (!id) return null; const s = new Set([id]); for (const n of adj.get(id) ?? []) s.add(n); return s; }

  function project() {
    const cy = Math.cos(rotY), sy = Math.sin(rotY), cx2 = Math.cos(rotX), sx2 = Math.sin(rotX);
    const f = 720, ox = cw / 2, oy = ch / 2;
    for (const n of nodes) {
      const x = n.dir[0] * n.rad, y = n.dir[1] * n.rad, z = n.dir[2] * n.rad;
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y;
      const y2 = y1 * cx2 - z1 * sx2, z2 = y1 * sx2 + z1 * cx2;
      const persp = f / (f - z2);
      n.sx = ox + x1 * persp * zoom; n.sy = oy - y2 * persp * zoom;
      n.depth = (z2 + R) / (2 * R); n.persp = persp;
    }
  }

  function draw() {
    const time = (performance.now() - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 배경 (딥 네이비 + 중심 글로우)
    const bg = ctx.createRadialGradient(cw / 2, ch / 2, 40, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
    bg.addColorStop(0, "#12203f"); bg.addColorStop(1, "#070d1c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

    project();
    const focus = hlActive ? new Set([...dense, ...expanded]) : neighborsOf(hover ?? selected);

    // 시냅스(엣지) — 계층(회색) + 의미/온톨로지(틸, 구를 가로지름)
    for (const e of edges) {
      const inF = focus ? (focus.has(e.a.id) && focus.has(e.b.id)) : false;
      const touch = focus ? (focus.has(e.a.id) || focus.has(e.b.id)) : false;
      const off = focus && !inF && !(e.sem && touch);
      const d = (e.a.depth + e.b.depth) / 2;
      ctx.beginPath();
      if (e.sem) {
        // 의미 엣지: 살짝 휜 곡선으로 구를 가로지르는 느낌
        const mx = (e.a.sx + e.b.sx) / 2, my = (e.a.sy + e.b.sy) / 2;
        const off2 = 18 * (0.6 + d);
        ctx.moveTo(e.a.sx, e.a.sy); ctx.quadraticCurveTo(mx, my - off2, e.b.sx, e.b.sy);
        ctx.strokeStyle = (inF || touch) ? "rgba(43,212,189,0.7)" : `rgba(43,212,189,${off ? 0.03 : 0.07 + d * 0.06})`;
        ctx.lineWidth = (inF || touch) ? 1.4 : 0.7;
      } else {
        ctx.moveTo(e.a.sx, e.a.sy); ctx.lineTo(e.b.sx, e.b.sy);
        ctx.strokeStyle = inF ? "rgba(120,225,255,0.8)" : `rgba(130,165,215,${off ? 0.02 : 0.04 + d * 0.06})`;
        ctx.lineWidth = inF ? 1.5 : 0.8;
      }
      ctx.stroke();
    }
    // 검색 끌어오기
    if (hlActive) {
      ctx.save(); ctx.setLineDash([3, 6]); ctx.lineDashOffset = -time * 20; ctx.strokeStyle = "rgba(43,212,189,0.9)"; ctx.lineWidth = 1.8;
      for (const dId of dense) for (const eId of expanded) if (adj.get(dId)?.has(eId)) {
        const a = byId.get(dId)!, b = byId.get(eId)!; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }
      ctx.restore();
    }

    const order = nodes.slice().sort((a, b) => a.depth - b.depth);
    for (const n of order) {
      const inF = !focus || focus.has(n.id);
      n.alpha += ((inF ? 1 : 0.12) - n.alpha) * 0.18;
      n.scale += ((hover === n.id ? 1.6 : inF ? 1 : 0.8) - n.scale) * 0.18;
      const baseA = 0.3 + n.depth * 0.7;
      const rs = n.r * n.persp * zoom * n.scale;
      const drawR = rs * 3;
      if (n.sx + drawR < 0 || n.sx - drawR > cw || n.sy + drawR < 0 || n.sy - drawR > ch) continue;
      ctx.globalAlpha = Math.min(1, baseA * n.alpha);
      if (dense.has(n.id)) {
        const p = (Math.sin(time * 3) + 1) / 2;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, rs + 5 + p * 6, 0, 7); ctx.strokeStyle = hexA(n.color, 0.6 - p * 0.5); ctx.lineWidth = 2; ctx.stroke();
      }
      if (expanded.has(n.id)) { ctx.save(); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(n.sx, n.sy, rs + 4, 0, 7); ctx.strokeStyle = "rgba(43,212,189,0.9)"; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore(); }
      ctx.drawImage(sprite(n.color), n.sx - drawR, n.sy - drawR, drawR * 2, drawR * 2);
      if (selected === n.id) { ctx.beginPath(); ctx.arc(n.sx, n.sy, rs + 2.5, 0, 7); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    // 라벨 — 우선순위 + 충돌 회피로 절대 안 겹치게
    drawLabels(focus);
  }

  // 라벨 후보를 우선순위·깊이 순으로 정렬 후, 이미 놓인 라벨과 겹치면 스킵
  function drawLabels(focus: Set<string> | null) {
    const prio = (n: N) => {
      if (selected === n.id || hover === n.id) return 0;
      if (dense.has(n.id)) return 1;
      if (expanded.has(n.id)) return 2;
      if (n.kind === "root" || n.kind === "source") return 3;
      if (n.kind === "folder" && (!focus || focus.has(n.id))) return 4;
      return 9; // 페이지는 호버/검색일 때만(아래서 컷)
    };
    const cands = nodes
      .filter((n) => {
        if (n.depth < 0.36) return false; // 뒷면 라벨 X
        const p = prio(n);
        if (p === 9) return false; // 페이지는 hover/dense/expanded(=prio<9)만 통과
        if (focus && !focus.has(n.id) && p > 3) return false; // 포커스 중엔 무관 폴더 라벨 끔
        if (!focus && role === "exec" && p === 4) return false; // C레벨: 폴더 라벨 숨김(소스만)
        return true;
      })
      .sort((a, b) => prio(a) - prio(b) || b.depth - a.depth);

    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const hit = (x: number, y: number, w: number, h: number) =>
      placed.some((r) => Math.abs(x - r.x) < (w + r.w) / 2 + 6 && Math.abs(y - r.y) < (h + r.h) / 2 + 3);

    for (const n of cands) {
      const big = n.r > 4.5;
      const fs = big ? 13 : 10.5;
      ctx.font = `${big ? 700 : 500} ${fs}px ${big ? "Poppins" : "Pretendard"}, sans-serif`;
      const label = n.title.length > 34 ? n.title.slice(0, 32) + "…" : n.title;
      const w = ctx.measureText(label).width, h = fs + 2;
      const rs = n.r * n.persp * zoom * n.scale;
      const cx = n.sx, cy = n.sy + rs + 3 + h / 2;
      const isFocusNode = selected === n.id || hover === n.id || dense.has(n.id) || expanded.has(n.id);
      if (!isFocusNode && hit(cx, cy, w, h)) continue; // 허브/일반 라벨은 겹치면 양보 (포커스 라벨은 항상)
      placed.push({ x: cx, y: cy, w, h });
      ctx.globalAlpha = focus ? (focus.has(n.id) ? 1 : 0.3) : (0.45 + n.depth * 0.55);
      ctx.lineWidth = 3.4; ctx.strokeStyle = "rgba(7,13,28,0.95)"; ctx.lineJoin = "round";
      ctx.strokeText(label, n.sx, n.sy + rs + 3);
      ctx.fillStyle = big || isFocusNode ? "#fff" : "#c2d4ee";
      ctx.fillText(label, n.sx, n.sy + rs + 3);
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const idle = !dragging && !hover && !hlActive && !tgt.on;
    if (autorotate && idle) rotY += dt * 0.12;
    if (tgt.on) {
      rotY += (tgt.y - rotY) * 0.1; rotX += (tgt.x - rotX) * 0.1;
      if (Math.abs(tgt.y - rotY) < 0.002 && Math.abs(tgt.x - rotX) < 0.002) tgt.on = false;
    }
    draw(); raf = requestAnimationFrame(loop);
  }

  function faceDir(dir: V3) {
    const ty = Math.atan2(-dir[0], dir[2]);
    const tx = Math.atan2(dir[1], Math.hypot(dir[0], dir[2]));
    tgt = { y: ty, x: tx, on: true };
  }
  function resetView() { zoom = 1; tgt = { y: 0.4, x: -0.15, on: true }; }

  function pick(mx: number, my: number): N | null {
    let best: N | null = null, bd = 1e9;
    for (const n of nodes) {
      if (n.depth < 0.32) continue; // 뒷면 무시
      const d = Math.hypot(n.sx - mx, n.sy - my);
      const hit = Math.max(7, n.r * n.persp * zoom + 5);
      if (d < hit && d < bd) { best = n; bd = d; }
    }
    return best;
  }

  function rel(e: { clientX: number; clientY: number }) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e: PointerEvent) { const m = rel(e); dragging = true; downMoved = 0; lastX = m.x; lastY = m.y; tgt.on = false; canvas.setPointerCapture(e.pointerId); }
  function onMove(e: PointerEvent) {
    const m = rel(e);
    if (dragging) {
      const dx = m.x - lastX, dy = m.y - lastY; lastX = m.x; lastY = m.y; downMoved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.006; rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.006));
    } else {
      const n = pick(m.x, m.y); const id = n?.id ?? null;
      if (id !== hover) { hover = id; opts.onHover?.(id); canvas.style.cursor = id ? "pointer" : "grab"; }
    }
  }
  function onUp(e: PointerEvent) {
    if (dragging && downMoved < 4) {
      const m = rel(e); const n = pick(m.x, m.y);
      if (n) { selected = selected === n.id ? null : n.id; opts.onSelect?.(selected); if (selected) faceDir(n.dir); }
      else { selected = null; opts.onSelect?.(null); opts.onBgClick?.(); }
    }
    dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch { /* */ }
  }
  function onWheel(e: WheelEvent) { e.preventDefault(); zoom = Math.max(0.5, Math.min(4, zoom * Math.exp(-e.deltaY * 0.0012))); }

  function setHighlight(d: string[], ex: string[]) {
    dense = new Set(d); expanded = new Set(ex); hlActive = d.length > 0;
    if (hlActive) {
      const ns = [...dense, ...expanded].map((i) => byId.get(i)!).filter(Boolean);
      if (ns.length) { const avg: V3 = [0, 0, 0]; for (const n of ns) { avg[0] += n.dir[0]; avg[1] += n.dir[1]; avg[2] += n.dir[2]; } faceDir(norm(avg)); zoom = 1.5; }
    } else resetView();
  }
  function setSelected(id: string | null) { selected = id; const n = id ? byId.get(id) : null; if (n) faceDir(n.dir); }
  function setAutorotate(v: boolean) { autorotate = v; }
  function setRole(r: Role) { role = r; zoom = r === "exec" ? 0.82 : 1; if (r === "exec") { selected = null; opts.onSelect?.(null); } }

  const ro = new ResizeObserver(() => resize());
  function resize() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = cw * dpr; canvas.height = ch * dpr; }
  ro.observe(canvas); resize();
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.style.cursor = "grab"; loop();

  function destroy() {
    cancelAnimationFrame(raf); ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("wheel", onWheel);
  }
  return { setData, setHighlight, setSelected, setAutorotate, setRole, resetView, destroy };
}

function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function hexA(hex: string, a: number) { const c = parse(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function mix(h1: string, h2: string, t: number) { const a = parse(h1), b = parse(h2); return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`; }
function parse(hex: string) { let h = hex.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return { r: parseInt(h.slice(0, 2), 16) || 30, g: parseInt(h.slice(2, 4), 16) || 40, b: parseInt(h.slice(4, 6), 16) || 70 }; }
