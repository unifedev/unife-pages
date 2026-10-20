# Changelog

Derived from the private monorepo's CHANGELOG (`unifedev/unife` 56d101e): the parts that
concern the Claude Code plugin and the server inlined into it. References to `reviews/`, `NOTES.md`, `DESIGN.md`
and branch names are to that monorepo.

## 1.10.3 (bb plugin) — 2026-10-14

The bb plugin's release of the 0.2.4 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.10.3`). What changes for bb is the shell's Back and
Forward fix, from pages-core; no bb host code changed.

## 0.2.4 — 2026-10-14

A shell fix in pages-core (B-0105), so both hosts carry it: `@unifedev/pages-core` 0.2.3, `@unifedev/claude-pages`
0.2.4, the bb plugin `@unifedev/thread-pages` 1.10.3. No protocol change: spec 01 R1.12f, R1.12g and 08 A149 already
say what Back and Forward do; the shell now does it.

### Fixed

- **Back and Forward show the document of the entry they land on.** Opening another document of the page by a link
  pushed a history entry that named the document being left, not the one opened: the shell wrote the entry before the
  new document became its current one. So after a → b → c, Back showed a under the address of b, and Forward showed
  each entry's predecessor (claude-pages 0.2.3 and thread-pages 1.10.2, Chromium and WebKit). Each entry now names
  its own document, query and fragment. Steps faster than the host answers land right too: Back then Forward before
  the host has answered for the middle document used to show that document under the last one's address; the shell
  now compares against the document it is heading to, the newest step wins and a late answer is dropped, and a
  fragment move from the document being left no longer rewrites the new entry. Tests: `packages/pages-core/test/runtime/shell/install.test.ts` (the entries
  a link pushes; fails on 0.2.3's shell) and `pnpm --filter @unifedev/pages-core test:history`, a browser test on the
  reference server that clicks a → b → c?scope=x and steps Back, Back, Forward, Forward and `history.back()` in
  Chromium and WebKit, then the same with a host slow to answer for one document (on 0.2.3's shell 8 of the first
  16 steps fail; all pass now).

### Versions

- `@unifedev/pages-core` 0.2.3; `@unifedev/claude-pages` (`package.json`, `plugin.json`) 0.2.4;
  `@unifedev/thread-pages` 1.10.3.

## 0.2.3 — 2026-10-13

A Claude Code host fix (B-0001). No protocol change, no pages-core change (`@unifedev/pages-core` stays 0.2.2), no
bb host change (no bb release from this tag).

### Fixed

- **claude-pages CLI: output read through a pipe is whole.** `unife-pages guide` (and every other role) exited
  right after writing its answer; on a pipe, as an agent's shell tool reads it, the write is asynchronous and the
  exit dropped all but the first 64 KiB: the guide stopped inside "Capabilities from contributors", so the
  contributors' methods, the errors, what a page cannot do and the limits never reached the agent (98,300 bytes into
  a file, 65,536 through a pipe, 3 of 3 runs on Claude Code 2.1.296). The CLI now exits once stdout and stderr have
  drained. Test: `packages/claude-pages/test/cli/pipe.test.ts` runs the built CLI's `guide`, `status` and `init`
  into a file and through a pipe and compares the byte counts (fails on 0.2.2: 65,536 against 71,332).

### `@unifedev/claude-pages`

- `package.json` and `plugin.json` version 0.2.3.

## 1.10.2 (bb plugin) — 2026-10-11

The bb plugin's release of the 0.2.2 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.10.2`; the marketplace entry's range `^1.3.1` reaches
it). What changes for bb is the built-in home (the hub) and the shell's grants refresh, both from pages-core; no bb
host code changed. Root `pnpm check` on the release commit passes.

## 0.2.2 — 2026-10-11

The built-in home becomes a hub in the host's look. No protocol change, no host code change; reviewed in two design
and three code rounds (findings fixed with tests that fail before each fix).

### Changed

- **The built-in home page is a hub in the host's look** (`packages/pages-core/src/home/builtin-home.html`, still one
  file, only `window.threadPage`). A sidebar of sessions by workspace with state glyphs, unread marks and sub-agents
  folded under their parent; a session opens as its page embedded in the main area or as a chat (transcript, question
  and approval cards, composer with files, Stop); New session is a composer with workspace (Add a folder…), model,
  effort and permission mode; search with an Archived filter; Unsent drafts and Page permissions from the footer;
  phone layout with a drawer; light and dark. Every control is feature-detected from the roster. "Open the page on
  its own" uses `pages.open` in place: a tab opened from the sandboxed home has no reader credential (measured).
  When a host's session list fails validation (`invalid_result`, seen on the Claude daemon: a row with an empty
  workspace id), the hub reads workspace by workspace, keeping each workspace's last good rows and holding its share
  of the budget near 40 calls a minute. The list loads in pages of 50 that halve on `response_too_large` (a page of
  200 real rows is over the 64 KiB bound), with "Show more sessions". In page view a strip says when the session waits
  on you or is not running in its host; a running turn can be steered (`sessions.send` `mode: "steer"`).
  Search reaches every session (it pages through the rest of the host's list while a query is typed). Every call the
  hub makes goes through one budget guard: at most 60 a minute and 4 at once, the reader's own actions first, polls
  paused while the tab is hidden; tests assert the bound over five simulated minutes of the worst cases.
  Tests: `test/agent/home.test.ts`.

### Fixed

- **pages-core shell:** after the reader grants a page the right to answer, the next poll goes without
  `If-None-Match`, so the home's Page permissions list shows the new pair without a reload
  (`src/runtime/shell/poll.ts`, `install.ts`; test in `test/runtime/shell/poll.test.ts`).

## 1.10.1 (bb plugin) — 2026-10-10

The bb plugin's release of the 0.2.1 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.10.1`; the marketplace entry's range `^1.3.1` reaches
it). What changes for bb is U50: `context.get`'s `session.settings` carries the thread's current model, reasoning
level and permission mode as provider ids, read from `threads.defaultExecutionOptions` on `sessions.get`; snapshot
rows carry no `settings` (one SDK call per row per poll is not paid). Review: `reviews/current-settings.md`. Root
`pnpm check` on `main` after the merge (`175a86b`): 101 files, 671 tests passed, 1 skipped.

## 0.2.1 — 2026-10-10

One decision of the owner's (U50, from owner test 4 finding 5: "always my reasoning") in the protocol
`bartsoj/unife-pages` (spec 03 R-C10 and R5.11d, 04 R6.24, 06 R-P2, 08 A191), on branch `current-settings`, reviewed
in `reviews/current-settings.md` (`fb73724`: ship-after CS-1, CS-2; after `b942da6` with CS-1…CS-4 applied: ship) and
merged as `175a86b`. `PROTOCOL_VERSION` stays 1: the new field is optional on both reads. Root `pnpm check` on the
merge: 101 files, 671 tests passed, 1 skipped.

### Added

- **A page reads the session's current settings (U50).** `context.get`'s `session` gains `settings?: { model?,
  reasoningLevel?, permissionMode? }` and `sessions.snapshot` rows the same field: the session's current values as the
  host knows them, in the ids `providers.list` uses; a field the host cannot tell is absent, never guessed. The guide's
  "Settings for the next turn" tells a composer to start from them. `SessionRecord.settings?` on the provider contract
  (06 R-P2); `knownSettings` in `@unifedev/pages-core`'s `serving/bridge/handlers/settings.ts` bounds what is
  projected. On **bb**, `sessions.get` reads
  `threads.defaultExecutionOptions` for all three (snapshot rows carry none: one SDK call per row per poll is not
  paid). On **Claude Code**, the mod reports the model (`$.config.list()`'s alias, `$.session.model()`'s id) and the
  effort from the `Set effort level to …` line any `/effort` prints — the person's in the terminal or its own — at
  hello, on every such line and at each turn's end; the daemon maps them to the roster's ids (an alias the roster
  cannot express, `opus[1m]` or `opusplan`, leaves `model` absent); `permissionMode` is never reported (the only
  config row is the person's default, not the session's mode — probe on 2.1.296, `claude-pages/NOTES.md` "Current
  settings"). The guide: a composer starts from `session.settings`; a field absent there starts with no value
  chosen and travels only when the reader picks one.

### Fixed

- **CS-1 — the person's `/effort` line reaches the record (Claude Code).** The mod took `reasoningLevel` only from its
  own `/effort` run, so a level a page had set stayed reported after the person typed `/effort low` in the terminal —
  the inversion U50 was decided against. Now `noteSettingLine` in `claude-pages/src/mod/bridge-loop.ts` reads every
  `Set effort level to <level>` command-door line, whoever ran the command, and the `session.append` hook posts the
  settings at once on a `Set effort…` or `Set model…` line (the model line only triggers the re-read of
  `$.config.list()` / `$.session.model()`; nothing is parsed from its display name). `/effort auto` leaves the level
  absent (not a roster id).
- **CS-2 — no default stands in for an absent field.** The guide (`@unifedev/pages-core` `agent/guide.ts`, pinned in
  `guide.test.ts`), spec 04 R6.24 and the Claude host statement XC15 now say: a field absent from `session.settings`
  starts with no value chosen — an "as it is now" choice or the control left blank — and the reply carries it only when
  the reader picks a value; never a list's first id, never the provider's `default` (`reasoningLevels` carry none).
- **CS-3 — an alias the roster cannot express leaves `model` absent** (`claude-pages/src/daemon/providers.ts`):
  `opus[1m]`, `opusplan`, `best` and a bare `[1m]` id no longer label the session with its 200k family; the plain full
  id's family is used only for `default` or no alias.

### `@unifedev/pages-core`

- `PAGES_CORE_VERSION` 0.2.1. `domain/capabilities/specs.ts` (the optional `settings` on `context.get`'s session and on
  snapshot rows), `host/provider.ts` and `host/index.ts` (`SessionRecord.settings`, the `SessionSettings` type),
  `serving/bridge/handlers/context.ts`, `handlers/sessions.ts`, `handlers/settings.ts` (`knownSettings`),
  `agent/guide.ts`. Tests: `test/serving/bridge.test.ts`, `test/agent/guide.test.ts`.

### `@unifedev/claude-pages`

- Plugin 0.2.1 (`plugin.json`, `PLUGIN_VERSION`). The mod's `postSettings` (`src/mod/bridge-loop.ts`, `register.ts`,
  `state.ts`; `shared/protocol.ts` `SettingsBody`) and the daemon's `/v1/sessions/:id/settings` route under the
  session's bearer (`daemon/control/api.ts`), `currentSettings` mapping to roster ids (`daemon/providers.ts`), the
  registry entry and `toRecord` (`daemon/registry.ts`, `daemon.ts`). DESIGN §C "Current settings", D-C14; NOTES
  "Current settings" with the 2.1.296 probe. Tests: `test/mod/mod.test.ts` "reports the current settings",
  `test/daemon/control.test.ts` "settings report (U50)". Bundles rebuilt.

## 1.10.0 (bb plugin) — 2026-10-10

The bb plugin's release of the 0.2.0 tree below, under the released identity: package `@unifedev/thread-pages`, plugin
id `thread-pages`, display name "Thread Pages", repository `unifedev/bb-thread-pages`, the Community marketplace entry
`thread-pages`. The owner's decision (`unife-bb-plugin/docs/DECISIONS.md` D47): the switch from the 1.9.0
implementation to this one is a **plugin update** with no backward compatibility, and the version is **1.10.0** —
a minor, so that the marketplace entry's range `^1.3.1` reaches it without a marketplace PR — although the release is
breaking for everything but the pages themselves. Root `pnpm check` on the branch: 102 files, 666 tests passed, 1 skipped. Nothing in `@unifedev/pages-core` or `@unifedev/claude-pages` changes in this release.

### Breaking

- **1.9.0 → 1.10.0 is a different implementation under the same id.** Kept: the pages (`$BB_THREAD_STORAGE/index.html`
  is a file), the five settings by name and value (an unedited 1.9 instruction text reads as the built-in one), the
  contributor RPC methods and the caller id. Gone: `bb thread-page` (the command is `bb pages`), the bar and every
  bar-era behaviour (0.2.0 Breaking below), the `homeSessionId` setting (the home designation is `bb pages home`), and
  every kv row 1.9 wrote: offline copies (`cache:*`), storage pages (`state:*`), grants (`grants:v1`) and the signing
  key (`signing-key:v3`) are **deleted once on the first start** by `src/migrate.ts`, guarded by the marker
  `pages-core:migrated-from:thread-pages-1`, with one `info` line giving the count; `pages-core:*` is never touched. A
  reader is asked for embed grants again once; a page's `storage` starts empty; a link 1.9 minted is re-minted on load.
- **The seed placeholder is `{title}`.** A `pageSeedHtml` from 1.9 carries over by value, but 1.9's `{{TITLE}}` and
  `{{DATE}}` now render literally: edit the seed to `{title}`; there is no date placeholder. A seed equal to one of
  1.0.3–1.2.0's shipped defaults reads as "no seed", like an instruction text equal to a shipped default reads as the
  built-in text (`PAST_SEED_DEFAULTS`, `PAST_INSTRUCTION_DEFAULTS` in `src/settings.ts`: all of 1.9's hashes carried).

## 0.2.0 — 2026-10-09

The round after the `v0.1.0` tag (`fc4681e`, the owner's, 9 October 2026): four decisions of the owner's (U46–U49)
and two of the lead's (U44, U45) in the protocol `bartsoj/unife-pages`, and a fix round from the owner's testing on
Claude Code. Each branch had its independent review before it merged (`reviews/README.md`: `contributor-workspace`,
`fix-round-2`, `reply-settings`, `sign-in`, `no-shell`; each closed with `ship`). The tag is the owner's:
`RELEASE-0.2.0.md` has the commands. Root `pnpm check` on the release tree: 100 files, 652 tests, 1 skipped; the
browser fixtures 01–12 re-run on it in Chromium, WebKit and Firefox under both strategies with 0 unexpected FAIL rows
(`1606d09`).

Fix round 3 (branch `fix-round-3`, merged `a998fec` before the tag): the owner's fourth Claude Code test, 10 October 2026 (`packages/claude-pages/NOTES.md`
"Owner test 4"). No protocol change; `PROTOCOL_VERSION` stays 1. Root `pnpm check` after the merge: 663 tests.

### Breaking

For hosts that mount `@unifedev/pages-core` and for pages that read the shell's envelopes; readers and page authors
see wording and layout changes only.

- **`MountOptions.hostName` removed** (U49, NS-12). The shell draws no "Open in <host>"; both plugins stop passing it.
- **`ShellConfig`** loses `actions`, `hostName`, `notice` and `isHome`; gains `builtinHome` (set by the home route
  alone, NS-1). **`KernelConfig`** gains `swapIdleMs`. **`GrantSummary`** gains `from`/`fromTitle` (the home's list
  covers every pair on the host).
- **`ChromeActionBody` is cut** to `declined` and `revokeGrant` (now with `from?`, accepted under the home's token
  alone); `pin`, `open`, `markRead`, `archive` and `revokeAllGrants` are gone from `/chrome-action` — the home page's
  rows call `sessions.openHost`, `sessions.markRead` and `sessions.archive` as capabilities. `/chrome-action` may
  answer `{ ok: true, opened: false, notice }` (U46).
- **Kernel↔shell protocol** (`@unifedev/pages-core/runtime`): `thread-page:update-available` → `thread-page:update
  { available }`; `thread-page:apply-update` gone (the swap is deferred, not offered); `thread-page:dirty` carries
  `custom`; new `thread-page:typing`, `thread-page:session-state`, `thread-page:draft-discard`,
  `thread-page:grant-revoke`, `thread-page:drafts`, `thread-page:grants`; `thread-page:restore` may carry
  `leftovers`. `UPDATE_OFFER_LABEL` is replaced by `UPDATE_DEFERRED_STATUS`; `FORM_GONE_STATUS` points at the home
  page.
- **The 19th fixed error code, `settings_unsupported`** (U47; `reason: "settings"`, `detail.unsupported: string[]`,
  HTTP 400). `ProviderError.code` gains `unsupported` with `detail`.
- **`providers.list` rows must carry `settings`** (`ProviderChoice.settings: { model?, reasoningLevel?,
  permissionMode? }`, each `"turn" | "session"`); a model may list `reasoningLevels`. `ProviderHost.send` takes a
  fifth argument `settings?: ReplySettings` and returns `settings?: AppliedSettings` (06 R-P3a);
  `SessionRecord.providerId?` names the provider a session runs on.
- **`ContributorHost.workspaceOf(sessionId)` is required** (U44); every `ContributorCall.caller` carries
  `workspace: { id, path, machine } | null`.
- **`sessions.openHost` may answer `{ opened: false, notice }`** (U46) through the provider, the capability and
  `/chrome-action`; a page that treated anything but `{ url }` / `{ opened: true }` as an error must take it.
- **Claude Code contributors declare themselves in `unife-pages.json`** (`{ "contributor": { namespace, process,
  args? } }`, U45); `contributes.namespaces` in a plugin manifest is no longer read.
- **Limits** gain `swapIdleMs` (3 s) and `environmentsPerWorkspace` (64, PC-18); `Placement.slot` is any declared
  slot name.
- **claude-pages' home layout**: `readers.json`, `bootstrap.json` and `kv/` live in the daemon's private directory
  `~/.unife-pages/daemon/` (0700); a 0.1.0 install is moved on the next daemon start (below).

### Upgrade

**Claude Code** (loaded through `CLAUDE_CODE_PLUGIN_DIRS` or `--plugin-dir`): rebuild (`pnpm build` at the root; the
bundles under `plugin/` are committed, so a pull is enough), then `node packages/claude-pages/plugin/bin/unife-pages.js
daemon stop` — the next session starts the 0.2.0 daemon, which on that first start moves the loose `readers.json`,
`bootstrap.json` and `kv/` into `~/.unife-pages/daemon/`, keeping every signed-in reader and the signing key (a loose
copy a 0.1.0 daemon recreated beside it is left and logged, FR-5). Sessions that were running under 0.1.0 keep the old
hooks module until they end; the bridge protocol is unchanged (`PROTOCOL_VERSION` 1). Readers on this machine sign in
with the **Sign in** button on the first page they open (U48); a phone still takes `open --print`. If a 0.1.0 session's
`tool.check` refused the agent its own page root, that is gone: only the socket and `daemon/` are off limits.

**Pages** need no change: the bar is gone, so a page that relied on the bar's title, status line, Update button,
Drafts panel or Reload must show its own (`data-thread-page-session`, `data-thread-page-update`, the forms' status
lines; the guide's "Around your page" says how); `threadPage.version` stays `1`.

### `@unifedev/pages-core`

- **U49 — the host draws no chrome around the page** (branch `no-shell`, the owner's decision; spec 02, 04, 05, 06,
  08; `reviews/no-shell.md`, reviewed `2221f3b`, deltas `582599e` and `35fe99c`, final verdict ship):
  - The bar goes entirely: Home link, visible title, working dot, status line, "Page changed — Update", Pin, Open in
    host, Mark read, Archive, the Grants panel, the Drafts panel, Reload. The frame fills the viewport; `<title>`
    alone carries the session's title. A `#tp-notice` strip at the bottom has no height and no content except while
    the host has a line a dead page cannot show (deleted, expired, stopped reloading, unreachable host, blocked tab,
    voice failure, still loading); the 1 s "Loading the new version…" hint is dropped.
  - Session state and read-only reach the page as attributes the kernel keeps:
    `data-thread-page-session="working|idle"` on `<html>` and on every captured form,
    `data-thread-page-readonly="offline|archived"` on `<html>` (the `<aside>` banner is gone); while the session
    works, the host's `workingLabel` is each captured form's standing status (blank = nothing);
    `Sending…`/`Queued`/`Sent`/notices win while they show and clear on the next state change; read-only text wins
    over all. The shell posts `thread-page:session-state { working, label }` on connect and on each change of the
    poll's working header.
  - The update offer becomes a **deferred swap**: a new revision is swapped at once unless the reader is typing (a
    text control focused and an `input` within `swapIdleMs`, 3 s), a submission is pending, the page holds
    `setDirty(true)` or the confirm dialog / recorder is open; while deferred the kernel sets
    `data-thread-page-update="available"`, fires a `thread-page:update` DOM event and writes "This page has a newer
    version — it appears when you pause typing; your text is kept." into every touched or focused dirty form's
    status (NS-10); the deferred revision is not kept loaded (R2.18a). A hidden tab swaps past typing and dirt, never
    past a pending submission or an open dialog. The same rule inside embeds (the in-embed Update aside is gone).
  - The built-in home page: every row keeps Open in host (a U46 `{ opened: false, notice }` is shown in the row),
    Mark read/unread, Archive; each row lists its grant pairs with Revoke; an **Unsent drafts** section lists what a
    page's shell could not restore (`localStorage` `up:leftovers:<session>`, one entry per field with a stable id,
    read-modify-write, bounded in the session's 1 MiB with a notice; Copy and Discard; NS-3, NS-7). These duties
    ride `ShellConfig.builtinHome`, set by the home route alone — a designated agent page is served as any page and
    sees no other session's drafts (NS-1); `/home?builtin=1` keeps the built-in home reachable. The stale-home notice
    is in the home document (`<p data-thread-page-notice>`); the empty-page sentence is in the empty document.
  - Review fixes: the hold is re-checked after the flush, at `restored` and at the timeout (NS-2); a withdrawn
    revision lets a newer one be announced (NS-4); a newer revision during a load restarts it (NS-5); an edited
    `contenteditable` holds the swap while focused (NS-6); an error status stands across a state change and clears
    on the reader's next input (NS-8); no strip line at a hidden-tab timeout (NS-11); stale bar wording (NS-9); a
    page's `storage`-event reconcile is prune-only, so two tabs of one page converge (NS-14).
  - Guide: a new "Around your page" section with the owner's text; every mention of the bar, the Update button, the
    Drafts panel and Reload replaced; the limits table gains "Swap while typing". `check-neutral` and the bundle
    checks pass. The browser fixtures ran in Chromium, WebKit and Firefox under both strategies with 0 unexpected
    FAIL rows (`test/browser/EXPECTATIONS.md` regenerated). Verified in headless Chromium against a plain page over
    the dev server: the frame fills the viewport with nothing drawn, the working label in the forms' status, the
    deferred swap while typing, the swap after the pause with the text and caret kept, the home page's row actions.
- **U47 — a reply may name the next turn's model, reasoning level and permission mode** (branch `reply-settings`,
  the owner's decision; spec 03 R-C9, R5.41c, 06 R-P3a, 08 A189–A190; `reviews/reply-settings.md`, reviewed
  `562e074`, delta `6dbdf56`, verdict ship): `session.reply` takes `settings: { model?, reasoningLevel?,
  permissionMode? }`, applied to the next turn, never a running one; the result echoes each field's scope. A field
  the session's provider row does not name in `settings`, or a value it does not list, fails the whole call before
  delivery with `settings_unsupported` (`reason: "settings"`, `detail.unsupported`). `permissionMode` is confirmed
  per call like a decision. `providers.list` rows carry `settings` and a model may list its own `reasoningLevels`;
  the guide's "Settings for the next turn" words the control by scope. Review fixes: an embedded refusal carries
  `reason` and `detail`, an empty `settings` is dropped before `pages.answer`, the mode is shown whole in the
  confirmation (RS-5, RS-6, RS-11).
- **U46 — `sessions.openHost` may answer `{ opened: false, notice }`** (branch `fix-round-2`; `reviews/fix-round-2.md`,
  reviewed `6d2a3fe`, delta `f17f191`, verdict ship): passed through the capability (03 R5.31b) and `/chrome-action`
  (05); the shell shows the notice (`[data-tp=action-notice]`, 8 s).
- **U44 — `caller.workspace` in every contributed call** (merge `064adf3` of `contributor-workspace`;
  `reviews/contributor-workspace.md`, reviewed `d1d7797`, delta `cc0af85`, verdict ship): `caller` gains `workspace:
  { id, path, machine } | null`, supplied by the provider through `ContributorHost.workspaceOf(sessionId)`; `null`
  from the home page.
- **PC-17 / PC-18** (from `reviews/pages-core-0.1.0.md`): the model-list cut is stated identically in the guide,
  08 §Limits and 03 ("a longer list is cut to the first N in the host's order, the default kept"); the same bound
  now applies to a workspace's environments (`environmentsPerWorkspace` 64).
- **Regression found by the live checks (`3d6db95`) and fixed on branch `home-tdz`** (`550939a`, merged before the tag
  after its delta review): the built-in home document's `thread-page:grants` / `thread-page:drafts` listeners called
  `render()` before the `let workspaces, sessions` they read, so the home logged `Cannot access 'workspaces' before
  initialization` on load and lost its first grants/drafts render until the sessions watch redrew; the two are
  declared before the listeners.
- `status` no longer says pages link to the built-in home (`c38acfd`); the fake provider reports its real
  instruction slot (`2fa5986`).
- 71 test files, 455 tests.

### `@unifedev/claude-pages`

- **U48 — the daemon signs a loopback browser in on the first click, without a terminal** (branch `sign-in`, the
  owner's decision; `reviews/sign-in.md`, reviewed `0ee5058`, delta `42b8c92`, verdict ship; NOTES "U48"): an
  unauthenticated navigation to `/page` or `/home` on a loopback Host gets the daemon's own one-button page (no
  script, `default-src 'none'`, no-store); its `POST /sign-in` sets the same 30-day cookie in the same tab and lands
  on the page asked for — only for a loopback Host, a loopback peer, no `Forwarded`/`Via`/`X-Forwarded-*`/`X-Real-IP`/
  `CF-Connecting-IP` header (SI-1, SI-10) and `Sec-Fetch-Site: same-origin`, else 403; `to` is printable ASCII only
  (SI-2); a live reader is reused and live sessions are capped at 32 (SI-3). A declared remote origin gets the `open
  --print` instruction instead; the bootstrap path (U30/U37) is unchanged; a fetch keeps the server's 401. The agent's
  `tool.check` denies Bash naming the listen origin as a URL or a `Host:` header, `/sign-in` on a loopback name or
  `unife-pages open` as an invocation (SI-4); `daemon status` lists the reader sessions (when, via, until). Host
  statement: the reader-auth row and XC13; spec 05 R-S8's bootstrap sentence. Verified in Chromium through the
  agent-browser on a second daemon, and against the running daemon on this machine after the merge
  (`test/e2e/screenshots/REPORT.md`, `3d6db95`: the button page with no script, the same tab landing on the home, no
  button on a second visit). The CLI's `open` line says what it is for — a phone or another machine (`c38acfd`).
- **U47**: `model` and `reasoningLevel` as `session` — the mod runs `/model` and `/effort` before the submit once
  idle, a `classic.PreModelSwitch` hook allows its own `requested_model` (RS-14); `permissionMode` absent. The mod
  keeps every delivery id in flight until its ack and runs settings deliveries one at a time, re-checking for a
  running turn (RS-2, RS-3); a `/model` or `/effort` that fails submits nothing — the delivery is acked as failed,
  the daemon logs it, keeps it on the session (`status`, `daemon status`), answers an open call
  `settings_unsupported`, and the person is told in the transcript (RS-4; residual in U47 and XC14); only a `Set …`
  answer counts as the setting taking (RS-17, `8be9423`). `$.command.run` and the hook were verified by a `-p` probe
  on 2.1.295; an interactive session and `--bg` were not.
- **Fix round 2** (the owner's findings; NOTES "Fix round 2"; `reviews/fix-round-2.md`):
  - The agent's `tool.check` no longer refuses the session's own page root: it denies only the control socket (as a
    path) and the daemon's private directory — every spelling of the home with a `daemon` segment or the socket,
    Bash and path tools alike (FR-2, FR-3); its wording names the page root as the agent's (FR-4). The private
    directory holds `readers.json`, `bootstrap.json` and `kv/`; a 0.1.0 install's loose copies are moved there on
    the next daemon start, a copy left beside is logged (FR-5).
  - "Open in Claude Code" on a session live in a terminal shows "This session is already open in your terminal."
    inline instead of a 503 (U46).
  - A Claude Code session inside a bb thread (`BB_THREAD_ID`) gets no page from claude-pages: no instruction section,
    `init` prints SKIP naming the bb thread and `bb pages init` (FR-6), the daemon marks it ineligible; the daemon
    and everything it starts (`claude --bg`, declared contributors) run without the starting session's `BB_*`
    variables (FR-1).
- **U45 — daemon-supervised process contributors** (`contributor-workspace`): a Claude Code plugin declares
  `{ "contributor": { "namespace", "process", "args"? } }` in a `unife-pages.json` in its folder; the daemon
  (`src/daemon/supervisor.ts`) scans installed, enabled user-scope plugins and every `--plugin-dir` a session reports,
  spawns `node <process>` with `UNIFE_PAGES_HOME`, `UNIFE_PAGES_CONTROL_SOCKET` and a per-process token that alone
  may hold the declared namespace, restarts with backoff (1 s → 60 s), and stops it when the plugin goes, is
  disabled, or the daemon stops; `daemon status` lists each.
- **U44**: `workspaceOf` answers with the session's cwd.
- **U49**: `hostName` no longer passed at mount; the home page shows Open in Claude Code alone for a row (no
  archive, read state or pin on this host, XC5).
- The daemon reads its version from `plugin.json` (`daemon 0.2.0 pid …`); the hooks module reports `0.2.0` at attach.

### `@unifedev/claude-pages` — fix round 3, 2026-10-10

- **A reply's model or reasoning level from the page is delivered again in an interactive session.** 2.1.296 answers
  `$.command.run` with `{ text: undefined }` and prints the command's line into the transcript; the 0.2.0 mod read that
  as a refusal ("the command answered no text") and submitted nothing — after `/model` had already switched. The mod
  now takes the line from the transcript (`session.append`, `door: "command"`, up to 0.5 s — two waits fit inside the
  daemon's 1.5 s ack wait, so a refusal still reaches the page's open call), and with no line judges `/model` by the
  session's own model (`$.config.list()`'s `model` row or `$.session.model()`, equality only); `/effort` without a
  line stays a refusal. `Model '<name>' not found` (2.1.296) is a refusal like `Unknown model`. Note: an interactive
  Claude Code saves a `/model` or `/effort` as the person's default for new sessions; a model picked on the page does
  the same.
- **"Open in host" for an ended session opens a terminal again.** The daemon answered a `claude://` Desktop deep link
  when `/Applications/Claude.app` existed; the shell navigates to http(s) and `/`-relative addresses only, so nothing
  happened and nothing was logged. The daemon now opens the window itself (`claude --resume <id>` in the session's
  folder; `claude attach` for a background one), awaits the `osascript`, and when macOS refuses the automation opens
  Claude Code's `claude-cli://open?cwd=…&q=/resume <id>` link (no permission needed; the handler registers on the
  first interactive prompt) and answers `{ opened: false, notice: "… press Enter there." }`; when neither is possible
  the reader gets the command to run and the permission to grant (System Settings › Privacy & Security › Automation).
  An osascript waiting on the permission dialog is one per session and killed after 60 s. Failures are `warn` lines in
  the daemon log. `DaemonOptions.opener` injects the opener in tests.
- **`tool.check` no longer denies a Bash command for a `daemon` directory that is not the home's** (`src/daemon/open.ts`
  beside `~/.unife-pages/daemon.log` was refused as the private directory; the owner's agent could not finish its look);
  the private-path rules match case-insensitively (APFS default).
- `dollar.ts`: `session.model()`, `config.list()`; the `command.run` note says what each host mode answers.

### `@unifedev/pages-core` — fix round 3, 2026-10-10

- `sessions.openHost`: a provider URL the shell cannot navigate to (anything but `/`-relative or http(s)) answers
  `{ opened: false, notice: "This host gave an address the page cannot open." }` and logs a `warn`, instead of
  `{ opened: true }` with nothing happening. The fake provider gains `setOpenHostUrl`.

### Open after this version

- `reviews/reply-settings.md` RS-18/RS-19 and `reviews/sign-in.md` SI-7 (the first look) are notes; XC4 and the
  cookie row's XC12 wait as the owner's host-statement texts (`packages/claude-pages/NOTES.md`).
- The e2e's session side is still a fake mod, not the hooks module in a live Claude Code; Desktop loading is
  unverified (XC6). Two fresh `claude -p` sessions in a neutral project under the standing instruction wrote a
  whole document with one form and nothing about a bar (`verify/scenarios/results/`, `c38acfd`).

## 0.1.0 — 2026-10-09

First cut of the monorepo: one host-neutral server and two host plugins, re-derived from the archived
implementations against the protocol in `bartsoj/unife-pages`, each reviewed before this version was set.
Tagged by the owner as `v0.1.0` at `fc4681e` on 9 October 2026; nothing published.

### What each package is

- `@unifedev/pages-core` (`packages/pages-core`) — the reference server. The domain (tokens, challenges, grants,
  budgets, submissions), the browser runtime (kernel and shell, bundled into `src/generated/`), serving (the page,
  document, file, submit, bridge and home routes), pages, the agent instruction and guide, the built-in home
  page. Knows no host: a host mounts it through the serving, provider and contributor contracts (spec 05–07).
- `@unifedev/claude-pages` (`packages/claude-pages`) — the Claude Code plugin. The hooks module (the mod: a
  `ProviderHost` in process), the daemon (`ServingHost`, the session registry, a durable delivery queue, reader
  auth over a loopback cookie), the bridge between them, and the `unife-pages` CLI for the agent.

### What is verified

- pages-core: 70 test files, 442 tests (Node and jsdom) green; the browser fixtures 01–12 under both file
  strategies (by-url, carried) in Chromium 156, WebKit 27.2 and Firefox 157 with 0 unexpected FAIL rows
  (`packages/pages-core/test/browser/EXPECTATIONS.md`); re-run on the tagged tree after the PC fixes in all three
  engines at once, and the regenerated record is byte-identical to the committed one. `build-runtime --check` and
  `check-neutral` pass.
- claude-pages: 5 files, 34 tests green (one opt-in test, the real `claude --bg`, ran once); `claude plugin
  validate` passed; the loopback end-to-end (`test/e2e/EXPECTATIONS.md`): the built daemon with the core inlined,
  fake sessions attached through the control socket as a bridge would, fixtures 01, 06, 11 and 12 in Chromium,
  WebKit and Firefox with 0 unexpected FAIL rows; and a real `claude -p` probe recorded in its NOTES.
- echo-contributor: 13 tests green through both hosts' loaders; `claude plugin validate` passed with two
  warnings (`contributes` is the field the claude-pages daemon reads for namespaces; no author).

### What the host statements mark absent

- Claude Code (`unife-claude-plugin/HOST-STATEMENT.md`): no transcription, Dictate hidden (XC1); a reader's file
  reaches the agent as a path, not a native attachment (XC2); workspaces derived from cwds, no browsing or
  creating folders (XC3, XC5); no `sessions.archive`, `markRead` or pin (XC5); plan approval and elicitation are
  waits of kind `other`, answerable in the terminal only (XC8); `--bg` sessions start queued turns late (XC7).
  Two statement texts are prepared in `packages/claude-pages/NOTES.md` and wait for the owner: XC4
  (`sessions.stop`) and the cookie row with the new XC12 (`SameSite=None` on the file route).

### Open, from the reviews' deltas (`reviews/`)

- pages-core (delta: ship): the spec amendment PC-15 records — `unife-pages` 03 §`pages.answer` gains
  `form.action?` and 05 R2.32 names the submitter's value — before the guide is generated from the roster.
- claude-pages (delta: ship): CP-8 and CP-16, the owner's texts above; the minors CP-19–CP-22 are applied on
  `main` (`09ae796`). The e2e's session side is a fake mod, not the hooks module in a live Claude Code.
- The core's `providers.list` fix (`20f809c`) has its delta review appended to `reviews/pages-core-0.1.0.md`
  (verdict: ship). Its two follow-ups for the next round: PC-17, say in the guide row, 08 §Limits and DESIGN §E.4
  that a longer catalog is cut to the first N in the host's order with the default kept; PC-18, the same bound for
  `workspaces.list`'s environments (unreachable on both known hosts).
