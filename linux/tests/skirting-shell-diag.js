const M = window.MLO;
if (!M) return 'no MLO';
try { M.UI.closeModal(); } catch (e) {}
await M.Model.openProject('My Interior');
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (M.ImportModel && M.ImportModel.loaded) break; }
const b = M.App.built, segs = b && b.shell && b.shell.segs || [], res = b && b.shell && b.shell.resolved || [];
const left = segs.filter(s => s.o === 'V' && Math.abs(s.c + 7.255) < 0.4).map(s => ({ o: s.o, c: s.c, u0: s.u0, u1: s.u1, inward: s.inward, ops: (s.ops || []).map(op => ({ u0: op.u0, u1: op.u1, z0: op.z0, z1: op.z1, type: op.type })) }));
const resolved = res.filter(s => s.o === 'V' && Math.abs(s.c + 7.1) < 0.5).map(s => ({ o: s.o, c: s.c, u0: s.u0, u1: s.u1, z0: s.z0, z1: s.z1, type: s.type }));
return JSON.stringify({ left, resolved });
