// src/bridge/main.ts
import http from "node:http";
import fs2 from "node:fs";
import path3 from "node:path";

// src/shared/paths.ts
import os from "node:os";
import path from "node:path";
function stateHome(env = process.env) {
  return env.UNIFE_PAGES_HOME ?? path.join(os.homedir(), ".unife-pages");
}
var socketPath = (home2) => path.join(home2, "control.sock");
var lockPath = (home2) => path.join(home2, "daemon.lock");
var logPath = (home2) => path.join(home2, "daemon.log");

// src/shared/daemon-start.ts
import fs from "node:fs";
import path2 from "node:path";
import { spawnSync } from "node:child_process";

// src/shared/env.ts
var SESSION_HOST_VAR = /^BB_/;
function withoutSessionEnv(env = process.env) {
  const out2 = {};
  for (const [k, v] of Object.entries(env)) if (!SESSION_HOST_VAR.test(k)) out2[k] = v;
  return out2;
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
function takeLock(home2) {
  fs.mkdirSync(home2, { recursive: true, mode: 448 });
  const lock = lockPath(home2);
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
function releaseLock(home2) {
  try {
    fs.unlinkSync(lockPath(home2));
  } catch {
  }
}
function spawnDaemon(home2, pluginRoot2, env = process.env) {
  if (!takeLock(home2)) return null;
  const daemonJs = path2.join(pluginRoot2, "bin", "daemon.js");
  const script = [
    'const { spawn } = require("node:child_process"); const fs = require("node:fs");',
    'const fd = fs.openSync(process.env.UNIFE_PAGES_LOG, "a", 0o600);',
    'const c = spawn(process.execPath, [process.env.UNIFE_PAGES_DAEMON_JS], { detached: true, stdio: ["ignore", fd, fd], cwd: process.env.UNIFE_PAGES_HOME });',
    "c.unref(); process.stdout.write(String(c.pid ?? 0));"
  ].join(" ");
  const r = spawnSync(process.execPath, ["-e", script], {
    env: { ...withoutSessionEnv(env), UNIFE_PAGES_HOME: home2, UNIFE_PAGES_PLUGIN_ROOT: pluginRoot2, UNIFE_PAGES_LOCK_HELD: "1", UNIFE_PAGES_LOG: logPath(home2), UNIFE_PAGES_DAEMON_JS: daemonJs },
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1e4
  });
  const pid = Number(String(r.stdout ?? "").trim());
  if (!Number.isFinite(pid) || pid <= 0) {
    releaseLock(home2);
    return null;
  }
  return pid;
}
var backoffMs = (attempt) => Math.min(5e3, 300 * (attempt + 1));

// src/shared/protocol.ts
var BRIDGE_HEADER = "x-unife-bridge";

// src/bridge/main.ts
var argOf = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : void 0;
};
var sid = argOf("session");
var cwd = argOf("cwd") ?? "";
var pluginRoot = argOf("plugin-root") ?? path3.resolve(path3.dirname(new URL(import.meta.url).pathname), "..");
var parentPid = Number(argOf("parent-pid")) || process.ppid;
var clearedFrom = argOf("cleared-from");
var forkOf = argOf("fork-of");
if (!sid) {
  process.stderr.write("bridge: --session required\n");
  process.exit(2);
}
var home = stateHome();
var sock = socketPath(home);
var out = (o) => process.stdout.write(JSON.stringify(o) + "\n");
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pluginVersion() {
  try {
    return String(JSON.parse(fs2.readFileSync(path3.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8")).version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}
function connect() {
  return new Promise((resolve) => {
    const pluginDirs = (process.env.CLAUDE_CODE_PLUGIN_DIRS ?? "").split(path3.delimiter).map((d) => d.trim()).filter(Boolean);
    const body = { sessionId: sid, cwd, pluginRoot, pluginVersion: pluginVersion(), parentPid, ...clearedFrom ? { clearedFrom } : {}, ...forkOf ? { forkOf } : {}, ...pluginDirs.length ? { pluginDirs } : {}, ...process.env.BB_THREAD_ID ? { underHost: "bb", underHostId: process.env.BB_THREAD_ID } : {} };
    const text = JSON.stringify(body);
    const req = http.request({
      socketPath: sock,
      path: `/v1/sessions/${encodeURIComponent(sid)}/attach`,
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)), [BRIDGE_HEADER]: "1" }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve("bad-status");
        return;
      }
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (d) => {
        buf += d;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          try {
            const m = JSON.parse(line);
            if (m.type !== "ping") process.stdout.write(line + "\n");
          } catch {
          }
        }
      });
      res.on("end", () => resolve("closed"));
      res.on("error", () => resolve("closed"));
    });
    req.on("error", (err) => resolve(err.code === "ECONNREFUSED" || err.code === "ENOENT" ? "refused" : "error"));
    req.end(text);
  });
}
setInterval(() => {
  try {
    process.kill(parentPid, 0);
  } catch {
    process.exit(0);
  }
}, 5e3).unref();
var startedAt = 0;
for (let attempt = 0; ; attempt++) {
  const r = await connect();
  if (r === "refused" && Date.now() - startedAt > 1e4) {
    const pid = spawnDaemon(home, pluginRoot);
    startedAt = Date.now();
    out({ type: "status", text: pid ? `started the unife-pages daemon (pid ${pid})` : "waiting for the daemon another process is starting" });
    await sleep(400);
    continue;
  }
  if (r === "closed") attempt = 0;
  await sleep(backoffMs(attempt % 10));
}
