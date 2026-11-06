// Original static furniture. Geometry and collision share the same rotated parts.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const { Model, el } = M,
        S = Model.state,
        F = (M.Props = {});
    const box = (x, y, z, w, d, h, accent = false) => ({ x, y, z, w, d, h, accent });
    const legs = (w, d, h, t = 0.07) =>
        [-1, 1].flatMap((x) => [-1, 1].map((y) => box((x * (w - t)) / 2, (y * (d - t)) / 2, 0, t, t, h, true)));
    const table = (w, d, h) => [...legs(w, d, h - 0.07), box(0, 0, h - 0.07, w, d, 0.07)];
    const sofa = (w) => [
        box(0, 0, 0.14, w, 0.85, 0.22, true),
        box(0, -0.34, 0.36, w, 0.17, 0.52),
        box(-(w - 0.16) / 2, 0, 0.36, 0.16, 0.85, 0.32),
        box((w - 0.16) / 2, 0, 0.36, 0.16, 0.85, 0.32),
        ...[-1, 1].map((x) => box((x * (w - 0.34)) / 4, 0.09, 0.36, (w - 0.36) / 2, 0.64, 0.15)),
        ...legs(w - 0.16, 0.68, 0.14),
    ];
    const entries = [
        ['sofa', 'Two-seat sofa', 'Seating', sofa(1.9), 'plaster_navy'],
        ['armchair', 'Armchair', 'Seating', sofa(0.95), 'plaster_sage'],
        ['chair', 'Dining chair', 'Seating', [...table(0.46, 0.48, 0.46), box(0, -0.205, 0.46, 0.46, 0.07, 0.43)], 'wood_oak'],
        ['bench', 'Bench', 'Seating', table(1.5, 0.45, 0.46), 'wood_oak'],
        ['dining_table', 'Dining table', 'Tables', table(1.6, 0.9, 0.76), 'wood_oak'],
        ['coffee_table', 'Coffee table', 'Tables', table(1.1, 0.6, 0.42), 'wood_oak'],
        ['desk', 'Writing desk', 'Tables', [...table(1.3, 0.65, 0.75), box(0.42, 0, 0.3, 0.32, 0.55, 0.37, true)], 'wood_oak'],
        [
            'shelf',
            'Open bookshelf',
            'Storage',
            [
                box(-0.55, 0, 0, 0.06, 0.35, 1.8),
                box(0.55, 0, 0, 0.06, 0.35, 1.8),
                box(0, -0.16, 0, 1.04, 0.03, 1.8, true),
                ...[0, 0.44, 0.88, 1.32, 1.76].map((z) => box(0, 0, z, 1.04, 0.35, 0.04)),
            ],
            'wood_oak',
        ],
        [
            'cabinet',
            'Low cabinet',
            'Storage',
            [
                box(0, 0, 0.1, 1.2, 0.45, 0.7),
                ...[-1, 1].map((x) => box(x * 0.3, 0.234, 0.16, 0.57, 0.025, 0.58, true)),
                ...legs(1.08, 0.35, 0.1),
            ],
            'wood_oak',
        ],
        [
            'bed',
            'Double bed',
            'Bedroom',
            [
                box(0, 0, 0.08, 1.6, 2.05, 0.25, true),
                box(0, 0, 0.33, 1.56, 2, 0.2),
                box(0, -0.99, 0.08, 1.6, 0.07, 0.9, true),
                ...[-1, 1].map((x) => box(x * 0.38, -0.65, 0.53, 0.62, 0.4, 0.12, true)),
            ],
            'plaster_cream',
        ],
        ['nightstand', 'Bedside table', 'Bedroom', [box(0, 0, 0, 0.45, 0.4, 0.52), box(0, 0.205, 0.1, 0.37, 0.02, 0.3, true)], 'wood_oak'],
        [
            'counter',
            'Kitchen counter',
            'Kitchen',
            [
                box(0, 0, 0, 1.2, 0.58, 0.86),
                box(0, 0, 0.86, 1.24, 0.64, 0.04, true),
                ...[-1, 1].map((x) => box(x * 0.3, 0.297, 0.08, 0.57, 0.025, 0.7, true)),
            ],
            'plaster_white',
        ],
        ['rug', 'Rectangular rug', 'Decorations', [box(0, 0, 0, 1.8, 1.2, 0.012)], 'plaster_terra'],
        [
            'books',
            'Book stack',
            'Decorations',
            [box(0, 0, 0, 0.25, 0.18, 0.04), box(0.02, 0, 0.04, 0.22, 0.19, 0.035, true), box(-0.01, 0.015, 0.075, 0.24, 0.17, 0.04)],
            'plaster_navy',
        ],
        [
            'planter',
            'Square planter',
            'Decorations',
            [box(0, 0, 0, 0.34, 0.34, 0.3), box(0, 0, 0.3, 0.27, 0.27, 0.025, true)],
            'plaster_terra',
        ],
        [
            'picture',
            'Picture frame',
            'Decorations',
            [box(0, 0, 0, 0.55, 0.04, 0.7, true), box(0, 0.024, 0.04, 0.47, 0.012, 0.62)],
            'plaster_sage',
        ],
    ];
    // Original low-poly room furnishings; all use the same paint, sizing and collision pipeline.
    entries.push(
        ['bar_table', 'Tall bar table', 'Bar & dining', table(0.85, 0.85, 1.08), 'wood_oak'],
        ['bar_long_table', 'Long bar table', 'Bar & dining', table(1.8, 0.65, 1.08), 'wood_oak'],
        ['bar_stool', 'Bar stool', 'Bar & dining', [...table(0.4, 0.4, 0.76), box(0, 0.16, 0.25, 0.34, 0.04, 0.04, true), box(0, -0.16, 0.25, 0.34, 0.04, 0.04, true)], 'wood_oak'],
        ['bar_counter', 'Bar counter', 'Bar & dining', [box(0, 0, 0, 1.8, 0.55, 1.04), box(0, 0.06, 1.04, 1.9, 0.8, 0.06, true), box(0, 0.4, 0.2, 1.65, 0.05, 0.05, true), ...[-1,1].map(x => box(x * 0.72, 0.34, 0, 0.05, 0.05, 0.22, true))], 'wood_oak'],
        ['bottle_shelf', 'Back-bar display shelf', 'Bar & dining', [box(-0.72, 0, 0, 0.06, 0.3, 1.4), box(0.72, 0, 0, 0.06, 0.3, 1.4), box(0, -0.14, 0, 1.4, 0.02, 1.4), ...[0,0.45,0.9,1.35].map(z => box(0, 0, z, 1.4, 0.3, 0.05, true))], 'wood_oak'],
        ['booth', 'Booth bench', 'Bar & dining', [box(0, 0, 0, 1.5, 0.65, 0.35, true), box(0, 0.04, 0.35, 1.5, 0.56, 0.13), box(0, -0.28, 0.35, 1.5, 0.12, 0.85)], 'plaster_terra'],
        ['side_table', 'Side table', 'Tables', table(0.5, 0.5, 0.55), 'wood_oak'],
        ['wardrobe', 'Double wardrobe', 'Bedroom', [box(0, 0, 0, 1.2, 0.55, 2), ...[-1,1].map(x => box(x * 0.3, 0.285, 0.05, 0.57, 0.03, 1.9, true)), ...[-1,1].map(x => box(x * 0.07, 0.315, 0.9, 0.025, 0.03, 0.18))], 'wood_oak'],
        ['dresser', 'Chest of drawers', 'Bedroom', [box(0, 0, 0, 1, 0.45, 0.9), ...[0.06,0.34,0.62].map(z => box(0, 0.235, z, 0.92, 0.025, 0.25, true))], 'wood_oak'],
        ['single_bed', 'Single bed', 'Bedroom', [box(0, 0, 0.08, 0.9, 2, 0.25, true), box(0, 0, 0.33, 0.87, 1.96, 0.2), box(0, -0.97, 0.08, 0.9, 0.06, 0.85, true), box(0, -0.65, 0.53, 0.65, 0.4, 0.12, true)], 'plaster_cream'],
        ['kitchen_island', 'Kitchen island', 'Kitchen', [box(0, 0, 0, 1.5, 0.75, 0.86), box(0, 0, 0.86, 1.65, 0.95, 0.05, true)], 'plaster_white'],
        ['fridge', 'Refrigerator', 'Kitchen', [box(0, 0, 0, 0.7, 0.65, 1.8), box(0, 0.337, 0.04, 0.66, 0.025, 1.18, true), box(0, 0.337, 1.25, 0.66, 0.025, 0.5, true), box(0.25, 0.37, 0.85, 0.03, 0.04, 0.28)], 'plaster_white'],
        ['tv_stand', 'TV cabinet', 'Living room', [box(0, 0, 0.08, 1.5, 0.4, 0.36), ...legs(1.35, 0.3, 0.08), box(0, 0.21, 0.14, 1.35, 0.025, 0.22, true)], 'wood_oak'],
        ['tv', 'Decorative television', 'Living room', [box(0, 0, 0.13, 1.1, 0.08, 0.66, true), box(0, 0.045, 0.17, 1.02, 0.015, 0.58), box(0, 0, 0, 0.4, 0.25, 0.04, true), box(0, 0, 0.04, 0.08, 0.06, 0.09, true)], 'plaster_navy'],
        ['office_chair', 'Office chair', 'Office', [...table(0.5, 0.5, 0.46), box(0, -0.22, 0.46, 0.5, 0.08, 0.5), ...[-1,1].map(x=>box(x * 0.24, 0, 0.62, 0.05, 0.36, 0.05, true))], 'plaster_navy'],
        ['filing_cabinet', 'Filing cabinet', 'Office', [box(0, 0, 0, 0.5, 0.6, 1.3), ...[0.05,0.36,0.67,0.98].map(z=>box(0, 0.31, z, 0.44, 0.025, 0.27, true))], 'plaster_sage'],
        ['reception_desk', 'Reception counter', 'Office', [box(-0.72, 0, 0, 0.06, 0.65, 1.1), box(0.72, 0, 0, 0.06, 0.65, 1.1), box(0, 0.29, 0, 1.4, 0.06, 1.1), box(0, 0, 0.72, 1.4, 0.6, 0.05, true), box(0, 0.2, 1.1, 1.6, 0.3, 0.05, true)], 'wood_oak'],
        ['workbench', 'Garage workbench', 'Utility', [...table(1.8, 0.7, 0.9), box(0, -0.32, 0.9, 1.8, 0.06, 0.65), box(0, 0, 0.16, 1.65, 0.55, 0.05, true)], 'wood_oak'],
        ['storage_crate', 'Storage crate', 'Utility', [box(0, 0, 0, 0.6, 0.5, 0.45), ...[-1,1].map(x=>box(x * 0.22, 0, 0.45, 0.06, 0.5, 0.035, true))], 'wood_oak'],
        ['wall_shelf', 'Floating wall shelf', 'Storage', [box(0, 0, 0, 1, 0.25, 0.05), ...[-1,1].map(x=>box(x * 0.35, -0.08, -0.15, 0.04, 0.04, 0.15, true))], 'wood_oak']
    );
    entries.push(['text_sign', 'Text sign', 'Signs', [box(0,0,0,1.8,0.045,0.6)], 'furn_metal_dark']);
    const barTable = entries.find(e => e[0] === 'bar_table');
    barTable[3] = [box(0,0,0,0.52,0.52,0.045,true), box(0,0,0.045,0.08,0.08,0.975,true), box(0,0,1.02,0.85,0.85,0.06)];
    const upholstered = new Set(['sofa','armchair','booth','office_chair']);
    entries.forEach(e => {
        if (upholstered.has(e[0])) e[4] = e[0] === 'booth' ? 'furn_leather_wine' : 'furn_fabric_grey';
        else if (e[4] === 'wood_oak') e[4] = 'furn_oak';
        else if (['counter','kitchen_island','fridge','filing_cabinet'].includes(e[0])) e[4] = 'furn_enamel';
    });
    F.catalog = entries.map(([id, name, category, parts, tex]) => {
        const mn = [Infinity, Infinity, Infinity],
            mx = [-Infinity, -Infinity, -Infinity];
        parts.forEach((b) => {
            const a = [b.x - b.w / 2, b.y - b.d / 2, b.z],
                c = [b.x + b.w / 2, b.y + b.d / 2, b.z + b.h];
            for (let i = 0; i < 3; i++) {
                mn[i] = Math.min(mn[i], a[i]);
                mx[i] = Math.max(mx[i], c[i]);
            }
        });
        return { id, name, category, parts, tex, mn, mx, size: mx.map((v, i) => v - mn[i]) };
    });
    const def = (id) => F.catalog.find((d) => d.id === id);
    F.recommended = id => ({tex:def(id).tex,accent:['bar_table','bar_stool','office_chair','filing_cabinet','fridge','tv'].includes(id)?'furn_metal_dark':'furn_walnut'});
    const holder = (P, k = S.level) => (P.kind === 'grid' ? P.levels[k] : P.shell);
    F.list = (P, k = S.level) => holder(P, k).props || [];
    F.active = () => S.tab === 'build' && (S.project.kind === 'grid' ? S.tool : S.shellTool) === 'furnish';
    F.sel = null;
    F.choice = 'sofa';
    F.move = false;
    F.search = '';
    const selected = () => F.selected ? (F.selected().length === 1 ? F.selected()[0] : null) : F.list(S.project).find((p) => p.id === F.sel);
    const round = (v) => Math.round(v * 1000) / 1000;
    const warn = (e) => Model.bus.emit('toast', { text: e.message || e, kind: 'warn' });
    F.validate = (p) => {
        if (!def(p.model)) throw new Error('Unknown furniture model: ' + p.model);
        if (!['x', 'y', 'z', 'yaw', 'w', 'd', 'h'].every((k) => Number.isFinite(p[k])))
            throw new Error('Furniture coordinates and dimensions must be finite numbers.');
        if (['w', 'd', 'h'].some((k) => p[k] < 0.005 || p[k] > 20))
            throw new Error('Furniture dimensions must be between 0.005 and 20 metres.');
        if (Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 10000) throw new Error('Furniture is too far from the building.');
    };
    F.place = (P, k, model, x, y, patch = {}) => {
        const d = def(model);
        if (!d) throw new Error('Choose furniture first.');
        const p = Object.assign(
            {
                id: 'p' + Math.random().toString(36).slice(2, 11),
                model,
                x,
                y,
                z: 0,
                yaw: 0,
                w: d.size[0],
                d: d.size[1],
                h: d.size[2],
                tex: d.tex,
                accent: ['bar_table','bar_stool','office_chair','filing_cabinet','fridge','tv'].includes(model) ? 'furn_metal_dark' : 'furn_walnut',
                detail: 'detailed',
                ...(model === 'text_sign' ? { sign: {text:'YOUR SIGN',font:'sans',color:'#eee5cd',background:'#252a29',align:'center',scale:85,bold:true,border:true,doubleSided:false} } : {}),
                collision: model !== 'rug',
                outside: false,
            },
            patch,
        );
        F.validate(p);
        const H = holder(P, k);
        (H.props || (H.props = [])).push(p);
        return p;
    };
    F.update = (patch) => {
        const p = selected();
        if (!p) return;
        const next = Object.assign({}, p, patch);
        F.validate(next);
        Model.edit(() => Object.assign(p, next));
        M.UI.renderLeft();
    };
    F.remove = () => {
        if (!selected()) return;
        Model.edit((P) => {
            holder(P).props = F.list(P).filter((p) => p.id !== F.sel);
        });
        F.sel = null;
        F.move = false;
        M.UI.renderLeft();
    };
    F.duplicate = () => {
        const p = selected();
        if (!p) return;
        Model.edit((P) => {
            F.sel = F.place(
                P,
                S.level,
                p.model,
                p.x,
                p.y,
                Object.assign({}, p, { id: 'p' + Math.random().toString(36).slice(2, 11), x: p.x + 0.25, y: p.y + 0.25 }),
            ).id;
        });
        F.move = true;
        M.UI.renderLeft();
    };
    F.parts = (p, z = 0) => {
        F.validate(p);
        const d = def(p.model),
            scale = [p.w / d.size[0], p.d / d.size[1], p.h / d.size[2]],
            c = Math.cos(p.yaw),
            s = Math.sin(p.yaw);
        return d.parts.map((b) => {
            const x = (b.x - (d.mn[0] + d.mx[0]) / 2) * scale[0],
                y = (b.y - (d.mn[1] + d.mx[1]) / 2) * scale[1];
            return {
                cx: p.x + x * c - y * s,
                cy: p.y + x * s + y * c,
                z: z + p.z + (b.z - d.mn[2]) * scale[2],
                w: b.w * scale[0],
                d: b.d * scale[1],
                h: b.h * scale[2],
                yaw: p.yaw,
                tex: b.accent ? p.accent : p.tex,
                shape: p.model === 'text_sign' || p.detail === 'simple' ? 'box' : (p.model === 'bar_table' || (b.h > 2 * b.w && Math.abs(b.w - b.d) < 0.005 && b.w < 0.12) ? 'cylinder' : 'bevel'),
                bevel: upholstered.has(p.model) ? 0.035 : 0.009,
            };
        });
    };
    const faces = [
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [3, 0, 4, 7],
        [1, 2, 6, 5],
        [4, 5, 6, 7],
        [3, 2, 1, 0],
    ];
    F.corners = (b) => {
        const c = Math.cos(b.yaw),
            s = Math.sin(b.yaw);
        return [
            [-1, -1, 0],
            [1, -1, 0],
            [1, 1, 0],
            [-1, 1, 0],
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1],
        ].map(([u, v, z]) => [
            b.cx + ((u * b.w) / 2) * c - ((v * b.d) / 2) * s,
            b.cy + ((u * b.w) / 2) * s + ((v * b.d) / 2) * c,
            b.z + z * b.h,
        ]);
    };
    // Chamfered boxes and round supports stay inside the existing collision/placement bounds.
    F.polygons = (b) => {
        if (!b.shape || b.shape === 'box') return faces.map(f => ({points:f.map(i=>F.corners(b)[i])}));
        const h = [b.w/2,b.d/2,b.h/2], polys = [];
        if (b.shape === 'cylinder') {
            const ring = z => Array.from({length:16},(_,i)=>[h[0]*Math.cos(i*Math.PI/8),h[1]*Math.sin(i*Math.PI/8),z]);
            const a=ring(-h[2]), c=ring(h[2]);
            polys.push(a.slice().reverse(),c);
            for(let i=0;i<16;i++)polys.push([a[i],a[(i+1)%16],c[(i+1)%16],c[i]]);
        } else {
            const r=Math.min(b.bevel || 0.009, ...h.map(v=>v*0.3)), inner=h.map(v=>v-r);
            for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
                const other=[0,1,2].filter(a=>a!==axis);
                polys.push([[-1,-1],[1,-1],[1,1],[-1,1]].map(s=>{const p=[0,0,0];p[axis]=sign*h[axis];other.forEach((a,i)=>p[a]=s[i]*inner[a]);return p;}));
            }
            for(const [a,c] of [[0,1],[0,2],[1,2]])for(const sa of [-1,1])for(const sc of [-1,1]){
                const t=3-a-c;
                polys.push([[0,-1],[1,-1],[1,1],[0,1]].map(([side,st])=>{const p=[0,0,0];p[a]=sa*(side?inner[a]:h[a]);p[c]=sc*(side?h[c]:inner[c]);p[t]=st*inner[t];return p;}));
            }
            for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
                const signs=[x,y,z];polys.push([0,1,2].map(a=>h.map((v,i)=>signs[i]*(a===i?v:inner[i]))));
            }
        }
        const c=Math.cos(b.yaw),s=Math.sin(b.yaw);
        return polys.map(q=>{
            const a=q[1].map((v,i)=>v-q[0][i]),d=q[2].map((v,i)=>v-q[0][i]);
            const n=[a[1]*d[2]-a[2]*d[1],a[2]*d[0]-a[0]*d[2],a[0]*d[1]-a[1]*d[0]];
            if(n.reduce((sum,v,i)=>sum+v*q[0][i],0)<0)q=q.slice().reverse();
            return {points:q.map(p=>[b.cx+p[0]*c-p[1]*s,b.cy+p[0]*s+p[1]*c,b.z+h[2]+p[2]])};
        });
    };
    const SIGN_FONTS = {
        sans:['Modern sans','Arial, sans-serif'], condensed:['Condensed','Impact, "Arial Narrow", sans-serif'],
        serif:['Classic serif','Georgia, serif'], roman:['Roman','"Times New Roman", serif'],
        mono:['Monospace','"Courier New", monospace'], script:['Script','"Brush Script MT", cursive'],
        humanist:['Humanist','"Trebuchet MS", sans-serif']
    };
    F.signFonts = SIGN_FONTS;
    F.signData = p => {
        const s=p.sign || {}, color=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v || '') ? v : fallback;
        return {text:String(s.text ?? 'YOUR SIGN').slice(0,240).split('\n').slice(0,6).join('\n'),
            font:SIGN_FONTS[s.font]?s.font:'sans',color:color(s.color,'#eee5cd'),background:color(s.background,'#252a29'),
            align:['left','center','right'].includes(s.align)?s.align:'center',scale:Math.max(20,Math.min(100,Number(s.scale)||85)),
            bold:s.bold!==false,border:s.border!==false,doubleSided:!!s.doubleSided};
    };
    F.signTexture = p => {
        const s=F.signData(p), key=JSON.stringify([s,Math.round(p.w/p.h*10000)]);
        let h=2166136261,g=5381;for(let i=0;i<key.length;i++){h=Math.imul(h^key.charCodeAt(i),16777619);g=Math.imul(g,33)^key.charCodeAt(i);}
        const id='sign_'+(h>>>0).toString(16)+'_'+(g>>>0).toString(16);
        if(M.TEX.byId?.[id])return id;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
        const ctx=canvas.getContext('2d'),height=512*p.h/p.w,pad=Math.min(18,height*0.08);
        ctx.scale(1,512/height);ctx.fillStyle=s.background;ctx.fillRect(0,0,512,height);
        ctx.fillStyle=s.color;ctx.strokeStyle=s.color;ctx.lineWidth=Math.min(2,height*0.012);
        if(s.border)ctx.strokeRect(pad/2,pad/2,512-pad,height-pad);
        const lines=s.text.split('\n'),maxH=(height-pad*2)/lines.length;
        let size=Math.min(maxH*0.8,200);
        const font=()=>{ctx.font=(s.bold?'bold ':'')+size+'px '+SIGN_FONTS[s.font][1];};font();
        const width=Math.max(1,...lines.map(line=>ctx.measureText(line).width));size*=Math.min(1,(512-pad*2)/width)*s.scale/100;font();
        ctx.textAlign=s.align;ctx.textBaseline='middle';
        const lineHeight=size*1.2, start=height/2-(lines.length-1)*lineHeight/2;
        const x=s.align==='left'?pad:s.align==='right'?512-pad:256;
        lines.forEach((line,i)=>ctx.fillText(line,x,start+i*lineHeight));
        return M.TEX.addGenerated(id,'Sign lettering',canvas);
    };
    F.signPanel = (root,p) => {
        const s=F.signData(p),update=patch=>F.update({sign:{...F.signData(p),...patch}});
        root.append(el('div',{class:'h'},'Sign lettering'),el('textarea',{'aria-label':'Sign text',rows:3,maxLength:240,style:{width:'100%',boxSizing:'border-box'},value:s.text,onchange:e=>update({text:e.target.value})}));
        const select=(label,key,options)=>root.append(el('div',{class:'row'},el('label',null,label),el('select',{'aria-label':label,onchange:e=>update({[key]:e.target.value})},...options.map(([id,name])=>el('option',{value:id,selected:s[key]===id},name)))));
        select('Sign font','font',Object.entries(SIGN_FONTS).map(([id,f])=>[id,f[0]]));
        select('Text alignment','align',[['left','Left'],['center','Centre'],['right','Right']]);
        for(const [key,label] of [['color','Text colour'],['background','Sign background']])root.append(el('div',{class:'row'},el('label',null,label),el('input',{type:'color','aria-label':label,value:s[key],onchange:e=>update({[key]:e.target.value})})));
        root.append(el('div',{class:'row'},el('label',null,'Text size (%)'),el('input',{type:'number',min:20,max:100,'aria-label':'Text size (%)',value:s.scale,onchange:e=>update({scale:+e.target.value})})));
        for(const [key,label] of [['bold','Bold lettering'],['border','Sign border'],['doubleSided','Lettering on both sides']])root.append(el('label',{class:'chk'},el('input',{type:'checkbox',checked:s[key],onchange:e=>update({[key]:e.target.checked})}),label));
        root.append(el('div',{class:'note'},'Up to 6 lines. Fonts use this computer’s installed fonts with fallbacks. Lettering is baked into the exported texture. Rotate to face the viewer; use Wall faces snapping to mount it.'));
    };
    F.append = (P, built, opts = {}) => {
        const levels=P.kind==='grid'?P.levels.map((_,k)=>k):[0],batches=new Map();
        const getBatch=(k,group,tex,n)=>{
            const key=k+'|'+group+'|'+tex;let b=batches.get(key);
            if(!b||b.pos.length/3+n>60000){b={level:k,kind:'prop',group,tex,glass:false,pos:[],nrm:[],uv:[],idx:[]};batches.set(key,b);built.batches.push(b);}return b;
        };
        levels.forEach(k=>F.list(P,k).forEach(saved=>{
            const p=opts.mode==='export'?saved:(F.previewItem?F.previewItem(P,k,saved):saved),z=P.kind==='grid'?k*P.settings.storyHeight:0,group=p.outside?'ext':'int';
            const sign=p.model==='text_sign'?F.signTexture(p):null;
            F.parts(p,z).forEach(b=>{
                const pts=F.corners(b),mn=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),mx=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));
                for(let i=0;i<3;i++){built.bounds.mn[i]=Math.min(built.bounds.mn[i],mn[i]);built.bounds.mx[i]=Math.max(built.bounds.mx[i],mx[i]);}
                F.polygons(b).forEach((poly,face)=>{
                    const q=poly.points,a=q[1].map((v,i)=>v-q[0][i]),c=q[2].map((v,i)=>v-q[0][i]);
                    const n=[a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]],len=Math.hypot(...n),al=Math.hypot(...a);
                    if(len<1e-12)return;
                    const normal=n.map(v=>v/len),u=a.map(v=>v/al),v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]];
                    const lettering=sign&&(face===1||(face===0&&F.signData(p).doubleSided)),tex=lettering?sign:b.tex;
                    const batch=getBatch(k,group,tex,q.length),base=batch.pos.length/3;
                    q.forEach((pt,i)=>{batch.pos.push(...pt);batch.nrm.push(...normal);
                        const d=pt.map((x,j)=>x-q[0][j]);batch.uv.push(...(lettering?[[0,1],[1,1],[1,0],[0,0]][i]:[d.reduce((s,x,j)=>s+x*u[j],0)/M.TEX.tile(tex),d.reduce((s,x,j)=>s+x*v[j],0)/M.TEX.tile(tex)]));});
                    for(let i=1;i+1<q.length;i++)batch.idx.push(base,base+i,base+i+1);
                    built.stats.tris+=q.length-2;
                });
                if(p.collision!==false&&(opts.mode==='export'||opts.boxes)){
                    const type=M.TEX.colType(b.tex),room=p.outside?0:1;let mi=built.matList.findIndex(m=>m[0]===type&&m[1]===room);
                    if(mi<0){mi=built.matList.length;built.matList.push([type,room]);}
                    built.boxes.push([...mn,...mx,mi,{cx:b.cx,cy:b.cy,hu:b.w/2,hn:b.d/2,yaw:b.yaw}]);
                }
            });
        }));
        built.batches.filter(b=>b.kind==='prop').forEach(b=>{b.pos=new Float32Array(b.pos);b.nrm=new Float32Array(b.nrm);b.uv=new Float32Array(b.uv);b.idx=new Uint16Array(b.idx);});
        built.stats.boxes=built.boxes.length;return built;
    };
    // Install before storeys.js so each imported floor is furnished exactly once.
    for (const mesher of [M.Mesher, M.Shell]) {
        const build = mesher.build;
        mesher.build = (P, opts) => F.append(P, build(P, opts), opts);
    }
    const baseZ = () => (S.project.kind === 'grid' ? S.level * S.project.settings.storyHeight : 0);
    F.down = (e) => {
        const A = M.Tools.api,
            ray = A.pointerRay(e),
            z = baseZ();
        let hit = null;
        if (!F.move)
            F.list(S.project).forEach((p) =>
                F.parts(p, z).forEach((b) => {
                    const c = Math.cos(b.yaw),
                        s = Math.sin(b.yaw),
                        x = ray.o[0] - b.cx,
                        y = ray.o[1] - b.cy;
                    const t = A.rayBox(
                        {
                            o: [x * c + y * s, -x * s + y * c, ray.o[2]],
                            d: [ray.d[0] * c + ray.d[1] * s, -ray.d[0] * s + ray.d[1] * c, ray.d[2]],
                        },
                        [-b.w / 2, -b.d / 2, b.z],
                        [b.w / 2, b.d / 2, b.z + b.h],
                    );
                    if (t != null && (!hit || t < hit.t)) hit = { t, p };
                }),
            );
        if (hit) {
            F.sel = hit.p.id;
            M.UI.renderLeft();
            return;
        }
        const ph = A.planeHit(ray, z);
        if (!ph) return;
        const snap = (v) => (e.shiftKey ? round(v) : Math.round(v * 10) / 10);
        try {
            if (F.move && selected()) {
                F.update({ x: snap(ph.x), y: snap(ph.y) });
                F.move = false;
            } else if (F.choice) {
                Model.edit((P) => {
                    F.sel = F.place(P, S.level, F.choice, snap(ph.x), snap(ph.y)).id;
                });
            } else F.sel = null;
            M.UI.renderLeft();
        } catch (err) {
            warn(err);
        }
    };
    F.key = (e, k) => {
        if (k === 'Escape') {
            F.move = false;
            F.sel = null;
            F.choice = null;
            M.UI.renderLeft();
            return true;
        }
        if (k === 'Delete' || k === 'x') {
            F.remove();
            return true;
        }
        if (k === 'r') {
            const p = selected();
            if (p) F.update({ yaw: p.yaw + Math.PI / 2 });
            return true;
        }
        if (k === 'd' && e.shiftKey) {
            F.duplicate();
            return true;
        }
        return false;
    };
    F.draw = (R) => {
        const p = selected();
        if (!p) return;
        F.parts(p, baseZ()).forEach((b) => {
            const pts = F.corners(b);
            R.ovBox(
                [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i]))),
                [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i]))),
                [0.3, 0.9, 0.5, 0.16],
            );
        });
    };
    function thumb(d) {
        const cv=document.createElement('canvas');cv.width=100;cv.height=76;
        const ctx=cv.getContext('2d'),pr=p=>[(p[0]-p[1])*0.7,(p[0]+p[1])*0.3-p[2]];
        const sample={model:d.id,x:0,y:0,z:0,yaw:0,w:d.size[0],d:d.size[1],h:d.size[2],...F.recommended(d.id)};
        const polys=F.parts(sample).flatMap(b=>F.polygons(b).map(q=>({...q,tex:b.tex}))),all=polys.flatMap(q=>q.points.map(pr));
        const mn=[0,1].map(i=>Math.min(...all.map(p=>p[i]))),mx=[0,1].map(i=>Math.max(...all.map(p=>p[i]))),scale=Math.min(88/(mx[0]-mn[0]),64/(mx[1]-mn[1]));
        polys.sort((a,b)=>a.points.reduce((s,p)=>s+p[0]+p[1]+p[2],0)/a.points.length-b.points.reduce((s,p)=>s+p[0]+p[1]+p[2],0)/b.points.length).forEach(q=>{
            const a=q.points[1].map((v,i)=>v-q.points[0][i]),b=q.points[2].map((v,i)=>v-q.points[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],l=Math.hypot(...n);
            if(!l||n[0]+n[1]+n[2]<=0)return;
            const shade=0.55+0.45*Math.max(0,(n[0]*0.4+n[1]*0.3+n[2]*0.85)/l),avg=M.TEX.pixels(q.tex).avg;
            ctx.fillStyle='rgb('+avg.map(v=>Math.round(v*255*shade)).join(',')+')';ctx.beginPath();
            q.points.map(pr).forEach((p,i)=>{const x=6+(p[0]-mn[0])*scale,y=6+(p[1]-mn[1])*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();
        });
        if(d.id==='text_sign'){ctx.fillStyle='#eee5cd';ctx.font='bold 16px sans-serif';ctx.fillText('ABC',30,40);}
        return cv;
    }
    F.panel = (root) => {
        root.append(
            el(
                'div',
                { class: 'note' },
                'Choose furniture, then click to place on the selected surface. Shift-click to select several. R rotates the selection; Shift+D duplicates; Delete removes.',
            ),
        );
        const search = el('input', { type: 'search', style: { width: '100%', color: 'inherit', background: 'var(--panel)', border: '1px solid var(--border)', padding: '6px' }, placeholder: 'Search furniture…', value: F.search, 'aria-label': 'Search furniture' }),
            grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', maxHeight: '290px', overflowY: 'auto' } });
        const render = () => {
            grid.innerHTML = '';
            F.catalog
                .filter((d) => (d.name + ' ' + d.category).toLowerCase().includes(F.search.toLowerCase()))
                .forEach((d) =>
                    grid.append(
                        el(
                            'button',
                            {
                                class: 'pitem',
                                'aria-label': 'Choose ' + d.name,
                                style: { flexDirection: 'column', color: 'inherit', font: 'inherit', borderColor: F.choice === d.id ? 'var(--accent)' : '' },
                                onclick: () => {
                                    F.choice = d.id;
                                    F.sel = null;
                                    F.move = false;
                                    M.UI.renderLeft();
                                },
                            },
                            thumb(d),
                            el('span', null, d.name),
                        ),
                    ),
                );
        };
        search.oninput = () => {
            F.search = search.value;
            render();
        };
        render();
        root.append(el('button', {class:'btn sm', onclick:()=>{F.choice='text_sign';F.sel=null;F.search='sign';M.UI.renderLeft();}}, 'Add text sign'), search, grid);
        if (F.choice) root.append(el('div', { class: 'note' }, 'Ready to place: ' + def(F.choice).name));
        const p = selected();
        if (p) {
            root.append(el('div', { class: 'h' }, 'Selected: ' + def(p.model).name));
            if(p.model==='text_sign') F.signPanel(root,p);
            else root.append(el('label',{class:'chk'},el('input',{type:'checkbox',checked:p.detail!=='simple',onchange:e=>F.update({detail:e.target.checked?'detailed':'simple'})}), 'Detailed edges and round supports'));
            const input = (label, key, factor = 1) =>
                root.append(
                    el(
                        'div',
                        { class: 'row' },
                        el('label', null, label),
                        el('input', {
                            class: 'grow',
                            type: 'number',
                            step: '0.05',
                            'aria-label': label,
                            value: round(p[key] * factor),
                            onchange: (e) => {
                                try {
                                    F.update({ [key]: e.target.value === '' ? NaN : Number(e.target.value) / factor });
                                } catch (err) {
                                    warn(err);
                                    M.UI.renderLeft();
                                }
                            },
                        }),
                    ),
                );
            [
                ['X', 'x'],
                ['Y', 'y'],
                ['Height above floor', 'z'],
                ['Width', 'w'],
                ['Depth', 'd'],
                ['Height', 'h'],
            ].forEach(([l, k]) => input(l, k));
            input('Rotation (degrees)', 'yaw', 180 / Math.PI);
            if(p.model!=='text_sign') root.append(el('button',{class:'btn sm',onclick:()=>F.update(F.recommended(p.model))},'Use recommended furniture finishes'));
            const finishes = [
                'furn_fabric_grey', 'furn_fabric_sand', 'furn_leather_brown', 'furn_leather_wine',
                'furn_oak', 'furn_walnut', 'furn_metal_dark', 'furn_enamel',
                'wood_oak',
                'plaster_white',
                'plaster_cream',
                'plaster_char',
                'plaster_navy',
                'plaster_sage',
                'plaster_terra',
                'metal_sheet',
            ];
            [
                ['Finish', 'tex'],
                ['Accent', 'accent'],
            ].forEach(([label, key]) => {
                const ids = [...new Set([p[key], ...finishes])];
                root.append(
                    el(
                        'div',
                        { class: 'row' },
                        el('label', null, label),
                        el(
                            'select',
                            { 'aria-label': label, onchange: (e) => F.update({ [key]: e.target.value }) },
                            ...ids.map((id) => el('option', { value: id, selected: id === p[key] }, M.TEX.def(id).name)),
                        ),
                    ),
                    el(
                        'button',
                        { class: 'btn sm', onclick: () => F.update({ [key]: S.brush.floor }) },
                        'Use current floor paint for ' + label.toLowerCase(),
                    ),
                );
            });
            [
                ['Solid collision', 'collision'],
                ['Outdoor prop (visible from outside)', 'outside'],
            ].forEach(([label, key]) =>
                root.append(
                    el(
                        'label',
                        { class: 'chk' },
                        el('input', { type: 'checkbox', checked: p[key], onchange: (e) => F.update({ [key]: e.target.checked }) }),
                        label,
                    ),
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
                                F.move = true;
                                M.UI.renderLeft();
                            },
                        },
                        'Move with next click',
                    ),
                    el('button', { class: 'btn sm', onclick: () => F.update({ yaw: p.yaw + Math.PI / 2 }) }, 'Rotate 90°'),
                    el('button', { class: 'btn sm', onclick: F.duplicate }, 'Duplicate'),
                    el('button', { class: 'btn sm danger', onclick: F.remove }, 'Delete'),
                ),
            );
            if (F.move) root.append(el('div', { class: 'note' }, 'Click the new position. Esc cancels movement.'));
        }
        root.append(el('div', { class: 'h' }, 'On this floor (' + F.list(S.project).length + ')'));
        F.list(S.project).forEach((p) =>
            root.append(
                el(
                    'button',
                    {
                        class: 'btn sm' + (F.selected?.().some(q => q.id === p.id) ? ' on' : ''),
                        'aria-pressed': String(!!F.selected?.().some(q => q.id === p.id)),
                        onclick: (e) => {
                            if (F.select) { F.select(p.id, e.shiftKey); return; }
                            F.sel = p.id;
                            F.move = false;
                            M.UI.renderLeft();
                        },
                    },
                    (def(p.model) || { name: p.model }).name,
                ),
            ),
        );
        root.append(
            el(
                'div',
                { class: 'note' },
                'Static furnishings are included in the map export. Place small items using Height above floor. These are original simple models, not GTA model-name props.',
            ),
        );
    };
    Model.bus.on('project', () => {
        F.sel = null;
        F.move = false;
    });
    Model.bus.on('buildings', () => {
        F.sel = null;
        F.move = false;
    });
})(window.MLO);
