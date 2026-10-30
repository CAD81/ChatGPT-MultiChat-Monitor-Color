# Zen Browser (Windows): ChatGPT MultiChat Monitor Color

Diese Variante basiert auf dem bestehenden Monitor, verwendet aber die Firefox-WebExtensions-APIs von Zen. Die Chromium-/Vivaldi-Variante bleibt erhalten.

## Was die Zen-Version anders macht

- Firefox Manifest V3 mit \`background.scripts\` statt Chromes \`background.service_worker\`.
- \`browser.*\` mit Promises statt \`chrome.*\` in den gebauten Skripten.
- Audiowiedergabe in der Firefox-Hintergrundseite statt Chromes \`offscreen\`-API. Ob Zen die Wiedergabe ohne vorherige Benutzeraktion erlaubt, muss praktisch geprüft werden.
- Ein zusätzlicher Inhaltsskript-Baustein \`zen-tab-title.js\` setzt am Ende des ChatGPT-Titels bei aktivem Status ein Kennzeichen wie \`[GPTMM:working]\`. Die CSS findet so den **einzelnen** Tab, unabhängig davon, was der Favicon-Zwischenspeicher meldet.
- Die bereits vorhandene Statuserkennung, der schwebende Monitor, Einstellungen, Langzeitdiagnosen, History und Tastenkürzel werden aus dem gemeinsamen Quellcode übernommen.
- Ein *separates*, dauerhaftes \`chatgpt-multichat-monitor-color.css\` wird nur bei geänderten CSS-Regeln oder Farben ersetzt. Keine CSS-Datei pro Erweiterungsversion.

**Nicht bewiesen:** Die native Zen-Tabstruktur kann sich zwischen Browser-Versionen ändern; die CSS-Auswahl ist noch nicht auf dem Rechner des Benutzers getestet. Der Port repariert nicht automatisch alle bestehenden Fehler der ChatGPT-Statuserkennung.

## 1. Paket offline auf Windows erstellen

1. In GitHub den Branch \`feature/zen-firefox-port\` auswählen.
2. **Code → Download ZIP** wählen und das Quellcode-Archiv entpacken.
3. Den entpackten Hauptordner öffnen. Darin müssen \`manifest.json\`, \`zen/\` und \`scripts/\` direkt liegen.
4. **Einfachste Möglichkeit:** Datei `zen\\Build-Zen.bat` doppelt anklicken. Alternativ in der Windows-Eingabeaufforderung in den Hauptordner wechseln und ausführen:

   \`\`\`bat
   py scripts\build-zen.py
   \`\`\`

   Alternativ \`python scripts\build-zen.py\`.

5. Im Unterordner \`dist\` liegen danach das **fertige, unsignierte Zen-Testpaket** \`ChatGPT-MultiChat-Monitor-Zen-v0.4.10.zip\`, die Datei \`chatgpt-multichat-monitor-color.css\` sowie SHA-256-Prüfsummen.

**Wichtig:** \`Code → Download ZIP\` ist der *Quellcode*, nicht das installierbare Zen-Paket. Das Skript paketiert lokal und startet keine GitHub Actions.

## 2. Zen-Erweiterung temporär installieren

1. Zen öffnen und \`about:debugging#/runtime/this-firefox\` aufrufen.
2. **Temporäres Add-on laden** auswählen.
3. Die gerade erstellte Datei \`dist\ChatGPT-MultiChat-Monitor-Zen-v0.4.10.zip\` wählen. Falls Zen kein ZIP annimmt: die ZIP entpacken und darin \`manifest.json\` auswählen.
4. \`https://chatgpt.com\` öffnen oder betroffene offene ChatGPT-Tabs **nach Sicherung ungesendeter Texte** mit F5 neu laden.
5. Die Erweiterung über das Symbol der Erweiterungen / Einstellungen öffnen. Sie heißt **ChatGPT MultiChat Monitor Color (Zen)**.

Ein nicht von Mozilla signiertes Add-on kann auf regulärem Firefox/Zen nur für die aktuelle Browsersitzung temporär geladen werden. **Nach einem Zen-Neustart muss es erneut geladen werden.** Für eine dauerhafte Installation ist später eine Mozilla-signierte XPI erforderlich. Keine Veröffentlichung oder Anmeldung bei Mozilla wurde vorgenommen.

## 3. Vollständig eingefärbte Zen-Tabs aktivieren

1. In Zen \`about:config\` öffnen und \`toolkit.legacyUserProfileCustomizations.stylesheets\` auf \`true\` setzen.
2. \`about:support\` aufrufen und **Profilordner öffnen** auswählen.
3. Im Profilordner den Unterordner \`chrome\` erstellen, falls er noch nicht existiert.
4. \`dist\chatgpt-multichat-monitor-color.css\` in den Ordner \`chrome\` kopieren.
5. In \`chrome\userChrome.css\` **ganz am Anfang vor anderen CSS-Regeln** diese Zeile einfügen:

   \`\`\`css
   @import url("chatgpt-multichat-monitor-color.css");
   \`\`\`

   Falls \`userChrome.css\` fehlt, neu anlegen. Eine bestehende Datei und andere Modifikationen **nicht löschen oder überschreiben**.
6. Zen vollständig beenden und neu starten. Die temporäre Erweiterung wie oben erneut laden.

Statusfarben: **Gelb** = arbeitet, **Grün** = fertig, **Rot** = Fehler; weitere Statusfarben sind in der CSS definiert. Bei \`idle\` bleibt das Browserdesign bestehen. An der Tab-Titelzeile ist währenddessen ein Kennzeichen wie \`[GPTMM:finished]\` als Suffix zu sehen; das ist die technische CSS-Brücke.

Um eigene Farben zu verwenden, im Erweiterungs-Popup **Tab-Hintergründe (Zen)** öffnen, Farben wählen und **Zen-CSS herunterladen**. Die bestehende Datei im Profil-\`chrome\`-Ordner ersetzen, **nicht** die \`userChrome.css\` selbst. Anschließend Zen neu starten.

## 4. Gezielter Funktionstest

1. Zwei ChatGPT-Tabs öffnen. In Tab A eine längere Frage stellen.
2. Prüfen, ob an dessen Titel \`[GPTMM:working]\` erscheint und der komplette Eintrag gelb ist.
3. Nach Antwortende muss \`[GPTMM:finished]\` und **Grün** erscheinen. Tab B soll seine eigene Farbe behalten.
4. Falls die Titel-Markierung korrekt ist, aber keine Farbe erscheint: im Popup den **sichtbaren CSS-Ladetest** einschalten, CSS erneut exportieren, Datei austauschen und Zen neu starten. Türkise Umrandung bedeutet: CSS wird geladen, aber die Statuszuordnung braucht weitere Anpassung.
5. Falls das Kennzeichen falsch oder gar nicht erscheint: Die Fehlersuche muss bei Statuserkennung / Inhaltsskripten beginnen. Dafür im Popup die 15-/60-/120-Minuten-Diagnose verwenden und nur die technische JSON-Datei teilen.

## 5. Tests und Grenzen

Lokale Entwicklerprüfungen:

\`\`\`sh
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_zen_builder.py"
python scripts/build-zen.py
\`\`\`

Diese Tests laufen **außerhalb GitHub Actions**. Der Zen-Build muss vor einer offiziellen Freigabe zusätzlich in einem echten Zen unter Windows geprüft werden: Popup, Monitor, Farben, Titeländerungen, Tab-Reihenfolge, Diagnose und optional Audio.

Die URL und der Chattext werden durch die CSS-Brücke nicht an externe Dienste übertragen. **Das sichtbare Tab-Titel-Suffix ändert jedoch zeitweise den Seitentitel**; andere browserinterne Funktionen oder Erweiterungen können das beobachten. Eine standardisierte API zur direkten Einfärbung einzelner nativer Tabs stellt Zen nicht bereit.

Keine GitHub Actions oder kostenpflichtigen Dienste werden für den Build verwendet.
