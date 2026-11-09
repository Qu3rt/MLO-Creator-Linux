const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const IM = M.ImportModel, P = M.Model.state.project;
const cutters = (P.import.cutters || []).map(k => ({ type: k.type, face: !!k.face, cx: k.cx, cy: k.cy, zb: k.zb, w: k.w, h: k.h, yaw: k.yaw, leaf: !!k.leaf }));
const fits = (P.import.fits || []).map(f => ({ kind: f.kind, open: f.open, cx: f.cx, cy: f.cy, w: f.w, h: f.h, yaw: f.yaw }));
const rects = M.Shell.regionRects(P.shell);
const faces = IM.shownFaces(); let acc = 0, blocked = 0; const samples = [];
for (const f of faces) {
    if (acc + blocked > 4000) break;
    const tris = IM.flatPatch(f.g, f.tri, f.file), r = IM.faceRect({ g: f.g, tris });
    if (!r || r.h < 1 || r.w < 0.5) continue;
    const fb = IM.faceBase({ g: f.g, tris });
    if (fb) { acc++; if (samples.length < 3) samples.push({ g: f.g, tri: f.tri, zb: r.zb, n: fb.segments[0].n, segs: fb.segments.length }); }
    else blocked++;
}
return JSON.stringify({ rects, cutters, fits, acc, blocked, samples });
