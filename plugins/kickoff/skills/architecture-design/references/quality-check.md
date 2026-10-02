# Quality check before handover

1. **Log match**: every statement in checklist and concept is in the decision log, same wording of the decision.
2. **Status**: label per statement checked; no assumption unlabelled, no OPEN phrased as fact.
3. **Contradictions**: compare checklist against concept (versions, names, folders, module list).
4. **Graphic**: render the SVG and look at the image for overlaps, clipped text, arrows to nowhere; module names match the concept. Without a browser tool, use headless Chrome or Edge: `chrome --headless=new --window-size=1100,720 --screenshot=out.png file:///path/overview.svg`, then view the PNG.
5. **Mermaid**: every diagram parses and renders (browser with network, or `mmdc` if installed); node ids without special characters, labels quoted. If rendering is impossible, check syntax by eye and list the diagram as not rendered in the handover.
6. **Language**: documents in the configured language, terms spelled consistently.

Fix and recheck the affected step. Tell the user what was verified and what was not. Never write "checked" for a step you only assumed.
