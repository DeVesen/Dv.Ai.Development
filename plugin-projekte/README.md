# Plugin-Projekte

Gemeinsamer Ordner für Projekte der Plugin-Druckerei (`plugins/plugin-druckerei`), je Plugin ein Unterordner `plugin-projekte/<p>`. Das forge-Projekt liegt daneben in `plugin-compiler/`.

Ein Plugin aus `plugins/` wird erst übernommen, wenn das jemand ausdrücklich will, und dann nur dieses eine:

```bash
plugins/plugin-druckerei/bin/druckerei neu plugin-projekte/<p> --aus plugins/<p> --owner DeVesen
```

Wie es danach weitergeht, steht im Skill `plugin-druckerei`, Ablauf C.
