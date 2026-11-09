// Add skirting to a wall face, save and export it.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const IM = M.ImportModel, faces = IM.shownFaces(); let found = null, tried = 0;
for (const f of faces) {
    if (++tried > 12000) break;
    const tris = IM.flatPatch(f.g, f.tri, f.file), r = IM.faceRect({ g: f.g, tris });
    if (!r || r.w < 1.2 || r.h < 1.0 || Math.abs(r.zb) > 0.6) continue;
    const fb = IM.faceBase({ g: f.g, tris });
    if (fb && fb.segments.length) { found = { f, tris, r, fb }; break; }
}
if (!found) return JSON.stringify({ error: 'no wall face', tried });
const fb = found.fb;
M.Model.edit(P => { P.shell.skirting = fb.segments.map((s, i) => ({ id: 'sk' + i, a: s.a.slice(), b: s.b.slice(), n: s.n.slice(), h: 0.1, t: 0.016, tex: 'trim_white' })); });
await M.Model.save();
M.App.remesh();
const atSave = (M.Model.state.project.shell.skirting || []).length;
M.App.setTab('export');
await new Promise(r => setTimeout(r, 800));
const btn = [...document.querySelectorAll('button')].find(x => /Export resource/i.test(x.textContent || ''));
if (!btn) return JSON.stringify({ atSave, error: 'no export button' });
btn.click();
for (let i = 0; i < 900; i++) { await new Promise(r => setTimeout(r, 1000)); const t = document.body.innerText; if (/Done: |Export failed:/.test(t)) break; }
const t = document.body.innerText;
return JSON.stringify({ face: { g: found.f.g, tri: found.f.tri, zb: found.r.zb, w: found.r.w }, boards: atSave, trimTris: (M.App.built.batches || []).filter(b => b.tex === 'trim_white').reduce((n, b) => n + b.idx.length / 3, 0), lines: t.split('\n').filter(l => /Done:|Export failed|Meshing|int:|textures|game file/i.test(l)).slice(-15) });
