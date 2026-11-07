// Check that Door/Window on a generated partition adds a shell opening (imported building).
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
M.App.setTab('build');
const md = document.getElementById('modal'); if (md) md.hidden = true;
M.App.setTool('door');
const cam = M.App.renderer.camera, canvas = document.getElementById('gl'), rect = canvas.getBoundingClientRect();
cam.target = [-4.4, -3, 1.2]; cam.dist = 1.5; cam.yaw = 0; cam.pitch = 0.2;
cam.update(rect.width / rect.height);
await new Promise(r => requestAnimationFrame(r));
const p = cam.project([-4.4, -3, 1.2], rect.width, rect.height);
const e = { clientX: rect.left + p[0], clientY: rect.top + p[1], button: 0, buttons: 1, pointerId: 1, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, stopPropagation() {} };
const surf = M.ImportTools.surfaceAt(M.Tools.api.pointerRay(e));
const before = JSON.stringify((M.Model.state.project.shell.parts[0] || {}).open || []);
const pe = new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false });
canvas.dispatchEvent(pe);
await new Promise(r => setTimeout(r, 700));
const P = M.Model.state.project, after = P.shell.parts[0] && P.shell.parts[0].open;
const left = document.getElementById('left') ? document.getElementById('left').innerText : '';
return JSON.stringify({ surf: surf && (surf.part ? 'part' : (surf.shell ? 'seg' : 'model')), before, after, sel: M.Model.state.shellSel, cutSel: M.Model.state.cutSel, tab: M.Model.state.tab, cutters: P.import.cutters.length, panelHasSelected: left.includes('Selected'), panelSelectedAt: left.indexOf('Selected'), panelLen: left.length, panelTail: left.slice(-500) });
