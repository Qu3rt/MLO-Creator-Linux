const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const IM = M.ImportModel, P = M.Model.state.project, cs = (P.import.cutters || []).filter(k => k.type === 'door' || k.type === 'arch');
const faces = IM.shownFaces(); let found = null, tried = 0;
for (const f of faces) {
    if (++tried > 20000) break;
    const tris = IM.flatPatch(f.g, f.tri, f.file), r = IM.faceRect({ g: f.g, tris });
    if (!r || r.w < 1 || r.h < 1 || Math.abs(r.zb) > 0.6) continue;
    const fb = IM.faceBase({ g: f.g, tris }); if (!fb) continue;
    // a face whose base is on the same wall as one of the door cutters
    for (const s of fb.segments) {
        const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        for (const k of cs) {
            const wx = Math.cos(k.yaw), wy = Math.sin(k.yaw), par = Math.abs(wx * ux + wy * uy);
            const px = k.cx - s.a[0], py = k.cy - s.a[1], perp = Math.abs(-px * uy + py * ux), t = px * ux + py * uy;
            if (par > 0.85 && perp < 0.35 && t > -k.w / 2 && t < len + k.w / 2) { found = { f, r, fb, cutter: k, t, len, par, perp }; break; }
        }
        if (found) break;
    }
    if (found) break;
}
if (!found) return JSON.stringify({ error: 'no face near door cutter', cutters: cs, tried });
// Does any returned board segment cover the cutter centre?
const s = found.fb.segments, c = found.cutter;
const covers = s.some(q => {
    const dx = q.b[0] - q.a[0], dy = q.b[1] - q.a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    const t = (c.cx - q.a[0]) * ux + (c.cy - q.a[1]) * uy;
    return t > 0.02 && t < l - 0.02;
});
return JSON.stringify({ cutters: cs.map(k => ({ cx: k.cx, cy: k.cy, zb: k.zb, w: k.w, yaw: k.yaw })), face: { g: found.f.g, tri: found.f.tri, zb: found.r.zb }, segments: found.fb.segments.map(q => ({ a: q.a, b: q.b, n: q.n })), cutter: { cx: c.cx, cy: c.cy, w: c.w, zb: c.zb }, coversDoor: covers });
