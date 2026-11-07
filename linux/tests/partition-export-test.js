// Add a door through a generated partition in an imported building, save it, then export.
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
canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerId: 1, bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 700));
const P = M.Model.state.project, added = P.shell.parts[0] && P.shell.parts[0].open;
await M.Model.save();
M.App.setTab('export');
await new Promise(r => setTimeout(r, 900));
const btns = [...document.querySelectorAll('button')];
const b = btns.find(x => /Export resource/i.test(x.textContent || ''));
if (!b) return JSON.stringify({ added, error: 'no export button', buttons: btns.map(x => (x.textContent || '').trim()).filter(Boolean).slice(-30) });
b.click();
for (let i = 0; i < 900; i++) { await new Promise(r => setTimeout(r, 1000)); const t = document.body.innerText; if (/Done: |Export failed:/.test(t)) break; }
const t = document.body.innerText;
const left = document.getElementById('left').innerText;
return JSON.stringify({ added, leftHasSelected: left.includes('Selected door'), leftSelectedAt: left.indexOf('Selected'), lines: t.split('\n').filter(l => /Done:|Export failed|meshing|triangles|collision|portals|texture|door/i.test(l)).slice(-40) });
