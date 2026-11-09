// Click a ground-level wall face with the Skirting tool and confirm a board is added and rendered.
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
    if (!fb || !fb.segments.length) continue;
    found = { f, tris, r, fb }; break;
}
if (!found) return JSON.stringify({ error: 'no ground wall face', tried, faces: faces.length });
const fb = found.fb, r = found.r, n = fb.segments[0].n;
M.App.setTab('build'); M.App.setTool('skirt');
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
const cx = r.cx, cy = r.cy, cz = r.zb + Math.min(1.0, r.h / 2);
cam.target = [cx, cy, cz]; cam.dist = 2.5; cam.yaw = Math.atan2(n[1], n[0]); cam.pitch = 0.12;
cam.update(rect.width / rect.height);
await new Promise(r => requestAnimationFrame(r));
const pt = cam.project([cx, cy, cz], rect.width, rect.height);
const e = { clientX: rect.left + pt[0], clientY: rect.top + pt[1], button: 0, buttons: 1, pointerId: 1, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, stopPropagation() {} };
const before = (M.Model.state.project.shell.skirting || []).length;
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 800));
const boards = M.Model.state.project.shell.skirting || [];
const trim = (M.App.built.batches || []).filter(b => b.tex === (M.Model.state.skirt || {}).tex || b.tex === 'trim_white').map(b => b.idx.length / 3);
const left = document.getElementById('left') ? document.getElementById('left').innerText : '';
return JSON.stringify({ face: { g: found.f.g, tri: found.f.tri, zb: r.zb, w: r.w, h: r.h }, base: { segs: fb.segments.length, n, a: fb.segments[0].a, b: fb.segments[0].b }, before, after: boards.length, board: boards[0] && { h: boards[0].h, t: boards[0].t, tex: boards[0].tex }, trim, panelHasSkirt: /Skirting/i.test(left), tool: M.Model.state.shellTool });
