const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const sh = M.Model.state.project.shell;
return JSON.stringify({ rooms: sh.ops, boards: (sh.skirting || []).map(b => ({ a: b.a, b: b.b, n: b.n, h: b.h, t: b.t, tex: b.tex })) });
