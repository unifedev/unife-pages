# Changelog

Derived from the private monorepo's CHANGELOG (`unifedev/unife` f222811): the parts that
concern the Claude Code plugin and the server inlined into it. References to `reviews/`, `NOTES.md`, `DESIGN.md`
and branch names are to that monorepo.

## 1.13.1 (bb plugin) — 2026-10-28

The bb plugin's release of the 0.5.1 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.13.1`): Stop on the page's own agent works at the
first Confirm while the agent saves, a Copy button works in Chrome and other Chromium browsers, and a document
whose own query names `file` opens as that document, from pages-core.

## 0.5.1 — 2026-10-28

Three fixes in pages-core, so both hosts carry them: Stop on the page's own session works at the first Confirm while
the agent saves (B-0120): spec 03 R5.28, 05 R2.13, R3.19, 02 R-K1, 08 A15, A49, 04's guide. A page may write the
clipboard on the reader's press in every browser (B-0133): spec 05 R3.3b, 02 R4.43, 08 A94; fixture 09. And a
document whose own query names `file` opens as that document on bb (B-0140), as 01 R1.12g already said.

`@unifedev/pages-core` 0.5.1, `@unifedev/claude-pages` 0.5.1, the bb plugin `@unifedev/thread-pages` 1.13.1.

### Fixed

- **Stopping the page's own agent works at the first Confirm while the agent saves.** When the agent saved its page
  while the reader looked at the Stop dialog, or in the moment between a save and the page updating, the confirmed
  Stop was refused `stale_page` and the turn kept running; a retry from the updated page was refused too. A stop of
  the page's own session now does not depend on which version of the page is open: the reader still confirms it, in
  the host's own words, and its confirmation still holds for that one request, once and briefly. A stop of another
  session, and every other call, is still refused `stale_page` once the page changed. The guide also says that a
  page with `onPageUpdate` is handed its new version rather than reloaded. Tests:
  `packages/pages-core/test/serving/bridge.test.ts` (§11a).
- **A Copy button in a page works in Chrome, other Chromium browsers and the bb desktop app.**
  `navigator.clipboard.writeText()` on the reader's click was refused in Chromium-based browsers, in the page and in
  any page shown inside it, while Safari and Firefox copied. The page frame and every frame the kernel shows now carry
  `allow="fullscreen *; clipboard-write *"`, so a click copies there too (measured in Chromium, WebKit and Firefox on
  both hosts, and in Chrome and the bb desktop app's Browser tab on bb). A write without the reader's recent click, in that
  frame or in a frame inside it, is still refused in every browser measured, and a page still cannot read the
  clipboard. A page that shows another page inside it can write the clipboard in the seconds after the reader clicks
  inside the page it shows, as Safari and Firefox already allowed. Tests:
  `packages/pages-core/test/runtime/shell/swap.test.ts`, `test/runtime/kernel/embed.test.ts`, and fixture 09 in
  Chromium, WebKit and Firefox.
- **On bb, a document whose own query names `file` opens as that document.** A link, `pages.open` or a typed page
  address to `tool.html?file=report.pdf` showed the file `report.pdf` in the frame instead of `tool.html`, and on
  every host a `file` typed as a further parameter of the page address (`&path=tool.html&file=report.pdf`) was
  dropped. The document now opens with `?file=report.pdf` as its own query, as with any other name the host does not
  use itself (`session`, `path`, `render`), and keeps it when the page updates; the page's own files still load as
  before. Claude Code opened the document already but lost its `file` at the page's next update. Tests:
  `packages/pages-core/test/serving/routes.test.ts` (the document route, B-0140).

### Tests

- **The browser fixture runner no longer counts a fixture that stopped early as a pass** (B-0144). It read a fixture
  until its rows had not changed for 2.5 s, and fixture 03's frame check waits silently for just as long, so a timer a
  little late ended the read after R4.13 with no FAIL. A fixture that declares a complete row (01–06) is now read until
  that row comes; one that never records it gets a FAIL row of the runner's own and the run exits 1. Nothing a page or
  a reader sees changes. Tests: `packages/pages-core/test/browser/runner.mjs` (`pnpm test:runner`).
- **Fixtures 08–15 now declare their complete row, and the runner fails a fixture with rows that does not**
  (B-0146). They declared none, so their reads still ended on the 2.5 s quiet spell: fixture 10's check
  that this host's page, framed by its own URL, never answers as a page waits 3 s in silence and had never been read.
  It now is (PASS in every engine and strategy). The runner's own FAIL for a fixture cut short, or one that declares no
  complete row, has its own row id (`runner-complete`) that no `known.json` entry can waive; `--known <file>` points
  the runner at another list. This repository's own copies of fixtures 08, 11 and 12, which the Claude Code host's
  end-to-end test reads, gain the same rows. Nothing a page or a reader sees changes. Tests: `pnpm test:runner`, run whenever the
  runner changes (it needs a Playwright browser, so `pnpm check` leaves it out).

## 1.13.0 (bb plugin) — 2026-10-28

The bb plugin's release of the 0.5.0 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.13.0`): a page shows a document it holds as a frame
of its own session, which works as the page itself, and `pages.open` opens another page at a document and a place,
from pages-core.

## 0.5.0 — 2026-10-28

Two changes in pages-core, so both hosts carry them: a frame of the page's own session is the page (B-0136): spec 02
R4.42a, R4.48a (R4.44, R4.48–R4.53 now about another session's page), 03 R5.59a, 05 R2.32, 04's guide, 08 A101,
A104, A131, A205; fixture 15. And `pages.open` takes a document and a fragment (B-0135): spec 03 R5.29b, R5.32b,
01 R1.12d, 08 A206.

`@unifedev/pages-core` 0.5.0, `@unifedev/claude-pages` 0.5.0, the bb plugin `@unifedev/thread-pages` 1.13.0.

### Added

- **A page can show a document it holds, and that frame works as the page.** `threadPage.embed(target, { html,
  scope, title, onState })` shows `html` in a frame with the page's own kernel and its plugins' page scripts in front
  of it; `scope` is the folder its calls are about, `title` names it in its form answers. Inside it everything works
  as on the page: forms upload their files to `uploads/`, text areas offer Attach (and Dictate where the host has
  voice), a voice-note input records, every capability the page may call works with `files`, under the host's own
  confirmations and the page's own budget, `storage` and plugin calls carry the frame's scope, and the frame may embed
  further, up to 4 frames deep. Its form answers reach the page's own session worded `The user answered the form in
  <title> on your Thread Page — <form title>.` The page's kernel passes everything the frame sends to the host as the
  page's own, so the frame cannot name another session. Its links resolve as the page's; its relative images, styles
  and scripts load from the page's folder on Claude Code, which serves files by URL, and not on bb, which carries a
  page's files inside it: there a frame inlines them or names them absolutely. A plugin's page script runs inside each
  such frame too; the kernel's `data-config` says `embedded: true` there. Tests: `packages/pages-core/test/runtime/kernel/embed.test.ts` (the frame and
  its relay), `test/serving/submit.test.ts` (the answer), `test/runtime/protocol.test.ts`,
  `test/runtime/shell/submit.test.ts`, and fixture 15 in Chromium, WebKit and Firefox.
- **`pages.open` opens another session's page at one of its documents and at a place in it.**
  `pages.open({ sessionId, path: "notes.html", fragment: "results" })` opens that page at `notes.html`, scrolled to
  `#results`, in place, and Back returns; `path` may carry the document's query (`"tool.html?scope=a"`), as the page's
  address does. A link to another session's page address with `&path=…#…` now lands there too, where it opened the
  page's entry before; such a link whose `path` is not a document of the page (a part, a file that is not HTML) or whose
  fragment the call refuses now does nothing, where it opened the entry. A `path` that is not a document of a page (a part, `uploads/`, outside its folder, a query using
  the host's names `session`, `path` or `render`), a fragment with `#`, whitespace or control characters or over 2,048
  characters in the address, and either field beside `home` are `invalid_params`; whether the
  document exists is the opened page's to show. Tests: `packages/pages-core/test/serving/bridge.test.ts`,
  `test/domain/scope.test.ts`.

## 1.12.1 (bb plugin) — 2026-10-28

The bb plugin's release of the 0.4.1 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.12.1`): a link to another session's page or to the
home opens it in place, from pages-core.

## 0.4.1 — 2026-10-28

One change in pages-core, so both hosts carry it: a link to the host's own page address opens that page (B-0134):
spec 02 R4.15, 03 R5.32b, 04's guide, 08 A204.

`@unifedev/pages-core` 0.4.1, `@unifedev/claude-pages` 0.4.1, the bb plugin `@unifedev/thread-pages` 1.12.1.

### Fixed

- **A link to another session's page, or to the home, opens it.** An ordinary `<a href>` to the host's own page
  address — `…/page?session=<id>` or `…/home`, on any origin the reader reaches the host at — did nothing: the
  kernel sends every link outside the page to `navigation.openExternal`, which refuses the host's own origins, and
  the refusal was silent. The host now answers such a call as `pages.open` with that session (or the home): in
  place, with no dialog, the back button returning, and with `pages.open`'s own refusals (a deleted session is
  `not_found`). It works the same from a page opened on its own and from one shown inside another, on both hosts.
  Any other address of the host is still refused before a dialog, and other sites are still asked about first. A
  `path` or fragment in such a link is not carried yet: the page opens at its entry. Tests:
  `packages/pages-core/test/domain/scope.test.ts` (the address) and `test/serving/bridge.test.ts` (the dispatch).

## 1.12.0 (bb plugin) — 2026-10-25

The bb plugin's release of the 0.4.0 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.12.0`): contributed calls and page storage inside an
embed, the built-in home listing every project's sessions, and `pages.open { home: true }`, from pages-core.

## 0.4.0 — 2026-10-25

Three changes in pages-core, so both hosts carry them:
- inside an embed, contributed calls and page storage work for the embedded session (B-0124): spec 02 R4.48, 03
  R5.18a, 04's guide listing, 05 R3.25 and its threat table, 07 R5.49, 08 A99 and A200, decision U56;
- the built-in home lists every workspace's sessions (B-0123): spec 03 R5.12a, 08 A201, decision U57;
- a page can send the reader to the host's home (B-0126): spec 03 R5.29a, 05 R2.15 and R-S12, 08 A173 and A202,
  decision U58; and a page shown in the home may make 60 calls a minute (02 R4.49, 08 A203, decision U59).

`@unifedev/pages-core` 0.4.0, `@unifedev/claude-pages` 0.4.0, the bb plugin `@unifedev/thread-pages` 1.12.0.

### Changed

- **Inside an embed, a page's contributed capabilities and its `storage` work for the embedded session.** Shown in
  the built-in home's page view, or by a page of its own session, an embedded page calls its contributors'
  capabilities (e.g. `syns.*`) and `storage.get`, `storage.set` and `storage.setMany` as it would on its own address:
  the contributor is called with the embedded session, its workspace and the document's scope as caller, and storage
  is the embedded session's own. Shown inside another session's page, it gets its contributors' reads only; its
  storage and contributed writes answer `unavailable`, since that page could otherwise act as any session it reads. A
  page whose contributor's page script shows something else in place of the page (a Syns repository's workspace)
  therefore looks and works the same in the home and on its own address, and shows the same inside any page. The
  embedding page's kernel relays each such call with the embed's answer token, which the host checks was issued to
  that page; the calls count toward the embed's 30 a minute. `context.get` inside an embed lists what works there.
  Until now all of them were refused inside an embed with `unavailable`. Tests:
  `packages/pages-core/test/serving/contributed.test.ts` and `test/serving/storage.test.ts` (inside an embed),
  `test/runtime/kernel/embed.test.ts` (the relay), `test/runtime/protocol.test.ts`.
- **A session started from the home stays open.** It is no longer shown as "This session is not listed" after 30 s
  when the list has not caught up: its workspace is read at once, and the home says it is not listed only once the
  host answers that it is gone. Tests: `packages/pages-core/test/agent/home.test.ts`.

### Added

- **`pages.open({ home: true })` sends the reader to the host's home.** Beside `{ sessionId }`, it navigates the
  reader's view in place to the host's home address: the page designated as home while there is one, otherwise the
  built-in home page; Back returns. A page cannot reach the home any other way (top navigation is sandboxed, and
  `navigation.openExternal` refuses the host's own addresses), and a page that remembered the designated session's id
  broke when the home changed. Inside an embed it works right after the reader acts in it, as `pages.open` does.
  `{ sessionId }` and `{ home: true }` together, or neither, is `invalid_params`. Tests:
  `packages/pages-core/test/serving/bridge.test.ts`, `test/runtime/kernel/embed.test.ts`.
- **A page shown in the built-in home may make 60 calls a minute, not 30.** The home's main view is the page the reader
  opened there; at 30 a Syns workspace answered "Didn't open: rate_limited" when the reader flipped through files
  quickly. Elsewhere an embedded page keeps 30 a minute. Spec 02 R4.49, 08 §Limits (`homeEmbedCallsPerMinute`) and
  A203, decision U59. Tests: `packages/pages-core/test/runtime/kernel/embed.test.ts`.

## 1.11.0 (bb plugin) — 2026-10-23

The bb plugin's release of the 0.3.0 tree below under the released identity (`@unifedev/thread-pages`, plugin id
`thread-pages`, repository `unifedev/bb-thread-pages`, tag `v1.11.0`): contributors' page scripts, asked over the
plugin RPC `threadPagesPageScript`; `threadPage.onPageUpdate`, a page stopping its own session once the reader
confirms, and the shorter standing instruction, from pages-core.

## 0.3.0 — 2026-10-23

Four contract changes in pages-core, so both hosts carry them:
- contributors' page scripts (B-0111): spec 07 §A page script (R5.87–R5.94), 02 R4.1, 06 `contributors.pageScript`,
  08 `pageScriptBytes`, `pageScriptMs` and A192–A196;
- a page that shows its own new version (B-0112): spec 02 R4.66 and R4.33, 05 R2.18, R2.18c and R2.10's port note,
  04's guide listing, 08 A197–A199 and fixture 14;
- a page may stop its own session once the reader confirms (B-0113): spec 03 R5.28, 08 A49, decision U52;
- a shorter standing instruction (B-0114): spec 04 §The text, §It MUST convey, R6.17, R6.24 and A56, decision U54.

`@unifedev/pages-core` 0.3.0, `@unifedev/claude-pages` 0.3.0, the bb plugin `@unifedev/thread-pages` 1.11.0.

### Added

- **A contributor can give the documents a host serves a script of its own.** A contributor that declares
  `pageScript: true` is asked, each time a document is served (the page at its own address, and a page another page
  reads with `pages.read`), with the served session and its workspace (`null` on the built-in home), the document's
  path and the version the host already holds: `{ caller, documentPath, have } → null | { version, script? }`. Its
  script goes in right after the kernel, as `<script data-thread-page-contributor="<id>">`, ahead of the page's own
  scripts, in the host's contributor order. The text is held per contributor and version, so it crosses once per
  version; a script over 256 KiB, or one containing `</script` or `<!--`, is refused whole and logged; a contributor
  that does not answer within 2 s, throws or answers a wrong shape is left out of that serve and logged once. A
  contributor that does not declare the key is never asked: with none, every document is served exactly as before.
  bb: the plugin RPC `threadPagesPageScript`. Claude Code: a process gets `{ namespace, kind: "pageScript", … }` at
  its registered endpoint; a mod passes a third argument to `$.pages.contribute(declaration, handler, pageScript)`.
  The guide names a contributor that gives documents a script. Tests:
  `packages/pages-core/test/serving/page-scripts.test.ts` (who is asked, the order, home and embeds, the cache, the
  refusals, the time bound), the injection in `test/domain/document.test.ts`, each host's glue.
- **`threadPage.onPageUpdate(callback)`: a page that shows its own new version is handed it instead of being
  swapped.** While a callback is registered, a save of the shown document no longer loads a new frame: when the swap
  would have come (after the reader pauses typing, a sending form finishes, a dialog closes, or the page clears
  `setDirty`), the shell fetches the new page and the callback gets `{ html, revision, documentPath }`, `html` being
  the page as served without the host's own scripts (the kernel, the contributors' page scripts, an injected
  `<base>`). The document keeps its state, and its calls and answers are from then on written against the new
  revision, under the renewed action token. It returns a stop function; a callback that throws is logged and called
  again on the next save; a hand-over the document does not take within 4 s, or a page the shell cannot fetch, is a
  swap as before. Another document, Back and Forward and reloads load as before. An embedded page that calls it is
  kept current in its embed the same way. A page that never calls it is swapped exactly as before. The guide lists it.
  Where own files are served by URL (Claude Code), the handed page names each of its own files with the file's
  version in the address (`big.png?pages-v=…`), so an image, stylesheet or script the agent changed under the same
  name shows its new version in the page that stays; `pages.read` does the same there, for embeds.
  Tests: `packages/pages-core/test/runtime/kernel/page-update.test.ts`, `test/runtime/shell/page-update.test.ts`,
  the embed cases in `test/runtime/kernel/embed.test.ts`, `test/pages/inline.test.ts`'s versioned own files;
  fixture 14 in the browser runner; `test/browser/page-update-files.mjs` (`pnpm test:page-update-files`).

### Changed

- **Every new session gets a shorter standing instruction: "Your page", about 850 bytes, in place of "The page is the
  conversation" (2,585).** It says where the page is: a new placeholder `{root}` names the page's folder in the
  host's words (bb: `` your thread storage, `$BB_THREAD_STORAGE` ``; Claude Code: `` the folder init prints as
  `Root` ``), and it is filled in an operator's own text too. What the text no longer says is in the guide: a new
  section *What the page is for* (the first time there is no file; read before editing, saving publishes; a page
  that would suit another task is not finished; answer where they read; costly assumptions; report failures
  plainly), and *One agent, one page* in full, as before.
- **A page may stop its own session, once the reader confirms** (spec 03 R5.28, 08 A49, decision U52).
  `sessions.stop` on the page's own session used to be refused before any dialog (`invalid_params`), so a chat on a
  page could not offer Stop while its agent worked. It now shows the host's usual dialog, naming it as this page's
  session ("Stop this page's own session, “‹title›” (‹id›)?"); Confirm stops the running turn (bb `threads.stop`;
  Claude Code aborts the live turn, and the session takes the next message), Cancel rejects with `cancelled` and
  stops nothing. A page alone still cannot stop the turn that reads it: unconfirmed, forged or replayed, the call
  stops nothing. `sessions.send`, `sessions.archive` and `sessions.respond` still refuse the own session. Tests:
  `packages/pages-core/test/serving/bridge.test.ts` (11a) and `hostile-page.test.ts` ("Forge or replay a
  confirmation"), both failing on 0.2.4. Fixture 06 A49 is now a manual button, as A46 is (a confirmed call cannot
  run headless).

### Versions

- `@unifedev/pages-core` 0.3.0; `@unifedev/claude-pages` (`package.json`, `plugin.json`) 0.3.0;
  `@unifedev/thread-pages` 1.11.0.

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
