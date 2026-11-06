const M = window.MLO;
if (!M) return 'no MLO';
try { if (M.UI && M.UI.closeModal) M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
M.App.setTab('build');
try { M.App.frameAll(); } catch (e) {}
try { if (M.UI && M.UI.closeModal) M.UI.closeModal(); } catch (e) {}
const md = document.getElementById('modal'); if (md) md.hidden = true;
await new Promise(r => setTimeout(r, 1200));
return JSON.stringify({ loaded: !!(M.ImportModel && M.ImportModel.loaded), models: M.ImportModel ? M.ImportModel.models.length : 0, tris: M.App.built ? M.App.built.stats.tris : 0 });
