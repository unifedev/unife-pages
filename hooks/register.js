// src/mod/state.ts
var state = {
  sessionId: null,
  token: null,
  pageRoot: null,
  pageUrl: null,
  pluginRoot: "",
  pluginVersion: "0.3.0",
  socketPath: null,
  nodePath: null,
  bridge: null,
  bridgeAlive: false,
  previousId: null,
  inflight: /* @__PURE__ */ new Map(),
  decided: /* @__PURE__ */ new Map(),
  turnId: null,
  instruction: null,
  helloTimedOut: false,
  contributors: /* @__PURE__ */ new Map(),
  chunkOutbox: [],
  lastFlushMs: 0,
  cwd: "",
  underHost: null,
  home: null,
  held: [],
  deliveries: /* @__PURE__ */ new Set(),
  settingsChain: Promise.resolve(),
  ownSwitch: null,
  commandOutput: [],
  commandWaiter: null,
  reasoningLevel: null
};
async function homeFor($) {
  if (state.home) return state.home;
  const userHome = await $.env.get("HOME") ?? "";
  const home = await $.env.get("UNIFE_PAGES_HOME") ?? `${userHome}/.unife-pages`;
  state.home = { home, userHome };
  return state.home;
}
async function socketPathFor($) {
  if (state.socketPath) return state.socketPath;
  state.socketPath = `${(await homeFor($)).home}/control.sock`;
  return state.socketPath;
}
async function nodePathFor($) {
  if (state.nodePath) return state.nodePath;
  try {
    const r = await $.process.run(["/bin/zsh", "-lc", "command -v node"], { timeoutMs: 1e4 });
    const p = r.stdout.trim().split("\n").pop() ?? "";
    if (r.exitCode === 0 && p.startsWith("/")) state.nodePath = p;
  } catch {
  }
  return state.nodePath ?? "node";
}

// src/mod/api.ts
async function call($, method, path, body, headers = {}) {
  const socketPath = await socketPathFor($);
  return $.http.fetch(`http://unife-pages${path}`, {
    method,
    socketPath,
    headers: { ...state.token ? { authorization: `Bearer ${state.token}` } : {}, ...body !== void 0 ? { "content-type": "application/json" } : {}, ...headers },
    ...body !== void 0 ? { body: JSON.stringify(body) } : {}
  });
}
var sessionPath = (what) => `/v1/sessions/${encodeURIComponent(state.sessionId ?? "")}/${what}`;
function post($, what, body) {
  if (!state.token) return Promise.resolve(null);
  return call($, "POST", sessionPath(what), body).catch((e) => {
    $.ui.log(`unife-pages: ${what} failed: ${e.message}`, { to: "debug" });
    return null;
  });
}

// src/mod/instruction.ts
var HELLO_WAIT_MS = 4e3;
var HELLO_POLL_MS = 50;
function waitForToken($, maxMs = HELLO_WAIT_MS) {
  if (state.token || !state.bridgeAlive || state.helloTimedOut) return Promise.resolve(state.token);
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (state.token || !state.bridgeAlive) {
        resolve(state.token);
        return;
      }
      if (Date.now() - started >= maxMs) {
        state.helloTimedOut = true;
        resolve(null);
        return;
      }
      $.clock.after(HELLO_POLL_MS, tick);
    };
    $.clock.after(HELLO_POLL_MS, tick);
  });
}
async function instructionText($) {
  if (!await waitForToken($)) return "";
  try {
    const r = await call($, "GET", sessionPath("instruction"), void 0, state.instruction ? { "if-none-match": state.instruction.etag } : {});
    if (r.status === 304 && state.instruction) return state.instruction.text;
    if (r.status !== 200) return state.instruction?.text ?? "";
    const parsed = JSON.parse(r.text);
    state.instruction = { etag: parsed.etag, text: parsed.text };
    return parsed.text;
  } catch {
    return state.instruction?.text ?? "";
  }
}

// src/mod/tool-check.ts
var CLI_RE = /^(?:\S*\/)?node\s+(?:"[^"]*\/|'[^']*\/|\S*\/)?bin\/unife-pages\.js\s+(init|guide|status|home|grants)(?:\s+[A-Za-z0-9_.:\/=-]+)*\s*$/;
var SHELL_OPERATORS = /[;&|<>`$(){}\n]/;
var PATH_TOOLS = /* @__PURE__ */ new Set(["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "NotebookEdit"]);
function isCliCommand(command) {
  if (typeof command !== "string") return false;
  const c = command.trim();
  if (SHELL_OPERATORS.test(c)) return false;
  if (!/\/unife-pages\/|unife-pages\.js/.test(c)) return false;
  return CLI_RE.test(c) && /\bunife-pages\b/.test(c);
}
var HOME_RE = /\.unife-pages\b|UNIFE_PAGES_HOME/;
var PRIVATE_SEGMENT_RE = /(?<![\w.-])daemon(?![\w.-])|control\.sock/gi;
var INSIDE_OTHER_DIR_RE = /(?:^|[^\w.$-])[\w-][\w.-]*\/$/;
function namesPrivate(command) {
  if (typeof command !== "string" || !HOME_RE.test(command)) return false;
  for (const m of command.matchAll(PRIVATE_SEGMENT_RE)) {
    if (m[0].toLowerCase() === "control.sock") return true;
    if (!INSIDE_OTHER_DIR_RE.test(command.slice(0, m.index))) return true;
  }
  return false;
}
var PRIVATE_REASON = "unife-pages: the control socket and ~/.unife-pages/daemon/ (the readers' sign-ins) are not for the agent; the page root init printed, under ~/.unife-pages/pages/, is";
var DEFAULT_PORT = 7341;
var LOOPBACK_NAMES = ["127.0.0.1", "localhost", "[::1]"];
var OPEN_RE = /(?:^|[;&|(\n])\s*(?:env(?:\s+\S+)*?\s+)?(?:node\s+)?(?:\S*\/)?unife-pages(?:\.js)?\s+open\b/;
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var SIGN_IN_ROUTE_RE = /(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\/sign-in\b/i;
function daemonAuthorities(pageUrl) {
  let port = DEFAULT_PORT;
  const out = /* @__PURE__ */ new Set();
  if (pageUrl) {
    try {
      const u = new URL(pageUrl);
      if (LOOPBACK_NAMES.includes(u.hostname)) port = Number(u.port || (u.protocol === "https:" ? 443 : 80));
      else out.add(u.host.toLowerCase());
    } catch {
    }
  }
  for (const n of LOOPBACK_NAMES) out.add(`${n}:${port}`);
  return [...out];
}
function namesSignIn(command, pageUrl) {
  if (typeof command !== "string") return false;
  if (OPEN_RE.test(command) || SIGN_IN_ROUTE_RE.test(command)) return true;
  return daemonAuthorities(pageUrl).some((a) => new RegExp(`(?:https?:\\/\\/|host:\\s*)${escapeRe(a)}(?![\\w.-])`, "i").test(command));
}
var SIGN_IN_REASON = "unife-pages: sign-in is the person's; the agent never holds the reader's credential";
function pathOf(tool, input) {
  if (!PATH_TOOLS.has(tool) || !input || typeof input !== "object") return null;
  const i = input;
  const p = i.file_path ?? i.path ?? i.notebook_path;
  return typeof p === "string" && !p.includes("\0") ? p : null;
}
function normalizePath(p, userHome) {
  const expanded = p === "~" || p.startsWith("~/") ? userHome + p.slice(1) : p;
  const out = [];
  for (const seg of expanded.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return (expanded.startsWith("/") ? "/" : "") + out.join("/");
}
function underPrivate(tool, input, home, userHome) {
  const raw = pathOf(tool, input);
  if (raw === null) return false;
  const p = normalizePath(raw, userHome).toLowerCase();
  const h = normalizePath(home, userHome).toLowerCase();
  const priv = `${h}/daemon`;
  return p === `${h}/control.sock` || p === priv || p.startsWith(`${priv}/`);
}
function underPageRoot(tool, input, pageRoot) {
  if (!pageRoot) return false;
  const p = pathOf(tool, input);
  if (p === null || p.includes("..")) return false;
  return p === pageRoot || p.startsWith(pageRoot + "/");
}

// src/mod/holds.ts
var HOLD_STRATEGY = "race";
var MAX_SUMMARY_CHARS = 16384;
function questionWaiting(id, questions) {
  return {
    id,
    kind: "question",
    text: questions.map((q) => q.question ?? "").filter(Boolean).join(" \xB7 ").slice(0, 1024) || null,
    questions: questions.map((q, i) => ({
      id: `q${i}`,
      text: q.question ?? "",
      options: q.kind === "text" || q.kind === "number" ? [] : (q.options ?? []).map((o, j) => ({ id: `q${i}o${j}`, label: o.label ?? "" })),
      multiSelect: !!q.multiSelect,
      allowFreeText: true
    }))
  };
}
function permissionWaiting(id, tool, input, reason, suggestions) {
  const body = tool === "Bash" && input && typeof input === "object" && typeof input.command === "string" ? input.command : JSON.stringify(input, null, 2);
  const summary = `${reason ? `${reason}

` : ""}${tool}
${body}`;
  return {
    id,
    kind: "approval",
    text: `${tool}: ${body.split("\n")[0] ?? ""}`.slice(0, 200),
    approval: { subject: "tool", summary: summary.slice(0, MAX_SUMMARY_CHARS + 1), decisions: ["allow_once", "deny", ...suggestions.some((s) => s.type === "addRules") ? ["allow_for_session"] : []] }
  };
}
async function openWait($, id, waiting, claude) {
  const r = await call($, "POST", sessionPath("waits"), { id, waiting, claude }).catch(() => null);
  return !!r && r.status === 201;
}
function closeWait($, id) {
  void call($, "DELETE", sessionPath(`waits/${encodeURIComponent(id)}`)).catch(() => null);
}
async function pollAnswer($, id, done) {
  for (; ; ) {
    if (done()) return null;
    let r;
    try {
      r = await call($, "GET", sessionPath(`waits/${encodeURIComponent(id)}/answer`));
    } catch {
      return null;
    }
    if (r.status === 200) {
      try {
        return JSON.parse(r.text);
      } catch {
        return null;
      }
    }
    if (r.status !== 204) return null;
  }
}
async function race($, id, waiting, claude, nextP, apply) {
  if (!state.token || !await openWait($, id, waiting, claude)) return nextP();
  let settled = false;
  const fromPage = pollAnswer($, id, () => settled).then((a) => ({ page: a }));
  const fromTerminal = nextP().then((r) => ({ terminal: r }), (e) => ({ error: e }));
  const first = await Promise.race([fromPage, fromTerminal]);
  settled = true;
  if ("page" in first) {
    const applied = first.page ? apply(first.page) : null;
    if (applied !== null) return applied;
    const t = await fromTerminal;
    if ("terminal" in t) return t.terminal;
    throw t.error;
  }
  closeWait($, id);
  if ("terminal" in first) return first.terminal;
  throw first.error;
}
function holdQuestion($, e, next) {
  const questions = Array.isArray(e.questions) ? e.questions : [];
  const waiting = questionWaiting(e.tool_use_id, questions);
  return race(
    $,
    e.tool_use_id,
    waiting,
    { kind: "question", questions },
    () => next(e),
    (a) => "answers" in a ? { result: { questions, answers: a.answers } } : null
  );
}
function holdPermissionB($, e, next) {
  const input = JSON.stringify(e.tool_input);
  let id = [...state.inflight].find(([, v]) => v.tool === e.tool_name && JSON.stringify(v.input) === input)?.[0];
  if (!id) id = `perm-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const suggestions = e.permission_suggestions ?? [];
  const waiting = permissionWaiting(id, e.tool_name, e.tool_input, void 0, suggestions);
  return race(
    $,
    id,
    waiting,
    { kind: "permission", tool: e.tool_name, input: e.tool_input, suggestions },
    () => next(e),
    (a) => "decision" in a ? { decision: a.decision } : null
  );
}
async function holdPermissionA($, e, verdict) {
  const { tool, tool_use_id, agentId: _a, ...input } = e;
  const waiting = permissionWaiting(tool_use_id, tool, input, verdict.reason, []);
  if (!state.token || !await openWait($, tool_use_id, waiting, { kind: "permission", tool, input, suggestions: [] })) return;
  const a = await pollAnswer($, tool_use_id, () => false);
  if (a && "decision" in a) state.decided.set(tool_use_id, a.decision.behavior);
  closeWait($, tool_use_id);
}
async function holdOther($, id, text, nextP) {
  const opened = state.token && await openWait($, id, { id: null, kind: "other", text }, { kind: "other" });
  try {
    return await nextP();
  } finally {
    if (opened) closeWait($, id);
  }
}

// src/mod/rows-out.ts
function stamp(e, atMs) {
  return {
    uuid: e.uuid,
    ...e.agentId ? { agentId: e.agentId } : {},
    atMs,
    door: e.door,
    origin: e.origin,
    message: { type: e.message.type, ...e.message.role ? { role: e.message.role } : {}, ...e.message.isMeta ? { isMeta: true } : {}, ...e.message.name ? { name: e.message.name } : {}, content: e.message.content ?? [] }
  };
}
async function sendRow($, e) {
  await post($, "rows", [stamp(e, await $.clock.now())]);
}
var FLUSH_MS = 250;
var FLUSH_BYTES = 2048;
function pushChunk(turnId, step, c, agentId, atMs) {
  if (c.kind !== "text" || typeof c.text !== "string" || typeof c.index !== "number") return;
  state.chunkOutbox.push({ turnId, step, index: c.index, text: c.text, ...agentId ? { agentId } : {}, atMs });
}
function outboxBytes() {
  return state.chunkOutbox.reduce((n, c) => n + c.text.length, 0);
}
async function flushChunks($) {
  if (!state.chunkOutbox.length) return;
  const batch = state.chunkOutbox;
  state.chunkOutbox = [];
  state.lastFlushMs = await $.clock.now();
  await post($, "chunks", batch);
}

// src/mod/pages-noun.ts
async function post2($, namespace, declaration) {
  const r = await call($, "POST", "/v1/contributors", { kind: "mod", namespace, declaration }).catch(() => null);
  return r && r.status === 201 ? { ok: true } : { ok: false, error: r ? `daemon answered ${r.status}` : "daemon unreachable" };
}
function pagesNoun($) {
  return {
    async contribute(declaration, handler, pageScript) {
      const { namespace: ns, ...rest } = declaration ?? {};
      if (typeof ns !== "string") return { ok: false, error: "declaration.namespace required" };
      state.contributors.set(ns, { declaration: rest, handler, ...pageScript ? { pageScript } : {} });
      if (!state.token) return { ok: true };
      return post2($, ns, rest);
    }
  };
}
async function reregister($, contributions) {
  for (const [ns, c] of contributions) await post2($, ns, c.declaration);
}

// src/mod/bridge-loop.ts
function runBridge($, extra = {}) {
  if (state.bridgeAlive || !state.sessionId) return;
  state.bridgeAlive = true;
  const sid = state.sessionId;
  void (async () => {
    let buf = "";
    let child = null;
    try {
      const argv = [
        await nodePathFor($),
        `${state.pluginRoot}/bin/bridge.js`,
        "--session",
        sid,
        "--cwd",
        state.cwd,
        "--plugin-root",
        state.pluginRoot,
        "--parent-pid",
        "0",
        ...extra.clearedFrom ? ["--cleared-from", extra.clearedFrom] : [],
        ...extra.forkOf ? ["--fork-of", extra.forkOf] : []
      ];
      child = $.process.spawn({ argv });
      state.bridge = child;
      for await (const piece of child) {
        if (state.sessionId !== sid) break;
        if (piece.stream === "stderr") {
          $.ui.log(`bridge: ${piece.text.trim()}`, { to: "debug" });
          continue;
        }
        buf += piece.text;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.trim()) handle($, line);
        }
      }
    } catch (err) {
      $.ui.log(`unife-pages: bridge failed: ${err.message}`, { to: "debug" });
    }
    if (child && state.bridge !== child) return;
    state.bridgeAlive = false;
    state.bridge = null;
    state.token = null;
    if (state.sessionId === sid) $.clock.after(3e3, () => runBridge($, extra));
  })();
}
function handle($, line) {
  let m;
  try {
    m = JSON.parse(line);
  } catch {
    return;
  }
  switch (m.type) {
    case "hello": {
      state.token = m.sessionToken;
      state.helloTimedOut = false;
      state.pageRoot = m.page.root;
      state.pageUrl = m.page.url;
      state.instruction = null;
      if (m.backfill) {
        void $.session.messages().then((rows) => post($, "backfill", rows)).catch((e) => $.ui.log(`unife-pages: backfill failed: ${e.message}`, { to: "debug" }));
      }
      void post($, "state", { state: state.turnId ? "working" : "idle", ...state.turnId ? { turnId: state.turnId } : {}, atMs: Date.now() });
      void postSettings($);
      if (state.contributors.size) void reregister($, state.contributors);
      return;
    }
    case "deliver": {
      if (state.deliveries.has(m.deliveryId)) return;
      state.deliveries.add(m.deliveryId);
      if (m.settings && (m.settings.model !== void 0 || m.settings.reasoningLevel !== void 0)) {
        const delivery = { deliveryId: m.deliveryId, text: m.text, settings: m.settings };
        if (state.turnId) {
          state.held.push(delivery);
          return;
        }
        enqueueSettings($, delivery);
        return;
      }
      $.ui.toast("Answer from your page");
      void $.prompt.submit({ text: m.text, asUser: true }).then(() => call($, "POST", `/v1/deliveries/${encodeURIComponent(m.deliveryId)}/ack`, {})).catch((e) => $.ui.log(`unife-pages: delivery failed: ${e.message}`, { to: "debug" })).finally(() => state.deliveries.delete(m.deliveryId));
      return;
    }
    case "steer":
      void $.session.append({ message: { type: "user", role: "user", content: [{ type: "text", text: m.text }] } }).then((r) => call($, "POST", `/v1/deliveries/${encodeURIComponent(m.deliveryId)}/ack`, "uuid" in r ? { messageId: r.uuid } : {})).catch((e) => $.ui.log(`unife-pages: steer failed: ${e.message}`, { to: "debug" }));
      return;
    case "turn.abort":
      if (state.turnId) void $.turn.abort({ turnId: state.turnId }).catch((e) => $.ui.log(`unife-pages: abort failed: ${e.message}`, { to: "debug" }));
      return;
    case "usage":
      void $.session.usage().then((u) => call($, "POST", `/v1/calls/${encodeURIComponent(m.callId)}`, { result: { context: u.context, ...u.cost ? { cost: u.cost } : {} } })).catch((e) => call($, "POST", `/v1/calls/${encodeURIComponent(m.callId)}`, { failure: e.message }));
      return;
    case "contrib.invoke": {
      const h = state.contributors.get(m.namespace)?.handler;
      const answer = h ? h({ method: m.method, params: m.params, caller: m.context, requestId: m.requestId }).then((result) => ({ result }), (e) => ({ failure: e.message })) : Promise.resolve({ failure: "no such contributor in this session" });
      void answer.then((a) => call($, "POST", `/v1/calls/${encodeURIComponent(m.callId)}`, a)).catch(() => null);
      return;
    }
    case "contrib.pageScript": {
      const ask = state.contributors.get(m.namespace)?.pageScript;
      const answer = ask ? ask({ caller: m.caller, documentPath: m.documentPath, have: m.have }).then((result) => ({ result }), (e) => ({ failure: e.message })) : Promise.resolve({ failure: "no page script for this contributor in this session" });
      void answer.then((a) => call($, "POST", `/v1/calls/${encodeURIComponent(m.callId)}`, a)).catch(() => null);
      return;
    }
    case "instruction.changed":
      state.instruction = null;
      return;
    case "status":
      $.ui.log(`unife-pages: ${m.text}`, { to: "debug" });
      return;
    default:
      return;
  }
}
async function postSettings($) {
  const body = {};
  try {
    const alias = (await $.config.list()).find((c) => c.key === "model")?.value;
    if (typeof alias === "string" && alias) body.model = alias;
  } catch {
  }
  try {
    const id = await $.session.model();
    if (typeof id === "string" && id) body.modelId = id;
  } catch {
  }
  if (state.reasoningLevel) body.reasoningLevel = state.reasoningLevel;
  if (!Object.keys(body).length) return;
  try {
    await post($, "settings", body);
  } catch (e) {
    $.ui.log(`unife-pages: settings report failed: ${e.message}`, { to: "debug" });
  }
}
function enqueueSettings($, delivery) {
  state.settingsChain = state.settingsChain.then(() => submitWithSettings($, delivery)).catch(() => void 0);
}
function refusedText(answer) {
  const text = directText(answer);
  if (text === null) return NO_TEXT;
  if (/^Usage:/i.test(text) || /^Unknown model\b/i.test(text)) return text;
  return /^Set /.test(text) ? null : text;
}
var NO_TEXT = "the command answered no text";
var COMMAND_OUTPUT_WAIT_MS = 500;
function directText(answer) {
  return answer && typeof answer === "object" && typeof answer.text === "string" ? answer.text.trim() : null;
}
function noteCommandOutput(e, nowMs = Date.now()) {
  if (e.door !== "command") return false;
  const blocks = Array.isArray(e.message?.content) ? e.message.content : [];
  const text = typeof e.message?.content === "string" ? e.message.content : blocks.filter((b) => b && typeof b.text === "string").map((b) => b.text).join("\n");
  const m = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(text);
  if (!m) return false;
  const line = m[1].trim();
  state.commandOutput.push({ text: line, atMs: nowMs });
  if (state.commandOutput.length > 8) state.commandOutput.shift();
  state.commandWaiter?.(line);
  return noteSettingLine(line);
}
function noteSettingLine(line) {
  const effort = /^Set effort level to (\S+)/.exec(line);
  if (effort) {
    state.reasoningLevel = effort[1];
    return true;
  }
  return /^Set model to /.test(line);
}
async function commandLine($, answer, command, sinceMs) {
  const direct = directText(answer);
  if (direct !== null) return direct;
  const names = (line) => new RegExp(`\\b${command}\\b`, "i").test(line);
  const seen = state.commandOutput.find((l) => l.atMs >= sinceMs && names(l.text));
  if (seen) return seen.text;
  return new Promise((resolve) => {
    const timer = $.clock.after(COMMAND_OUTPUT_WAIT_MS, () => {
      state.commandWaiter = null;
      resolve(null);
    });
    state.commandWaiter = (text) => {
      if (!names(text)) return;
      timer.cancel();
      state.commandWaiter = null;
      resolve(text);
    };
  });
}
async function settingTook($, command, value) {
  if (command !== "model") return NO_TEXT;
  let alias = null, id = "";
  try {
    alias = (await $.config.list()).find((c) => c.key === "model")?.value ?? null;
  } catch {
  }
  try {
    id = await $.session.model();
  } catch {
  }
  if (alias === value || id === value) return null;
  return `${NO_TEXT}; the session's model is ${alias ?? (id || "unknown")}`;
}
async function submitWithSettings($, delivery) {
  const { deliveryId, text, settings } = delivery;
  if (state.turnId) {
    if (!state.held.some((h) => h.deliveryId === deliveryId)) state.held.push(delivery);
    return;
  }
  const steps = [["model", "model", settings.model], ["effort", "reasoningLevel", settings.reasoningLevel]];
  for (const [command, field, value] of steps) {
    if (value === void 0) continue;
    let failure = null;
    if (command === "model") state.ownSwitch = value;
    try {
      const sinceMs = Date.now();
      const line = await commandLine($, await $.command.run({ command, args: value }), command, sinceMs);
      failure = line === null ? await settingTook($, command, value) : refusedText({ text: line });
    } catch (e) {
      failure = e.message || `/${command} failed`;
    } finally {
      state.ownSwitch = null;
    }
    if (failure === null && field === "reasoningLevel") state.reasoningLevel = value;
    if (failure !== null) {
      const reason = `/${command} ${value}: ${failure}`;
      $.ui.log(`unife-pages: a reply from your page was not delivered \u2014 ${reason}`);
      $.ui.log(`unife-pages: delivery ${deliveryId} not submitted: ${reason}`, { to: "debug" });
      try {
        await call($, "POST", `/v1/deliveries/${encodeURIComponent(deliveryId)}/ack`, { failed: { fields: [field], reason } });
      } catch (e) {
        $.ui.log(`unife-pages: failed ack failed: ${e.message}`, { to: "debug" });
      } finally {
        state.deliveries.delete(deliveryId);
      }
      return;
    }
  }
  void postSettings($);
  $.ui.toast("Answer from your page");
  try {
    await $.prompt.submit({ text, asUser: true });
    await call($, "POST", `/v1/deliveries/${encodeURIComponent(deliveryId)}/ack`, {});
  } catch (e) {
    $.ui.log(`unife-pages: delivery failed: ${e.message}`, { to: "debug" });
  } finally {
    state.deliveries.delete(deliveryId);
  }
}
function flushHeld($) {
  for (const h of state.held.splice(0)) enqueueSettings($, h);
}

// src/mod/register.ts
var PLUGIN_VERSION = "0.3.0";
async function ids($) {
  state.sessionId = await $.session.id();
  state.cwd = await $.session.cwd();
  state.pluginRoot = $.plugin.root;
  state.pluginVersion = PLUGIN_VERSION;
  state.underHost = await $.env.get("BB_THREAD_ID") ? "bb" : null;
  return state.sessionId;
}
var guard = (next, e) => next.called ? void 0 : next(e);
function register(on) {
  on("session.start", async ($, e, next) => {
    await ids($);
    runBridge($);
    return next(e);
  });
  on("classic.SessionStart", async ($, e, next) => {
    const id = await $.session.id();
    if (state.sessionId && id !== state.sessionId) {
      const previous = state.previousId ?? state.sessionId;
      state.sessionId = id;
      state.token = null;
      state.pageRoot = null;
      state.instruction = null;
      state.inflight.clear();
      state.decided.clear();
      state.cwd = await $.session.cwd();
      try {
        await state.bridge?.return(void 0);
      } catch {
      }
      state.bridgeAlive = false;
      runBridge($, e.source === "clear" ? { clearedFrom: previous } : e.source === "fork" ? { forkOf: previous } : {});
    } else if (!state.sessionId) {
      await ids($);
      runBridge($);
    }
    return next(e);
  });
  on("session.end", async ($, e, next) => {
    state.previousId = e.sessionId;
    void post($, "detach", { reason: e.reason, ...e.resume?.id ? { resumeId: e.resume.id } : {} });
    return next(e);
  });
  on("prompt.compose", async ($, e, next) => {
    const r = await next(e);
    if (state.underHost) return r;
    const text = await instructionText($);
    if (!text) return r;
    return { ...r, sections: [...r.sections, { id: "unife-pages:pages", text, scope: "session" }] };
  });
  on("turn.start", async ($, e, next) => {
    state.turnId = e.turnId;
    void post($, "state", { state: "working", turnId: e.turnId, atMs: Date.now() });
    return next(e);
  });
  on("turn.complete", async ($, e, next) => {
    const turnId = e.turnId ?? state.turnId;
    state.turnId = null;
    await flushChunks($);
    void post($, "state", { state: "idle", ...turnId ? { turnId } : {}, ...e.reason ? { reason: e.reason } : {}, atMs: Date.now() });
    void postSettings($);
    if (state.held.length) flushHeld($);
    return next(e);
  });
  on("classic.PreModelSwitch", async ($, e, next) => {
    if (state.ownSwitch !== null && (typeof e.requested_model !== "string" || e.requested_model === state.ownSwitch)) return { decision: "allow", reason: "unife-pages: the page's own settings for the next turn" };
    return next(e);
  }).catch(($, e, next) => guard(next, e));
  on("turn.step", async function* ($, e, next) {
    const stream = next(e);
    let result;
    for (; ; ) {
      const { done, value } = await stream.next();
      if (done) {
        result = value;
        break;
      }
      const c = value;
      pushChunk(e.turnId, e.index, c, e.agentId, Date.now());
      if (c.kind === "text" && (Date.now() - state.lastFlushMs >= FLUSH_MS || outboxBytes() >= FLUSH_BYTES)) void flushChunks($);
      yield c;
    }
    void flushChunks($);
    return result;
  });
  on("session.append", async ($, e, next) => {
    if (noteCommandOutput(e)) void postSettings($);
    const r = await next(e);
    await sendRow($, e);
    return r;
  }).catch(($, e, next) => guard(next, e));
  on("tool.call", async ($, e, next) => {
    const { tool, tool_use_id, agentId, ...input } = e;
    state.inflight.set(tool_use_id, { tool, input, ...agentId ? { agentId } : {} });
    try {
      if (tool === "AskUserQuestion") return await holdQuestion($, e, next);
      if (tool === "ExitPlanMode") return await holdOther($, tool_use_id, "Plan approval in the terminal", () => next(e));
      if (HOLD_STRATEGY === "gated") {
        const verdict = await $.tool.check({ tool, input });
        if (verdict.decision === "ask") await holdPermissionA($, e, verdict);
      }
      return await next(e);
    } finally {
      state.inflight.delete(tool_use_id);
    }
  }).catch(($, e, next) => guard(next, e));
  on("classic.PermissionRequest", async ($, e, next) => {
    if (HOLD_STRATEGY !== "race") return next(e);
    return holdPermissionB($, e, next);
  }).catch(($, e, next) => guard(next, e));
  on("tool.check", async ($, e, next) => {
    const input = e.input;
    if (e.tool === "Bash" && namesPrivate(input?.command)) return { decision: "deny", reason: PRIVATE_REASON };
    if (e.tool === "Bash" && namesSignIn(input?.command, state.pageUrl)) return { decision: "deny", reason: SIGN_IN_REASON };
    if (PATH_TOOLS.has(e.tool)) {
      const h = await homeFor($);
      if (underPrivate(e.tool, e.input, h.home, h.userHome)) return { decision: "deny", reason: PRIVATE_REASON };
    }
    if (e.tool === "Bash" && isCliCommand(input?.command)) return { decision: "allow", reason: "unife-pages: the plugin's own CLI" };
    if (underPageRoot(e.tool, e.input, state.pageRoot)) return { decision: "allow", reason: "unife-pages: the session's own page root" };
    if (HOLD_STRATEGY === "gated" && e.tool_use_id && state.decided.has(e.tool_use_id)) {
      const d = state.decided.get(e.tool_use_id);
      state.decided.delete(e.tool_use_id);
      return d === "allow" ? { decision: "allow", reason: "unife-pages: allowed from the page" } : { decision: "deny", reason: "Denied from the page" };
    }
    return next(e);
  }).catch(($, e, next) => guard(next, e));
  on("engine.create", async ($, e, next) => {
    const built = await next(e);
    return { ...built, pages: pagesNoun($) };
  });
}
export {
  PLUGIN_VERSION,
  call,
  register
};
