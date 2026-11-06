const M = window.MLO;
if (!M) return 'no MLO';
const r = await fetch('tex/smdz_floor_001_oak_wide_natural.png', { cache: 'no-store' });
const b = await r.blob();
M.App.setTab('paint');
await new Promise(r => setTimeout(r, 800));
const text = document.body.innerText;
return JSON.stringify({ photos: (M.texturePhotos || []).length, pngStatus: r.status, pngBytes: b.size, paint: text.includes('Added floors') || text.includes('Added walls'), title: document.title });
