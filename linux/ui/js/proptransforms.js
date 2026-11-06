// Furniture-only transforms. Preview is separate from saved state; release commits one edit.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const F = M.Props,
        Model = M.Model,
        S = Model.state,
        el = M.el;
    const clone = (o) => JSON.parse(JSON.stringify(o)),
        id = () => 'p' + Math.random().toString(36).slice(2, 11);
    const holder = (P) => (P.kind === 'grid' ? P.levels[S.level] : P.shell);
    const baseZ = () => (S.project.kind === 'grid' ? S.level * S.project.settings.storyHeight : 0);
    const scope = (P = S.project, k = S.level) =>
        P.kind === 'grid' ? 'grid:' + k : 'import:' + (P.import?.activeB || 'b1') + ':' + (P.import?.activeFloor || 'f1');
    let ids = new Set(),
        context = null,
        contextProject = null,
        drag = null,
        hover = null,
        queued = false;
    F.choice = null;
    F.preview = new Map();
    F.gridStep = 0.1;
    F.angleStep = 15;
    F.surfaceMode = 'surfaces';
    const redraw = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            if (M.App.remesh) M.App.remesh();
        });
    };
    function guard() {
        const h = scope();
        if (context !== h || contextProject !== S.project) {
            context = h;
            contextProject = S.project;
            ids.clear();
            drag = null;
            F.preview.clear();
            F.move = false;
        }
        return h;
    }
    F.selected = () => {
        guard();
        return F.list(S.project).filter((p) => ids.has(p.id));
    };
    Object.defineProperty(F, 'sel', {
        get: () => F.selected()[0]?.id || null,
        set: (v) => {
            F.cancel();
            guard();
            ids = new Set(v ? [v] : []);
        },
        configurable: true,
    });
    F.cancel = () => {
        const had = !!drag || F.preview.size > 0;
        drag = null;
        hover = null;
        F.preview.clear();
        F.move = false;
        if (M.App?.canvas) M.App.canvas.style.cursor = '';
        if (had) redraw();
        return had;
    };
    F.select = (pid, toggle = false) => {
        F.cancel();
        guard();
        const p = F.list(S.project).find((p) => p.id === pid);
        if (!p) {
            ids.clear();
            return;
        }
        const group = F.list(S.project)
            .filter((q) => q.id === pid || (p.group && q.group === p.group))
            .map((q) => q.id);
        const remove = toggle && group.every((id) => ids.has(id));
        if (!toggle) ids.clear();
        group.forEach((id) => (remove ? ids.delete(id) : ids.add(id)));
        F.choice = null;
        M.UI.renderLeft();
    };
    F.bounds = (items) => {
        const points = items.flatMap((p) => F.parts(p).flatMap(F.corners));
        if (!points.length) return null;
        const min = [Infinity, Infinity, Infinity],
            max = [-Infinity, -Infinity, -Infinity];
        points.forEach((p) =>
            p.forEach((v, i) => {
                min[i] = Math.min(min[i], v);
                max[i] = Math.max(max[i], v);
            }),
        );
        return { min, max, center: min.map((v, i) => (v + max[i]) / 2) };
    };
    F.transform = (items, delta = [0, 0, 0], angle = 0, pivot = F.bounds(items)?.center) =>
        items.map((p) => {
            const c = Math.cos(angle),
                s = Math.sin(angle),
                x = p.x - pivot[0],
                y = p.y - pivot[1];
            const q = {
                ...p,
                x: pivot[0] + x * c - y * s + delta[0],
                y: pivot[1] + x * s + y * c + delta[1],
                z: p.z + delta[2],
                yaw: p.yaw + angle,
            };
            F.validate(q);
            return q;
        });
    F.commit = (items) => {
        items.forEach(F.validate);
        const patches = new Map(items.map((p) => [p.id, p]));
        Model.edit((P) => {
            F.list(P).forEach((p) => {
                if (patches.has(p.id)) Object.assign(p, patches.get(p.id));
            });
        });
        M.UI.renderLeft();
    };
    F.rotate = (angle) => {
        const list = F.selected();
        if (list.length) F.commit(F.transform(list, [0, 0, 0], angle));
    };
    F.remove = () => {
        const list = F.selected();
        if (!list.length) return;
        F.cancel();
        const remove = new Set(list.map((p) => p.id));
        Model.edit((P) => {
            holder(P).props = F.list(P).filter((p) => !remove.has(p.id));
        });
        ids.clear();
        M.UI.renderLeft();
    };
    F.duplicate = () => {
        const list = F.selected();
        if (!list.length) return;
        F.cancel();
        const groups = new Map();
        const copies = list.map((p) => {
            const q = { ...p, id: id(), x: p.x + 0.25, y: p.y + 0.25 };
            if (p.group) {
                if (!groups.has(p.group)) groups.set(p.group, id());
                q.group = groups.get(p.group);
            }
            F.validate(q);
            return q;
        });
        Model.edit((P) => {
            holder(P).props.push(...copies);
        });
        ids = new Set(copies.map((p) => p.id));
        F.move = true;
        F.choice = null;
        M.UI.renderLeft();
    };
    F.group = (name = 'Furniture group') => {
        const list = F.selected();
        if (list.length < 2) return;
        const gid = id(),
            label = String(name).trim().slice(0, 60) || 'Furniture group';
        F.commit(list.map((p) => ({ ...p, group: gid, groupName: label })));
    };
    F.ungroup = () => {
        const list = F.selected();
        F.commit(
            list.map((p) => {
                const q = { ...p };
                delete q.group;
                delete q.groupName;
                return { ...q, group: null, groupName: null };
            }),
        );
    };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
        add = (a, b, t = 1) => a.map((v, i) => v + b[i] * t),
        sub = (a, b) => a.map((v, i) => v - b[i]);
    const snap = (n, step, free) => (step > 0 && !free ? Math.round(n / step) * step : n);
    function lineParam(ray, P, A) {
        const w = sub(P, ray.o),
            b = dot(A, ray.d),
            c = dot(ray.d, ray.d),
            den = c - b * b;
        return Math.abs(den) < 1e-7 ? null : (b * dot(ray.d, w) - c * dot(A, w)) / den;
    }
    function plane(ray, z) {
        if (Math.abs(ray.d[2]) < 1e-8) return null;
        const t = (z - ray.o[2]) / ray.d[2];
        return t < 0 ? null : { t, p: add(ray.o, ray.d, t), n: [0, 0, 1] };
    }
    F.pick = (ray) => {
        let best = null;
        const z = baseZ();
        F.list(S.project).forEach((p) =>
            F.parts(p, z).forEach((b) => {
                const c = Math.cos(b.yaw),
                    s = Math.sin(b.yaw),
                    x = ray.o[0] - b.cx,
                    y = ray.o[1] - b.cy;
                const t = M.Tools.api.rayBox(
                    {
                        o: [x * c + y * s, -x * s + y * c, ray.o[2]],
                        d: [ray.d[0] * c + ray.d[1] * s, -ray.d[0] * s + ray.d[1] * c, ray.d[2]],
                    },
                    [-b.w / 2, -b.d / 2, b.z],
                    [b.w / 2, b.d / 2, b.z + b.h],
                );
                if (t != null && (!best || t < best.t)) best = { p, t };
            }),
        );
        return best;
    };
    function triHit(ray, a, b, c) {
        const e1 = sub(b, a),
            e2 = sub(c, a),
            cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
            p = cross(ray.d, e2),
            det = dot(e1, p);
        if (Math.abs(det) < 1e-8) return null;
        const t = sub(ray.o, a),
            u = dot(t, p) / det;
        if (u < 0 || u > 1) return null;
        const q = cross(t, e1),
            v = dot(ray.d, q) / det;
        if (v < 0 || u + v > 1) return null;
        const d = dot(e2, q) / det;
        if (d < 0) return null;
        let n = cross(e1, e2),
            len = Math.hypot(...n);
        n = n.map((v) => v / len);
        if (dot(n, ray.d) > 0) n = n.map((v) => -v);
        return { t: d, p: add(ray.o, ray.d, d), n };
    }
    F.surface = (ray, exclude = new Set(), mode = F.surfaceMode) => {
        let best = mode === 'walls' ? null : plane(ray, baseZ());
        const accept = (h) => {
            if (h && (!best || h.t < best.t)) best = h;
        };
        if (mode === 'surfaces')
            F.list(S.project)
                .filter((p) => !exclude.has(p.id))
                .forEach((p) =>
                    F.parts(p, baseZ()).forEach((b) => {
                        const h = plane(ray, b.z + b.h);
                        if (!h) return;
                        const c = Math.cos(b.yaw),
                            s = Math.sin(b.yaw),
                            x = h.p[0] - b.cx,
                            y = h.p[1] - b.cy;
                        const u = (x * c + y * s) / (b.w / 2), v = (-x * s + y * c) / (b.d / 2);
                        if (Math.abs(u) <= 1 && Math.abs(v) <= 1 && (b.shape !== 'cylinder' || u * u + v * v <= 1)) accept(h);
                    }),
                );
        if (mode !== 'grid') {
            (M.App.built?.batches || [])
                .filter((b) => (mode === 'walls' ? b.kind === 'wall' : b.kind === 'floor' || b.kind === 'stair'))
                .filter((b) => S.project.kind !== 'grid' || b.level === S.level)
                .forEach((b) => {
                    for (let i = 0; i < b.idx.length; i += 3) {
                        const pts = [0, 1, 2].map((j) => Array.from(b.pos.slice(b.idx[i + j] * 3, b.idx[i + j] * 3 + 3))),
                            h = triHit(ray, ...pts);
                        if (h && (mode === 'walls' ? Math.abs(h.n[2]) < 0.2 : h.n[2] > 0.9)) accept(h);
                    }
                });
            if (S.project.kind === 'import' && M.ImportModel?.loaded) {
                const h = M.ImportModel.pick(ray);
                if (h && (mode === 'walls' ? Math.abs(h.n[2]) < 0.2 : h.n[2] > 0.9)) accept(h);
            }
        }
        return best;
    };
    F.target = (items, ray, free = false, offset = [0, 0], planeZ = null) => {
        const b = F.bounds(items),
            excluded = new Set(items.map((p) => p.id)),
            h = free ? plane(ray, planeZ == null ? baseZ() + b.min[2] : planeZ) : F.surface(ray, excluded);
        if (!h) return null;
        let x = snap(h.p[0] + offset[0], F.gridStep, free),
            y = snap(h.p[1] + offset[1], F.gridStep, free),
            z = h.p[2] - baseZ();
        if (!free && F.surfaceMode === 'walls') {
            const n = h.n,
                pts = items.flatMap((p) => F.parts(p).flatMap(F.corners));
            const reach = -pts.reduce((min, p) => Math.min(min, (p[0] - b.center[0]) * n[0] + (p[1] - b.center[1]) * n[1]), Infinity);
            const u = [-n[1], n[0]],
                along = snap(h.p[0] * u[0] + h.p[1] * u[1], F.gridStep, false),
                diff = along - dot(h.p.slice(0, 2), u);
            x = h.p[0] + u[0] * diff + n[0] * (reach + 0.005);
            y = h.p[1] + u[1] * diff + n[1] * (reach + 0.005);
            z = snap(h.p[2] - baseZ() - (b.max[2] - b.min[2]) / 2, F.gridStep, false);
        }
        return F.transform(items, [x - b.center[0], y - b.center[1], z - b.min[2]]);
    };
    F.gizmo = () => {
        const list = F.selected().map((p) => F.preview.get(p.id) || p),
            b = F.bounds(list);
        if (!b) return [];
        const c = add(b.center, [0, 0, baseZ()]),
            L = Math.max(0.5, Math.min(2, M.App.renderer.camera.dist * 0.075)),
            r = Math.max(0.5, Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 2 + 0.2),
            z = baseZ() + b.min[2] + 0.035;
        const out = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ].map((axis, i) => ({
            id: ['x', 'y', 'z'][i],
            axis,
            p: c,
            p2: add(c, axis, L),
            col: [
                [1, 0.3, 0.3, 1],
                [0.3, 0.95, 0.4, 1],
                [0.3, 0.6, 1, 1],
            ][i],
        }));
        out.push({
            id: 'ring',
            p: [c[0], c[1], z],
            points: Array.from({ length: 65 }, (_, i) => [
                c[0] + r * Math.cos((i * Math.PI) / 32),
                c[1] + r * Math.sin((i * Math.PI) / 32),
                z,
            ]),
            col: [1, 0.8, 0.3, 1],
        });
        return out;
    };
    function screen(p) {
        const r = M.App.canvas.getBoundingClientRect(),
            cam = M.App.renderer.camera;
        cam.update(r.width / r.height);
        return cam.project(p, r.width, r.height);
    }
    function segDistance(p, a, b) {
        const d = sub(b, a),
            l = dot(d, d),
            t = l ? Math.max(0, Math.min(1, dot(sub(p, a), d) / l)) : 0;
        return Math.hypot(...sub(p, add(a, d, t)));
    }
    F.handleAt = (e) => {
        const r = M.App.canvas.getBoundingClientRect(),
            p = [e.clientX - r.left, e.clientY - r.top];
        let best = null,
            dist = Infinity;
        F.gizmo().forEach((h) => {
            const pts = (h.points || [h.p, h.p2]).map(screen);
            for (let i = 0; i < pts.length - 1; i++) {
                if (!pts[i] || !pts[i + 1]) continue;
                const d = segDistance(p, pts[i], pts[i + 1]);
                if (d < (h.id === 'ring' ? 7 : 10) && d < dist) {
                    best = h;
                    dist = d;
                }
            }
        });
        return best;
    };
    F.beginDrag = (handle, ray, e) => {
        const items = clone(F.selected());
        if (!items.length) return;
        const b = F.bounds(items),
            p = handle?.p || add(b.center, [0, 0, baseZ()]);
        const hit = plane(ray, baseZ() + b.min[2]);
        drag = {
            project: S.project,
            scope: scope(),
            items,
            handle: handle || { id: 'free' },
            pivot: b.center,
            p,
            start: [e.clientX, e.clientY],
            offset: hit ? [b.center[0] - hit.p[0], b.center[1] - hit.p[1]] : [0, 0],
            moved: false,
            param: handle?.axis ? lineParam(ray, p, handle.axis) : null,
            angle:
                handle?.id === 'ring'
                    ? (() => {
                          const h = plane(ray, p[2]);
                          return h ? Math.atan2(h.p[1] - p[1], h.p[0] - p[0]) : null;
                      })()
                    : null,
        };
    };
    F.dragTo = (ray, e) => {
        if (!drag) return;
        const d = drag;
        if (d.project !== S.project || d.scope !== scope()) {
            F.cancel();
            return;
        }
        if (!d.moved && Math.hypot(e.clientX - d.start[0], e.clientY - d.start[1]) < 3) return;
        let next = null;
        if (d.handle.axis) {
            const t = lineParam(ray, d.p, d.handle.axis);
            if (t == null || d.param == null) return;
            const delta = snap(t - d.param, F.gridStep, e.shiftKey);
            next = F.transform(
                d.items,
                d.handle.axis.map((v) => v * delta),
            );
        } else if (d.handle.id === 'ring') {
            const h = plane(ray, d.p[2]);
            if (!h || d.angle == null) return;
            let a = Math.atan2(h.p[1] - d.p[1], h.p[0] - d.p[0]) - d.angle;
            a = Math.atan2(Math.sin(a), Math.cos(a));
            a = snap(a, (F.angleStep * Math.PI) / 180, e.shiftKey);
            next = F.transform(d.items, [0, 0, 0], a, d.pivot);
        } else next = F.target(d.items, ray, e.shiftKey, d.offset, baseZ() + F.bounds(d.items).min[2]);
        if (next) {
            d.moved = true;
            F.preview = new Map(next.map((p) => [p.id, p]));
            redraw();
        }
    };
    F.previewItem = (P, k, p) => (drag && drag.project === P && drag.scope === scope(P, k) ? F.preview.get(p.id) || p : p);
    F.up = () => {
        if (!drag) return;
        const d = drag,
            next = Array.from(F.preview.values());
        drag = null;
        F.preview.clear();
        if (d.project === S.project && d.scope === scope() && d.moved && next.length) F.commit(next);
        redraw();
    };
    F.down = (e) => {
        guard();
        const ray = M.Tools.api.pointerRay(e),
            handle = F.move ? null : F.handleAt(e);
        if (handle) {
            F.beginDrag(handle, ray, e);
            return;
        }
        const hit = F.pick(ray);
        if (hit && !F.move && !F.choice) {
            if (e.shiftKey) {
                F.select(hit.p.id, true);
                return;
            }
            if (!ids.has(hit.p.id)) F.select(hit.p.id);
            F.choice = null;
            F.beginDrag(null, ray, e);
            return;
        }
        if (e.shiftKey && !F.choice && !F.move) {
            F.sel = null;
            M.UI.renderLeft();
            return;
        }
        if (F.move && F.selected().length) {
            const next = F.target(clone(F.selected()), ray, e.shiftKey);
            if (next) {
                F.commit(next);
                F.move = false;
            }
            return;
        }
        if (F.choice) {
            const d = F.catalog.find((d) => d.id === F.choice),
                template = {
                    id: 'preview',
                    model: d.id,
                    x: 0,
                    y: 0,
                    z: 0,
                    yaw: 0,
                    w: d.size[0],
                    d: d.size[1],
                    h: d.size[2],
                    tex: d.tex,
                    accent: 'wood_oak',
                },
                next = F.target([template], ray, e.shiftKey);
            if (next) {
                Model.edit((P) => {
                    F.sel = F.place(P, S.level, d.id, next[0].x, next[0].y, { z: next[0].z }).id;
                });
                F.choice = null;
                M.UI.renderLeft();
            }
        } else {
            F.sel = null;
            M.UI.renderLeft();
        }
    };
    F.pointerMove = (e) => {
        if (drag) F.dragTo(M.Tools.api.pointerRay(e), e);
        else hover = F.handleAt(e);
    };
    F.key = (e, k) => {
        if (k === 'Escape') {
            if (!F.cancel()) {
                F.sel = null;
                F.choice = null;
            }
            M.UI.renderLeft();
            return true;
        }
        if (k === 'Delete' || k === 'x') {
            F.remove();
            return true;
        }
        if (k === 'r') {
            F.rotate(Math.PI / 2);
            return true;
        }
        if (k === 'd' && e.shiftKey) {
            F.duplicate();
            return true;
        }
        return false;
    };
    F.draw = (R) => {
        if (drag && (drag.project !== S.project || drag.scope !== scope())) F.cancel();
        F.selected().forEach((p) =>
            F.parts(F.preview.get(p.id) || p, baseZ()).forEach((b) =>
                R.ovOBox([b.cx, b.cy, b.z + b.h / 2], b.w / 2, b.d / 2, b.h / 2, b.yaw, null, [1, 1, 1, 0.85]),
            ),
        );
        F.gizmo().forEach((h) => {
            const col = drag?.handle.id === h.id || hover?.id === h.id ? [1, 1, 0.6, 1] : h.col;
            if (h.points) {
                for (let i = 1; i < h.points.length; i++) R.ovTopLine(h.points[i - 1], h.points[i], col);
            } else {
                R.ovTopLine(h.p, h.p2, col);
                const L = Math.hypot(...sub(h.p2, h.p)) * 0.13,
                    perp = h.axis[2] ? [1, 0, 0] : [0, 0, 1],
                    back = add(h.p2, h.axis, -L);
                R.ovTopQuad(add(back, perp, L / 2), add(back, perp, -L / 2), h.p2, h.p2, col);
            }
        });
        M.App.canvas.style.cursor = drag ? 'grabbing' : hover ? 'grab' : '';
    };
    const panel = F.panel;
    F.panel = (root) => {
        guard();
        const list = F.selected();
        root.append(el('div', { class: 'h' }, 'Placement & selection'));
        const select = (label, value, choices, change) =>
            root.append(
                el(
                    'div',
                    { class: 'row' },
                    el('label', null, label),
                    el(
                        'select',
                        { 'aria-label': label, onchange: (e) => change(e.target.value) },
                        ...choices.map(([v, l]) => el('option', { value: v, selected: String(value) === String(v) }, l)),
                    ),
                ),
            );
        select(
            'Grid snap',
            F.gridStep,
            [
                [0, 'Off'],
                [0.01, '1 cm'],
                [0.05, '5 cm'],
                [0.1, '10 cm'],
                [0.25, '25 cm'],
                [0.5, '50 cm'],
                [1, '1 m'],
            ],
            (v) => (F.gridStep = Number(v)),
        );
        select(
            'Rotation snap',
            F.angleStep,
            [
                [0, 'Free'],
                [15, '15°'],
                [45, '45°'],
                [90, '90°'],
            ],
            (v) => (F.angleStep = Number(v)),
        );
        select(
            'Snap to',
            F.surfaceMode,
            [
                ['surfaces', 'Floor / furniture tops'],
                ['walls', 'Wall faces'],
                ['grid', 'Grid only'],
            ],
            (v) => (F.surfaceMode = v),
        );
        root.append(
            el(
                'div',
                { class: 'note' },
                'Shift-click adds or removes selection. Drag arrows to move; drag the ring to rotate. Drag an item to slide it. Hold Shift during a drag for unsnapped movement. Esc cancels a drag.',
            ),
        );
        root.append(
            el(
                'div',
                { class: 'row wrap' },
                el(
                    'button',
                    {
                        class: 'btn sm',
                        onclick: () => {
                            F.cancel();
                            guard();
                            ids = new Set(F.list(S.project).map((p) => p.id));
                            F.choice = null;
                            M.UI.renderLeft();
                        },
                    },
                    'Select all furniture',
                ),
                el(
                    'button',
                    {
                        class: 'btn sm',
                        onclick: () => {
                            F.sel = null;
                            F.choice = null;
                            M.UI.renderLeft();
                        },
                    },
                    'Clear selection',
                ),
            ),
        );
        if (list.length) {
            root.append(el('div', { class: 'h' }, list.length + ' selected'));
            if (list.length > 1) {
                const name = el('input', {
                    type: 'text',
                    value: list[0].groupName || 'Furniture group',
                    'aria-label': 'Group name',
                    maxlength: '60',
                });
                root.append(name, el('button', { class: 'btn sm', onclick: () => F.group(name.value) }, 'Group selection'));
                root.append(
                    el(
                        'div',
                        { class: 'row wrap' },
                        el(
                            'button',
                            {
                                class: 'btn sm',
                                onclick: () => {
                                    F.move = true;
                                    M.UI.renderLeft();
                                },
                            },
                            'Move selection with next click',
                        ),
                        el('button', { class: 'btn sm', onclick: () => F.rotate(Math.PI / 2) }, 'Rotate selection 90°'),
                        el('button', { class: 'btn sm', onclick: F.duplicate }, 'Duplicate selection'),
                        el('button', { class: 'btn sm danger', onclick: F.remove }, 'Delete selection'),
                    ),
                );
            }
            if (list.some((p) => p.group)) root.append(el('button', { class: 'btn sm', onclick: F.ungroup }, 'Ungroup selection'));
        }
        panel(root);
    };
    Model.bus.on('project', () => {
        F.cancel();
        ids.clear();
        context = null;
    });
    Model.bus.on('buildings', () => {
        F.cancel();
        ids.clear();
        context = null;
    });
})(window.MLO);
