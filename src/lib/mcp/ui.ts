import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * MCP Apps UI for the Lynx connector: one self-contained HTML card that
 * Claude renders inline for the hub, QR code and link page tools.
 *
 * The card talks to the host over the MCP Apps postMessage bridge
 * (ui/initialize, ui/notifications/tool-result, tools/call, ui/open-link,
 * ui/message). The bridge is hand-written below to keep the card small; it
 * follows protocol version 2026-01-26 of @modelcontextprotocol/ext-apps.
 */

export const UI_RESOURCE_URI = 'ui://lynx/card.html';
export const UI_MIME_TYPE = 'text/html;profile=mcp-app';

/** Tool `_meta` linking a tool to the card (new and legacy keys). */
export const uiToolMeta = {
  ui: { resourceUri: UI_RESOURCE_URI },
  'ui/resourceUri': UI_RESOURCE_URI,
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
}

function appOrigin(): string | null {
  try {
    return new URL(appUrl()).origin;
  } catch {
    return null;
  }
}

export function registerLynxUi(server: McpServer): void {
  const origin = appOrigin();
  const uiMeta = {
    ui: {
      prefersBorder: true,
      // Brand font files are served from the Lynx app itself.
      csp: origin ? { resourceDomains: [origin] } : {},
    },
  };

  server.registerResource(
    'Lynx card',
    UI_RESOURCE_URI,
    {
      title: 'Lynx card',
      description: 'Interactive Lynx hub, QR code and link page card.',
      mimeType: UI_MIME_TYPE,
      _meta: uiMeta,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: UI_MIME_TYPE,
          text: buildCardHtml(origin ?? ''),
          _meta: uiMeta,
        },
      ],
    })
  );
}

export function buildCardHtml(fontOrigin: string): string {
  return CARD_HTML.split('__FONT_ORIGIN__').join(fontOrigin);
}

// Note: the client script avoids backticks and "${" so it can live in this
// String.raw template unchanged.
const CARD_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lynx</title>
<style>
@font-face{font-family:"Gilroy";src:url("__FONT_ORIGIN__/fonts/Gilroy-Medium.ttf") format("truetype");font-weight:500;font-display:swap}
@font-face{font-family:"Gilroy";src:url("__FONT_ORIGIN__/fonts/Gilroy-Bold.ttf") format("truetype");font-weight:700;font-display:swap}
:root{
  --bg:#ffffff;--surface:#f3f8f5;--surface-2:#e8f1ec;--line:#dbe7e0;
  --fg:#13201a;--muted:#55665d;--faint:#7d8c84;
  --accent:#3e8068;--accent-strong:#336754;--accent-ink:#ffffff;--accent-wash:rgba(62,128,104,.10);
  --warn:#9a5b00;--warn-wash:rgba(214,138,0,.12);--bad:#b42318;
  --font:"Gilroy",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color-scheme:light;
}
:root[data-theme="dark"]{
  --bg:#121514;--surface:#1a1f1c;--surface-2:#222924;--line:#2b342f;
  --fg:#eef3f0;--muted:#a0ada6;--faint:#748179;
  --accent:#58a386;--accent-strong:#6fbf98;--accent-ink:#0b0d0c;--accent-wash:rgba(88,163,134,.15);
  --warn:#f0b04a;--warn-wash:rgba(240,176,74,.12);--bad:#f97066;
  color-scheme:dark;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#121514;--surface:#1a1f1c;--surface-2:#222924;--line:#2b342f;
  --fg:#eef3f0;--muted:#a0ada6;--faint:#748179;
  --accent:#58a386;--accent-strong:#6fbf98;--accent-ink:#0b0d0c;--accent-wash:rgba(88,163,134,.15);
  --warn:#f0b04a;--warn-wash:rgba(240,176,74,.12);--bad:#f97066;
  color-scheme:dark;}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
.card{padding:16px;display:flex;flex-direction:column;gap:16px}
button{font:inherit;color:inherit;cursor:pointer}
button:disabled{opacity:.55;cursor:default}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.top{display:flex;align-items:center;gap:10px}
.mark{width:28px;height:26px;flex:none}
.mark .a{fill:var(--fg)} .mark .b{fill:var(--accent)}
.brand{display:flex;flex-direction:column;line-height:1.15;min-width:0;flex:1}
.brand b{font-weight:700;font-size:16px}
.brand span{color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn{border:1px solid var(--line);background:var(--bg);border-radius:9px;padding:7px 12px;font-weight:500;font-size:13px;white-space:nowrap}
.btn:hover:not(:disabled){border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:700}
.btn.primary:hover:not(:disabled){background:var(--accent-strong);border-color:var(--accent-strong)}
.btn.ghost{border-color:transparent;background:transparent;color:var(--muted);padding:6px 8px}
.btn.ghost:hover:not(:disabled){color:var(--fg)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.stat{background:var(--surface);border-radius:12px;padding:10px 12px;min-width:0}
.stat .n{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.stat .l{color:var(--muted);font-size:12px}
.sec h3{margin:0 0 6px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.list{border:1px solid var(--line);border-radius:12px;overflow:hidden}
.item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;padding:10px 12px}
.item:last-child{border-bottom:0}
.item:hover{background:var(--surface)}
.item .t{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .s{grid-column:1;font-family:var(--mono);font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .v{grid-row:1 / span 2;grid-column:2;text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.item .v small{display:block;font-weight:500;color:var(--faint);font-size:11px}
.bar{display:block;height:3px;border-radius:2px;background:var(--surface-2);margin-top:4px;width:72px;margin-left:auto}
.bar i{display:block;height:100%;border-radius:2px;background:var(--accent)}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;background:var(--surface-2);color:var(--muted)}
.pill.live{background:var(--accent-wash);color:var(--accent-strong)}
.pill.live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}
.empty{color:var(--muted);padding:12px;text-align:center;font-size:13px}
.split{display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px;align-items:start}
.qrbox{background:#fff;border-radius:14px;padding:10px;border:1px solid var(--line)}
.qrbox img{display:block;width:100%;height:auto;image-rendering:pixelated}
h2{margin:0;font-size:19px;font-weight:700;line-height:1.2;overflow-wrap:anywhere}
.meta{display:flex;flex-direction:column;gap:10px;min-width:0}
.kv{display:flex;flex-direction:column;gap:2px;min-width:0}
.kv .k{font-size:11.5px;color:var(--faint);font-weight:500}
.kv .val{overflow-wrap:anywhere}
.link{display:flex;gap:6px;align-items:center;min-width:0}
.link code{font-family:var(--mono);font-size:12px;background:var(--surface);border-radius:7px;padding:5px 8px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;user-select:all}
.panel{border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.panel h4{margin:0;font-size:13px;font-weight:700}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.field{display:flex;flex-direction:column;gap:4px;min-width:0}
.field label{font-size:12px;color:var(--muted);font-weight:500}
.swatch{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:9px;padding:4px 8px 4px 4px}
.swatch input[type=color]{width:28px;height:28px;border:0;padding:0;background:none;border-radius:6px;cursor:pointer}
.swatch span{font-family:var(--mono);font-size:12px}
.seg{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.seg button{flex:1;border:0;background:transparent;padding:6px 4px;font-size:12px;font-weight:500;color:var(--muted)}
.seg button+button{border-left:1px solid var(--line)}
.seg button[aria-pressed="true"]{background:var(--accent-wash);color:var(--accent-strong);font-weight:700}
input[type=url]{font:inherit;width:100%;border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--bg);color:var(--fg)}
.note{border-radius:10px;padding:8px 10px;font-size:12.5px;background:var(--accent-wash);color:var(--fg)}
.note.warn{background:var(--warn-wash);color:var(--warn)}
.note.bad{background:var(--warn-wash);color:var(--bad)}
.foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;color:var(--faint);font-size:12px}
.phone{border-radius:26px;border:6px solid var(--surface-2);overflow:hidden;min-height:330px;display:flex;flex-direction:column;align-items:center;gap:9px;padding:22px 14px 18px;text-align:center}
.phone .av{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:20px}
.phone .pt{font-weight:700;font-size:16px;line-height:1.2}
.phone .pb{font-size:12px;line-height:1.35;opacity:.85}
.phone .soc{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.phone .soc span{min-width:26px;height:26px;padding:0 5px;border-radius:13px;display:grid;place-items:center;font-size:10px;font-weight:700;border:1.5px solid currentColor;opacity:.85}
.phone .lb{width:100%;padding:9px 10px;font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.phone .more{font-size:11px;opacity:.7}
.mini{display:grid;grid-template-columns:84px minmax(0,1fr);gap:12px;align-items:center}
.skel{display:flex;align-items:center;gap:10px;color:var(--muted);padding:6px 0}
.spin{width:16px;height:16px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
@media (max-width:520px){
  .split{grid-template-columns:minmax(0,1fr)}
  .split .qrbox{max-width:220px}
  .fields{grid-template-columns:minmax(0,1fr)}
}
</style>
</head>
<body>
<div class="card" id="root"><div class="skel"><div class="spin"></div>Loading Lynx</div></div>
<script>
(function () {
  'use strict';

  // ── MCP Apps bridge ─────────────────────────────────────────────────
  var PROTOCOL = '2026-01-26';
  var nextId = 1;
  var pending = {};
  function post(msg) { window.parent.postMessage(msg, '*'); }
  function rpc(method, params) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending[id] = { resolve: resolve, reject: reject };
      post({ jsonrpc: '2.0', id: id, method: method, params: params || {} });
    });
  }
  function notify(method, params) { post({ jsonrpc: '2.0', method: method, params: params || {} }); }
  function reply(id, result) { post({ jsonrpc: '2.0', id: id, result: result || {} }); }

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var m = e.data;
    if (!m || m.jsonrpc !== '2.0') return;
    if (m.id != null && !m.method) {
      var p = pending[m.id];
      if (p) { delete pending[m.id]; if (m.error) p.reject(m.error); else p.resolve(m.result); }
      return;
    }
    switch (m.method) {
      case 'ui/notifications/tool-input': onToolInput(m.params || {}); break;
      case 'ui/notifications/tool-result': onResult(m.params || {}, false); break;
      case 'ui/notifications/tool-cancelled': if (!state.data) renderMessage('Cancelled.', false); break;
      case 'ui/notifications/host-context-changed': applyContext(m.params || {}); break;
      case 'ui/resource-teardown': reply(m.id, {}); break;
      case 'ping': reply(m.id, {}); break;
      default:
        if (m.id != null) post({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'Method not found' } });
    }
  });

  function applyContext(ctx) {
    if (ctx && (ctx.theme === 'light' || ctx.theme === 'dark')) document.documentElement.setAttribute('data-theme', ctx.theme);
  }

  function callTool(name, args) {
    setBusy(true);
    return rpc('tools/call', { name: name, arguments: args || {} })
      .then(function (r) { onResult(r, true); })
      .catch(function (err) { flash((err && err.message) || 'That did not work. Try again.', 'bad'); })
      .then(function () { setBusy(false); });
  }
  function openLink(url) {
    rpc('ui/open-link', { url: url }).catch(function () { try { window.open(url, '_blank', 'noopener'); } catch (e) {} });
  }
  function ask(text) {
    rpc('ui/message', { role: 'user', content: [{ type: 'text', text: text }] }).catch(function () {
      flash('Type this in the chat: ' + text, 'warn');
    });
  }

  // ── State ───────────────────────────────────────────────────────────
  var state = { data: null, image: null, history: [], busy: false, flash: null, confirm: false, draft: null };

  function onToolInput() {
    if (!state.data) renderLoading('Working on it');
  }

  function parseResult(r) {
    var data = r && r.structuredContent;
    var image = null;
    var text = '';
    (r && r.content || []).forEach(function (c) {
      if (c.type === 'image' && !image) image = 'data:' + (c.mimeType || 'image/png') + ';base64,' + c.data;
      if (c.type === 'text') text += c.text;
    });
    if (!data && text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
    return { data: data, image: image, text: text, isError: !!(r && r.isError) };
  }

  function onResult(r, fromCard) {
    var res = parseResult(r);
    if (res.isError) {
      if (state.data && fromCard) { flash(res.text || 'Something went wrong.', 'bad'); return; }
      renderMessage(res.text || 'Something went wrong.', true);
      return;
    }
    if (!res.data || !res.data.view) {
      if (state.data && fromCard) { flash('Done.', 'info'); return; }
      renderMessage('Nothing to show here.', false);
      return;
    }
    if (fromCard && state.data && state.data.view !== res.data.view) {
      state.history.push({ data: state.data, image: state.image });
    } else if (fromCard && state.data && sameItem(state.data, res.data)) {
      // An update of the item on screen: keep history as it is.
    } else if (fromCard && state.data) {
      state.history.push({ data: state.data, image: state.image });
    }
    state.data = res.data;
    state.image = res.image;
    state.flash = null;
    state.confirm = false;
    state.draft = null;
    render();
  }

  function sameItem(a, b) {
    if (a.view === 'qr' && b.view === 'qr') return a.qr_code && b.qr_code && a.qr_code.id === b.qr_code.id;
    if (a.view === 'link_page' && b.view === 'link_page') return a.link_page && b.link_page && a.link_page.id === b.link_page.id;
    return false;
  }

  function back() {
    var prev = state.history.pop();
    if (!prev) return;
    state.data = prev.data; state.image = prev.image; state.flash = null; state.confirm = false; state.draft = null;
    render();
  }

  function setBusy(b) {
    state.busy = b;
    Array.prototype.forEach.call(document.querySelectorAll('[data-busy]'), function (el) { el.disabled = b; });
    var s = document.getElementById('busy');
    if (s) s.hidden = !b;
  }

  function flash(text, kind) { state.flash = { text: text, kind: kind || 'info' }; render(); }

  // ── DOM helpers ─────────────────────────────────────────────────────
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') Object.keys(v).forEach(function (s) { el.style[s] = v[s]; });
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function btn(label, onClick, cls, extra) {
    var a = { class: 'btn ' + (cls || ''), type: 'button', onclick: onClick, 'data-busy': '1' };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    var b = h('button', a, label);
    if (state.busy) b.disabled = true;
    return b;
  }
  function fmt(n) { return (n || 0).toLocaleString('en-GB'); }
  function hostOf(url) { try { return new URL(url).host.replace(/^www\./, ''); } catch (e) { return url || ''; } }
  function shortUrl(url) { try { var u = new URL(url); return u.host + u.pathname.replace(/\/$/, ''); } catch (e) { return url || ''; } }

  function mark() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 468.2 422.16');
    svg.setAttribute('class', 'mark');
    svg.setAttribute('aria-hidden', 'true');
    var a = document.createElementNS(ns, 'path');
    a.setAttribute('class', 'a');
    a.setAttribute('d', 'M468.2,210.93c0,65.29-20.88,116.9-62.64,154.8-20.38,18.5-44.38,32.42-72.05,41.94V73.29h-103.1c-6.28,30.28-19.99,52.26-41.14,65.95-21.18,13.74-52.14,20.58-92.87,20.58h-11.09v86.5h131.33v175.84c-63.99-2.92-115.18-21.72-153.67-56.43C21,327.83,0,276.22,0,210.93S20.88,94.14,62.64,56.48C104.4,18.79,161.87,0,234.43,0s129.63,18.82,171.28,56.48c41.67,37.66,62.49,89.15,62.49,154.45Z');
    var b = document.createElementNS(ns, 'path');
    b.setAttribute('class', 'b');
    b.setAttribute('d', 'M405.71,56.48C364.06,18.82,306.98,0,234.43,0S104.4,18.79,62.64,56.48C20.88,94.14,0,145.63,0,210.93s21,116.9,62.97,154.8c38.49,34.71,89.68,53.51,153.67,56.43v-17.14l-.65.08c-58.97-2.93-106.61-20.42-141.62-52-38.6-34.85-57.37-81.36-57.37-142.17s18.66-107.21,57.04-141.82c38.31-34.58,92.27-52.11,160.39-52.11s121.64,17.53,159.87,52.1c38.29,34.6,56.89,80.99,56.89,141.83s-18.66,107.36-57.06,142.2h-.01c-17.11,15.55-37.47,27.79-60.61,36.46v18.08c27.67-9.52,51.67-23.44,72.05-41.94,41.76-37.9,62.64-89.51,62.64-154.8s-20.82-116.79-62.49-154.45Z');
    svg.appendChild(a); svg.appendChild(b);
    return svg;
  }

  function header(sub, right) {
    return h('div', { class: 'top' },
      state.history.length ? h('button', { class: 'btn ghost', type: 'button', onclick: back, 'aria-label': 'Back' }, '←') : null,
      mark(),
      h('div', { class: 'brand' }, h('b', { text: 'Lynx' }), h('span', { text: sub })),
      h('div', { class: 'spin', id: 'busy', hidden: !state.busy }),
      right || null
    );
  }

  function flashEl() {
    if (!state.flash) return null;
    return h('div', { class: 'note ' + (state.flash.kind === 'bad' ? 'bad' : state.flash.kind === 'warn' ? 'warn' : ''), role: 'status' }, state.flash.text);
  }

  function copyRow(value) {
    var code = h('code', { title: value }, value);
    return h('div', { class: 'link' }, code,
      h('button', { class: 'btn', type: 'button', onclick: function (e) {
        var b = e.currentTarget;
        var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); };
        try {
          navigator.clipboard.writeText(value).then(done, function () { selectText(code); b.textContent = 'Selected'; });
        } catch (err) { selectText(code); b.textContent = 'Selected'; }
      } }, 'Copy'));
  }
  function selectText(el) {
    try { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
  }

  // ── Views ───────────────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('root');
    root.textContent = '';
    var d = state.data;
    if (!d) return;
    if (d.view === 'hub') add(root, hubView(d));
    else if (d.view === 'qr') add(root, qrView(d));
    else if (d.view === 'link_page') add(root, pageView(d));
    else renderMessage('Nothing to show here.', false);
  }

  function renderLoading(text) {
    var root = document.getElementById('root');
    root.textContent = '';
    add(root, h('div', { class: 'skel' }, h('div', { class: 'spin' }), text));
  }

  function renderMessage(text, isError) {
    var root = document.getElementById('root');
    root.textContent = '';
    add(root, [header(isError ? 'Something went wrong' : 'Lynx'), h('div', { class: 'note ' + (isError ? 'bad' : '') }, text)]);
  }

  function hubView(d) {
    var t = d.totals || {};
    var top = d.top_qr_codes || [];
    var max = top.reduce(function (m, c) { return Math.max(m, c.total_scans || 0); }, 0) || 1;
    var pages = d.link_pages || [];
    return [
      header('QR codes and link pages', btn('Dashboard ↗', function () { openLink(d.dashboard_url); })),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'n', text: fmt(t.qr_codes) }), h('div', { class: 'l', text: 'QR codes · ' + fmt(t.active_qr_codes) + ' active' })),
        h('div', { class: 'stat' }, h('div', { class: 'n', text: fmt(t.total_scans) }), h('div', { class: 'l', text: 'Scans, all time' })),
        h('div', { class: 'stat' }, h('div', { class: 'n', text: fmt(t.link_pages) }), h('div', { class: 'l', text: 'Link pages · ' + fmt(t.live_link_pages) + ' live' }))
      ),
      flashEl(),
      h('div', { class: 'sec' }, h('h3', { text: 'Most scanned' }),
        top.length ? h('div', { class: 'list' }, top.map(function (c) {
          return h('button', { class: 'item', type: 'button', 'data-busy': '1', onclick: function () { callTool('get_qr_code', { id: c.id }); } },
            h('span', { class: 't', text: c.name }),
            h('span', { class: 's', text: c.short_link ? shortUrl(c.short_link) : hostOf(c.destination_url) + ' (direct)' }),
            h('span', { class: 'v' }, fmt(c.total_scans), h('small', { text: 'scans' }),
              h('span', { class: 'bar' }, h('i', { style: { width: Math.max(4, Math.round((c.total_scans || 0) / max * 100)) + '%' } }))));
        })) : h('div', { class: 'list' }, h('div', { class: 'empty', text: 'No QR codes yet.' }))
      ),
      h('div', { class: 'sec' }, h('h3', { text: 'Link pages' }),
        pages.length ? h('div', { class: 'list' }, pages.map(function (p) {
          return h('button', { class: 'item', type: 'button', 'data-busy': '1', onclick: function () { callTool('get_link_page', { id: p.id }); } },
            h('span', { class: 't', text: p.title }),
            h('span', { class: 's', text: shortUrl(p.page_url) }),
            h('span', { class: 'v' }, h('span', { class: 'pill ' + (p.status === 'live' ? 'live' : ''), text: p.status }), h('small', { text: fmt(p.total_views) + ' views' })));
        })) : h('div', { class: 'list' }, h('div', { class: 'empty', text: 'No link pages yet.' }))
      ),
      h('div', { class: 'row' },
        btn('New QR code', function () { ask('Make a new QR code in Lynx.'); }, 'primary'),
        btn('New link page', function () { ask('Build a new Lynx link page.'); }),
        btn('Scan report', function () { ask('Give me a scan report for my top Lynx QR codes over the last 30 days.'); })
      )
    ];
  }

  // Contrast helpers for the style editor.
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 1;
    var n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  function seg(options, value, onPick) {
    return h('div', { class: 'seg', role: 'group' }, options.map(function (o) {
      return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () { onPick(o[0]); } }, o[1]);
    }));
  }

  function qrView(d) {
    var q = d.qr_code || {};
    var st = q.style || {};
    if (!state.draft || state.draft.id !== q.id) {
      state.draft = { id: q.id, foreground_color: st.foreground_color, background_color: st.background_color,
        module_shape: st.module_shape, eye_shape: st.eye_shape, destination_url: q.destination_url };
    }
    var dr = state.draft;
    var changed = {};
    ['foreground_color', 'background_color', 'module_shape', 'eye_shape'].forEach(function (k) {
      if (dr[k] && String(dr[k]).toLowerCase() !== String(st[k] || '').toLowerCase()) changed[k] = dr[k];
    });
    var ratio = contrast(dr.foreground_color, dr.background_color);
    var inverted = lum(dr.foreground_color) > lum(dr.background_color);
    var warn = inverted ? 'Light dots on a dark background often fail to scan.'
      : ratio < 3 ? 'Low contrast (' + ratio.toFixed(1) + ':1). This may not scan reliably.' : null;

    function colour(key, label) {
      var inp = h('input', { type: 'color', value: dr[key] || '#000000', 'aria-label': label, oninput: function (e) {
        dr[key] = e.target.value.toUpperCase(); span.textContent = dr[key];
      }, onchange: function () { render(); } });
      var span = h('span', { text: dr[key] });
      return h('div', { class: 'field' }, h('label', { text: label }), h('div', { class: 'swatch' }, inp, span));
    }
    function pick(key) { return function (v) { dr[key] = v; render(); }; }

    var notes = (d.notes || []).map(function (n) { return h('div', { class: 'note' }, n); });
    var dl = d.downloads || {};
    var managed = q.mode === 'managed';

    return [
      header(d.created ? 'QR code created' : d.updated ? 'QR code updated' : 'QR code',
        btn('Dashboard ↗', function () { openLink(q.dashboard_url); })),
      flashEl(),
      notes,
      h('div', { class: 'split' },
        h('div', { class: 'qrbox' }, state.image ? h('img', { src: state.image, alt: 'QR code for ' + q.name }) : h('div', { class: 'empty', text: 'No preview' })),
        h('div', { class: 'meta' },
          h('div', {}, h('h2', { text: q.name }),
            h('div', { class: 'row', style: { marginTop: '6px' } },
              h('span', { class: 'pill ' + (q.is_active ? 'live' : ''), text: q.is_active ? 'Active' : 'Paused' }),
              h('span', { class: 'pill', text: managed ? 'Managed' : 'Direct' }),
              managed ? h('span', { class: 'pill', text: fmt(q.total_scans) + ' scans' }) : null)),
          managed && q.short_link ? h('div', { class: 'kv' }, h('span', { class: 'k', text: 'Short link (printed in the code)' }), copyRow(q.short_link)) : null,
          h('div', { class: 'kv' }, h('span', { class: 'k', text: 'Goes to' }), h('span', { class: 'val', text: q.destination_url })),
          h('div', { class: 'kv' }, h('span', { class: 'k', text: 'Download (links last 24 hours)' }),
            h('div', { class: 'row' },
              dl.png ? btn('PNG', function () { openLink(dl.png); }) : null,
              dl.svg ? btn('SVG', function () { openLink(dl.svg); }) : null,
              dl.pdf ? btn('PDF', function () { openLink(dl.pdf); }) : null))
        )
      ),
      h('div', { class: 'panel' },
        h('h4', { text: 'Style' }),
        h('div', { class: 'fields' },
          colour('foreground_color', 'Dots'),
          colour('background_color', 'Background'),
          h('div', { class: 'field' }, h('label', { text: 'Dot shape' }),
            seg([['square', 'Square'], ['rounded', 'Rounded'], ['dots', 'Dots'], ['diamond', 'Diamond']], dr.module_shape, pick('module_shape'))),
          h('div', { class: 'field' }, h('label', { text: 'Corners' }),
            seg([['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle']], dr.eye_shape, pick('eye_shape')))
        ),
        warn ? h('div', { class: 'note warn' }, warn) : null,
        h('div', { class: 'row' },
          btn('Apply style', function () {
            var args = { id: q.id };
            Object.keys(changed).forEach(function (k) { args[k] = changed[k]; });
            callTool('update_qr_code', args);
          }, 'primary', { disabled: Object.keys(changed).length === 0 }),
          Object.keys(changed).length ? btn('Reset', function () { state.draft = null; render(); }, 'ghost') : null)
      ),
      managed ? h('div', { class: 'panel' },
        h('h4', { text: 'Change where it goes' }),
        h('div', { class: 'field' },
          h('label', { for: 'dest', text: 'New destination. Printed codes keep working.' }),
          h('input', { id: 'dest', type: 'url', value: dr.destination_url || '', placeholder: 'https://', oninput: function (e) { dr.destination_url = e.target.value; } })),
        h('div', { class: 'row' }, btn('Update destination', function () {
          var v = (dr.destination_url || '').trim();
          if (!v || v === q.destination_url) { flash('Enter a different link first.', 'warn'); return; }
          callTool('update_qr_code', { id: q.id, destination_url: v });
        }))
      ) : null
    ];
  }

  var SOCIAL = { instagram: 'IG', facebook: 'FB', tiktok: 'TT', twitter: 'X', youtube: 'YT', linkedin: 'in',
    github: 'GH', threads: '@', discord: 'DC', spotify: 'SP', twitch: 'TW', email: '✉', website: 'www' };

  function phone(p) {
    var ds = p.design || {};
    var screen = h('div', { class: 'phone', style: { color: ds.text || '#1A1A1A' } });
    try { screen.style.background = ds.background || '#FFFFFF'; } catch (e) {}
    var initials = (p.title || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    add(screen, h('div', { class: 'av', style: { background: ds.button_bg || ds.accent || '#1A1A1A', color: ds.button_text || '#FFFFFF' }, text: initials }));
    add(screen, h('div', { class: 'pt', text: p.title }));
    if (p.subtitle || p.bio) add(screen, h('div', { class: 'pb', style: { color: ds.text_secondary || '' }, text: p.subtitle || p.bio }));
    if ((p.social || []).length) add(screen, h('div', { class: 'soc' }, p.social.map(function (s) { return h('span', { text: SOCIAL[s.platform] || s.platform.slice(0, 2) }); })));
    var bs = ds.button_style || 'filled';
    (p.links || []).slice(0, 6).forEach(function (l) {
      var style = { borderRadius: ds.button_radius || '12px' };
      if (bs === 'outline') { style.border = '2px solid ' + (ds.button_bg || '#1A1A1A'); style.color = ds.text || '#1A1A1A'; style.background = 'transparent'; }
      else { style.background = ds.button_bg || '#1A1A1A'; style.color = ds.button_text || '#FFFFFF'; if (bs === 'shadow') style.boxShadow = '0 3px 0 rgba(0,0,0,.25)'; }
      add(screen, h('div', { class: 'lb', style: style, text: l.title }));
    });
    if ((p.links || []).length > 6) add(screen, h('div', { class: 'more', text: '+' + (p.links.length - 6) + ' more' }));
    if (!(p.links || []).length) add(screen, h('div', { class: 'more', text: 'No link buttons yet' }));
    if (p.other_blocks) add(screen, h('div', { class: 'more', text: '+ ' + p.other_blocks + ' other block' + (p.other_blocks === 1 ? '' : 's') }));
    return screen;
  }

  function pageView(d) {
    var p = d.link_page || {};
    var live = p.status === 'live';
    var q = d.qr_code;
    var notes = [].concat(d.notes || [], d.note ? [d.note] : [], d.qr_note ? [d.qr_note] : []).map(function (n) { return h('div', { class: 'note' }, n); });
    var dl = d.downloads || {};

    var publishArea = live ? null : state.confirm
      ? h('div', { class: 'note warn' }, 'Publishing makes this your live page. Your current live page becomes a draft and its link stops working.',
          h('div', { class: 'row', style: { marginTop: '8px' } },
            btn('Yes, publish', function () { callTool('update_link_page', { id: p.id, publish: true }); }, 'primary'),
            btn('Cancel', function () { state.confirm = false; render(); }, 'ghost')))
      : btn('Publish', function () { state.confirm = true; render(); }, 'primary');

    return [
      header(d.created ? 'Link page created' : d.updated ? 'Link page updated' : 'Link page',
        btn('Dashboard ↗', function () { openLink(p.dashboard_url); })),
      flashEl(),
      notes,
      h('div', { class: 'split' },
        phone(p),
        h('div', { class: 'meta' },
          h('div', {}, h('h2', { text: p.title }),
            h('div', { class: 'row', style: { marginTop: '6px' } },
              h('span', { class: 'pill ' + (live ? 'live' : ''), text: live ? 'Live' : 'Draft' }),
              h('span', { class: 'pill', text: fmt(p.total_views) + ' views' }),
              h('span', { class: 'pill', text: (p.links || []).length + ' links' }))),
          h('div', { class: 'kv' }, h('span', { class: 'k', text: 'Page address' }), copyRow(p.page_url)),
          h('div', { class: 'row' }, btn('Open page ↗', function () { openLink(p.page_url); }), publishArea),
          q ? h('div', { class: 'panel' },
            h('h4', { text: 'QR code for this page' }),
            h('div', { class: 'mini' },
              h('div', { class: 'qrbox' }, state.image ? h('img', { src: state.image, alt: 'QR code for ' + p.title }) : null),
              h('div', { class: 'meta' },
                q.short_link ? copyRow(q.short_link) : null,
                h('div', { class: 'row' },
                  dl.png ? btn('PNG', function () { openLink(dl.png); }) : null,
                  dl.svg ? btn('SVG', function () { openLink(dl.svg); }) : null,
                  dl.pdf ? btn('PDF', function () { openLink(dl.pdf); }) : null))))
          : p.qr_code_id ? h('div', { class: 'row' }, btn('View its QR code', function () { callTool('get_qr_code', { id: p.qr_code_id }); }))
          : h('div', { class: 'row' }, btn('Add a QR code', function () { callTool('update_link_page', { id: p.id, create_qr: true }); }))
        )
      )
    ];
  }

  // ── Size reporting ──────────────────────────────────────────────────
  var lastH = 0;
  function reportSize() {
    var hgt = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (hgt !== lastH) { lastH = hgt; notify('ui/notifications/size-changed', { height: hgt }); }
  }
  try { new ResizeObserver(reportSize).observe(document.body); } catch (e) { setInterval(reportSize, 500); }

  // ── Start ───────────────────────────────────────────────────────────
  rpc('ui/initialize', { appInfo: { name: 'lynx-card', version: '1.0.0' }, appCapabilities: {}, protocolVersion: PROTOCOL })
    .then(function (r) { applyContext(r && r.hostContext); notify('ui/notifications/initialized', {}); reportSize(); })
    .catch(function () { notify('ui/notifications/initialized', {}); });
})();
</script>
</body>
</html>`;
