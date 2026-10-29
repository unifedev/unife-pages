// src/bridge/main.ts
import http from "node:http";
import fs2 from "node:fs";
import path4 from "node:path";
import { fileURLToPath } from "node:url";

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
import path3 from "node:path";
import { spawnSync } from "node:child_process";

// src/shared/env.ts
import path2 from "node:path";
var MACHINE_VARS = /* @__PURE__ */ new Set([
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "PATH",
  "TMPDIR",
  "CLAUDE_CONFIG_DIR",
  "LANG",
  "TZ",
  "UNIFE_PAGES_HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "all_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "SSH_AUTH_SOCK",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "DBUS_SESSION_BUS_ADDRESS",
  "XAUTHORITY"
]);
var MACHINE_VAR_FAMILY = /^(LC_|XDG_)/;
function daemonEnv(env = process.env) {
  const out2 = {};
  for (const [k, v] of Object.entries(env)) if (MACHINE_VARS.has(k) || MACHINE_VAR_FAMILY.test(k)) out2[k] = v;
  if (out2.CLAUDE_CONFIG_DIR !== void 0 && !path2.isAbsolute(out2.CLAUDE_CONFIG_DIR)) delete out2.CLAUDE_CONFIG_DIR;
  return out2;
}
function claudeConfigDir(env = process.env) {
  if (env.CLAUDE_CONFIG_DIR && path2.isAbsolute(env.CLAUDE_CONFIG_DIR)) return env.CLAUDE_CONFIG_DIR;
  const home2 = env.HOME ?? env.USERPROFILE;
  return home2 ? path2.join(home2, ".claude") : null;
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
  const daemonJs = path3.join(pluginRoot2, "bin", "daemon.js");
  const script = [
    'const { spawn } = require("node:child_process"); const fs = require("node:fs");',
    'const fd = fs.openSync(process.env.UNIFE_PAGES_LOG, "a", 0o600);',
    'const c = spawn(process.execPath, [process.env.UNIFE_PAGES_DAEMON_JS], { detached: true, stdio: ["ignore", fd, fd], cwd: process.env.UNIFE_PAGES_HOME });',
    "c.unref(); process.stdout.write(String(c.pid ?? 0));"
  ].join(" ");
  const r = spawnSync(process.execPath, ["-e", script], {
    env: { ...daemonEnv(env), UNIFE_PAGES_HOME: home2, UNIFE_PAGES_PLUGIN_ROOT: pluginRoot2, UNIFE_PAGES_LOCK_HELD: "1", UNIFE_PAGES_LOG: logPath(home2), UNIFE_PAGES_DAEMON_JS: daemonJs },
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
var pluginRoot = argOf("plugin-root") ?? path4.resolve(path4.dirname(fileURLToPath(import.meta.url)), "..");
var parentPid = Number(argOf("parent-pid")) || process.ppid;
var clearedFrom = argOf("cleared-from");
var forkOf = argOf("fork-of");
var resumedFrom = argOf("resumed-from");
var ifFree = process.argv.includes("--if-free");
if (!sid) {
  process.stderr.write("bridge: --session required\n");
  process.exit(2);
}
var home = stateHome();
var sock = socketPath(home);
var out = (o) => process.stdout.write(JSON.stringify(o) + "\n");
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var real = (p) => {
  try {
    return fs2.realpathSync(p);
  } catch {
    return path4.resolve(p);
  }
};
function installed(root) {
  const config = claudeConfigDir();
  if (!config) return false;
  const rel = path4.relative(real(path4.join(config, "plugins", "cache")), real(root));
  return !rel.startsWith("..") && !path4.isAbsolute(rel) && rel.split(path4.sep).length === 3;
}
var fromInstall = installed(pluginRoot);
function pluginVersion() {
  try {
    return String(JSON.parse(fs2.readFileSync(path4.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8")).version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}
function newerThan(a, b) {
  const x = /^(\d+)\.(\d+)\.(\d+)$/.exec(a), y = /^(\d+)\.(\d+)\.(\d+)$/.exec(b);
  if (!x || !y) return false;
  for (let i = 1; i <= 3; i++) if (Number(x[i]) !== Number(y[i])) return Number(x[i]) > Number(y[i]);
  return false;
}
var ended = false;
var superseded = false;
var handingOver = 0;
var signalled = /* @__PURE__ */ new Set();
function maybeHandOver(m, own) {
  if (m.type !== "hello" || !fromInstall || handingOver || signalled.size >= 2) return;
  const { version = "", pid = 0 } = m.daemon ?? {};
  if (!(pid > 0) || signalled.has(pid) || !newerThan(own, version)) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  handingOver = pid;
  signalled.add(pid);
  out({ type: "status", text: `plugin ${own} is newer than the daemon ${version} (pid ${pid}): stopping it to start ${own}` });
}
async function exited(pid, ms) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(25)) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
  }
}
function connect() {
  return new Promise((resolve) => {
    const pluginDirs = (process.env.CLAUDE_CODE_PLUGIN_DIRS ?? "").split(path4.delimiter).map((d) => d.trim()).filter(Boolean);
    const own = pluginVersion();
    const body = { sessionId: sid, cwd, pluginRoot, pluginVersion: own, parentPid, ...clearedFrom ? { clearedFrom } : {}, ...forkOf ? { forkOf } : {}, ...resumedFrom ? { resumedFrom } : {}, ...ifFree ? { ifFree: true } : {}, ...pluginDirs.length ? { pluginDirs } : {}, ...process.env.BB_THREAD_ID ? { underHost: "bb", underHostId: process.env.BB_THREAD_ID } : {} };
    const text = JSON.stringify(body);
    const req = http.request({
      socketPath: sock,
      path: `/v1/sessions/${encodeURIComponent(sid)}/attach`,
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)), [BRIDGE_HEADER]: "1" }
    }, (res) => {
      if (res.statusCode === 409 && ifFree) {
        res.resume();
        resolve("busy");
        return;
      }
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
            if (m.type === "ended") ended = true;
            if (m.type === "superseded") superseded = true;
            maybeHandOver(m, own);
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
  if (ended || superseded || r === "busy") process.exit(0);
  if (handingOver) {
    await exited(handingOver, 8e3);
    handingOver = 0;
    const pid = spawnDaemon(home, pluginRoot);
    startedAt = Date.now();
    out({ type: "status", text: pid ? `started the unife-pages daemon ${pluginVersion()} (pid ${pid})` : "waiting for the daemon another process is starting" });
    await sleep(400);
    continue;
  }
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
