// Used with --close-after: open the project, mark it changed, and let the window's close handler save it.
const M = window.MLO;
if (!M) return 'no MLO';
try { if (M.UI && M.UI.closeModal) M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
M.Model.touch();
await new Promise(r => setTimeout(r, 500));
return JSON.stringify({ loaded: !!(M.ImportModel && M.ImportModel.loaded), saved: M.Model.state.saved, dirty: M.Model.state.dirty });
