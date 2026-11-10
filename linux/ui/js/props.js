// Furniture is a library of game props (model names). Only the names and placement go in the MLO YMT;
// no game model or texture is copied. The editor fetches the game mesh for preview only.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const { Model, el } = M, S = Model.state, F = (M.Props = {});
    const r3 = (v) => Math.round(v * 1000) / 1000;
    const warn = (e) => Model.bus.emit('toast', { text: e && e.message ? e.message : e, kind: 'warn' });
    const holder = (P, k = S.level) => (P.kind === 'grid' ? P.levels[k] : P.shell);
    const baseZ = (P = S.project) => (P.kind === 'grid' ? S.level * P.settings.storyHeight : 0);
    const lib = (P = S.project) => (P.propsLib || (P.propsLib = []));
    const find = (name, P = S.project) => lib(P).find((e) => e.name === name) || null;
    const entry = (e) => e && ({ id: e.name, name: e.name, category: 'Game props', size: [e.baseW, e.baseD, e.baseH], mn: e.bmin, mx: e.bmax, bmin: e.bmin, bmax: e.bmax, game: true });
    F.def = (name, P = S.project) => entry(find(name, P));
    Object.defineProperty(F, 'catalog', { get: () => lib().map(entry).filter(Boolean), configurable: true });
    F.list = (P, k = S.level) => holder(P, k).props || [];
    F.active = () => S.tab === 'build' && (S.project.kind === 'grid' ? S.tool : S.shellTool) === 'furnish';
    F.sel = null;
    F.choice = null;
    F.move = false;
    F.search = '';
    F.importError = '';
    F.importing = false;
    F.fetching = false;
    F.models = new Map();                    // name -> { pos, nrm, tris } for the editor preview only

    // ---------- library / import ----------
    const dec = (s) => {
        if (!s) return new Float32Array(0);
        const bin = atob(s), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return new Float32Array(u.buffer);
    };
    const bytes = (s) => {
        if (!s) return new Uint8Array(0);
        const bin = atob(s), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return u;
    };
    function setModel(name, d) {
        if (!d) { F.models.set(name, null); return; }
        const geoms = (d.geoms || []).map((g) => ({ tex: g.tex || '', pos: dec(g.pos), nrm: dec(g.nrm), uv: dec(g.uv), verts: g.verts || 0, tris: g.tris || 0 }));
        const textures = {};
        for (const k in (d.textures || {})) { const t = d.textures[k]; if (t) textures[k] = { w: t.w, h: t.h, rgba: bytes(t.rgba) }; }
        F.models.set(name, { geoms, textures, tris: d.tris });
    }
    F.fetchAll = async function () {
        const P = S.project, need = lib(P).map((e) => e.name).filter((n) => !F.models.has(n));
        if (F.fetching || !need.length) return;
        F.fetching = true;
        try {
            for (let i = 0; i < need.length; i += 60) {
                const r = await Model.api('import/prop-models?name=' + encodeURIComponent(Model.safeName(P.name)), 'POST', { names: need.slice(i, i + 60), gta: '' });
                const ms = r.models || {};
                need.slice(i, i + 60).forEach((n) => {
                    const d = ms[n]; setModel(n, d);
                });
            }
            if (M.App) M.App.remesh(); M.UI.renderLeft();
        } catch (e) { F.importError = e.message || String(e); }
        F.fetching = false;
    };
    F.importProp = async function (raw) {
        const name = String(raw || '').trim().toLowerCase();
        if (!name) { F.importError = 'Type the name of a game prop, for example prop_chair_01a.'; M.UI.renderLeft(); return; }
        const have = find(name); if (have) { F.choice = name; F.importError = ''; F.fetchAll(); M.UI.renderLeft(); return; }
        if (F.importing) return;
        F.importing = true; F.importError = '';
        try {
            const r = await Model.api('import/prop-info?name=' + encodeURIComponent(Model.safeName(S.project.name)), 'POST', { name: name, gta: '' });
            if (!r.ok || !r.prop) { F.importError = r.error || ('The game has no prop named ' + name + '.'); }
            else {
                const p = r.prop, nm = p.name;
                Model.edit((P) => {
                    const L = lib(P);
                    if (!L.some((e) => e.name === nm)) L.push({ name: nm, hash: p.hash, file: p.file, bmin: p.bmin.slice(), bmax: p.bmax.slice(), baseW: p.size[0], baseD: p.size[1], baseH: p.size[2] });
                });
                setModel(nm, p);
                F.choice = nm; F.search = '';
                if (M.App) M.App.remesh();
            }
        } catch (e) { F.importError = e.message || String(e); }
        F.importing = false; M.UI.renderLeft();
    };
    F.removeFromLibrary = async function (name) {
        if (!find(name)) return;
        const count = (P) => {
            if (P.kind === 'grid') return P.levels.reduce((n, l) => n + (l.props || []).filter((p) => p.model === name).length, 0);
            if (P.kind === 'import' && M.Storeys) { let n = 0; M.Storeys.all(P).forEach((f) => M.Storeys.withFloor(f.id, () => { n += (P.shell.props || []).filter((p) => p.model === name).length; })); return n; }
            return (P.shell.props || []).filter((p) => p.model === name).length;
        };
        const used = count(S.project);
        if (used && M.UI && M.UI.confirm) {
            const ok = await M.UI.confirm('Remove "' + name + '" from the prop list?', 'It is placed ' + used + ' time' + (used === 1 ? '' : 's') + ' in this project. Those placements are removed too. Undo can restore them.', 'Remove');
            if (!ok) return;
        }
        Model.edit((P) => {
            P.propsLib = lib(P).filter((e) => e.name !== name);
            const clean = (L) => (L.props || []).filter((p) => p.model !== name);
            if (P.kind === 'grid') P.levels.forEach((l) => { l.props = clean(l); });
            else if (P.kind === 'import' && M.Storeys) M.Storeys.all(P).forEach((f) => M.Storeys.withFloor(f.id, () => { P.shell.props = clean(P.shell); }));
            else P.shell.props = clean(P.shell);
        });
        F.models.delete(name); if (F.choice === name) F.choice = null; F.sel = null; M.UI.renderLeft();
    };

    // ---------- placements ----------
    F.validate = (p) => {
        if (!F.def(p.model)) throw new Error('This game prop is not in the library any more: ' + p.model);
        if (!['x', 'y', 'z', 'yaw', 'w', 'd', 'h'].every((k) => Number.isFinite(p[k]))) throw new Error('Furniture coordinates must be finite numbers.');
        if (['w', 'd', 'h'].some((k) => p[k] <= 0.0005)) throw new Error('This prop has no usable size.');
        if (Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 10000) throw new Error('Furniture is too far from the building.');
    };
    F.place = (P, k, model, x, y, patch = {}) => {
        const d = F.def(model, P); if (!d) throw new Error('Choose a game prop first.');
        const p = Object.assign({ id: 'p' + Math.random().toString(36).slice(2, 11), model, x, y, z: 0, yaw: 0, w: d.size[0], d: d.size[1], h: d.size[2], outside: false }, patch);
        F.validate(p);
        const H = holder(P, k); (H.props || (H.props = [])).push(p); return p;
    };
    const selected = () => (F.selected ? (F.selected().length === 1 ? F.selected()[0] : null) : F.list(S.project).find((p) => p.id === F.sel));
    F.update = (patch) => {
        const p = selected(); if (!p) return;
        const next = Object.assign({}, p, patch); F.validate(next);
        Model.edit(() => Object.assign(p, next)); M.UI.renderLeft();
    };
    F.remove = () => {
        const p = selected(); if (!p) return;
        Model.edit((P) => { holder(P).props = F.list(P).filter((q) => q.id !== p.id); });
        F.sel = null; F.move = false; M.UI.renderLeft();
    };
    F.parts = (p, z = 0) => {
        const d = F.def(p.model); if (!d) return [];
        return [{ cx: p.x, cy: p.y, z: z + p.z, w: p.w || d.size[0], d: p.d || d.size[1], h: p.h || d.size[2], yaw: p.yaw, shape: 'box', tex: 'plaster_grey' }];
    };
    const FACES = [[0,1,5,4],[2,3,7,6],[3,0,4,7],[1,2,6,5],[4,5,6,7],[3,2,1,0]];
    F.corners = (b) => {
        const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
        return [[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([u,v,z]) => [b.cx + ((u*b.w)/2)*c - ((v*b.d)/2)*s, b.cy + ((u*b.w)/2)*s + ((v*b.d)/2)*c, b.z + z*b.h]);
    };
    F.polygons = (b) => FACES.map((f) => ({ points: f.map((i) => F.corners(b)[i]) }));

    // ---------- preview geometry (editor only) ----------
    const previewPlacements = (P) => {
        if (P.kind === 'grid') return P.levels.flatMap((l, k) => (l.props || []).map((p) => ({ p, z: k * P.settings.storyHeight, level: k })));
        return (P.shell.props || []).map((p) => ({ p, z: 0, level: 0 }));   // Storeys shifts each imported floor
    };
    const registerTextures = (name, m) => {
        const IM = M.ImportModel; if (!IM) return;
        IM.textures = IM.textures || {};
        for (const t in (m.textures || {})) { const key = 'gp:' + name + ':' + t; if (!IM.textures[key]) IM.textures[key] = m.textures[t]; }
    };
    F.append = function (P, built, opts = {}) {
        if (opts.mode === 'export') return built;
        previewPlacements(P).forEach(({ p, z, level }) => {
            const d = F.def(p.model, P), m = F.models.get(p.model);
            if (!d || !m || !m.geoms || !m.geoms.length) return;
            registerTextures(p.model, m);
            const c = Math.cos(p.yaw), s = Math.sin(p.yaw), cx = (d.bmin[0] + d.bmax[0]) / 2, cy = (d.bmin[1] + d.bmax[1]) / 2, bz = d.bmin[2];
            m.geoms.forEach((g) => {
                if (!g.pos || !g.pos.length) return;
                const n = g.pos.length / 3, maxVerts = 60000;
                const hasTex = !!(g.tex && m.textures[g.tex] && M.ImportModel && M.ImportModel.textures && M.ImportModel.textures['gp:' + p.model + ':' + g.tex]);
                for (let base = 0; base < n; base += maxVerts) {
                    const stop = Math.min(n, base + maxVerts), count = stop - base;
                    const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), uv = new Float32Array(count * 2), idx = new Uint16Array(count);
                    for (let i = base; i < stop; i++) {
                        const j = i - base, lx = g.pos[i*3] - cx, ly = g.pos[i*3+1] - cy, lz = g.pos[i*3+2] - bz;
                        pos[j*3] = p.x + lx*c - ly*s; pos[j*3+1] = p.y + lx*s + ly*c; pos[j*3+2] = z + p.z + lz;
                        nrm[j*3] = g.nrm[i*3]*c - g.nrm[i*3+1]*s; nrm[j*3+1] = g.nrm[i*3]*s + g.nrm[i*3+1]*c; nrm[j*3+2] = g.nrm[i*3+2];
                        if (g.uv && g.uv.length >= n*2) { uv[j*2] = g.uv[i*2]; uv[j*2+1] = g.uv[i*2+1]; }
                        idx[j] = j;
                    }
                    built.batches.push({ level, kind: 'prop', group: 'int', tex: '', imgKey: hasTex ? 'gp:' + p.model + ':' + g.tex : null, flat: [0.63, 0.60, 0.54], alpha: 1, noCull: true, clip: true, pos, nrm, uv, idx, glass: false, model: 'gameprop' });
                    for (let i = 0; i < count; i++) { built.bounds.mn[0] = Math.min(built.bounds.mn[0], pos[i*3]); built.bounds.mn[1] = Math.min(built.bounds.mn[1], pos[i*3+1]); built.bounds.mn[2] = Math.min(built.bounds.mn[2], pos[i*3+2]); built.bounds.mx[0] = Math.max(built.bounds.mx[0], pos[i*3]); built.bounds.mx[1] = Math.max(built.bounds.mx[1], pos[i*3+1]); built.bounds.mx[2] = Math.max(built.bounds.mx[2], pos[i*3+2]); }
                    built.stats.tris += count / 3;
                }
            });
        });
        return built;
    };
    F.exportData = function (P) {
        const out = [];
        const push = (p, floorZ) => {
            const d = F.def(p.model, P); if (!d) return;
            const cx = (d.bmin[0] + d.bmax[0]) / 2, cy = (d.bmin[1] + d.bmax[1]) / 2, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
            out.push({ name: d.name, x: r3(p.x - (cx*c - cy*s)), y: r3(p.y - (cx*s + cy*c)), z: r3(floorZ + p.z - d.bmin[2]), heading: r3(p.yaw * 180 / Math.PI), scale: 1, room: 1, bmin: d.bmin, bmax: d.bmax });
        };
        if (P.kind === 'grid') P.levels.forEach((l, k) => (l.props || []).forEach((p) => push(p, k * P.settings.storyHeight)));
        else if (P.kind === 'import' && M.Storeys) {
            const z0 = P.import.frame.z;
            M.Storeys.all(P).forEach((f) => M.Storeys.withFloor(f.id, () => (P.shell.props || []).forEach((p) => push(p, f.z - z0))));
        }
        else (P.shell.props || []).forEach((p) => push(p, 0));
        return out;
    };
    F.migrate = function (P) {
        P.propsLib = P.propsLib || [];
        const ok = new Set(P.propsLib.map((e) => e.name));
        const clean = (L) => (L.props || []).filter((p) => ok.has(p.model));
        if (P.kind === 'grid') P.levels.forEach((l) => { l.props = clean(l); }); else P.shell.props = clean(P.shell);
    };
    // Install before storeys.js so each imported floor is furnished exactly once.
    for (const mesher of [M.Mesher, M.Shell]) {
        const build = mesher.build;
        mesher.build = (P, opts) => F.append(P, build(P, opts), opts);
    }

    // ---------- UI ----------
    function thumb(d) {
        const cv = document.createElement('canvas'); cv.width = 100; cv.height = 76;
        const ctx = cv.getContext('2d'), m = F.models.get(d.id);
        ctx.fillStyle = '#3a3d3c'; ctx.fillRect(0, 0, 100, 76);
        const gm = m && m.geoms && m.geoms[0];
        if (gm && gm.pos && gm.pos.length) {
            const p = gm.pos, n = p.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
            for (let i = 0; i < n; i++) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], p[i*3+q]); mx[q] = Math.max(mx[q], p[i*3+q]); }
            const sc = Math.min(80 / Math.max(1e-3, mx[0]-mn[0]), 56 / Math.max(1e-3, mx[1]-mn[1]), 56 / Math.max(1e-3, mx[2]-mn[2]));
            const ox = 10 - mn[0]*sc, oy = 66 + mn[1]*sc, oz = 38 + mn[2]*sc;
            const pr = (i) => [ox + p[i*3]*sc, oy - p[i*3+1]*sc - p[i*3+2]*sc*0.45];
            ctx.fillStyle = '#c2b8a4';
            for (let i = 0; i + 2 < n; i += 3) { ctx.beginPath(); [i,i+1,i+2].forEach((q,k) => { const a = pr(q); k ? ctx.lineTo(a[0],a[1]) : ctx.moveTo(a[0],a[1]); }); ctx.closePath(); ctx.fill(); }
        } else { ctx.fillStyle = '#777'; ctx.fillRect(28, 24, 44, 28); }
        ctx.fillStyle = '#f1eee6'; ctx.font = '10px sans-serif'; ctx.fillText(d.name.slice(0, 16), 4, 14);
        return cv;
    }
    F.panel = function (root) {
        F.fetchAll();
        root.append(el('div', { class: 'h' }, 'Game props'));
        root.append(el('div', { class: 'note' }, 'Type the model name of a game prop (for example prop_chair_01a or prop_light...). It is looked up in your game files and added to this project\'s list; only the name and placement are exported, never the game model.'));
        const name = el('input', { type: 'text', style: { flex: '1', minWidth: '120px' }, placeholder: 'prop_chair_01a', 'aria-label': 'Game prop name' });
        name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); F.importProp(name.value); } };
        root.append(el('div', { class: 'row wrap' }, name, el('button', { class: 'btn sm primary', onclick: () => F.importProp(name.value) }, F.importing ? 'Looking up…' : 'Import prop')));
        if (F.importError) root.append(el('div', { class: 'note', style: { color: '#f0c674' } }, F.importError));
        const search = el('input', { type: 'search', style: { width: '100%', color: 'inherit', background: 'var(--panel)', border: '1px solid var(--border)', padding: '6px' }, placeholder: 'Search this project\'s props…', value: F.search, 'aria-label': 'Search props' });
        const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', maxHeight: '290px', overflowY: 'auto' } });
        const render = () => {
            grid.innerHTML = '';
            F.catalog.filter((d) => d.name.toLowerCase().includes(F.search.toLowerCase())).forEach((d) =>
                grid.append(el('div', { class: 'pitem', title: d.name, style: { position: 'relative', flexDirection: 'column', alignItems: 'stretch', padding: '4px', cursor: 'pointer', borderColor: F.choice === d.id ? 'var(--accent)' : '' }, onclick: () => { F.choice = d.id; F.sel = null; F.move = false; M.UI.renderLeft(); } },
                    el('button', { class: 'btn sm danger', title: 'Remove ' + d.name + ' from this project\'s props', 'aria-label': 'Remove ' + d.name, style: { position: 'absolute', top: '2px', right: '2px', zIndex: '2', padding: '0 5px', lineHeight: '1', minWidth: '0' }, onclick: async (e) => { e.stopPropagation(); await F.removeFromLibrary(d.name); } }, '×'),
                    thumb(d), el('span', { style: { fontSize: '11px' } }, d.name))));
            if (!F.catalog.length) grid.append(el('div', { class: 'note' }, 'No game props yet. Type a name above and press Import prop.'));
        };
        search.oninput = () => { F.search = search.value; render(); };
        render();
        root.append(search, grid);
        if (F.choice) root.append(el('div', { class: 'note' }, 'Ready to place: ' + F.choice));
        const p = selected();
        if (p) {
            const d = F.def(p.model); root.append(el('div', { class: 'h' }, 'Selected: ' + (d ? d.name : p.model)));
            const input = (label, key, factor = 1) => root.append(el('div', { class: 'row' }, el('label', null, label), el('input', { class: 'grow', type: 'number', step: '0.05', 'aria-label': label, value: r3(p[key] * factor), onchange: (e) => { try { F.update({ [key]: e.target.value === '' ? NaN : Number(e.target.value) / factor }); } catch (err) { warn(err); M.UI.renderLeft(); } } })));
            [['X', 'x'], ['Y', 'y'], ['Height above floor', 'z']].forEach(([l, k]) => input(l, k));
            input('Rotation (degrees)', 'yaw', 180 / Math.PI);
            root.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm', onclick: () => { F.move = true; M.UI.renderLeft(); } }, 'Move with next click'), el('button', { class: 'btn sm', onclick: () => F.update({ yaw: p.yaw + Math.PI / 2 }) }, 'Rotate 90°'), el('button', { class: 'btn sm', onclick: F.duplicate }, 'Duplicate'), el('button', { class: 'btn sm danger', onclick: F.remove }, 'Delete'), d ? el('button', { class: 'btn sm danger', onclick: () => F.removeFromLibrary(d.name) }, 'Remove from list') : null));
            if (F.move) root.append(el('div', { class: 'note' }, 'Click the new position. Esc cancels movement.'));
        }
        root.append(el('div', { class: 'h' }, 'On this floor (' + F.list(S.project).length + ')'));
        F.list(S.project).forEach((p) => root.append(el('button', { class: 'btn sm' + (F.selected?.().some((q) => q.id === p.id) ? ' on' : ''), onclick: (e) => { if (F.select) { F.select(p.id, e.shiftKey); return; } F.sel = p.id; F.move = false; M.UI.renderLeft(); } }, (F.def(p.model) || { name: p.model }).name)));
        root.append(el('div', { class: 'note' }, 'Game props are placed as MLO YMT entities that reference your game\'s own models. They are not copied into the resource and are not redistributed.'));
    };
    Model.bus.on('project', () => { F.sel = null; F.move = false; F.importError = ''; });
    Model.bus.on('buildings', () => { F.sel = null; F.move = false; });
})(window.MLO);
