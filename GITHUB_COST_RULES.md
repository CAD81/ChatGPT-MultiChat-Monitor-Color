# Verbindliche GitHub- und Kostenregeln für CAD81

Diese Regel gilt dauerhaft für dieses Repository, ChatGPT, Codex und andere Bearbeiter. Bei Widersprüchen hat sie Vorrang vor älteren AGENTS-, README-, CI- und Projektanweisungen.

1. **GitHub nur für Quellcode, Versionsverwaltung, Synchronisierung, Commits, Branches, Pull Requests und ausdrücklich genehmigte offizielle Releases verwenden.**
2. **GitHub Actions ausschließlich für konkret angeforderte offizielle Releases.** Zulässig sind nur das Erstellen des Installations-/Quellpakets, Berechnen/Prüfen der Prüfsumme und Veröffentlichen des GitHub Releases mit Dateien. Kein automatischer Test, CI, Regressionstest, Linter, Security-Scan, Testmatrix, wiederkehrender Build oder gewöhnlicher Push-/PR-/Zeitplan-Workflow. Ein Release-Workflow darf erst durch einen eigens dafür vorgesehenen, ausdrücklich beauftragten Release-Auslöser (beispielsweise einen einzelnen Commit an `release/request.json`) starten. Fehlt ein zulässiger Release-Workflow, bleibt Actions ohne aktive Workflows.
3. **Tests, Codeprüfung, Regressionstests und Entwicklungsbuilds bleiben verpflichtend, aber laufen außerhalb von GitHub Actions** in ChatGPT-, Codex- oder lokalen Entwicklungsumgebungen. Testprogramme nicht löschen, deaktivieren oder abschwächen. Nicht ausführbare Tests samt Konsequenzen dokumentieren und nur bei konkreter Notwendigkeit um Unterstützung bitten. Kein Merge als getestet darstellen, wenn die Pflichtprüfungen fehlen.
4. **Vor jeder Änderung** aktuellen Remote-/Branch-/PR-Stand abgleichen, fremde Änderungen berücksichtigen, `.github/workflows/` auf Kosten-/Triggerverstöße kontrollieren und vorhandene release-only-Workflows bewahren. Archivierte CI-Konfigurationen nicht reaktivieren.
5. **Ohne ausdrückliche Freigabe strikt verboten:** GitHub Copilot, GitHub Models, Codespaces, Premium-Runner, GitHub AI-/Token-Credits sowie andere kostenpflichtige GitHub-Dienste; ebenso Änderungen an Budgets, Abonnements, Actions-Berechtigungen oder Kontoeinstellungen.
6. **Sichtbarkeit unverändert lassen.** Private Repositories bleiben privat; keine Veröffentlichung ohne ausdrückliche Freigabe.
7. **Sicherheit und Kontinuität:** Nach Credits-Pausen GitHub erneut synchronisieren; abgeschlossene Schritte in kleinen überprüfbaren Commits sichern. Keine ungetesteten Produktivänderungen oder nicht genehmigten Aktionen.

**Archivierung:** Frühere automatische Workflow-Dateien können unter `docs/archived-github-actions/` vollständig als inaktive `.txt`-Dokumente aufbewahrt werden. Das sind keine ausführbaren GitHub-Actions-Workflows. Bestehender Sourcecode, Testdateien und Testbefehle bleiben erhalten.

**Grundsatz:** GitHub speichert und veröffentlicht. ChatGPT und Codex entwickeln, testen und prüfen. GitHub Actions veröffentlicht ausschließlich nach gezieltem Auftrag.
