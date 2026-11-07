// The shared GLB window/door library, attached to the scratch builder's grid walls.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const { Model, el } = M, S = Model.state, G = M.GridModels = {};
    const round = n => Math.round(n * 1000) / 1000;
    const toast = text => Model.bus.emit('toast', { text, kind: 'warn' });
    G.choice = {}; G.options = {}; G.sel = null;
    const parse = key => { const [i, j] = M.parseKey(key.slice(2)); return { o: key[0], u: key[0] === 'H' ? i : j, c: key[0] === 'H' ? j : i }; };
    const wallKey = (o, u, c) => o + ':' + (o === 'H' ? u + ',' + c : c + ',' + u);
    const selected = () => G.sel && (S.project.levels[S.level].fits || []).find(f => f.id === G.sel);
    // The hinge is at the middle of the leaf's depth. Keep its half-thickness
    // sweep plus 5 mm in collision; finishing trim hides that structural gap.
    G.doorReveal = 0.006;
    G.doorGap = function (f) {
        const m = M.FitModels.model(f.m);
        const t = m && m.core ? (m.core[1] - m.core[0]) * f.d / Math.max(m.size[1], 1e-6) : Math.min(f.d, 0.08);
        return t / 2 + 0.005;
    };
    G.frameDoor = function (f) {
        if (f.kind !== 'frame' || !f.door) return null;
        const m = M.FitModels.model(f.door.m), inner = M.FitModels.frameInner(f);
        if (!m || !inner) return null;
        const h = inner.h - G.doorReveal, d = f.door.d || Math.max(0.03, Math.min(0.2, m.size[1] * h / m.size[2]));
        const w = inner.w - 2 * G.doorGap({ m: m.id, d });
        return { id: f.id + '_leaf', f: m.f, m: m.id, kind: 'door', cx: f.cx + inner.cu * Math.cos(f.yaw), cy: f.cy + inner.cu * Math.sin(f.yaw), zb: inner.zb,
            yaw: f.yaw, w, d, h, double: !!f.door.double, hinge: f.door.hinge || (m.latch > 0 ? 'r' : 'l'), rot: m.rot };
    };
    G.fits = P => P.levels.flatMap((L, k) => (L.fits || []).flatMap(f => {
        const leaf = G.frameDoor(f);
        return (leaf ? [f, leaf] : [f]).map(it => Object.assign({}, it, { level: k, zb: it.zb + k * P.settings.storyHeight }));
    }));
    G.ensureLibrary = function () {
        const FM = M.FitModels, context = S.project.kind + ':' + S.project.name;
        if (FM.lib.context !== context) { FM.reset(); FM.lib.context = context; G.sel = null; G.choice = {}; G.options = {}; }
        if (!FM.lib.loaded && !FM.lib.busy && !FM.lib.error) FM.loadLib();
    };
    G.onProject = function () {
        G.sel = null;
        if (G.fits(S.project).length) G.ensureLibrary();
    };
    G.cut = function (f) {
        if (f.kind === 'garage') return { cx: f.cx, cy: f.cy, zb: f.zb, w: round(f.w + 0.012), h: round(f.h + 0.006) };
        if (f.kind === 'door') return { cx: f.cx, cy: f.cy, zb: f.zb, w: round(f.w), h: round(f.h) };
        const z = f.kind === 'frame' && f.zb < 0.02 ? 0 : f.zb + 0.01;
        return { cx: f.cx, cy: f.cy, zb: z, w: f.w - 0.02, h: f.zb + f.h - 0.01 - z };
    };
    G.opening = function (P, k, wall) {
        const f = wall.fit && (P.levels[k].fits || []).find(f => f.id === wall.fit);
        if (!f) return null;
        const a = parse(f.anchor), cut = G.cut(f);
        return { f, c: a.o === 'H' ? f.cx : f.cy, w: cut.w, sill: cut.zb, head: cut.zb + cut.h, portal: f.kind === 'window' ? 0 : 8192 };
    };
    G.remove = function (P, k, id) {
        const L = P.levels[k];
        Object.entries(L.walls).forEach(([key, w]) => {
            if (w.fit !== id) return;
            delete w.fit; delete w.open;
            if (P.entrance && P.entrance.level === k && P.entrance.key === key) P.entrance = null;
        });
        L.fits = (L.fits || []).filter(f => f.id !== id);
    };
    G.plan = function (P, k, key, m, opts, id) {
        if (!m) throw new Error('Choose a model from the library first.');
        const a = parse(key), kind = opts.kind || M.FitModels.kindOf(m.f), L = P.levels[k];
        if (!['H', 'V'].includes(a.o) || !Number.isInteger(a.u) || !Number.isInteger(a.c) || !L.walls[key]) throw new Error('Choose an existing grid wall for this model.');
        const { w, d, h } = opts, zb = (kind === 'door' || kind === 'garage') ? 0 : (opts.zb == null ? 0 : opts.zb), offset = opts.offset == null ? 0 : opts.offset, centre = a.u + 0.5 + offset;
        if (![w, d, h, zb, offset].every(Number.isFinite) || w < 0.2 || w > 12 || d < 0.02 || d > 2 || h < 0.2 || zb < (kind === 'frame' ? -P.settings.slab : 0)) throw new Error('Use width 0.2–12 m, depth 0.02–2 m, and a height and sill that fit this level.');
        const flip = kind === 'garage' && opts.flip == null ? (a.o === 'H' ? !!L.floor[a.u + ',' + a.c] : !L.floor[a.c + ',' + a.u]) : !!opts.flip;
        const f = { id: id || 'gf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), anchor: key, f: m.f, m: m.id, kind,
            cx: a.o === 'H' ? centre : a.c, cy: a.o === 'H' ? a.c : centre, zb, w, d, h, offset,
            yaw: (a.o === 'H' ? 0 : Math.PI / 2) + (flip ? Math.PI : 0), flip, double: kind === 'door' && !!opts.double, hinge: opts.hinge || (m.latch > 0 ? 'r' : 'l'), rot: m.rot,
            door: kind === 'frame' && opts.door ? Object.assign({}, opts.door) : undefined,
            clearance: kind === 'garage' ? (opts.clearance == null ? 0.15 : opts.clearance) : undefined };
        if (kind === 'garage') {
            M.FitModels.validateGarage(f);
            if (h + f.clearance + d / 2 > P.settings.storyHeight - P.settings.slab - 0.01) throw new Error('The open garage panel would hit the ceiling. Reduce its height or head clearance, or increase the storey height.');
        }
        if (f.door) { const leaf = G.frameDoor(f); if (!leaf || leaf.w < 0.3 || leaf.h < 0.5) throw new Error('The door model is unavailable or the frame is too small for a door.'); }
        const cut = G.cut(f), lo = centre - cut.w / 2, hi = centre + cut.w / 2;
        if (Math.max(zb + h, cut.zb + cut.h) > P.settings.storyHeight - P.settings.slab - 0.01) throw new Error('The model reaches the ceiling. Reduce its height or sill, or increase the storey height.');
        const keys = [];
        for (let u = Math.floor(lo + 1e-6); u < Math.ceil(hi - 1e-6); u++) {
            const wk = wallKey(a.o, u, a.c), wall = L.walls[wk];
            if (wall && M.Model.wallRatio(wall) < 1) throw new Error('Use a full-height wall for a door or window model.');
            if (!wall) throw new Error('The model needs a longer straight wall. Move it away from the end or reduce its width.');
            if (wall.arch) throw new Error('Remove the adjustable archway before placing a model here.');
            if (wall.fit && wall.fit !== id) throw new Error('This opening overlaps another model. Remove it first or choose another wall.');
            if (wall.open && !wall.fit && wk !== key) throw new Error('This opening overlaps an existing door or window. Remove that opening first.');
            keys.push(wk);
        }
        // A wide opening must not cut through a perpendicular room wall or corner.
        for (let u = Math.floor(lo) + 1; u < hi - 1e-6; u++) {
            if (a.o === 'H' ? (L.walls['V:' + u + ',' + a.c] || L.walls['V:' + u + ',' + (a.c - 1)]) : (L.walls['H:' + a.c + ',' + u] || L.walls['H:' + (a.c - 1) + ',' + u])) throw new Error('The opening crosses a corner or partition. Move it or reduce its width.');
        }
        return { f, keys };
    };
    G.place = function (P, k, key, m, opts, id) {
        const plan = G.plan(P, k, key, m, opts, id), entrance = P.entrance, index = (P.levels[k].fits || []).findIndex(f => f.id === id);
        if (id) G.remove(P, k, id);
        const L = P.levels[k]; L.fits = L.fits || []; L.fits.splice(index < 0 ? L.fits.length : index, 0, plan.f);
        plan.keys.forEach(wk => { L.walls[wk].fit = plan.f.id; L.walls[wk].open = plan.f.kind === 'window' ? 'window' : 'door'; });
        if (entrance && entrance.level === k && plan.keys.includes(entrance.key) && plan.f.kind !== 'window') P.entrance = { level: k, key: plan.f.anchor };
        return plan.f;
    };
    // Fit the frame to the existing leaf, including asymmetric frame openings.
    G.wrapDoor = function (P, k, door, frame, options) {
        const inner = frame.inner || [frame.min[0], frame.max[0], frame.min[2], frame.max[2]];
        const iw = inner[1] - inner[0], ih = inner[3] - inner[2];
        if (iw <= 0 || ih <= 0) throw new Error('This frame has no usable door opening.');
        const h = (door.h + G.doorReveal) * frame.size[2] / ih, w = (door.w + 2 * G.doorGap(door)) * frame.size[0] / iw;
        const cu = ((inner[0] + inner[1]) / 2 - (frame.min[0] + frame.max[0]) / 2) * w / frame.size[0];
        const a = parse(door.anchor), centre = a.o === 'H' ? door.cx : door.cy;
        return G.place(P, k, door.anchor, frame, { kind: 'frame', w, h, d: options.d, flip: door.flip,
            zb: door.zb - (inner[2] - frame.min[2]) * h / frame.size[2], offset: centre - (a.u + 0.5) - (door.flip ? -cu : cu),
            door: { m: door.m, d: door.d, hinge: door.hinge, double: door.double } }, door.id);
    };
    G.choose = function (type, m) {
        G.sel = null; G.choice[type] = m ? m.id : null;
        if (m) {
            const kind = M.FitModels.kindOf(m.f), maxH = S.project.settings.storyHeight - S.project.settings.slab - 0.05;
            const h = Math.min(kind === 'window' ? 1.2 : kind === 'garage' ? 2.4 : 2.1, maxH), scale = h / m.size[2];
            G.options[type] = { clearance: kind === 'garage' ? 0.15 : undefined, kind, w: round(Math.max(0.2, Math.min(12, m.size[0] * scale))), h: round(h), d: round(Math.max(0.03, Math.min(2, m.size[1] * scale))), zb: kind === 'window' ? round(Math.max(0, Math.min(0.9, maxH - h))) : 0, flip: kind === 'garage' ? null : false, double: false, hinge: m.latch > 0 ? 'r' : 'l' };
        }
        M.UI.renderLeft();
    };
    // True means this click was handled by the library; otherwise use the original simple opening tool.
    G.click = function (key, type) {
        const P = S.project, L = P.levels[S.level], w = L.walls[key], f = w && (L.fits || []).find(f => f.id === w.fit);
        if (f) {
            try {
                const chosen = M.FitModels.model(G.choice[type]), kind = chosen && M.FitModels.kindOf(chosen.f); let result = f;
                if (f.kind === 'door' && kind === 'frame') Model.edit(Q => { result = G.wrapDoor(Q, S.level, f, chosen, G.options[type]); });
                else if (f.kind === 'frame' && kind === 'door') Model.edit(Q => { result = G.place(Q, S.level, f.anchor, M.FitModels.model(f.m), Object.assign({}, f, { door: { m: chosen.id, hinge: G.options[type].hinge, double: G.options[type].double } }), f.id); });
                G.sel = result.id; G.choice[type] = result.m; G.options[type] = Object.assign({}, result); M.UI.renderLeft();
            } catch (e) { toast(e.message); }
            return true;
        }
        if (!G.choice[type]) return false;
        try {
            const m = M.FitModels.model(G.choice[type]);
            G.plan(P, S.level, key, m, G.options[type]);
            Model.edit(Q => { const f = G.place(Q, S.level, key, m, G.options[type]); G.sel = f.id; if (f.kind === 'garage') G.options[type] = Object.assign({}, f); });
            M.UI.renderLeft();
        } catch (e) { toast(e.message); }
        return true;
    };
    G.preview = function (key, type) {
        const m = M.FitModels.model(G.choice[type]); if (!m) return null;
        try { const f = G.plan(S.project, S.level, key, m, G.options[type], (S.project.levels[S.level].walls[key] || {}).fit).f; return Object.assign({}, f, { zb: f.zb + S.level * S.project.settings.storyHeight }); } catch (e) { return null; }
    };
    G.validate = function (P) {
        const FM = M.FitModels;
        const placed = P.levels.flatMap((L, k) => (L.fits || []).map(f => ({ f, k })));
        if (placed.length && (!FM.lib.loaded || FM.lib.context !== 'grid:' + P.name)) throw new Error('Open the Window or Door tool and wait for this project’s model library to load.');
        if (placed.length && (FM.lib.busy || FM.lib.error)) throw new Error('Wait for the model library to finish loading, or use Reload library to resolve its error before exporting.');
        placed.forEach(({ f, k }) => {
            const m = FM.model(f.m); if (!m) throw new Error('A placed window or door model is unavailable. Open its tool and load the library before exporting.');
            G.plan(P, k, f.anchor, m, f, f.id);
        });
    };
    G.panel = function (root, type) {
        G.ensureLibrary(); const FM = M.FitModels, lib = FM.lib;
        root.append(el('button', { class: 'btn sm', onclick: () => G.choose(type, null) }, 'Use simple ' + (type === 'window' ? 'window' : 'doorway')));
        const file = el('input', { type: 'file', accept: '.glb', multiple: true, style: { display: 'none' }, onchange: async e => {
            const P = S.project;
            try {
                await Model.save();
                for (const f of e.target.files) {
                    if (!/\.glb$/i.test(f.name)) continue;
                    await Model.apiRaw('import/upload?name=' + encodeURIComponent(Model.safeName(P.name)) + '&file=' + encodeURIComponent(f.name), await f.arrayBuffer());
                    if (S.project !== P) return;
                    Model.edit(Q => { Q.fittings = Q.fittings || {}; Q.fittings.glbKinds = Q.fittings.glbKinds || {}; Q.fittings.glbKinds[f.name] = type; });
                }
                await FM.loadLib();
            } catch (err) { toast(err.message); }
        } });
        root.append(el('div', { class: 'row wrap' }, file, el('button', { class: 'btn sm', onclick: () => file.click() }, 'Add .glb models...'), el('button', { class: 'btn sm', disabled: lib.busy, onclick: () => FM.loadLib() }, 'Reload library')));
        if (lib.busy) root.append(el('div', { class: 'note' }, 'Reading the window and door library...'));
        if (lib.error) root.append(el('div', { class: 'note bad' }, lib.error));
        const sel = selected(), f = sel && (type === 'window' ? sel.kind === 'window' : sel.kind !== 'window') ? sel : null;
        const m = FM.model(G.choice[type]), opts = G.options[type];
        if (m && opts) {
            root.append(el('div', { class: 'h' }, (f ? 'Selected: ' : 'Place: ') + m.name));
            const update = (key, value) => {
                const next = Object.assign({}, opts, { [key]: value });
                try {
                    if (f) { G.plan(S.project, S.level, f.anchor, m, next, f.id); Model.edit(P => G.place(P, S.level, f.anchor, m, next, f.id)); }
                    G.options[type] = next;
                } catch (e) { toast(e.message); }
                M.UI.renderLeft();
            };
            [['Width (m)', 'w'], ['Height (m)', 'h'], ['Depth (m)', 'd']].concat(opts.kind === 'garage' ? [['Head clearance (m)', 'clearance']] : []).concat(opts.kind === 'window' ? [['Sill height (m)', 'zb']] : []).forEach(([label, key]) => root.append(el('div', { class: 'row' }, el('label', null, label), el('input', { class: 'grow', type: 'number', step: '0.05', value: round(opts[key]), 'aria-label': label, onchange: e => update(key, e.target.value === '' ? NaN : Number(e.target.value)) }))));
            root.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: opts.flip, onchange: e => update('flip', e.target.checked) }), 'Reverse facing'));
            if (opts.kind === 'garage') root.append(el('div', { class: 'note' }, 'Lifts and tips back under the ceiling. Leave space behind it equal to its height; Reverse facing changes which side it tips into. Export includes a shared open/close controller; press E near the door in-game.'));
            if (opts.kind === 'door') {
                root.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: opts.double, onchange: e => update('double', e.target.checked) }), 'Double door (two leaves)'));
                root.append(el('div', { class: 'row' }, el('label', null, 'Hinge'), el('select', { 'aria-label': 'Hinge', onchange: e => update('hinge', e.target.value) }, ...['l', 'r'].map(v => el('option', { value: v, selected: opts.hinge === v }, v === 'l' ? 'Left' : 'Right')))));
            }
            if (opts.kind === 'frame') {
                const doors = FM.models().filter(m => FM.kindOf(m.f) === 'door');
                root.append(el('div', { class: 'row' }, el('label', null, 'Door in frame'), el('select', { class: 'grow', 'aria-label': 'Door in frame', onchange: e => update('door', e.target.value ? { m: e.target.value } : null) }, el('option', { value: '', selected: !opts.door }, 'No door leaf'), ...doors.map(m => el('option', { value: m.id, selected: opts.door && opts.door.m === m.id }, m.name)))));
                if (opts.door) root.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: opts.door.double, onchange: e => update('door', Object.assign({}, opts.door, { double: e.target.checked })) }), 'Double door inside frame'));
            }
            root.append(el('div', { class: 'row wrap' }, ...[['tilt', 'Stand up'], ['roll', 'Quarter turn'], ['auto', 'Auto orientation']].map(([how, label]) => el('button', { class: 'btn sm', onclick: () => FM.setup(m, how) }, label))));
            if (f) root.append(el('button', { class: 'btn sm danger', onclick: () => { Model.edit(P => G.remove(P, S.level, f.id)); G.sel = null; M.UI.renderLeft(); } }, 'Remove selected model'));
            root.append(el('div', { class: 'note' }, 'Click a straight wall to place; click a placed opening to edit it. Wide models open neighbouring wall cells automatically. Exterior openings receive portals on export.'));
            if (type === 'door') root.append(el('div', { class: 'note' }, 'To add a frame around a door, choose a frame and click the existing door. To fit a door into a frame, choose a door and click the frame.'));
        }
        const files = lib.files.filter(file => type === 'window' ? FM.kindOf(file.file) === 'window' : FM.kindOf(file.file) !== 'window');
        if (lib.loaded && !lib.busy && !files.some(file => file.models.length)) root.append(el('div', { class: 'note' }, 'No ' + type + ' models found. Keep the original models folder next to MloCreator.exe, or add a .glb file.'));
        files.forEach(file => {
            root.append(el('div', { class: 'h' }, file.title || file.file));
            if (!file.builtin) root.append(el('select', { 'aria-label': 'Model type for ' + file.file, onchange: e => FM.setKind(file.file, e.target.value) }, ...['window', 'door', 'frame', 'garage'].map(kind => el('option', { value: kind, selected: FM.kindOf(file.file) === kind }, kind))));
            if (file.error) root.append(el('div', { class: 'note bad' }, file.error));
            const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' } });
            file.models.forEach(m => grid.append(el('button', { class: 'pitem', 'aria-label': 'Choose ' + m.name, title: m.name, style: { flexDirection: 'column', padding: '5px', color: 'inherit', font: 'inherit', borderColor: G.choice[type] === m.id ? 'var(--accent)' : '' }, onclick: () => G.choose(type, m) }, FM.thumb(m, 56), el('span', { style: { fontSize: '11px' } }, m.name))));
            root.append(grid);
            if (file.author || file.license) root.append(el('div', { class: 'note' }, [file.author, file.license].filter(Boolean).join(' · ')));
        });
    };
})(window.MLO);
