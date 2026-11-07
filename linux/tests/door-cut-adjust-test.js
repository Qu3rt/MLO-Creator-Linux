// Default cut equals the door; changing Cut width/height changes the actual attached partition, boundary or model cut.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const FM = M.FitModels, P = M.Model.state.project;
const base = { cx: -4.4, cy: -3, zb: 0, yaw: -Math.PI / 2, w: 0.9, h: 2.1, d: 0.08, m: 'none', kind: 'door' };
const defaults = FM.doorCut({ cx: 0, cy: 0, zb: 0, w: 1.0, h: 2.1, d: 0.08, kind: 'door' });
// partition
P.shell.parts = [{ id: 'p', o: 'V', c: -4.4, u0: -8.5, u1: 2.5, open: [{ id: 'o', type: 'door', u0: -3.45, u1: -2.55, z0: 0, z1: 2.1 }] }];
P.shell.openings = []; P.import.cutters = []; P.import.fits = [];
const rp = FM.findOpening(base), fp = FM.openingFit(base, rp);
P.import.fits = [Object.assign({ id: 'd', kind: 'door' }, fp)]; FM.sel = 'd';
FM.set({ cut: { w: 1.1, h: 2.2, du: 0, dz: 0 } }, 'd');
const po = P.shell.parts[0].open[0];
// outside model cutter
const c = { id: 'c1', face: { g: 0, tris: [], added: [] }, type: 'door', cx: -4.4, cy: -3, zb: 0, w: 0.9, h: 2.1, yaw: -Math.PI / 2, d: 0.8 };
P.shell.parts = []; P.import.cutters = [c]; P.import.fits = [];
const rc = FM.findOpening(base), fc = FM.openingFit(base, rc);
P.import.fits = [Object.assign({ id: 'd2', kind: 'door' }, fc)]; FM.sel = 'd2';
FM.set({ cut: { w: 1.2, h: 2.3, du: 0, dz: 0 } }, 'd2');
const kc = P.import.cutters[0];
// room boundary shell opening
P.import.cutters = []; P.import.fits = []; P.shell.openings = [{ id: 'b', o: 'V', c: -4.4, u0: -3.45, u1: -2.55, z0: 0, z1: 2.1, type: 'door' }];
const rb = FM.findOpening(base), fb = FM.openingFit(base, rb);
P.import.fits = [Object.assign({ id: 'd3', kind: 'door' }, fb)]; FM.sel = 'd3';
FM.set({ cut: { w: 1.05, h: 2.15, du: 0, dz: 0 } }, 'd3');
const bo = P.shell.openings[0];
const gcut = M.GridModels.cut({ kind: 'door', cx: 0, cy: 0, zb: 0, w: 1.0, h: 2.1, d: 0.1 });
return JSON.stringify({
  defaults: { w: defaults.w, h: defaults.h },
  partition: { fittedW: fp.w, fittedH: fp.h, cutW: fp.cut.w, cutH: fp.cut.h, open: fp.open, src: fp.src, opening: { u0: po.u0, u1: po.u1, z0: po.z0, z1: po.z1 } },
  cutter: { fittedW: fc.w, fittedH: fc.h, open: fc.open, src: fc.src, now: { w: kc.w, h: kc.h, zb: kc.zb, cx: kc.cx, cy: kc.cy } },
  boundary: { open: fb.open, src: fb.src, opening: { u0: bo.u0, u1: bo.u1, z0: bo.z0, z1: bo.z1 } },
  gridCut: gcut
});
