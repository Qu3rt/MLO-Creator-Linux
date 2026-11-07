// Check that the Models-tool door attaches to generated shell cuts (partition and boundary) and to arch cutters,
// and that attaching turns off the door's own wall cut.
const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const FM = M.FitModels, P = M.Model.state.project;
const it = { cx: -4.4, cy: -3, zb: 0, yaw: -Math.PI / 2, w: 0.9, h: 2.1, d: 0.08, m: 'none', kind: 'door' };
// inside-to-inside: a partition opening
P.shell.parts = [{ id: 'p', o: 'V', c: -4.4, u0: -8.5, u1: 2.5, open: [{ id: 'o', type: 'door', u0: -3.45, u1: -2.55, z0: 0, z1: 2.1 }] }];
P.shell.openings = [];
const r = FM.findOpening(it), fit = FM.openingFit(it, r);
P.import.fits = [Object.assign({ id: 'd', kind: 'door', m: 'none', f: 'x' }, fit)];
const cuttersAfterAttach = FM.cutters(P).length;
// outside-to-inside: an Archway box cut (no faces)
P.shell.parts = []; P.import.fits = [];
P.import.cutters = [{ face: false, type: 'arch', cx: -4.4, cy: -3, zb: 0, w: 1.6, h: 2.3, yaw: -Math.PI / 2 }];
const r2 = FM.findOpening(it), fit2 = FM.openingFit(it, r2);
// outside-to-inside: a face door cut made with the Door tool
P.import.cutters = [{ face: true, type: 'door', cx: -4.4, cy: -3, zb: 0, w: 0.9, h: 2.1, yaw: -Math.PI / 2 }];
const r3 = FM.findOpening(it), fit3 = FM.openingFit(it, r3);
// outside-to-inside: a shell opening on a room boundary
P.shell.openings = [{ id: 'b', o: 'V', c: -4.4, u0: -3.45, u1: -2.55, z0: 0, z1: 2.1, type: 'door' }];
P.import.cutters = [];
const r4 = FM.findOpening(it), fit4 = FM.openingFit(it, r4);
return JSON.stringify({
  partition: r && { cut: !!r.cut, w: r.w, h: r.h, yaw: r.yaw },
  attached: fit && { open: fit.open, w: fit.w, h: fit.h, cut: fit.cut },
  cuttersAfterAttach,
  arch: r2 && { cut: !!r2.cut, w: r2.w, h: r2.h },
  archAttached: fit2 && { open: fit2.open, w: fit2.w, h: fit2.h },
  doorCut: r3 && { cut: !!r3.cut, w: r3.w, h: r3.h },
  doorCutAttached: fit3 && { open: fit3.open, w: fit3.w, h: fit3.h },
  boundary: r4 && { cut: !!r4.cut, w: r4.w, h: r4.h },
  boundaryAttached: fit4 && { open: fit4.open, w: fit4.w, h: fit4.h }
});
