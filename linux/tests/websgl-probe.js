const c = document.createElement('canvas');
const gl = c.getContext('webgl2') || c.getContext('webgl');
if (!gl) return 'NO WEBGL';
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
return JSON.stringify({version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), unmasked: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE), mlo: !!window.MLO, rendererOk: !!(window.MLO && window.MLO.App && window.MLO.App.renderer), errorBanner: !!document.getElementById('errbar')});
