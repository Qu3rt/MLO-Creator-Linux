// Place a library door with the Models tool on a generated partition that already has a door cut.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const P = M.Model.state.project, FM = M.FitModels;
P.shell.parts = [{ id: 'p', o: 'V', c: -4.4, u0: -8.5, u1: 2.5, open: [{ id: 'o', type: 'door', u0: -3.45, u1: -2.55, z0: 0, z1: 2.1 }] }];
P.shell.openings = [];
M.App.remesh();
for (let i = 0; i < 80; i++) { if (FM.lib.loaded) break; await new Promise(r => setTimeout(r, 250)); }
if (!FM.lib.loaded) { try { await FM.loadLib(); } catch (e) {} }
for (let i = 0; i < 80; i++) { if (FM.lib.loaded) break; await new Promise(r => setTimeout(r, 250)); }
const all = [...FM.lib.byId.values()];
const dm = all.find(m => FM.kindOf(m.f) === 'door') || all[0];
if (!dm) return JSON.stringify({ error: 'no library model', loaded: FM.lib.loaded, files: FM.lib.files });
FM.chosen = dm.id;
M.App.setTab('build'); M.App.setTool('fit');
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
cam.target = [-4.4, -3, 1.1]; cam.dist = 1.5; cam.yaw = 0; cam.pitch = 0.2;
cam.update(rect.width / rect.height);
await new Promise(r => requestAnimationFrame(r));
const sp = cam.project([-4.4, -3, 1.1], rect.width, rect.height);
const e = { clientX: rect.left + sp[0], clientY: rect.top + sp[1], button: 0, buttons: 1, pointerId: 1, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, stopPropagation() {} };
const surf = M.ImportTools.surfaceAt(M.Tools.api.pointerRay(e));
const before = (P.import.fits || []).length;
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 700));
const fits = P.import.fits || [], last = fits[fits.length - 1];
return JSON.stringify({ model: dm.id, kind: DMK = FM.kindOf(dm.f), surfPN: !!(surf && surf.p && surf.n && surf.part), before, after: fits.length,
  last: last && { kind: last.kind, open: last.open, w: last.w, h: last.h, cut: last.cut, cx: last.cx, cy: last.cy, yaw: last.yaw },
  cutters: M.FitModels.cutters(P).length, panel: (document.getElementById('left').innerText.match(/Selected [^\n]*/) || [''])[0] });
