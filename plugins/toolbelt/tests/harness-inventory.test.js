'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inventoryOf, matchTargets, itemLine } = require('../scripts/lib/harness-inventory');

function write(file, content = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-repo-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-home-'));
  const plugin = path.join(repoRoot, 'plugins', 'werkzeug');
  write(path.join(repoRoot, '.claude', 'skills', 'projekt-skill', 'SKILL.md'));
  write(path.join(repoRoot, '.claude', 'agents', 'projekt-agent.md'));
  write(path.join(repoRoot, '.claude', 'hooks', 'vorher.js'));
  write(path.join(plugin, '.claude-plugin', 'plugin.json'), '{"name":"dv-werkzeug"}');
  write(path.join(plugin, 'skills', 'plan-schreiben', 'SKILL.md'));
  write(path.join(plugin, 'agents', 'pruefer.md'));
  write(path.join(plugin, 'scripts', 'zaehlen.js'));
  write(path.join(home, '.claude', 'skills', 'global-skill', 'SKILL.md'));
  write(path.join(home, '.claude', 'agents', 'global-agent.md'));
  return { repoRoot, home, pluginDirs: [plugin] };
}

function names(items) {
  return items.map((item) => `${item.art}:${item.name}`);
}

test('inventoryOf_AllAllowedAreas_NamesPluginsSkillsAgentsHooksAndScripts', () => {
  const result = names(inventoryOf(fixture()));

  assert.deepEqual(result, [
    'skill:projekt-skill', 'agent:projekt-agent', 'hook:vorher.js',
    'plugin:dv-werkzeug', 'skill:plan-schreiben', 'agent:pruefer', 'skript:zaehlen',
    'skill:global-skill', 'agent:global-agent',
  ]);
});

test('inventoryOf_MissingFolders_EmptyList', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-empty-'));

  assert.deepEqual(inventoryOf({ repoRoot: empty, home: empty, pluginDirs: [] }), []);
});

test('matchTargets_OneNameInFeedback_ExactlyOneHit', () => {
  const context = fixture();

  const hits = matchTargets('Der Skill Plan-Schreiben fragt zu oft nach.', inventoryOf(context), context.repoRoot);

  assert.deepEqual(names(hits), ['skill:plan-schreiben']);
});

test('matchTargets_PluginAndSkillNamed_BothHits', () => {
  const context = fixture();

  const hits = matchTargets('Aufruf /dv-werkzeug:plan-schreiben hakte.', inventoryOf(context), context.repoRoot);

  assert.deepEqual(names(hits), ['plugin:dv-werkzeug', 'skill:plan-schreiben']);
});

test('matchTargets_NameOnlyAsPartOfLongerWord_NoHit', () => {
  const context = fixture();

  const hits = matchTargets('plan-schreiben-alt und projekt-agenten', inventoryOf(context), context.repoRoot);

  assert.deepEqual(hits, []);
});

test('matchTargets_RelativePathWithBackslashes_Hit', () => {
  const context = fixture();

  const hits = matchTargets('Fehler in plugins\\werkzeug\\scripts\\zaehlen.js Zeile 3', inventoryOf(context), context.repoRoot);

  assert.deepEqual(names(hits), ['plugin:dv-werkzeug', 'skript:zaehlen']);
});

test('matchTargets_InvocationLines_HitHookPluginAgentAndScript', () => {
  const context = fixture();
  const feedback = [
    'Hook node "$CLAUDE_PROJECT_DIR"/.claude/hooks/vorher.js lief nicht.',
    'node "${CLAUDE_PLUGIN_ROOT}/scripts/zaehlen.js" --dir "x" brach ab.',
    'subagent_type: dv-werkzeug:pruefer kam ohne Antwort zurück.',
  ].join('\n');

  const hits = matchTargets(feedback, inventoryOf(context), context.repoRoot);

  assert.deepEqual(names(hits), ['hook:vorher.js', 'plugin:dv-werkzeug', 'agent:pruefer', 'skript:zaehlen']);
});

test('itemLine_Item_KindNameAndPathSeparatedByBars', () => {
  assert.equal(itemLine({ art: 'skill', name: 'a', pfad: 'x/a' }), 'skill | a | x/a');
});
