// Find a wall face with a straight base, add skirting, and check the built interior.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const IM = M.ImportModel, faces = IM.shownFaces(); let found = null, tried = 0;
for (const f of faces) {
    if (++tried > 5000) break;
    const tris = IM.flatPatch(f.g, f.tri, f.file), r = IM.faceRect({ g: f.g, tris });
    if (!r || r.w < 1.0 || r.h < 1.2) continue;
    const fb = IM.faceBase({ g: f.g, tris });
    if (!fb || !fb.segments.length) continue;
    found = { f, tris, r, fb }; break;
}
if (!found) return JSON.stringify({ error: 'no wall face', faces: faces.length });
const fb = found.fb, seg = fb.segments[0], S = M.Model.state;
M.Model.edit(P => { P.shell.skirting = fb.segments.map((s, i) => ({ id: 't' + i, a: s.a.slice(), b: s.b.slice(), n: s.n.slice(), h: 0.1, t: 0.016, tex: 'trim_white' })); });
M.App.remesh();
const batches = M.App.built.batches.filter(b => b.tex === 'trim_white').map(b => ({ tex: b.tex, verts: b.pos.length / 3, tris: b.idx.length / 3 }));
return JSON.stringify({ faces: faces.length, tried, face: { g: found.f.g, tri: found.f.tri, r: { w: found.r.w, h: found.r.h, zb: found.r.zb } }, base: { segs: fb.segments.length, a: seg.a, b: seg.b, n: seg.n, len: Math.hypot(seg.b[0]-seg.a[0], seg.b[1]-seg.a[1]) }, boards: S.project.shell.skirting.length, trimBatches: batches, tris: M.App.built.stats.tris });
