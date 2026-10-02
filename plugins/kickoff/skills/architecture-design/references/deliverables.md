# Deliverables

Create only on request. Ask once, bundled: target folder and file names (defaults from the `Kickoff` block), document language. Never commit.

## 1. Checklist
Short, sectioned like the catalog. One line per point: `[x]` DECIDED, `[~]` DERIVED (to check), `[ ]` OPEN. Ends with the open points. No reasons; those belong to the concept. Developer agents read this file whole, so keep every line a self-contained fact (stack with version, rule, location).

## 2. Concept
Front matter (type, title, status, created). Sections: purpose and scope · principles with reasons · structure (style, operations) · folder trees backend and frontend (text trees) · modules and relations (Mermaid) · example flow (Mermaid sequence) · decision log table · open points. Every substantive statement carries its status. A "why not X" paragraph for the main rejected alternative (e.g. why no microservices) makes the style decision defensible later.

## 3. Overview graphic (SVG)
Start from `assets/overview-template.svg`. Style rules:
- Gradient rectangles = applications and processes (frontend, backend, database, storage, identity provider).
- White boxes = modules (project or folder), inside their application.
- Dashed = planned for later.
- Arrows carry a label (protocol or purpose).
- Legend covering every symbol used.
Keep text short and spacing generous. Add Mermaid for module dependencies and one example flow where the concept needs them.
