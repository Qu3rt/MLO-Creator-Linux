// Imported buildings: independent floor layouts, sharing one model and one MLO interior.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const Model = M.Model, S = Model.state, clone = o => JSON.parse(JSON.stringify(o));
    const F = M.Storeys = {};
    const fields = ['cutters', 'cboxes', 'fits'];
    function snap(P) {
        const d = { shell: P.shell, settings: P.settings, defaults: P.defaults, import: {} };
        fields.forEach(k => { d.import[k] = P.import[k] || []; });
        return clone(d);
    }
    function load(P, d) {
        P.shell = d.shell; P.settings = d.settings; P.defaults = d.defaults;
        fields.forEach(k => { P.import[k] = d.import[k] || []; });
    }
    F.ensure = function (P) {
        const I = P.import;
        if (!I.storeys || !I.storeys.length) { I.storeys = [{ id: 'f1', name: 'Ground floor', z: I.frame.z, snap: null }]; I.activeFloor = 'f1'; }
        if (!I.storeys.some(f => f.id === I.activeFloor)) I.activeFloor = I.storeys[0].id;
        I.stairs = I.stairs || [];
    };
    // This also accepts a building snapshot, without changing the active building.
    F.all = function (P) {
        F.ensure(P); const I = P.import;
        return I.storeys.map(f => {
            const active = f.id === I.activeFloor, d = active ? P : f.snap;
            return { id: f.id, name: f.name, active, z: active ? I.frame.z : f.z,
                d: { shell: d.shell, settings: d.settings, defaults: d.defaults,
                    import: Object.assign({}, I, d.import, { frame: Object.assign({}, I.frame, { z: active ? I.frame.z : f.z }) }) } };
        });
    };
    function switchIn(P, id) {
        F.ensure(P); const I = P.import, from = I.storeys.find(f => f.id === I.activeFloor), to = I.storeys.find(f => f.id === id);
        if (!to || from === to) return;
        from.z = I.frame.z; from.snap = snap(P);
        load(P, to.snap); to.snap = null; I.frame.z = to.z; I.activeFloor = id;
    }
    F.withFloor = function (id, fn) {
        const P = S.project; F.ensure(P); const orig = P.import.activeFloor;
        switchIn(P, id);
        try { return fn(); } finally { switchIn(P, orig); }
    };
    const changed = () => { S.shellSel = null; S.cutSel = null; S.opSel = null; Model.bus.emit('buildings'); };
    F.select = id => { Model.edit(P => switchIn(P, id)); changed(); };
    F.add = function (rise, copyRooms) {
        if (!Number.isFinite(rise) || rise < 2.1 || rise > 20) throw new Error('Floor spacing must be between 2.1 and 20 metres.');
        let id;
        Model.edit(P => {
            F.ensure(P); const I = P.import, fresh = snap(P), z = I.frame.z + rise;
            if (F.all(P).some(f => Math.abs(f.z - z) < 0.1)) throw new Error('There is already a floor at that height.');
            id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            fresh.shell = { ops: copyRooms ? clone(P.shell.ops) : [], openings: [], parts: [], floors: [], lights: [], cands: [] };
            fields.forEach(k => { fresh.import[k] = []; });
            I.storeys.push({ id, name: 'Floor ' + I.storeys.length, z, snap: fresh }); switchIn(P, id);
        });
        changed(); return id;
    };
    F.remove = function (id) {
        Model.edit(P => {
            F.ensure(P); const I = P.import; if (I.storeys.length < 2) return;
            const keep = I.activeFloor === id ? I.storeys.find(f => f.id !== id).id : I.activeFloor;
            switchIn(P, id);
            I.cutters.slice().forEach(k => M.ImportModel.removeCutterIn(P, k.id));
            switchIn(P, keep); I.storeys = I.storeys.filter(f => f.id !== id);
            I.stairs = I.stairs.filter(s => s.from !== id && s.to !== id);
        }); changed();
    };
    F.interiors = P => Model.bldAll(P).flatMap(b => F.all(b.d).map(f => ({ id: b.id + ':' + f.id, name: b.name + ' / ' + f.name, d: f.d })));
    F.hasRooms = d => F.all(d).some(f => f.d.shell.ops.some(o => o.op === 'add'));
    F.stairs = function (P) {
        const floors = F.all(P);
        return P.import.stairs.map(s => {
            const from = floors.find(f => f.id === s.from), to = floors.find(f => f.id === s.to);
            if (!from || !to || to.z <= from.z || ![s.x, s.y, s.w, s.run].every(Number.isFinite) || s.w < 0.5 || s.run < 1) return null;
            const rise = to.z - from.z, n = Math.max(2, Math.ceil(rise / 0.18)), alongX = s.dir === 'x+' || s.dir === 'x-', reverse = s.dir.endsWith('-');
            return Object.assign({}, s, { fromFloor: from, toFloor: to, rise, n, alongX, reverse,
                r: [s.x, s.y, s.x + (alongX ? s.run : s.w), s.y + (alongX ? s.w : s.run)] });
        }).filter(Boolean);
    };
    F.holes = function (P) {
        const id = P.import.activeFloor, holes = { floor: [], ceiling: [] };
        F.stairs(P).forEach(s => {
            if (s.from === id) holes.ceiling.push(s.r);
            if (s.to === id) holes.floor.push(s.r);
        }); return holes;
    };
    F.stairCuts = function (P) {
        const cuts = [];
        Model.bldAll(P).forEach(b => F.stairs(b.d).forEach(s => {
            const f = b.d.import.frame, h = f.heading * Math.PI / 180, x = (s.r[0] + s.r[2]) / 2, y = (s.r[1] + s.r[3]) / 2;
            cuts.push({ id: b.id + ':' + s.id, type: 'cut', mesh: true,
                cx: f.x + x * Math.cos(h) - y * Math.sin(h), cy: f.y + x * Math.sin(h) + y * Math.cos(h),
                zb: s.fromFloor.z + 0.02, h: s.rise + 2.05, w: s.r[2] - s.r[0], d: s.r[3] - s.r[1], yaw: h });
        })); return cuts;
    };
    // Aggregate in the active floor's frame; all floors retain one interior room, so stairs need no inter-MLO portal.
    const buildOne = M.Shell.build;
    F.shiftBatches = function (batches, dz) {
        return batches.map(b => { const pos = new Float32Array(b.pos); for (let i = 2; i < pos.length; i += 3) pos[i] += dz; return Object.assign({}, b, { pos }); });
    };
    M.Shell.build = function (P, opts) {
        opts = opts || {};
        if (P.kind !== 'import' || opts.singleFloor) return buildOne(P, opts);
        F.ensure(P);
        if (P !== S.project) throw new Error('Build the active imported project.');
        const all = F.all(P), z = P.import.frame.z, id = P.import.activeFloor;
        const selected = (opts.mode === 'export' || S.showAllFloors) ? all : all.filter(f => f.active);
        const out = { batches: [], boxes: [], matList: [], portals: [], lights: [], entrance: null,
            bounds: { mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] }, stats: { tris: 0, boxes: 0, portals: 0, lights: 0, warnings: [] } };
        selected.forEach(f => F.withFloor(f.id, () => {
            const b = buildOne(P, opts), dz = f.z - z, offset = out.matList.length;
            out.batches.push(...F.shiftBatches(b.batches, dz)); out.matList.push(...b.matList);
            b.boxes.forEach(box => { const q = box.slice(); q[2] += dz; q[5] += dz; q[6] += offset; out.boxes.push(q); });
            b.portals.forEach(p => { const corners = p.corners.slice(); for (let i = 2; i < corners.length; i += 3) corners[i] += dz; out.portals.push(Object.assign({}, p, { corners })); });
            b.lights.forEach(l => out.lights.push(Object.assign({}, l, { z: l.z + dz })));
            if (b.batches.length) for (let a = 0; a < 3; a++) { out.bounds.mn[a] = Math.min(out.bounds.mn[a], b.bounds.mn[a] + (a === 2 ? dz : 0)); out.bounds.mx[a] = Math.max(out.bounds.mx[a], b.bounds.mx[a] + (a === 2 ? dz : 0)); }
            out.stats.tris += b.stats.tris; out.stats.warnings.push(...b.stats.warnings);
            if (f.id === id) out.shell = b.shell;
        }));
        out.stats.boxes = out.boxes.length; out.stats.portals = out.portals.length; out.stats.lights = out.lights.length;
        return out;
    };
    F.allFitted = function (P) {
        const z = P.import.frame.z, items = [];
        F.all(P).forEach(f => F.withFloor(f.id, () => {
            const spec = M.FitModels.exportSpec(P);
            if (spec) spec.items.forEach(it => items.push(Object.assign({}, it, { id: f.id + '_' + it.id, zb: it.zb + f.z - z })));
        })); return items.length ? { project: P.name, items } : undefined;
    };
    F.allDoors = function (P) {
        const z = P.import.frame.z, out = [];
        F.all(P).forEach(f => F.withFloor(f.id, () => P.import.cutters.filter(k => k.leaf).forEach(k =>
            M.ImportModel.doorTransforms(k).forEach(t => out.push({ x: t.x, y: t.y, z: t.z + f.z - z, heading: t.yaw * 180 / Math.PI, sxy: t.sxy, sz: t.sz })))));
        return out;
    };
    F.modelBatches = function () {
        const P = S.project, z = P.import.frame.z;
        return F.all(P).filter(f => f.active || S.showAllFloors).flatMap(f => F.withFloor(f.id, () => F.shiftBatches(M.ImportModel.doorBatches().concat(M.FitModels.batches()), f.z - z)));
    };
    F.issues = function (P) {
        const out = [], floors = F.all(P).sort((a, b) => a.z - b.z);
        floors.forEach((f, i) => {
            if (i && f.z - floors[i - 1].z < floors[i - 1].d.settings.ceilH + 0.35 - 0.001) out.push(f.name + ': the floor slab overlaps the ceiling below. Raise this floor or lower that ceiling.');
        });
        const stairs = F.stairs(P);
        if (stairs.length !== P.import.stairs.length) out.push('A staircase has invalid dimensions or its destination is no longer above its starting floor. Remove and recreate that staircase.');
        stairs.forEach(s => {
            if (floors.some(f => f.z > s.fromFloor.z && f.z < s.toFloor.z)) out.push('Stairs must connect neighbouring floors. Remove and recreate the flight after adding or moving a floor between them.');
            if (s.run / s.n < 0.25) out.push('Stairs: increase the run to at least ' + (s.n * 0.25).toFixed(2) + ' m for deeper steps.');
            [s.fromFloor, s.toFloor].forEach(f => {
                const g = M.Shell.regionGrid(f.d.shell, [s.r[0], s.r[2]], [s.r[1], s.r[3]]);
                let covered = 0;
                for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.ny; j++) if (g.mask[i][j]) covered += Math.max(0, Math.min(g.X[i + 1], s.r[2]) - Math.max(g.X[i], s.r[0])) * Math.max(0, Math.min(g.Y[j + 1], s.r[3]) - Math.max(g.Y[j], s.r[1]));
                if (covered < s.w * s.run - 0.01) out.push(f.name + ': draw a room over the entire stair footprint.');
            });
        }); return out;
    };
    F.render = function (root) {
        const { el } = M, P = S.project; F.ensure(P); const I = P.import, floors = F.all(P), active = floors.find(f => f.active);
        const panel = el('details', { class: 'storey-panel', open: S.storeysOpen !== false, ontoggle: e => { S.storeysOpen = e.target.open; } }, el('summary', null, 'Floors and stairs'));
        const refresh = () => M.UI.renderLeft();
        const attempt = fn => { try { fn(); refresh(); } catch (e) { Model.bus.emit('toast', { text: e.message, kind: 'err' }); } };
        const number = (label, value, fn, step) => el('div', { class: 'row' }, el('label', null, label), el('input', { class: 'grow', type: 'number', step: step || '0.1', value, onchange: e => { const v = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(v)) attempt(() => fn(v)); } }));
        panel.append(el('select', { style: { width: '100%' }, onchange: e => F.select(e.target.value) }, ...floors.map(f => el('option', { value: f.id, selected: f.active ? true : null }, f.name + ' · Z ' + f.z.toFixed(2) + ' m'))));
        panel.append(el('input', { type: 'text', style: { width: '100%', boxSizing: 'border-box' }, value: active.name, title: 'Floor name', onchange: e => { const name = e.target.value.trim().slice(0, 40); if (name) Model.edit(Q => { Q.import.storeys.find(f => f.id === Q.import.activeFloor).name = name; }); refresh(); } }));
        panel.append(number('Floor Z (model)', I.frame.z, z => Model.edit(Q => { Q.import.frame.z = z; })), number('Ceiling height', P.settings.ceilH, h => { if (h < 2.05 || h > 20) throw new Error('Use a ceiling height between 2.05 and 20 m.'); Model.edit(Q => { Q.settings.ceilH = h; }); }));
        let rise = Math.max(3.1, P.settings.ceilH + 0.35), copy = true;
        panel.append(el('div', { class: 'row' }, el('label', null, 'Spacing to new floor'), el('input', { class: 'grow', type: 'number', step: '0.1', value: rise, onchange: e => { rise = Number(e.target.value); } })));
        panel.append(el('label', { class: 'note' }, el('input', { type: 'checkbox', checked: true, onchange: e => { copy = e.target.checked; } }), ' Copy room outlines to new floor'));
        panel.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm', onclick: () => attempt(() => F.add(rise, copy)) }, 'Add floor above'),
            el('button', { class: 'btn sm danger', disabled: floors.length < 2, onclick: async () => { if (await M.UI.confirm('Remove floor?', 'Remove this floor, its layout and its connecting stairs? Undo can restore it.', 'Remove floor')) F.remove(I.activeFloor); } }, 'Remove floor')));
        panel.append(el('label', { class: 'note' }, el('input', { type: 'checkbox', checked: S.showAllFloors ? true : null, onchange: e => { S.showAllFloors = e.target.checked; M.App.remesh(); } }), ' Show all floors'));
        panel.append(el('div', { class: 'note' }, 'Edit one floor at a time. Add rooms and openings on each floor. Export includes every floor. Stair X/Y is the lower-left corner; direction points uphill.'));
        const above = floors.filter(f => f.z > active.z).sort((a, b) => a.z - b.z)[0];
        if (above) panel.append(el('button', { class: 'btn sm', onclick: () => attempt(() => Model.edit(Q => {
            const rect = M.Shell.regionRects(Q.shell)[0] || [0, 0, 8, 8], run = Math.round(Math.ceil((above.z - active.z) / 0.18) * 280) / 1000;
            Q.import.stairs.push({ id: 'st' + Date.now().toString(36), from: active.id, to: above.id, x: Math.round(((rect[0] + rect[2]) / 2 - 0.6) * 100) / 100, y: Math.round(((rect[1] + rect[3]) / 2 - run / 2) * 100) / 100, w: 1.2, run, dir: 'y+' });
        })) }, 'Add stairs to ' + above.name));
        I.stairs.filter(s => s.from === active.id).forEach(s => {
            panel.append(el('div', { class: 'h' }, 'Stairs to ' + (floors.find(f => f.id === s.to) || {}).name));
            const set = (key, v) => Model.edit(Q => { Q.import.stairs.find(t => t.id === s.id)[key] = v; });
            [['X', 'x'], ['Y', 'y'], ['Width', 'w'], ['Run length', 'run']].forEach(([label, key]) => panel.append(number(label, s[key], v => { if ((key === 'w' && (v < 0.5 || v > 20)) || (key === 'run' && (v < 1 || v > 50))) throw new Error('Width: 0.5–20 m; run: 1–50 m.'); set(key, v); })));
            panel.append(el('select', { onchange: e => { set('dir', e.target.value); refresh(); } }, ...['y+', 'x+', 'y-', 'x-'].map(dir => el('option', { value: dir, selected: dir === s.dir ? true : null }, 'Up toward ' + dir))));
            panel.append(el('button', { class: 'btn sm danger', onclick: () => { Model.edit(Q => { Q.import.stairs = Q.import.stairs.filter(t => t.id !== s.id); }); refresh(); } }, 'Remove stairs'));
        });
        F.issues(P).forEach(msg => panel.append(el('div', { class: 'note bad' }, msg)));
        panel.append(el('div', { class: 'note' }, 'Stairs cut the imported model and collision through the stairwell. Keep both landings inside rooms and clear of walls. The flat Walk check tests the selected floor only; test stair travel in game.'));
        root.append(panel);
    };
})(window.MLO);
