---
name: angular-a11y
description: Use when implementing accessible interactive UI patterns in Angular — accordion, listbox, combobox/select, menu/menubar, tabs, toolbar, tree, or grid — via the headless @angular/aria directives. Triggers on ARIA/accessibility/Barrierefreiheit requests for these widget patterns, or keyboard-navigation/focus-management/screen-reader questions for custom components.
---

# Angular Aria (`@angular/aria`)

Headless, accessible directives implementing common WAI-ARIA patterns — keyboard interactions, ARIA attributes, focus management, screen reader support. Your job: HTML structure + CSS. The directives handle the accessibility logic; they ship **no styles**.

**Before use:** confirm `@angular/aria` is installed (`npm install @angular/aria`) — don't assume.

## Core rules

1. Never use a native element (`<select>`, etc.) when asked to implement one of these patterns — use the `ng*` directives instead.
2. Style manually, targeting the ARIA attributes/states the directives toggle: `[aria-expanded]`, `[aria-selected]`, `[aria-disabled]`, `[aria-current="page"]`, `[aria-pressed]`, `[aria-checked]`.
3. Wrap heavy content panels in the lazy-loading structural directive (`ngAccordionContent`, `ngTabContent`) inside `ng-template`.

## Pattern → directive family → when to use

| Pattern | Import from | Use for | Avoid for |
|---|---|---|---|
| Accordion | `@angular/aria/accordion` | FAQs, long forms, progressive disclosure | primary navigation, viewing multiple sections at once |
| Listbox | `@angular/aria/listbox` | visible single/multi-select lists | dropdowns (use Combobox/Select) |
| Combobox/Select/Multiselect | `@angular/aria/combobox` + `@angular/aria/listbox` | autocomplete, custom filtering | standard cases better served by a documented Select component |
| Menu/Menubar | `@angular/aria/menu` | persistent app command bars (File/Edit/View) | simple action lists, mobile-constrained layouts |
| Tabs | `@angular/aria/tabs` | settings panels, multi-topic content, ≤7-8 sections | sequential workflows (steppers), too many sections |
| Toolbar | `@angular/aria/toolbar` | grouped related controls (formatting, media) | — |
| Tree | `@angular/aria/tree` | deeply nested hierarchical data | flat lists, simple selection |
| Grid | `@angular/aria/grid` | data tables, calendars, spreadsheets | — |

Full directive names, HTML templates, and CSS styling strategy per pattern: [references/patterns.md](references/patterns.md).
