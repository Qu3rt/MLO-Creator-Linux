// Attach a library door to a partition cut and export it.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const P = M.Model.state.project, FM = M.FitModels;
for (let i = 0; i < 80; i++) { if (FM.lib.loaded) break; await new Promise(r => setTimeout(r, 250)); }
if (!FM.lib.loaded) { try { await FM.loadLib(); } catch (e) {} }
for (let i = 0; i < 80; i++) { if (FM.lib.loaded) break; await new Promise(r => setTimeout(r, 250)); }
const all = [...FM.lib.byId.values()], dm = all.find(m => FM.kindOf(m.f) === 'door') || all[0];
if (!dm) return JSON.stringify({ error: 'no library model', loaded: FM.lib.loaded });
FM.chosen = dm.id;
M.App.setTab('build'); M.App.setTool('fit');
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
cam.target = [-4.4, -3, 1.1]; cam.dist = 1.5; cam.yaw = 0; cam.pitch = 0.2;
cam.update(rect.width / rect.height);
await new Promise(r => requestAnimationFrame(r));
const sp = cam.project([-4.4, -3, 1.1], rect.width, rect.height);
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + sp[0], clientY: rect.top + sp[1], button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 800));
const fits = P.import.fits || [], last = fits[fits.length - 1];
await M.Model.save();
M.App.setTab('export');
await new Promise(r => setTimeout(r, 800));
const btn = [...document.querySelectorAll('button')].find(x => /Export resource/i.test(x.textContent || ''));
if (!btn) return JSON.stringify({ last, error: 'no export button', buttons: [...document.querySelectorAll('button')].map(x => x.textContent.trim()).filter(Boolean).slice(-30) });
btn.click();
for (let i = 0; i < 900; i++) { await new Promise(r => setTimeout(r, 1000)); const t = document.body.innerText; if (/Done: |Export failed:/.test(t)) break; }
const t = document.body.innerText;
return JSON.stringify({ model: dm.id, fits: fits.length, last: last && { kind: last.kind, open: last.open, w: last.w, h: last.h, cut: last.cut }, cutters: FM.cutters(P).length, lines: t.split('\n').filter(l => /Done:|Export failed|Meshing|door|doorway|triangles|portals|fitted/i.test(l)).slice(-30) });
