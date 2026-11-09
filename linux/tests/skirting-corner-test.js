// Add skirting on two real model wall faces that meet at a corner, frame the corner and leave a screenshot.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const IM = M.ImportModel, faces = IM.shownFaces(), cand = [];
for (const f of faces) {
    if (cand.length > 220) break;
    const tris = IM.flatPatch(f.g, f.tri, f.file), r = IM.faceRect({ g: f.g, tris });
    if (!r || r.w < 0.7 || r.h < 1.0 || Math.abs(r.zb) > 0.7) continue;
    const fb = IM.faceBase({ g: f.g, tris });
    if (fb && fb.segments.length) cand.push({ f, r, fb });
}
let pair = null;
for (let i = 0; i < cand.length && !pair; i++) for (let j = i + 1; j < cand.length && !pair; j++) {
    const a = cand[i], b = cand[j];
    for (const sa of a.fb.segments) for (const sb of b.fb.segments) {
        const d1 = Math.hypot(sa.a[0]-sb.a[0], sa.a[1]-sb.a[1]), d2 = Math.hypot(sa.a[0]-sb.b[0], sa.a[1]-sb.b[1]),
              d3 = Math.hypot(sa.b[0]-sb.a[0], sa.b[1]-sb.a[1]), d4 = Math.hypot(sa.b[0]-sb.b[0], sa.b[1]-sb.b[1]);
        const dd = Math.min(d1, d2, d3, d4), nd = sa.n[0]*sb.n[0] + sa.n[1]*sb.n[1];
        if (dd < 0.05 && nd < 0.8) {
            const p = d1 <= d2 && d1 <= d3 && d1 <= d4 ? sa.a : (d2 <= d3 && d2 <= d4 ? sa.a : (d3 <= d4 ? sa.b : sa.b));
            pair = { a, b, sa, sb, p, n1: sa.n, n2: sb.n }; break;
        }
    }
}
if (!pair) return JSON.stringify({ error: 'no adjacent wall faces', cand: cand.length });
const boards = [];
[pair.a, pair.b].forEach((c, q) => c.fb.segments.forEach((s, i) => boards.push({ id: 'c' + q + i, a: s.a.slice(), b: s.b.slice(), n: s.n.slice(), h: 0.1, t: 0.016, tex: 'trim_white' })));
M.Model.edit(P => { P.shell.skirting = boards; });
M.App.remesh();
const tris = M.Skirting.triangles(M.Model.state.project.shell);
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
let bx = pair.n1[0] + pair.n2[0], by = pair.n1[1] + pair.n2[1]; if (Math.hypot(bx, by) < 0.1) { bx = pair.n1[0]; by = pair.n1[1]; }
cam.target = [pair.p[0], pair.p[1], 0.25]; cam.dist = 2.2; cam.yaw = Math.atan2(by, bx); cam.pitch = 0.12;
cam.update(rect.width / rect.height);
await new Promise(r => setTimeout(r, 1200));
return JSON.stringify({ cand: cand.length, pair: { a: pair.f && pair.f.g, b: pair.f && pair.f.g }, point: pair.p, n1: pair.n1, n2: pair.n2, boards: boards.length, tris: tris.length, trimTris: (M.App.built.batches || []).filter(b => b.tex === 'trim_white').reduce((n, b) => n + b.idx.length / 3, 0) });
