const M = window.MLO;
if (!M) return 'no MLO';
try { if (M.UI && M.UI.closeModal) M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 240; i++) { await new Promise(r => setTimeout(r, 500)); if (M.ImportModel && M.ImportModel.loaded) break; }
const im = M.ImportModel, st = M.Model.state;
const out = { loaded: !!(im && im.loaded), kind: st.project.kind, target: st.project.import.target, models: im ? im.models.length : 0, textures: im ? Object.keys(im.textures).length : 0, tab: st.tab, cutters: st.project.import.cutters.length, deletes: st.project.import.deletes.length };
M.App.setTab('export');
await new Promise(r => setTimeout(r, 1000));
const btns = [...document.querySelectorAll('button')];
const b = btns.find(x => /Export resource/i.test(x.textContent || ''));
if (!b) return JSON.stringify(Object.assign(out, { error: 'no export button', buttons: btns.map(x => (x.textContent || '').trim()).filter(Boolean).slice(0, 50) }));
b.click();
for (let i = 0; i < 900; i++) { await new Promise(r => setTimeout(r, 1000)); const t = document.body.innerText; if (/Done: |Export failed:/.test(t)) break; }
const txt = document.body.innerText;
const lines = txt.split('\n').filter(l => /Done:|Export failed|Warning:|test spot|collision|triangles|portals|game file|plant|door|textures|models|vert/i.test(l));
return JSON.stringify(Object.assign(out, { lines: lines.slice(-80), tail: txt.slice(-3000) }));
