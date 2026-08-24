---
name: craft-clean-code
description: >
  Use when naming variables/functions/classes, writing or reviewing comments,
  formatting code layout, designing data objects/DTOs, handling errors and
  exceptions, or reviewing code for smells such as rigidity, fragility, or
  needless complexity. Triggers: @craft-clean-code, sprechender Name,
  Meaningful Names, Law of Demeter, DTO, Kommentar überflüssig, Code-Smell,
  Formatierung, Fehlerbehandlung, Exception statt Return-Code, null zurückgeben,
  Stepdown Rule.
  Opt-out: ohne craft-clean-code.
---

# Clean Code

Taktische Ebene von `craft-design-principles` (Rang 4 der Prinzipien-Hierarchie).
Für Architektur-/Struktur-Entscheidungen und SRP: Skill `craft-design-principles`.
Für Testcode-Konventionen: Skill `craft-unit-testing` / `craft-integration-testing`.

> "Code is clean if it can be read, and enhanced by a developer other than its original author." — Grady Booch

---

## 1 Meaningful Names

- **Use Intention-Revealing Names**: `elapsedTimeInDays` instead of `d`.
- **Avoid Disinformation**: Don't use `accountList` if it's actually a `Map`.
- **Make Meaningful Distinctions**: Avoid `ProductData` vs `ProductInfo`.
- **Use Pronounceable/Searchable Names**: Avoid `genymdhms`.
- **Class Names**: Use nouns (`Customer`, `WikiPage`). Avoid `Manager`, `Data`.
- **Method Names**: Use verbs (`postPayment`, `deletePage`).

## 2 Functions

- **One Level of Abstraction**: Don't mix high-level business logic with low-level details (like regex).
- **Descriptive Names**: `isPasswordValid` is better than `check`.
- **Arguments**: 0 is ideal, 1-2 is okay, 3+ requires a very strong justification.
- **No Side Effects**: Functions shouldn't secretly change global state.

Größe/"Eine Sache"-Regel: siehe `craft-design-principles` Regel 3.

## 3 Comments

- **Don't Comment Bad Code—Rewrite It**: Most comments are a sign of failure to express ourselves in code.
- **Explain Yourself in Code**:
  ```python
  # Check if employee is eligible for full benefits
  if employee.flags & HOURLY and employee.age > 65:
  ```
  vs
  ```python
  if employee.isEligibleForFullBenefits():
  ```
- **Good Comments**: Legal, Informative (regex intent), Clarification (external libraries), TODOs.
- **Bad Comments**: Mumbling, Redundant, Misleading, Mandated, Noise, Position Markers.

## 4 Formatting

- **The Newspaper Metaphor**: High-level concepts at the top, details at the bottom.
- **Vertical Density**: Related lines should be close to each other.
- **Distance**: Variables should be declared near their usage.
- **Indentation**: Essential for structural readability.

## 5 Objects and Data Structures

- **Data Abstraction**: Hide the implementation behind interfaces.
- **The Law of Demeter**: A module should not know about the innards of the objects it manipulates. Avoid `a.getB().getC().doSomething()`.
- **Data Transfer Objects (DTO)**: Classes with public variables and no functions.

## 6 Error Handling

- **Use Exceptions instead of Return Codes**: Keeps logic clean.
- **Write Try-Catch-Finally First**: Defines the scope of the operation.
- **Don't Return Null**: It forces the caller to check for null every time.
- **Don't Pass Null**: Leads to `NullPointerException`.

Fehler-*Kategorien* (Bedienfehler vs. technischer Fehler vs. Programmierfehler): [references — craft-design-principles error-handling.md] via Skill `craft-design-principles`.

## 7 Classes

- **Small!**: Classes should have a single responsibility — siehe SRP in `craft-design-principles` (SOLID-Tabelle).
- **The Stepdown Rule**: We want the code to read like a top-down narrative.

## 8 Smells and Heuristics

- **Rigidity**: Hard to change.
- **Fragility**: Breaks in many places.
- **Immobility**: Hard to reuse.
- **Viscosity**: Hard to do the right thing.
- **Needless Complexity/Repetition**.

---

## Implementation Checklist

- [ ] Sind alle Namen searchable und intention-revealing?
- [ ] Ein Level of Abstraction pro Funktion?
- [ ] Kommentare durch klareren Code ersetzt, wo möglich?
- [ ] Zu viele Argumente?
- [ ] Exceptions statt Return-Codes/Null?
- [ ] Law of Demeter verletzt (`a.getB().getC()`)?

---

## Opt-out

`ohne craft-clean-code` → Skill nicht laden.
