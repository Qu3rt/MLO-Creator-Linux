// Export the grid project "New House" (resource try_house_123) through the rebuilt editor.
const M = window.MLO;
if (!M) return 'no MLO';
try { if (M.UI && M.UI.closeModal) M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('New House');
await new Promise(r => setTimeout(r, 2000));
const md = document.getElementById('modal'); if (md) md.hidden = true;
M.App.setTab('export');
await new Promise(r => setTimeout(r, 800));
const btns = [...document.querySelectorAll('button')];
const b = btns.find(x => /Export resource/i.test(x.textContent || ''));
if (!b) return JSON.stringify({ error: 'no export button', buttons: btns.map(x => (x.textContent || '').trim()).filter(Boolean).slice(-40) });
b.click();
for (let i = 0; i < 900; i++) { await new Promise(r => setTimeout(r, 1000)); const t = document.body.innerText; if (/Done: |Export failed:/.test(t)) break; }
const t = document.body.innerText;
return t.split('\n').filter(l => /Done:|Export failed|Warning:|Meshing|collision|triangles|portals|door|garage|furniture|textures|game file/i.test(l)).slice(-80).join('\n');
