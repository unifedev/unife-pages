#!/usr/bin/env node

// src/cli/main.ts
import fs2 from "node:fs";
import path3 from "node:path";

// src/shared/paths.ts
import os from "node:os";
import path from "node:path";
function stateHome(env = process.env) {
  return env.UNIFE_PAGES_HOME ?? path.join(os.homedir(), ".unife-pages");
}
var socketPath = (home) => path.join(home, "control.sock");
var lockPath = (home) => path.join(home, "daemon.lock");
var logPath = (home) => path.join(home, "daemon.log");

// src/shared/daemon-start.ts
import fs from "node:fs";
import path2 from "node:path";
import { spawnSync } from "node:child_process";

// src/shared/env.ts
var SESSION_HOST_VAR = /^BB_/;
function withoutSessionEnv(env = process.env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) if (!SESSION_HOST_VAR.test(k)) out[k] = v;
  return out;
}

// src/shared/daemon-start.ts
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function takeLock(home) {
  fs.mkdirSync(home, { recursive: true, mode: 448 });
  const lock = lockPath(home);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lock, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 384);
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let pid = NaN;
      try {
        pid = Number(fs.readFileSync(lock, "utf8").trim());
      } catch {
      }
      if (Number.isFinite(pid) && pidAlive(pid)) return false;
      try {
        fs.unlinkSync(lock);
      } catch {
      }
    }
  }
  return false;
}
function releaseLock(home) {
  try {
    fs.unlinkSync(lockPath(home));
  } catch {
  }
}
function spawnDaemon(home, pluginRoot, env = process.env) {
  if (!takeLock(home)) return null;
  const daemonJs = path2.join(pluginRoot, "bin", "daemon.js");
  const script = [
    'const { spawn } = require("node:child_process"); const fs = require("node:fs");',
    'const fd = fs.openSync(process.env.UNIFE_PAGES_LOG, "a", 0o600);',
    'const c = spawn(process.execPath, [process.env.UNIFE_PAGES_DAEMON_JS], { detached: true, stdio: ["ignore", fd, fd], cwd: process.env.UNIFE_PAGES_HOME });',
    "c.unref(); process.stdout.write(String(c.pid ?? 0));"
  ].join(" ");
  const r = spawnSync(process.execPath, ["-e", script], {
    env: { ...withoutSessionEnv(env), UNIFE_PAGES_HOME: home, UNIFE_PAGES_PLUGIN_ROOT: pluginRoot, UNIFE_PAGES_LOCK_HELD: "1", UNIFE_PAGES_LOG: logPath(home), UNIFE_PAGES_DAEMON_JS: daemonJs },
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1e4
  });
  const pid = Number(String(r.stdout ?? "").trim());
  if (!Number.isFinite(pid) || pid <= 0) {
    releaseLock(home);
    return null;
  }
  return pid;
}
var backoffMs = (attempt) => Math.min(5e3, 300 * (attempt + 1));

// src/daemon/control/http.ts
import http from "node:http";
function request(opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(opts.url);
    const req = http.request({
      ...opts.socketPath ? { socketPath: opts.socketPath } : { host: u.hostname, port: u.port || 80 },
      path: u.pathname + u.search,
      method: opts.method ?? "GET",
      headers: { ...opts.body !== void 0 ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(opts.body)) } : {}, ...opts.headers ?? {} },
      timeout: opts.timeoutMs ?? 3e4,
      agent: false
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d) => {
        text += d;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (opts.body !== void 0) req.write(opts.body);
    req.end();
  });
}

// src/shared/protocol.ts
var underBbSkip = (threadId) => `SKIP     \u2014 this session has no page here: it runs inside bb thread ${threadId}, whose page is this session's. Use \`bb pages init\` and that page; nothing of unife-pages applies.
`;
var CLI_ROLES = ["init", "guide", "status", "home", "grants"];

// src/cli/main.ts
var USAGE = `unife-pages \u2014 Unife Pages for Claude Code

agent (inside a session, run through Bash):
  unife-pages init | guide | status | home [--clear] | grants [--revoke <from> <to> | --revoke-all]
person (your own terminal):
  unife-pages open [--print] [--session <id>] [--origin <declared origin>]   mint a sign-in link for a phone or another machine (a browser on this machine presses Sign in on the page)
  unife-pages forget <session id>                                           drop a session's page and state
  unife-pages daemon start|stop|status|log`;
async function api(io, method, p, body, tries = 20) {
  const home = io.home ?? stateHome(io.env);
  const sock = io.socket ?? socketPath(home);
  for (let attempt = 0; ; attempt++) {
    try {
      return await request({ socketPath: sock, url: `http://unife-pages${p}`, method, ...body !== void 0 ? { body: JSON.stringify(body) } : {}, timeoutMs: 6e4 });
    } catch (e) {
      const code = e.code;
      if (code !== "ECONNREFUSED" && code !== "ENOENT" || attempt >= tries || io.start === false) throw e;
      if (attempt === 0) spawnDaemon(home, io.pluginRoot, io.env);
      await new Promise((r) => setTimeout(r, backoffMs(attempt)));
    }
  }
}
async function main(argv, io) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h") {
    io.out(USAGE);
    return cmd ? 0 : 1;
  }
  const sessionId = io.env.CLAUDE_CODE_SESSION_ID ?? null;
  if (CLI_ROLES.includes(cmd)) {
    if (cmd === "init" && io.env.BB_THREAD_ID) {
      io.out(underBbSkip(io.env.BB_THREAD_ID));
      return 0;
    }
    const r = await api(io, "POST", `/v1/command/${cmd}`, { sessionId, args: rest });
    const a = JSON.parse(r.text);
    io.out(a.text);
    return a.exit;
  }
  if (cmd === "open") {
    if (sessionId) {
      io.err("this command is the person's; run it in your own terminal");
      return 1;
    }
    const flag = (n) => {
      const i = rest.indexOf(`--${n}`);
      return i >= 0 ? rest[i + 1] : void 0;
    };
    const print = rest.includes("--print");
    const session = flag("session");
    const origin = flag("origin");
    const body = { to: session ? `/page?session=${encodeURIComponent(session)}` : "/home", print, ...origin ? { origin } : {} };
    const r = await api(io, "POST", "/v1/bootstrap", body);
    if (r.status !== 200) {
      io.err(`open refused (${r.status}): ${r.text}`);
      return 1;
    }
    const a = JSON.parse(r.text);
    io.out(a.url ?? "opened in your browser; the link is valid for 10 minutes");
    return 0;
  }
  if (cmd === "forget") {
    if (sessionId) {
      io.err("this command is the person's; run it in your own terminal");
      return 1;
    }
    const id = rest[0];
    if (!id) {
      io.err("usage: unife-pages forget <session id>");
      return 1;
    }
    const r = await api(io, "POST", `/v1/sessions/${encodeURIComponent(id)}/forget`);
    io.out(r.status === 200 ? `forgot ${id}` : `forget refused (${r.status})`);
    return r.status === 200 ? 0 : 1;
  }
  if (cmd === "daemon") {
    const sub = rest[0] ?? "status";
    const home = io.home ?? stateHome(io.env);
    if (sub === "log") {
      io.out(fs2.existsSync(logPath(home)) ? fs2.readFileSync(logPath(home), "utf8").split("\n").slice(-200).join("\n") : "no log yet");
      return 0;
    }
    if (sub === "stop") {
      try {
        await api(io, "POST", "/v1/daemon/stop", void 0, 0);
        io.out("daemon stopping");
        return 0;
      } catch {
        io.out("no daemon running");
        return 0;
      }
    }
    if (sub === "start" || sub === "status") {
      try {
        const r = await api(io, "GET", "/v1/daemon", void 0, sub === "start" ? 20 : 0);
        const d = JSON.parse(r.text);
        io.out(`daemon ${d.version} pid ${d.pid}: ${d.origin} (${d.sessions} sessions known); state in ${home}`);
        const readers = d.readers ?? [];
        io.out(readers.length ? `${readers.length} reader session${readers.length === 1 ? "" : "s"}:` : "no reader sessions: open the page in a browser on this machine and press Sign in, or run `unife-pages open`");
        for (const r2 of readers) io.out(`  signed in ${new Date(r2.createdAtMs).toISOString()} via ${r2.via}, until ${new Date(r2.expiresAtMs).toISOString()}`);
        for (const err of d.deliveryErrors ?? []) io.out(`  session ${err.sessionId}: a page's reply was not submitted (${new Date(err.atMs).toISOString()}): ${err.reason}`);
        return 0;
      } catch {
        io.out(`no daemon running (state in ${home})`);
        return sub === "start" ? 1 : 0;
      }
    }
  }
  io.err(USAGE);
  return 1;
}
if (process.env.UNIFE_PAGES_CLI_LIB !== "1") {
  const here = path3.dirname(new URL(import.meta.url).pathname);
  const pluginRoot = process.env.UNIFE_PAGES_PLUGIN_ROOT ?? path3.resolve(here, "..");
  main(process.argv.slice(2), { out: (t) => process.stdout.write(t + "\n"), err: (t) => process.stderr.write(t + "\n"), env: process.env, pluginRoot }).then((code) => process.exit(code), (e) => {
    process.stderr.write(`unife-pages: ${e.message}
`);
    process.exit(1);
  });
}
export {
  main
};
