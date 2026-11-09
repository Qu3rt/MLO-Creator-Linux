const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
M.App.setTab('build'); M.App.setTool('skirt');
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
cam.target = [-7.22, -3.0, 1.0]; cam.dist = 2.2; cam.yaw = 0; cam.pitch = 0.12; cam.update(rect.width / rect.height);
await new Promise(r => requestAnimationFrame(r));
const pt = cam.project([-7.22, -3.0, 1.0], rect.width, rect.height);
const e = { clientX: rect.left + pt[0], clientY: rect.top + pt[1], button: 0, buttons: 1, pointerId: 1, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, stopPropagation() {} };
const ray = M.Tools.api.pointerRay(e), f = M.ImportModel.pickOriginal(ray), sp = M.ShellTools.pick(ray);
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 800));
const boards = M.Model.state.project.shell.skirting || [];
return JSON.stringify({ f: f && { g: f.g, tri: f.tri, t: f.t }, sp: sp && { kind: sp.kind, t: sp.t, c: sp.pt ? sp.pt.c : sp.sg && sp.sg.c, u: sp.u }, boards: boards.map(b => ({ a: b.a, b: b.b, n: b.n })), tool: M.Model.state.shellTool });
