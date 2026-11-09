// Skirting boards: placed on selected wall faces, mitered where two runs meet at an angle.
// Geometry is generated here; Shell.build adds it to the interior batches (and so to the export).
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const SK = M.Skirting = {};
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const unit = (x, y) => { const l = Math.hypot(x, y); return l < 1e-9 ? null : [x / l, y / l]; };
    const num = (v) => Math.round(v * 1000) / 1000;

    // A board's two ends: p is the wall-base point, n the inward wall normal, u the direction into the board.
    // A miter plane is found between boards that share a corner and have different wall normals.
    function endpoints(boards) {
        const eps = [];
        boards.forEach((b, i) => {
            const dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], u = unit(dx, dy); if (!u) return;
            const z = Math.min(b.a[2], b.b[2]);
            eps.push({ i, side: 0, p: [b.a[0], b.a[1], z], n: b.n, u, z });
            eps.push({ i, side: 1, p: [b.b[0], b.b[1], z], n: b.n, u: [-u[0], -u[1]], z });
        });
        // corners are found by their plan position (the base of both faces should be the same point)
        const groups = [];
        eps.forEach(e => {
            let g = groups.find(q => Math.hypot(e.p[0] - q[0].p[0], e.p[1] - q[0].p[1]) < 0.035);
            if (!g) { g = []; groups.push(g); }
            g.push(e);
        });
        groups.forEach(g => {
            const cx = g.reduce((n, e) => n + e.p[0], 0) / g.length, cy = g.reduce((n, e) => n + e.p[1], 0) / g.length;
            g.forEach(e => { e.c = [cx, cy]; });
            if (g.length < 2) return;
            g.forEach(e => {
                let best = null;
                g.forEach(o => {
                    if (o === e || o.i === e.i) return;
                    const cross = Math.abs(e.n[0] * o.n[1] - e.n[1] * o.n[0]);
                    if (cross < 0.05) return;                                      // the same wall (or a straight continuation)
                    const m = unit(o.n[0] - e.n[0], o.n[1] - e.n[1]); if (!m) return;
                    const den = dot(m, e.u); if (Math.abs(den) < 0.12) return;    // too shallow to make a clean end
                    const score = cross + (1 - Math.abs(dot(e.u, o.u))) * 0.5;    // prefer a real turn over a split face
                    if (!best || score > best.score) best = { m, den, score };
                });
                if (best) { e.m = best.m; e.den = best.den; }
            });
        });
        return eps;
    }

    // how far along the board a profile point at `off` from the wall lies when the miter plane cuts it
    function endShift(e, off) {
        if (!e || !e.m) return 0;
        const c = e.c || e.p, dp = e.m[0] * (e.p[0] - c[0]) + e.m[1] * (e.p[1] - c[1]);
        const s = -(dp + (e.m[0] * e.n[0] + e.m[1] * e.n[1]) * off) / e.den;
        return Math.max(-0.6, Math.min(0.6, s));
    }

    function profile(b) {
        const t = Math.max(0.006, b.t || 0.016), h = Math.max(0.025, b.h || 0.1);
        const bevel = Math.min(0.01, h * 0.18, t * 0.5), back = -0.0015;      // the back sits 1.5 mm inside the wall, so it cannot z-fight with it
        return { t, h, pts: [[back, 0], [t, 0], [t, h - bevel], [t - bevel, h], [back, h]] };
    }

    // Every triangle of every board, ready to go into a Shell.build batch. `tex` is the texture id.
    SK.triangles = function (shell) {
        const data = (shell && shell.skirting) || [], boards = [];
        data.forEach(b => {
            if (!b || !b.a || !b.b || !b.n) return;
            let dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1]; if (Math.hypot(dx, dy) < 0.04) return;
            const n = unit(b.n[0], b.n[1]); if (!n) return;
            // Keep the run direction on one side of the normal, otherwise the side faces are wound inside-out
            // on walls whose segment happened to run the other way (the -x/-y walls).
            let a = b.a, c = b.b;
            if (dx * n[1] - dy * n[0] < 0) { const t = a; a = c; c = t; }
            boards.push({ a, b: c, n, h: b.h, t: b.t, tex: b.tex || 'trim_white' });
        });
        if (!boards.length) return [];
        const eps = endpoints(boards), byBoard = boards.map(() => []);
        eps.forEach(e => byBoard[e.i].push(e));
        const tris = [];
        boards.forEach((b, i) => {
            const se = byBoard[i].find(e => e.side === 0), ee = byBoard[i].find(e => e.side === 1);
            if (!se || !ee) return;
            const pr = profile(b), base = Math.min(se.z, ee.z);
            const at = (e, off, z) => {
                const s = endShift(e, off);
                return [e.p[0] + e.u[0] * s + e.n[0] * off, e.p[1] + e.u[1] * s + e.n[1] * off, base + z];
            };
            const S = pr.pts.map(p => at(se, p[0], p[1])), E = pr.pts.map(p => at(ee, p[0], p[1])), n = pr.pts.length, tex = b.tex;
            const tri = (a, c, d) => tris.push({ tex, a, b: c, c: d });
            // side faces: profile edges extruded from the start to the end
            for (let q = 0; q < n; q++) {
                const r = (q + 1) % n;
                tri(S[q], S[r], E[r]); tri(S[q], E[r], E[q]);
            }
            // square/mitered end caps
            for (let q = 1; q < n - 1; q++) { tri(E[0], E[q], E[q + 1]); tri(S[0], S[q + 1], S[q]); }
        });
        return tris;
    };

    // Clean up boards saved before the inside-wall/door fixes: drop runs on the outside face of a wall,
    // flip runs whose normal pointed into the wall, and split every run at a door/arch cut.
    SK.clean = function (project) {
        const sh = project && project.shell; if (!sh || !Array.isArray(sh.skirting) || !sh.skirting.length) return false;
        const rects = M.Shell && M.Shell.regionRects ? M.Shell.regionRects(sh) : []; if (!rects.length) return false;
        const inRoom = (x, y) => rects.some(q => x > q[0] + 1e-4 && x < q[2] - 1e-4 && y > q[1] + 1e-4 && y < q[3] - 1e-4);
        const cutsFor = (a, b, n) => {
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 0.04) return [];
            const ux = dx / len, uy = dy / len, out = [];
            const add = (cx, cy, w, yaw) => {
                if (!(w > 0.2)) return;
                const wx = Math.cos(yaw), wy = Math.sin(yaw);
                if (Math.abs(wx * ux + wy * uy) < 0.85) return;
                const px = cx - a[0], py = cy - a[1];
                if (Math.abs(-px * uy + py * ux) > 0.35) return;
                const t = px * ux + py * uy, t0 = Math.max(0, t - w / 2), t1 = Math.min(len, t + w / 2);
                if (t1 - t0 > 0.01) out.push([t0, t1]);
            };
            ((project.import && project.import.cutters) || []).forEach(k => {
                if ((k.type === 'door' || k.type === 'arch') && (k.zb || 0) <= 0.5) add(k.cx, k.cy, k.w, k.yaw);
            });
            if (M.FitModels && M.FitModels.cutters) M.FitModels.cutters(project).forEach(k => {
                if ((k.type === 'door' || k.type === 'arch') && (k.zb || 0) <= 0.5) add(k.cx, k.cy, k.w, k.yaw);
            });
            const addShell = (o, c, op) => {
                if (!op || (op.type !== 'door' && op.type !== 'arch') || (op.z0 || 0) > 0.5) return;
                let p0, p1;
                if (o === 'H') { if (Math.abs(uy) > 0.3 || Math.abs(a[1] - c) > 0.35) return; p0 = [op.u0, c]; p1 = [op.u1, c]; }
                else { if (Math.abs(ux) > 0.3 || Math.abs(a[0] - c) > 0.35) return; p0 = [c, op.u0]; p1 = [c, op.u1]; }
                const t0 = (p0[0] - a[0]) * ux + (p0[1] - a[1]) * uy, t1 = (p1[0] - a[0]) * ux + (p1[1] - a[1]) * uy;
                const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(len, Math.max(t0, t1));
                if (hi - lo > 0.01) out.push([lo, hi]);
            };
            (sh.openings || []).forEach(op => addShell(op.o, op.c, op));
            (sh.parts || []).forEach(pt => (pt.open || []).forEach(op => addShell(pt.o, pt.c, op)));
            // stop where a perpendicular partition starts, just like wall paint
            SK.partitions(project, a, b, n).forEach(t => out.push([t - 0.0002, t + 0.0002]));
            return out;
        };
        const out = []; let changed = false;
        sh.skirting.forEach(b => {
            if (!b || !b.a || !b.b || !b.n) { changed = true; return; }
            const len0 = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]); if (len0 < 0.04) { changed = true; return; }
            const n = unit(b.n[0], b.n[1]); if (!n) { changed = true; return; }
            const mx = (b.a[0] + b.b[0]) / 2, my = (b.a[1] + b.b[1]) / 2;
            const plus = inRoom(mx + n[0] * 0.04, my + n[1] * 0.04), minus = inRoom(mx - n[0] * 0.04, my - n[1] * 0.04);
            if (!plus && !minus) { changed = true; return; }                       // the outside face of a wall
            let nn = n; if (minus && !plus) { nn = [-n[0], -n[1]]; changed = true; } // the face looked out of the room
            const z = Math.min(b.a[2], b.b[2]), dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], len = len0, ux = dx / len, uy = dy / len;
            const cuts = cutsFor(b.a, b.b, nn).sort((q, r) => q[0] - r[0]);
            let cur = 0; const parts = [];
            const put = (t0, t1) => { if (t1 - t0 >= 0.04) parts.push({ t0, t1 }); };
            cuts.forEach(q => { const lo = Math.max(0, q[0]), hi = Math.min(len, q[1]); if (hi <= cur) return; if (lo > cur) put(cur, lo); cur = Math.max(cur, hi); });
            if (cur < len) put(cur, len);
            if (!parts.length) { changed = true; return; }
            const sameOne = parts.length === 1 && parts[0].t0 === 0 && parts[0].t1 === len && nn === n;
            if (sameOne) { out.push(b); return; }
            changed = true;
            parts.forEach((p, i) => out.push(Object.assign({}, b, {
                id: (b.id || 'sk') + 'p' + i, n: nn,
                a: [b.a[0] + ux * p.t0, b.a[1] + uy * p.t0, z],
                b: [b.a[0] + ux * p.t1, b.a[1] + uy * p.t1, z]
            })));
        });
        if (changed) sh.skirting = out;
        return changed;
    };

    // Where perpendicular partitions cross a run, in metres from its start. Same side rule as paint:
    // a partition divides only the side it extends into.
    SK.partitions = function (project, a, b, n) {
        const parts = (project && project.shell && project.shell.parts) || [];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 0.05) return [];
        const ux = dx / len, uy = dy / len, out = [];
        parts.forEach(pt => {
            let p0, p1, t, ix, iy;
            if (pt.o === 'H') {
                if (Math.abs(uy) < 0.15) return;
                t = (pt.c - a[1]) / uy; if (t <= 0.02 || t >= len - 0.02) return;
                const x = a[0] + ux * t; if (x < pt.u0 - 0.02 || x > pt.u1 + 0.02) return;
                ix = x; iy = pt.c; p0 = [pt.u0, pt.c]; p1 = [pt.u1, pt.c];
            } else {
                if (Math.abs(ux) < 0.15) return;
                t = (pt.c - a[0]) / ux; if (t <= 0.02 || t >= len - 0.02) return;
                const y = a[1] + uy * t; if (y < pt.u0 - 0.02 || y > pt.u1 + 0.02) return;
                ix = pt.c; iy = y; p0 = [pt.c, pt.u0]; p1 = [pt.c, pt.u1];
            }
            const side0 = (p0[0] - ix) * n[0] + (p0[1] - iy) * n[1], side1 = (p1[0] - ix) * n[0] + (p1[1] - iy) * n[1];
            if (side0 <= 0.02 && side1 <= 0.02) return;
            out.push(t);
        });
        return out.sort((q, r) => q - r);
    };

    // plan direction of a board (for the tool preview)
    SK.boards = function (shell) { return (shell && shell.skirting) || []; };
})(window.MLO);
