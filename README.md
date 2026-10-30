# Unife Pages for Claude Code

Every Claude Code session gets one web page its agent writes for the task — a decision sheet, a diagram you click,
a report of what failed — and the forms on that page answer the session. You read and answer where the work is,
from this machine or from your phone, instead of in the terminal.

## Install

```sh
claude plugin install unife-pages --marketplace synsdev/syns-claude-plugins
```

Node 22 or newer on the session's PATH. The plugin loads a hooks module into each session; a daemon, one per machine,
starts itself the first time a session needs it and stays up. The CLI is `bin/unife-pages.js` in the installed plugin
folder (`~/.claude/plugins/cache/syns-claude-plugins/unife-pages/<version>/`); the agent's instruction names
it by its full path, and `unife-pages` below stands for that spelling. `unife-pages daemon stop` ends the daemon.

## First use

The agent runs `unife-pages init` and gives you a link to its page. Open the link in a browser on this machine and
press **Sign in** — the daemon's own one-button page, no terminal; the cookie it sets lives 30 days in that browser.
A phone or another machine signs in through a single-use link you mint here: `unife-pages open --print` (the agent
cannot: sign-in is yours, the agent never holds the reader's credential). The home page, `http://127.0.0.1:7341/home`
by default, lists your sessions by what needs you.

Everything the daemon keeps lives under `~/.unife-pages` (`settings.json` for the listen address, the pages,
the sessions' transcripts and queues, the log).

## What this repository is

A build artefact. The plugin is developed in the private monorepo `unifedev/unife` (`packages/claude-pages`):
the bundles here are committed as built, nothing is edited by hand, and `main` is only ever a reviewed release
(tags `unife-pages--v<version>`; this is 0.6.24). Report problems in this repository's issues.

Unife Pages is a host of a protocol for agent-written pages; the protocol spec is published separately. The
reference server, `@unifedev/pages-core`, is inlined into the daemon unchanged.

## License

MIT — see [LICENSE](./LICENSE).
