namespace Dev.Filesystem.Mcp.Web;

internal static class LogHtmlTemplate
{
    public static string GetHtml() => """
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Dev.Filesystem.Mcp — Log</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0c10; color: #e2e8f0; min-height: 100vh; }

            header {
              position: sticky; top: 0; z-index: 10;
              background: #111318; border-bottom: 1px solid #1e2228;
              padding: 12px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
            }
            header h1 { font-size: 1rem; font-weight: 600; color: #38bdf8; white-space: nowrap; }
            .badge { background: #1e2228; border-radius: 99px; padding: 2px 10px; font-size: 0.78rem; color: #94a3b8; }
            .spacer { flex: 1; }
            .refresh-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #94a3b8; cursor: pointer; }
            .refresh-toggle input { accent-color: #38bdf8; cursor: pointer; }
            .btn-clear {
              background: #7f1d1d; border: 1px solid #991b1b; color: #fca5a5;
              padding: 5px 14px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;
              transition: background .15s;
            }
            .btn-clear:hover { background: #991b1b; }

            main { padding: 16px 20px; max-width: 1100px; margin: 0 auto; }
            .empty { text-align: center; color: #475569; padding: 60px 0; font-size: 0.95rem; }

            .item {
              background: #111318; border: 1px solid #1e2228; border-radius: 8px;
              margin-bottom: 8px; overflow: hidden;
            }
            .item-header {
              display: flex; align-items: center; gap: 10px; padding: 10px 14px;
              cursor: pointer; user-select: none; transition: background .12s;
            }
            .item-header:hover { background: #1a1f2e; }
            .chevron { color: #475569; font-size: 0.75rem; transition: transform .2s; flex-shrink: 0; }
            .item.open .chevron { transform: rotate(90deg); }
            .tag {
              font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 99px;
              background: #1e2228; color: #38bdf8; white-space: nowrap; flex-shrink: 0;
            }
            .ts { font-size: 0.78rem; color: #64748b; white-space: nowrap; flex-shrink: 0; }
            .id-chip { font-size: 0.7rem; color: #475569; font-family: monospace; flex-shrink: 0; }
            .chars { font-size: 0.78rem; color: #64748b; flex-shrink: 0; }
            .dur { font-size: 0.78rem; color: #10b981; font-weight: 600; flex-shrink: 0; }
            .spacer-h { flex: 1; }
            .btn-remove {
              background: none; border: 1px solid #374151; color: #6b7280;
              border-radius: 4px; width: 22px; height: 22px; cursor: pointer;
              font-size: 0.85rem; display: flex; align-items: center; justify-content: center;
              transition: border-color .12s, color .12s; flex-shrink: 0;
            }
            .btn-remove:hover { border-color: #ef4444; color: #ef4444; }

            .item-body { display: none; border-top: 1px solid #1e2228; padding: 14px 16px; }
            .item.open .item-body { display: block; }

            .section { margin-bottom: 16px; }
            .section:last-child { margin-bottom: 0; }
            .section-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
            .section-header .section-title { margin-bottom: 0; }
            .section-title {
              font-size: 0.72rem; font-weight: 700; letter-spacing: .06em;
              text-transform: uppercase; color: #64748b; margin-bottom: 8px;
            }
            .btn-copy {
              background: none; border: 1px solid #374151; color: #64748b;
              border-radius: 4px; width: 20px; height: 20px; padding: 0; cursor: pointer;
              display: inline-flex; align-items: center; justify-content: center;
              transition: border-color .12s, color .12s; flex-shrink: 0;
            }
            .btn-copy:hover { border-color: #60a5fa; color: #60a5fa; }
            .btn-copy.copied { border-color: #10b981; color: #10b981; }
            .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px; }
            .meta-cell { background: #0a0c10; border-radius: 6px; padding: 6px 10px; }
            .meta-label { font-size: 0.68rem; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
            .meta-value { font-size: 0.82rem; color: #cbd5e1; margin-top: 2px; word-break: break-all; }

            pre {
              background: #0a0c10; border: 1px solid #1e2228; border-radius: 6px;
              padding: 10px 12px; font-size: 0.78rem; color: #94a3b8;
              overflow: auto; max-height: 320px; white-space: pre-wrap; word-break: break-word;
              font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            }
          </style>
        </head>
        <body>
          <header>
            <h1>&#x25CF; Dev.Filesystem.Mcp Log</h1>
            <span class="badge" id="count">0 Calls</span>
            <div class="spacer"></div>
            <label class="refresh-toggle">
              <input type="checkbox" id="autoRefresh" checked />
              Auto-Refresh (5s)
            </label>
            <button class="btn-clear" onclick="clearAll()">&#x1F5D1; Clear All</button>
          </header>
          <main>
            <div id="list"></div>
          </main>

          <script>
            var items = [];
            var timer = null;

            function fmt(ts) {
              var d = new Date(ts);
              return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE');
            }
            function fmtNum(n) { return Number(n).toLocaleString('de-DE'); }

            function esc(s) {
              return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }

            var COPY_SVG = '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>';

            function copyBtn(text) {
              return '<button class="btn-copy" title="In Zwischenablage kopieren" onclick="copyText(this)" data-copy="' + esc(text) + '">' + COPY_SVG + '</button>';
            }

            function copyText(btn) {
              var text = btn.getAttribute('data-copy');
              navigator.clipboard.writeText(text).then(function() {
                btn.classList.add('copied');
                btn.innerHTML = '&#10003;';
                setTimeout(function() { btn.classList.remove('copied'); btn.innerHTML = COPY_SVG; }, 1500);
              });
            }

            function render() {
              var list = document.getElementById('list');
              var count = document.getElementById('count');
              count.textContent = items.length + (items.length === 1 ? ' Call' : ' Calls');
              if (items.length === 0) {
                list.innerHTML = '<div class="empty">Noch kein Tool-Aufruf aufgezeichnet.</div>';
                return;
              }
              var openIds = new Set(Array.from(document.querySelectorAll('.item.open')).map(function(el) { return el.getAttribute('data-id'); }));
              list.innerHTML = items.map(function(it) {
                var open = openIds.has(it.id) ? ' open' : '';
                return '<div class="item' + open + '" data-id="' + esc(it.id) + '">'
                  + '<div class="item-header" onclick="toggle(this)">'
                  + '<span class="chevron">&#9658;</span>'
                  + '<span class="tag">' + esc(it.tool) + '</span>'
                  + '<span class="ts">' + fmt(it.timestamp) + '</span>'
                  + '<span class="id-chip">#' + esc(it.id) + '</span>'
                  + '<span class="chars">' + fmtNum(it.outputChars) + ' chars</span>'
                  + '<span class="dur">' + it.durationMs + 'ms</span>'
                  + '<div class="spacer-h"></div>'
                  + '<button class="btn-remove" title="Entfernen" data-remove-id="' + esc(it.id) + '" onclick="removeItem(this.getAttribute(&quot;data-remove-id&quot;), event)">&#215;</button>'
                  + '</div>'
                  + '<div class="item-body">'
                  + '<div class="section"><div class="section-title">Meta</div><div class="meta-grid">'
                  + '<div class="meta-cell"><div class="meta-label">Timestamp</div><div class="meta-value">' + fmt(it.timestamp) + '</div></div>'
                  + '<div class="meta-cell"><div class="meta-label">Tool</div><div class="meta-value">' + esc(it.tool) + '</div></div>'
                  + '<div class="meta-cell"><div class="meta-label">Duration</div><div class="meta-value">' + it.durationMs + ' ms</div></div>'
                  + '<div class="meta-cell"><div class="meta-label">Output Chars</div><div class="meta-value">' + fmtNum(it.outputChars) + '</div></div>'
                  + '</div></div>'
                  + '<div class="section"><div class="section-header"><div class="section-title">Parameter</div>' + copyBtn(it.params) + '</div><pre>' + esc(it.params) + '</pre></div>'
                  + '<div class="section"><div class="section-header"><div class="section-title">Output (Preview)</div>' + copyBtn(it.preview) + '</div><pre>' + esc(it.preview) + '</pre></div>'
                  + '</div>'
                  + '</div>';
              }).join('');
            }

            function toggle(header) { header.closest('.item').classList.toggle('open'); }

            function load() {
              fetch('/api/calls')
                .then(function(r) { if (r.ok) return r.json(); })
                .then(function(data) { if (data) { items = data; render(); } })
                .catch(function() {});
            }

            function removeItem(id, ev) {
              ev.stopPropagation();
              fetch('/api/calls/' + id, { method: 'DELETE' }).then(load);
            }

            function clearAll() {
              if (!confirm('Alle Einträge löschen?')) return;
              fetch('/api/calls', { method: 'DELETE' }).then(load);
            }

            document.getElementById('autoRefresh').addEventListener('change', function() {
              if (this.checked) { timer = setInterval(load, 5000); }
              else { clearInterval(timer); timer = null; }
            });

            load();
            timer = setInterval(load, 5000);
          </script>
        </body>
        </html>
        """;
}
