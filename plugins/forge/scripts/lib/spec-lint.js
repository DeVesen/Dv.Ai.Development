'use strict';

// Formprüfung einer Spec nach skills/spec-whiteboarding/references/spec-format.md und ac-rules.md, ohne KI.
// Fehler verletzen das Format, das Skripte und Reviews lesen; Warnungen sind Kandidaten, die ein Mensch oder Review bewertet.

const SECTIONS = ['Was, wie, wo, warum', 'Theoretisches Verhalten nach Umsetzung', 'Soll-Vorgaben', 'Akzeptanzkriterien', 'Entscheidungen'];
const ABORT_SECTION = 'Offen, bewusst nicht weiterverfolgt (Abbruch)';
const TAGS = ['Aussage', 'Anhang', 'Historie', 'Git', 'ungeklärt'];
const FREE_TAGS = new Set(['Aussage', 'Anhang', 'ungeklärt']);
const TAG_AT_END = new RegExp(` · (${TAGS.join('|')})\\.?\\s*$`);
const TAG_ANYWHERE = new RegExp(` · (${TAGS.join('|')})(?=[\\s.—]|$)`, 'g');
const STATUS_OK = /^Status: bestätigt am \d{4}-\d{2}-\d{2}$/;
const STATUS_ABORT = /^Status: Abbruch am \d{4}-\d{2}-\d{2}, (\d+) Punkte? offen$/;
const ART = /^Art: (frei|verankert)$/;
const BASIS = /^Basis: [0-9a-f]{7,40}$/;
const HEADER_LINE = /^(Status|Art|Workitem|Basis):/;
const AC_LINE = /^- \*\*AC-(\d+)\*\*\s*(.*)$/;
const AC_FORM = /^Gegeben\b.+,\s*wenn\b.+,\s*dann\b.+/i;
const W_LINE = /^- \*\*W · .+?\*\*/;
const W_FORM = new RegExp(`^- \\*\\*W · .+?\\*\\* · (${TAGS.join('|')}) — .+`);
const ABORT_ENTRY = /^- \*\*.+?\*\* · ungeklärt — .+/;
const FORBIDDEN = /(?<!\p{L})(funktioniert korrekt|ist möglich|sollte|sollten|idealerweise|schnell|benutzerfreundlich|intuitiv)(?!\p{L})/iu;
const REFERENCE = /https?:\/\/|\bAB#\d+|\b[A-Z][A-Z0-9]+-\d+\b(?<!AC-\d+)|(?:^|[\s(`])(?:[\w.-]+\/)+[\w-]+\.[a-z]{1,5}\b/;
const LIST_ITEM = /^(?:[-*] |\d+\. )/;
const FENCE = /^\s*(?:```|~~~)/;

function issue(rule, severity, location, quote, message) {
  return { rule, severity, location, quote, message };
}

function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function parse(text) {
  const lines = splitLines(text);
  const doc = { title: null, header: [], sections: [] };
  let fenced = false;
  let current = null;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = fenced ? null : /^## (.+?)\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], line: index + 1, body: [] };
      doc.sections.push(current);
    } else if (current) {
      current.body.push({ text: line, line: index + 1, fenced });
    } else if (!doc.title && /^# /.test(line)) {
      doc.title = { text: line, line: index + 1 };
    } else if (line.trim() !== '') {
      doc.header.push({ text: line.trim(), line: index + 1 });
    }
  });
  return doc;
}

// Absätze und Listenpunkte; ein Block endet an einer Leerzeile oder am nächsten Listenpunkt.
function blocks(body) {
  const result = [];
  let open = null;
  for (const entry of body) {
    if (entry.fenced || FENCE.test(entry.text)) { open = null; continue; }
    if (entry.text.trim() === '') { open = null; continue; }
    if (!open || LIST_ITEM.test(entry.text)) {
      open = { lines: [] };
      result.push(open);
    }
    open.lines.push(entry);
  }
  return result;
}

function headerIssues(doc) {
  const issues = [];
  if (!doc.title) issues.push(issue('titel', 'fehler', 'Kopf', '', 'Die erste Überschrift `# <Titel>` fehlt.'));
  const find = (key) => doc.header.find((entry) => entry.text.startsWith(`${key}:`));
  const status = find('Status');
  if (!status) issues.push(issue('kopf-status', 'fehler', 'Kopf', '', 'Die Zeile `Status:` fehlt.'));
  else if (!STATUS_OK.test(status.text) && !STATUS_ABORT.test(status.text)) {
    issues.push(issue('kopf-status', 'fehler', 'Kopf', status.text, 'Status hat weder die Form `bestätigt am <YYYY-MM-DD>` noch `Abbruch am <YYYY-MM-DD>, <k> Punkte offen`.'));
  }
  const art = find('Art');
  if (!art) issues.push(issue('kopf-art', 'warnung', 'Kopf', '', 'Die Zeile `Art:` fehlt; der Spec-Review nimmt dann `verankert` an.'));
  else if (!ART.test(art.text)) issues.push(issue('kopf-art', 'fehler', 'Kopf', art.text, 'Art ist weder `frei` noch `verankert`.'));
  const basis = find('Basis');
  if (!basis) issues.push(issue('kopf-basis', 'warnung', 'Kopf', '', 'Die Zeile `Basis:` mit dem Commit-Kurzhash fehlt.'));
  else if (!BASIS.test(basis.text)) issues.push(issue('kopf-basis', 'fehler', 'Kopf', basis.text, 'Basis ist kein Commit-Hash.'));
  for (const entry of doc.header.filter((line) => !HEADER_LINE.test(line.text))) {
    issues.push(issue('kopf-zeile', 'fehler', 'Kopf', entry.text, 'Vor dem ersten Abschnitt stehen nur Titel und Kopfzeilen.'));
  }
  return issues;
}

function sectionIssues(doc, aborted) {
  const expected = aborted ? [...SECTIONS, ABORT_SECTION] : SECTIONS;
  const names = doc.sections.map((section) => section.name);
  const issues = [];
  for (const name of names.filter((section) => !expected.includes(section))) {
    issues.push(issue('abschnitt-unbekannt', 'fehler', name, `## ${name}`, `Abschnitt „${name}“ gehört nicht zum Spec-Format.`));
  }
  for (const name of expected.filter((section) => !names.includes(section))) {
    issues.push(issue('abschnitt-fehlt', 'fehler', name, '', `Abschnitt „${name}“ fehlt.`));
  }
  const known = names.filter((name) => expected.includes(name));
  const order = expected.filter((name) => known.includes(name));
  if (known.join('\n') !== order.join('\n')) {
    issues.push(issue('abschnitt-reihenfolge', 'fehler', 'Kopf', '', `Abschnitte stehen nicht in der Reihenfolge: ${order.join(' → ')}.`));
  }
  for (const name of new Set(names.filter((name, index) => names.indexOf(name) !== index))) {
    issues.push(issue('abschnitt-doppelt', 'fehler', name, `## ${name}`, `Abschnitt „${name}“ steht mehrfach.`));
  }
  return issues;
}

function tagIssues(block, location, art) {
  const text = block.lines.map((entry) => entry.text).join(' ');
  const last = block.lines.at(-1).text;
  const tags = [...text.matchAll(TAG_ANYWHERE)].map((match) => match[1]);
  const quote = block.lines[0].text.trim();
  if (!TAG_AT_END.test(last)) return [issue('tag-fehlt', 'warnung', location, quote, 'Die Zeile endet nicht mit genau einem Beleg-Tag nach ` · `.')];
  if (tags.length > 1) return [issue('tag-mehrfach', 'warnung', location, quote, `Die Zeile trägt ${tags.length} Beleg-Tags statt einem.`)];
  if (art === 'frei' && !FREE_TAGS.has(tags[0])) return [issue('tag-art', 'warnung', location, quote, `Eine Spec der Art frei kennt den Tag ${tags[0]} nicht.`)];
  return [];
}

function acIssues(section, art) {
  const issues = [];
  const ids = [];
  for (const block of blocks(section.body)) {
    const match = AC_LINE.exec(block.lines[0].text);
    if (!match) {
      issues.push(issue('ac-zeile', 'fehler', section.name, block.lines[0].text.trim(), 'Unter Akzeptanzkriterien stehen nur Zeilen `- **AC-<NN>** …`.'));
      continue;
    }
    const id = `AC-${match[1]}`;
    const body = block.lines.map((entry, index) => (index === 0 ? match[2] : entry.text.trim())).join(' ').replace(TAG_ANYWHERE, '');
    ids.push({ id, number: Number(match[1]), digits: match[1], quote: block.lines[0].text.trim() });
    if (match[1].length !== 2) issues.push(issue('ac-id', 'fehler', id, block.lines[0].text.trim(), 'AC-IDs sind zweistellig.'));
    if (!AC_FORM.test(body)) issues.push(issue('ac-form', 'fehler', id, block.lines[0].text.trim(), 'Das AC folgt nicht der Form „Gegeben …, wenn …, dann …“.'));
    const forbidden = FORBIDDEN.exec(body);
    if (forbidden) issues.push(issue('ac-wort', 'warnung', id, block.lines[0].text.trim(), `„${forbidden[1]}“ ist nicht prüfbar (ac-rules.md).`));
    issues.push(...tagIssues(block, id, art));
  }
  ids.forEach((entry, index) => {
    if (entry.number !== index + 1) {
      issues.push(issue('ac-luecke', 'fehler', entry.id, entry.quote, `An Position ${index + 1} steht ${entry.id}; AC-IDs laufen lückenlos ab AC-01.`));
    }
  });
  if (ids.length === 0) issues.push(issue('ac-keine', 'fehler', section.name, '', 'Die Spec hat kein Akzeptanzkriterium.'));
  return { issues, count: ids.length };
}

function decisionIssues(section) {
  const issues = [];
  let count = 0;
  for (const entry of section.body.filter((line) => !line.fenced && W_LINE.test(line.text))) {
    count += 1;
    if (!W_FORM.test(entry.text)) {
      issues.push(issue('w-form', 'fehler', 'Entscheidungen', entry.text.trim(), 'W-Eintrag folgt nicht `- **W · <Kurztitel>** · <Tag> — <Antwort>`.'));
    }
  }
  return { issues, count };
}

function abortIssues(doc, section) {
  const status = doc.header.find((entry) => entry.text.startsWith('Status:'));
  const match = status ? STATUS_ABORT.exec(status.text) : null;
  if (!match) return [];
  if (!section) return [];
  const entries = section.body.filter((line) => !line.fenced && /^- \*\*/.test(line.text));
  const issues = entries.filter((entry) => !ABORT_ENTRY.test(entry.text))
    .map((entry) => issue('abbruch-eintrag', 'fehler', section.name, entry.text.trim(), 'Abbruch-Eintrag folgt nicht `- **<Kurztitel>** · ungeklärt — <was offen ist>`.'));
  if (entries.length !== Number(match[1])) {
    issues.push(issue('abbruch-anzahl', 'fehler', 'Kopf', status.text, `Status nennt ${match[1]} offene Punkte, der Abbruch-Abschnitt hat ${entries.length}.`));
  }
  return issues;
}

function referenceIssues(doc) {
  const issues = [];
  for (const section of doc.sections) {
    for (const entry of section.body.filter((line) => !line.fenced)) {
      if (REFERENCE.test(entry.text)) {
        issues.push(issue('verweis', 'warnung', section.name, entry.text.trim(), 'Link, Ticket oder Dateipfad: Die Spec ist in sich abgeschlossen (Regel 3) und beschreibt WAS statt WIE (Regel 4).'));
      }
    }
  }
  return issues;
}

function lintSpec(text) {
  const doc = parse(text);
  const status = doc.header.find((entry) => entry.text.startsWith('Status:'));
  const aborted = Boolean(status && STATUS_ABORT.test(status.text));
  const art = ART.exec(doc.header.find((entry) => entry.text.startsWith('Art:'))?.text ?? '')?.[1] ?? null;
  const byName = (name) => doc.sections.find((section) => section.name === name);
  const issues = [...headerIssues(doc), ...sectionIssues(doc, aborted)];
  let untagged = 0;
  let unresolved = 0;
  for (const name of SECTIONS.slice(0, 3)) {
    const section = byName(name);
    for (const block of section ? blocks(section.body) : []) {
      const found = tagIssues(block, name, art);
      untagged += found.filter((entry) => entry.rule === 'tag-fehlt').length;
      if (/ · ungeklärt\.?\s*$/.test(block.lines.at(-1).text)) unresolved += 1;
      issues.push(...found);
    }
  }
  const acSection = byName('Akzeptanzkriterien');
  const acs = acSection ? acIssues(acSection, art) : { issues: [], count: 0 };
  issues.push(...acs.issues);
  const decisions = byName('Entscheidungen') ? decisionIssues(byName('Entscheidungen')) : { issues: [], count: 0 };
  issues.push(...decisions.issues, ...abortIssues(doc, byName(ABORT_SECTION)), ...referenceIssues(doc));
  untagged += acs.issues.filter((entry) => entry.rule === 'tag-fehlt').length;
  return {
    issues,
    metrics: {
      fehler: issues.filter((entry) => entry.severity === 'fehler').length,
      warnungen: issues.filter((entry) => entry.severity === 'warnung').length,
      ac: acs.count,
      w: decisions.count,
      ohneTag: untagged,
      ungeklaert: unresolved,
      art,
      abbruch: aborted,
    },
  };
}

module.exports = { lintSpec, SECTIONS, ABORT_SECTION, TAGS };
