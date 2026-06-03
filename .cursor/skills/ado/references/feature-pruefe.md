# `prüfe Feature` — Feature-Kontext + parallele Story-Subagents



Gilt, wenn `wit_get_work_item` für die angegebene ID `System.WorkItemType` = **Feature** (projektsprachiger Name, typisch `Feature`) liefert.



## Ziel



1. **Feature** einmal lesen: Description, Acceptance Criteria, Discussion → **zusammengefasster Feature-Kontext** (für Agent und für jede Story-MD).

2. **Alle Child-User-Stories** ermitteln und **parallel** je einen [Story-SubAgent](story-pruefe-subagent.md) starten (nicht sequentieller Story-`prüfe` im Hauptagenten).

3. Pro Story: lokaler Ordner/Tasks wie bei `prüfe Story` — **plus** Abschnitt **`## Feature-Kontext`**; Task-MDs durch **Task-Subagents** ([task-pruefe-subagent.md](task-pruefe-subagent.md)).



**Kein** eigener Ordner `requests/stories/UserStory-{featureId}-*` nur für das Feature (keine `task-*.md` aus der Feature-Description auf Feature-Ebene).



## Phase A — Feature-Kontext laden (Hauptagent)



| Schritt | MCP / Aktion |

|---------|----------------|

| A1 | `wit_get_work_item` — `id` = Feature-ID, `project` = `defaultProject`, optional `expand: relations` (für Phase B) |

| A2 | `wit_list_work_item_comments` — Feature-ID (nur **Kontext**; Marker `TASK-CLOSED`/`TODO` für Tasks gelten weiter an der **jeweiligen Story**) |

| A3 | Feature-Kontext **zusammenfassen** (eigene Kurzprosa, strukturiert): Description, AC, relevante Discussion (ohne vollständigen HTML-Rohdump in Markdown) |



**Feature-Kontext-Objekt** (intern bis alle Story-Subagents gestartet), mindestens:



- `featureId`, `featureTitle`, `featureAdoUrl`

- `descriptionSummary`, `acSummary`, `discussionSummary` (je „gepflegt" / „leer" / „N Kommentare")



## Phase B — Child-User-Stories ermitteln (Hauptagent)



Unverändert: Relations `System.LinkTypes.Hierarchy-Forward` oder WIQL — siehe frühere Version in [op-load-feature.md](op-load-feature.md).



- **Sortierung:** Child-Story-IDs **aufsteigend**.

- **0 User Stories:** Abschlussbericht: Feature-Kontext geladen, keine Child-Stories, keine Story-Ordner.



## Phase C — Parallele Story-Subagents



**Hauptagent** startet pro Child-`storyId` **einen** Story-SubAgent (parallel, max. **10**/Welle; Host-Batching bei mehr):



| Parameter | Wert |

|-----------|------|

| `storyId` | Child-ID |

| `featureContext` | Objekt aus Phase A (**Pflicht**, gleich für alle) |



Jeder Story-SubAgent führt die **Story-Phase** aus ([story-pruefe-subagent.md](story-pruefe-subagent.md)) inkl. paralleler **Task-Subagents**.



**Nicht mehr:** Hauptagent führt Story-`prüfe` nacheinander selbst aus.



Zusätzlich in jeder Story-MD:



1. Abschnitt **`## Feature-Kontext`** — Block ersetzen ([field-mapping.md](field-mapping.md)).

2. Discussion/Marker: nur Story-Discussion ([task-overview.md](task-overview.md)).



**Story-Description** bleibt Quelle für das Task-Inventar (nicht Feature-Description).



## Abbruch / Teilerfolg



| Situation | Verhalten |

|-----------|-----------|

| MCP zu Beginn nicht erreichbar | **Stopp** — keine Story-Ordner anlegen |

| Story-SubAgent / Task-SubAgent `BLOCKER` (Modell, Task-Tool) | Im Feature-Bericht melden; weitere Stories **fortsetzen** wenn möglich |

| Einzelne Story schlägt fehl | Weitere Stories **fortsetzen**; Abschlussbericht pro ID OK/Fehler |

| Feature ist kein Feature-Typ | Hinweis + optional Story-`prüfe`, wenn Nutzer Story-ID meinte |



## Abschlussbericht (`prüfe Feature`)



- Feature-ID, ADO-URL, Kurz-Feature-Kontext (1–3 Sätze)

- Anzahl Child-Stories; Anzahl Story-Subagents / Wellen

- Tabelle: `storyId` → OK/Fehler, Task-Anzahl, Task-Subagent-Zusammenfassung, Modell-Slugs

- Hinweis: **kein** lokaler Feature-Ordner



## `prüfe Story` mit Parent-Feature (optional)



Wenn `System.Parent` ein Feature ist: Hauptagent **darf** Phase A nachladen und `featureContext` an die Story-Phase übergeben — **nicht** Pflicht. Pflicht nur bei **`prüfe Feature {id}`**.
