namespace Generic.Rtk.Web;

internal static class BufferHtmlTemplate
{
    public static string GetHtml() => """
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GenericRTK — Buffer</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }

            header {
              position: sticky; top: 0; z-index: 10;
              background: #1a1d2e; border-bottom: 1px solid #2d3148;
              padding: 12px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
            }
            header h1 { font-size: 1rem; font-weight: 600; color: #a78bfa; white-space: nowrap; }
            .badge { background: #2d3148; border-radius: 99px; padding: 2px 10px; font-size: 0.78rem; color: #94a3b8; }
            .spacer { flex: 1; }
            .refresh-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #94a3b8; cursor: pointer; }
            .refresh-toggle input { accent-color: #a78bfa; cursor: pointer; }
            .btn-clear {
              background: #7f1d1d; border: 1px solid #991b1b; color: #fca5a5;
              padding: 5px 14px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;
              transition: background .15s;
            }
            .btn-clear:hover { background: #991b1b; }

            main { padding: 16px 20px; max-width: 1100px; margin: 0 auto; }

            .empty { text-align: center; color: #475569; padding: 60px 0; font-size: 0.95rem; }

            .item {
              background: #1a1d2e; border: 1px solid #2d3148; border-radius: 8px;
              margin-bottom: 8px; overflow: hidden;
            }
            .item-header {
              display: flex; align-items: center; gap: 10px; padding: 10px 14px;
              cursor: pointer; user-select: none; transition: background .12s;
            }
            .item-header:hover { background: #222540; }
            .chevron { color: #475569; font-size: 0.75rem; transition: transform .2s; flex-shrink: 0; }
            .item.open .chevron { transform: rotate(90deg); }
            .tag {
              font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 99px;
              background: #2d3148; color: #818cf8; white-space: nowrap; flex-shrink: 0;
            }
            .ts { font-size: 0.78rem; color: #64748b; white-space: nowrap; flex-shrink: 0; }
            .id-chip { font-size: 0.7rem; color: #475569; font-family: monospace; flex-shrink: 0; }
            .chars { font-size: 0.78rem; color: #64748b; flex-shrink: 0; }
            .savings { font-size: 0.78rem; color: #34d399; font-weight: 600; flex-shrink: 0; }
            .spacer-h { flex: 1; }
            .btn-remove {
              background: none; border: 1px solid #374151; color: #6b7280;
              border-radius: 4px; width: 22px; height: 22px; cursor: pointer;
              font-size: 0.85rem; line-height: 1; display: flex; align-items: center; justify-content: center;
              transition: border-color .12s, color .12s; flex-shrink: 0;
            }
            .btn-remove:hover { border-color: #ef4444; color: #ef4444; }

            .item-body { display: none; border-top: 1px solid #2d3148; padding: 14px 16px; }
            .item.open .item-body { display: block; }

            .section { margin-bottom: 16px; }
            .section:last-child { margin-bottom: 0; }
            .section-title {
              font-size: 0.72rem; font-weight: 700; letter-spacing: .06em;
              text-transform: uppercase; color: #64748b; margin-bottom: 8px;
            }
            .meta-grid {
              display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px;
            }
            .meta-cell { background: #0f1117; border-radius: 6px; padding: 6px 10px; }
            .meta-label { font-size: 0.68rem; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
            .meta-value { font-size: 0.82rem; color: #cbd5e1; margin-top: 2px; word-break: break-all; }

            pre {
              background: #0f1117; border: 1px solid #2d3148; border-radius: 6px;
              padding: 10px 12px; font-size: 0.78rem; color: #94a3b8;
              overflow: auto; max-height: 320px; white-space: pre-wrap; word-break: break-word;
              font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            }
          </style>
        </head>
        <body>
          <header>
            <h1>&#x25CF; GenericRTK Buffer</h1>
            <span class="badge" id="count">0 Eintr&#228;ge</span>
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
            let items = [];
            let timer = null;

            function fmt(ts) {
              const d = new Date(ts);
              return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE');
            }
            function fmtNum(n) { return n.toLocaleString('de-DE'); }

            function render() {
              const list = document.getElementById('list');
              const count = document.getElementById('count');
              count.textContent = items.length + ' Einträge';

              if (items.length === 0) {
                list.innerHTML = '<div class="empty">Kein Eintrag im Puffer.</div>';
                return;
              }

              const openIds = new Set(
                [...document.querySelectorAll('.item.open')].map(el => el.dataset.id)
              );

              list.innerHTML = items.map(it => {
                const open = openIds.has(it.id) ? ' open' : '';
                const pct = it.savedPercent.toFixed(1);
                const ts = fmt(it.timestamp);
                return `
                  <div class="item${open}" data-id="${it.id}">
                    <div class="item-header" onclick="toggle(this)">
                      <span class="chevron">&#9658;</span>
                      <span class="tag">${escHtml(it.toolType)}</span>
                      <span class="ts">${ts}</span>
                      <span class="id-chip">#${escHtml(it.id)}</span>
                      <span class="chars">${fmtNum(it.inputChars)} &rarr; ${fmtNum(it.outputChars)}</span>
                      <span class="savings">&#8722;${pct}%</span>
                      <div class="spacer-h"></div>
                      <button class="btn-remove" title="Entfernen" onclick="removeItem('${it.id}', event)">&#215;</button>
                    </div>
                    <div class="item-body">
                      <div class="section">
                        <div class="section-title">Meta</div>
                        <div class="meta-grid">
                          <div class="meta-cell"><div class="meta-label">Timestamp</div><div class="meta-value">${ts}</div></div>
                          <div class="meta-cell"><div class="meta-label">Tool Type</div><div class="meta-value">${escHtml(it.toolType)}</div></div>
                          <div class="meta-cell"><div class="meta-label">ID</div><div class="meta-value">${escHtml(it.id)}</div></div>
                          <div class="meta-cell"><div class="meta-label">Input Chars</div><div class="meta-value">${fmtNum(it.inputChars)}</div></div>
                          <div class="meta-cell"><div class="meta-label">Output Chars</div><div class="meta-value">${fmtNum(it.outputChars)}</div></div>
                          <div class="meta-cell"><div class="meta-label">Saved Chars</div><div class="meta-value">${fmtNum(it.savedChars)}</div></div>
                          <div class="meta-cell"><div class="meta-label">Saved %</div><div class="meta-value">${pct}%</div></div>
                        </div>
                      </div>
                      <div class="section">
                        <div class="section-title">Request (Input)</div>
                        <pre>${escHtml(it.inputValue)}</pre>
                      </div>
                      <div class="section">
                        <div class="section-title">Output</div>
                        <pre>${escHtml(it.outputValue)}</pre>
                      </div>
                    </div>
                  </div>`;
              }).join('');
            }

            function escHtml(s) {
              return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            }

            function toggle(header) {
              header.closest('.item').classList.toggle('open');
            }

            async function load() {
              try {
                const r = await fetch('/api/buffer');
                if (r.ok) { items = await r.json(); render(); }
              } catch { /* network hiccup */ }
            }

            async function removeItem(id, ev) {
              ev.stopPropagation();
              await fetch('/api/buffer/' + id, { method: 'DELETE' });
              await load();
            }

            async function clearAll() {
              if (!confirm('Alle Einträge löschen?')) return;
              await fetch('/api/buffer', { method: 'DELETE' });
              await load();
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
