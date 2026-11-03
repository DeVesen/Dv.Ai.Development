<# Befund 3: eine Commit-Form für Spec, Brief der Etappen und Umsetzer. `git commit -- <pfad>` allein kennt eine neue Datei nicht. Die Verbote (git add -A usw.) stehen je Stelle, im Brief nur in der Regeldatei. -#>
`git add -- <pfade>` und direkt danach `git commit -m "<betreff>" -- <pfade>` mit denselben Pfaden
