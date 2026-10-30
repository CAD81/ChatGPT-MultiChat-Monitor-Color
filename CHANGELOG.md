# Changelog

## Unreleased

- Prepare an experimental Zen/Firefox port with a separate Firefox MV3 manifest, event-page audio, promise-based `browser.*` APIs, an offline ZIP builder and checksum verification.
- Add a reversible `[GPTMM:state]` title marker and Zen `userChrome.css` full-tab coloring independent of the browser favicon cache. Preserve the existing monitor, diagnostics, settings and Chromium build.
- Add stable-name Zen CSS export, component/build regression tests and Windows installation instructions. Live Zen compatibility and Mozilla signing remain outstanding.

- Handle an invalidated extension context after Vivaldi reload/update: guard the floating monitor's manifest-version lookup and all content-script preference writes against synchronous errors and rejected promises. Existing ChatGPT tabs still need a manual refresh after saving drafts; no automatic reload was added.
- Correct the content-script diagnostics version to match the packaged 0.4.10 manifest and add regression coverage for invalidated runtime/storage APIs.

## 0.4.10 - 2026-10-29 (Favicon reconciliation reliability)

- Analyzed the user-provided 60-minute/1,467-event v0.4.9 browser log. A total of 110 Finished samples retained a browser-reported Working favicon while the page icon and background monitor both reported Finished.
- Give each real favicon state change a fresh versioned SVG URL to bypass stale browser favicon caching.
- Independently compare the browser's reported favicon state to the page status, and attempt a bounded favicon refresh after two consecutive mismatches. Successful states use 60-second health checks.
- Extend quick and long diagnostics with browser favicon state and repair attempts; no raw tab URLs, chat text, favicon URLs or identifying tab IDs enter reports.
- Align Stop-button diagnostic inventory more closely with the actual working-state detector. Keep Vivaldi CSS file-path matching compatible with URL query strings.


## 0.4.9 - 2026-10-29 (Completion-state reliability and long diagnostics)

- Restrict stale generation markers: only visibly and explicitly busy `aria-busy=true` indicators qualify as active; `generating` / `streaming` testids alone cannot leave Working stuck.
- Preserve the green Finished icon after completion and tab focus instead of automatically acknowledging it to Idle.
- Update content diagnostic script version to match manifest; 0.4.8 had still reported 0.4.7.
- Trace recognized Stop controls inside versus outside the ChatGPT composer to identify false-positive stale Working caused by unrelated buttons.
- Add opt-in 15/60/120 minute multi-tab status recorder that continues after popup closes, including 10-second snapshots, user-marked false Working, recent DOM activity and stale-marker counts.
- Bounded, private, session-only report storage (2,500 events maximum). Only technical status fields are captured. No titles, full URLs, page content or automatic uploads.
- Copy or export a versioned JSON report on demand. Automatic anomaly detection and marker-based root-cause classification; protect existing recordings against accidental overwrite.


## 0.4.8 - 2026-10-29 (Vivaldi tab color settings)

- Added a dedicated **Tab-Hintergründe (Vivaldi)** section to the extension popup.
- Configurable per-status colors stored locally, plus a versioned CSS export with the selected colors.
- Optional explicit cyan-outline CSS-load diagnostic to distinguish missing CSS setup from unsupported Vivaldi tab favicon DOM.
- Documented that native per-tab background colors cannot be changed directly via an ordinary Chromium extension, and require manually installing the CSS and restarting Vivaldi.
- Browser-level per-tab status coloring remains unverified.


## 0.4.7 - 2026-10-29 (Live status diagnostics)

- Added a 10-sample, approximately 10-second interactive status diagnostic in the extension popup, including a copyable technical JSON report.
- Compare local status, monitor state, browser favicon kind, whether the status icon link is last, visible Stop/working indicators, bounded DOM shape counts, and up to 15 recent state transitions.
- The report uses a strict allowlist and excludes conversation contents, tab URLs, chat titles and raw page text; collection is user-initiated and kept only in popup memory.
- Added targeted regression tests for report redaction, false status names, bounded quantities, and layer-specific diagnosis; included helper in the versioned extension ZIP.
- Repackaged the optional Vivaldi CSS as version 0.4.7; the CSS still requires live browser verification and cannot independently detect ongoing generation.


## 0.4.6 - 2026-10-29 (Working detection and diagnostics)

- Widen generation Stop-button discovery beyond buttons with a recognized label/testid to include confirmed prompt-composer icon-only square controls, plus a visible active-generation indicator.
- Keep a brief, bounded evidence grace period during tool/composer transitions so an ongoing response is not prematurely marked Done; manual Stop bypasses the grace.
- Add a privacy-safe, tab-scoped popup diagnostic for the local detector state, monitor state, visible Stop / progress indicators, and actual favicon state.
- Preserve existing tab background coloring and all permissions; no automatic tab reload.
- Add regression fixtures for label-less variants, icon geometry, unrelated recording buttons, and transient missing controls.


## 0.4.5 - 2026-10-29 (Vivaldi tab background colors)

- Improved the optional Vivaldi tab background CSS to handle favicon img srcset, src and inline style attributes.
- Apply full-tab backgrounds for identified active/completed/error/attention and other non-idle states; inactive tabs retain the user's Vivaldi theme.
- Include the custom Vivaldi CSS in the extension ZIP and publish a separately versioned Vivaldi CSS asset under GitHub Releases.
- Add packaging and CSS compatibility regression tests and explicit Vivaldi configuration and diagnostic instructions.
- Status detection and extension browser permissions remain unchanged; live Vivaldi UI compatibility is still unverified.


- Added an automatic GitHub Releases workflow that publishes a version-labelled, installable ZIP when the new main version passes all regression checks.
- Added root-level `VERSION.txt`, matching `manifest.json`, packaging integrity checks, and a SHA-256 checksum file.
- Changed the recommended downloads to this fork's Releases → Assets instead of the unversioned Code → Download ZIP archive.


## 0.4.4 - 2026-10-29 (Visible tab status symbols)

- Redesigned all nine per-tab favicons as high-contrast colored circles with distinct state symbols, including an easily recognizable yellow active and green finished icon.
- Replace only the extension's own favicon link on a state change to make Chromium/Vivaldi refresh the tab icon; preserve ChatGPT's original favicon links and avoid unnecessary DOM mutations when the state is unchanged.
- Added regression tests for favicon replacement, reordering after ChatGPT SPA favicon updates, and all nine SVG assets.
- Updated the README with previews of the actual tab icons. No browser UI CSS or conversation-state detection changes.


## 0.4.3 - 2026-10-29 (ChatGPT DOM compatibility)

- Recognize active responses from ChatGPT's newer unlabeled, square Stop icon inside the composer; retain strict scoping to avoid unrelated controls.
- Recognize common German Stop labels without matching media or sharing controls.
- Add regression tests for the icon-only composer variant, false positives, and the Working-to-Done transition.
- Document manual tab refresh after extension updates and distinguish favicon coloring from experimental full-tab Vivaldi CSS.


## 0.4.2 - 2026-10-29 (Color fork)

- Made the regression workflow manually runnable, pinned Node.js 22, and added syntax checks for new tests to give the fork reproducible CI.

- Added per-chat status favicons for the existing nine monitor states, without changing the original page title or forcing tab reloads.
- Added optional Vivaldi CSS for full-tab state backgrounds; the browser-specific CSS requires a Vivaldi UI test.
- Added regression coverage for icon state mapping, ChatGPT favicon replacement, manifest scope, and CSS packaging.
- Corrected an SVG regression assertion that rejected the standard SVG namespace.
- Updated the upstream manifest security regression for the single restricted SVG resource declaration; escaped apostrophes in the quota matcher for compatibility with the upstream test parser.
- Stabilized Pending regression tests by including the tested tabs in the browser registry fixture.
- Distinguish visible quota/usage-limit failures as red Error instead of blue Retry; preserve Retry for transient network problems.
- Respect manual Pending flags from tab-scoped monitor snapshots and reset them on navigation.
- Branded the fork and redirected release checks to this repository while retaining upstream attribution and MIT license.

## 0.4.1 - 2026-09-25

- Updated Working and Draft detection for the current ChatGPT composer/stop-control DOM: aria-only stop controls such as **Detener la generación** and standalone **Detener** / **Stop** are recognized immediately, and the new textarea name=prompt composer is tracked for Draft.
- Fixed registry rebuilds and a service-worker cold-start race that could briefly publish a partial monitor containing only the active chat. Open tabs receive provisional rows while content scripts initialize, persisted Working runs are preserved, and snapshots are not broadcast until the initial registry is complete.

## 0.4.0 - 2026-09-24

- Added persistent panel resizing from a discreet bottom-right handle, with viewport clamping and a **Reset size** control.
- Added an **Opacity** slider in the popup, adjustable from 35% to 100% and applied live to the floating monitor.
- Added **System**, **Dark**, **Light**, **Cozy**, **Neon** and **Minimal** themes for both the floating monitor and the extension popup.
- Added optional **Dim when inactive** behavior: the monitor uses reduced opacity while the pointer is away and returns to the configured opacity on hover/focus.
- Compact and collapsed modes temporarily use their fixed dimensions and restore the saved custom size when returning to normal mode.
- The monitor now auto-fits its height to the visible chats until you manually resize it; a bottom **Auto size** button returns a custom-sized panel to chat-driven sizing.
- **Auto size** is shown only while the layout is unlocked; locked mode hides the control entirely. Auto-fit now uses the panel's overall height constraint instead of a second list-level cap, preventing spurious scrollbars during state changes such as Working → Done.
- Smart ordering now keeps Error, Retry, Attention, unread Done and manual Pending chats above routine states unless the user has created a manual order.
- Idle chats are shown by default. Added a persistent manual **Pending** state: right-click an Idle LED to mark/unmark the chat. Pending uses a distinct pink LED and remains local to the extension.
- Enlarged the invisible right-click target around Idle/Pending LEDs without changing the visible LED size, and gave Pending a slow 4.5-second pulse that respects the animation toggle.
- Replaced the header's letter-based counters and separate alert badge with compact number circles for Working, Done, Pending and Attention; their fills are now deliberately low-opacity while the numbers keep the state color, and zero-value counters stay hidden.
- Added persistent draggable separators. A header control creates a divider, dragging the divider changes group boundaries, and chats continue to smart-sort by state inside each section.
- Removed the visible `⋮⋮` drag handles: the full chat text area (name + status line) is now the drag target, separator lines drag directly, and the add-separator icon is slightly smaller.
- Improved drag feedback with destination-section highlighting and temporary **Drop here** targets for empty sections. Project drop-after markers now render after the project's last visible chat instead of between its header and first chat. Fixed the By-project chat dragover path so it accepts valid within-project destinations instead of failing before the drop marker is shown.
- Added a short-lived **Undo** action for chat moves and separator changes; it now appears as a compact **↶** control in the monitor header instead of an overlay toast.
- Added **Reset layout** to clear separators, section assignments and manual ordering while preserving aliases, pins, Pending, hidden state and other chat preferences.
- Added **By project** grouping as the default: the extension detects project membership from ChatGPT project routes, canonical URLs and sidebar conversation links, then creates automatic project sections locally.
- Project headers can now be dragged or moved from their section menu to persist a custom project order without moving the underlying ChatGPT projects. Chats can also be dragged to persist an order inside their current project/pin group without changing project membership.
- In **By project**, automatic chat titles no longer repeat the project name when the project header already provides that context; custom aliases remain unchanged.
- Added **Manual / None** grouping modes without discarding existing manual section data when switching modes.
- Added optional manual section names with an understated line–label–line design, inline rename, collapse/expand and collapsed chat counts.
- Added section menus for rename/clear name, collapse/expand, move up/down and delete. Automatic project sections expose collapse/expand without pretending to rename or move the underlying ChatGPT project.
- Project and manual collapsed state is persisted locally and participates in layout Undo/Reset.
- Project section headers now use only the project name, ignoring ChatGPT action labels such as **Abrir proyecto… / Open project…**.
- Added the current extension version to the normal monitor footer while keeping it hidden in Compact mode.
- Working rows now show visible ChatGPT work phases with a continuous active-response timer. Active start/phase timestamps are persisted per conversation and restored across same-page refreshes and extension service-worker restarts; transient Draft transitions preserve the active run instead of restarting its timer.
- Fixed visible **Pensando** phase detection for ChatGPT's shimmer status element and repaired accented Spanish attention wording. Work phases are kept canonical internally and rendered as **Analyzing / Searching / Executing** in English or **Analizando / Buscando / Ejecutando** in Spanish, following the current ChatGPT UI language instead of the detected source label.
- Hardened the monitor boundary against synthetic page events, restricted tab activation to registered ChatGPT tabs and enforced the layout lock in background layout mutations.
- Active runs are now owned by browser tab instead of conversation ID, preventing duplicate instances of the same conversation from clearing or inheriting each other's timers. Temporary new-chat identity is promoted to the assigned conversation ID without resetting the run, and local temporary preferences migrate with it.
- Active-run timing moved to extension session storage instead of long-term local storage. Discarded tabs now drop unverifiable Working runs instead of refreshing stale timers indefinitely.
- Removed periodic state heartbeats and redundant content-script reinjection on ordinary service-worker wakes. Unchanged state updates no longer broadcast a full snapshot to every ChatGPT tab.
- Kept visible chat rows attached across monitor snapshots instead of explicitly detaching and reinserting every row, reducing transient flicker during state changes and duplicate-tab updates.
- Serialized offscreen-audio creation so simultaneous alerts share one document, pruned orphan temporary tab preferences and stopped exposing internal chat/section identifiers through drag payloads.
- Added a persistent open/closed **layout lock** in the monitor header. Locked mode blocks accidental drag/reorder, section editing/collapse, separator creation, panel movement and resizing while leaving normal chat actions available; blocked layout gestures and blocked popup resets now give the closed lock a short visual shake. Normal chat clicks do not trigger it, and the effect respects `prefers-reduced-motion`.
- Done rows now show simply **Done** instead of a continuously updating “Done … ago” age.

## 0.3.0 - 2026-09-19

- Made unread **Done** much easier to distinguish from **Working**: Done now uses a brighter lime LED with a subtle glow and left-edge accent.
- Added a lightweight update checker for manual GitHub installs. It checks stable releases at most once every 24 hours and stores only version/timestamp metadata.
- Added an **Update available** popup card with **View release** and per-version **Dismiss** actions.
- Added a low-priority **↑** extension badge for available updates; chat attention and Working badges still take priority.
- Added a one-time **What's new** popup card after the extension version changes.
- Added a **Draft** state for chats with unsent prompt text. Draft stays visible even when Idle chats are hidden, does not enter recent history, and never overrides Working/Retry/Attention/Error/Done.
- Added the final MultiChat Monitor icon set and wired it into the extension manifest/action.
- Added presentation assets: normal monitor, compact monitor, drag-order and popup screenshots.
- Re-captured the monitor screenshots with transparent surroundings so no ChatGPT page elements leak into the image and the panel's rounded corners remain visible.
- Added two real-UI GIF demos: moving the floating panel across the screen and the pulsing Working LED transitioning to unread Done.
- Added a matching 1280×640 social preview asset.
- Reworked the README into a visual project landing page with screenshots, feature highlights and a state/color legend.
- Refined the README preview layout to avoid oversized GitHub table cells and added the same release/apps and support badges used across the other public projects.
- Final audit: verified that all declared extension permissions are actively used and host access remains limited to `chatgpt.com`.
- A Done chat is now acknowledged on tab activation only when its browser window is actually focused; focusing that window later still acknowledges the active Done chat.
- Normal Done chats keep only a 10-second late-error detection grace window instead of continuing retry/error scans for the entire unread period.
- Updated current documentation and shortcut labels to use the unread Done behavior consistently.
- Expanded the documented static checks to include `offscreen.js`.

## 0.2.7

- Added persistent manual chat ordering by dragging rows with the reorder handle.
- Manual order is saved locally and reused across tabs, reloads and browser sessions.
- Pinned chats remain in the top group; manual ordering applies within pinned/unpinned groups.
- Added **Move up** and **Move down** to the chat menu as a non-drag alternative.
- Added **Reset chat order** in Chat data to return to automatic smart sorting.
- Changed **Done** from a timed state to an unread-style state: it stays green until the user visits that chat.
- Visiting a Done chat through the monitor, browser tab switching or window focus acknowledges it and returns it to Idle.
- If a chat is already active in the focused window when it finishes, it is considered seen immediately instead of remaining green.
- Removed the old configurable Done visibility timer.

## 0.2.6

- Reorganized the popup into compact collapsible sections for Sound alerts, Chat data, Recent activity and Shortcuts.
- Added **Reset position** for the floating monitor.
- Added controls to clear all local aliases or pins independently and restore hidden chats.
- Added configurable Done visibility: 30 seconds, 1 minute, 3 minutes or 5 minutes.
- Done visibility changes apply immediately to an already-finished chat.
- Added state-name hover tooltips to monitor LEDs.
- Increased visual separation between yellow **Retry needed** and orange **Needs attention** indicators.
- Tightened Compact mode further to 214 px, shortens the header label to Monitor and keeps chat-option buttons low-profile until hover/focus.

## 0.2.5

- Changed the default **Done** sound from Off to **Pop**.
- Active generation now takes priority over stale Retry/Error UI left behind after retrying.
- Navigation between conversations clears stale state before detecting the new conversation.
- Discarded or reloading ChatGPT tabs are reset from stale Working state instead of remaining active indefinitely.
- Added a short stabilization delay for Done audio; a late Retry/Attention/Error transition cancels the pending Pop to prevent duplicate alerts.
- Pending Done audio is also cancelled when a tab closes, navigates away or disappears from the registry.

## 0.2.4

- Added local sound alerts for **Done**, **Retry needed**, **Needs attention** and **Error**.
- Added the same sound library used by ChatGPT Completion Sound: Pop, Cash Register, Chan, Potion, Point and Page Turn.
- Added a global sound-alert toggle, per-state sound selectors, volume control and per-state test buttons.
- `Done` is off by default to avoid overlapping ChatGPT Completion Sound; Retry, Attention and Error use distinct defaults.
- Hidden chats do not emit sound alerts.
- Sound playback is event-driven only: no new polling loop was added.
- The offscreen audio document is created on demand and closes after a short idle period.

## 0.2.3

- Added the same **Support** button used by ChatGPT Completion Sound.
- Support opens `https://joelmomo.github.io/#support` in a new tab.
- The button is a static link and adds no background work or extra permissions.

## 0.2.2

- Added **Retry needed** for recoverable timeout, delivery, network and retry states.
- Recoverable errors can now override a recent **Done** when the error UI appears slightly later.
- Added explicit detection for Retry/Reintentar actions and timeout messages such as "Se ha agotado el tiempo...".
- Retry states use an amber/yellow indicator and count as attention in the extension badge.
- Compact mode now uses single-line rows, hides secondary status text and reduces panel dimensions and spacing further.

## 0.2.1

- Fixed aliases, pin and hide preferences colliding between different conversations inside the same GPT.
- Changed the pinned marker from `*` to `📌`.
- Moved chat options to a viewport-level floating menu so it does not expand or get clipped by the monitor list.
- Changed the default monitor shortcut from `Ctrl+Shift+M` to `Alt+Shift+M` to avoid ChatGPT's own shortcut.
- Restored the continuous lightweight Working pulse when animations are enabled.

## 0.2.0

- Added **Needs attention** and **Error** states.
- Added extension badge for working and attention states.
- Added pin, hide and local alias controls per chat.
- Added smart ordering and multi-window tab focusing.
- Added compact mode.
- Added optional one-shot state transition animation.
- Added 24-hour / 100-event local activity history.
- Added keyboard shortcuts for monitor visibility and chat navigation.
- Added popup controls for hidden chats and history.
- Improved detector efficiency with throttled mutation handling.
- Reduced broad fallback scans from every second to every five seconds.
- Removed continuous working animation.
- Paused timer repaint work in hidden tabs.
- Added conservative finish-time attention detection.

## 0.1.0

- Initial prototype.
- Shared state across ChatGPT tabs.
- Working, done, stopped and idle states.
- Live timers.
- Draggable and collapsible overlay.
- Click-to-focus navigation.
