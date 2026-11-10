var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/service/main.js
var import_node_http = __toESM(require("node:http"));
var import_node_fs6 = require("node:fs");
var import_node_os4 = require("node:os");
var import_node_path6 = require("node:path");

// node_modules/@openchamber/sdk/dist/scrollbar-style.js
var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
var GUEST_SCROLLBAR_CSS = `
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
function installGuestScrollbarActivity(doc) {
  const root = doc.documentElement;
  if (root.hasAttribute("data-oc-scrollbar-activity"))
    return;
  root.setAttribute("data-oc-scrollbar-activity", "");
  const timers = /* @__PURE__ */ new WeakMap();
  doc.addEventListener("scroll", (event) => {
    const target = event.target === doc ? root : event.target;
    if (!(target instanceof Element))
      return;
    if (!target.hasAttribute("data-oc-scrolling"))
      target.setAttribute("data-oc-scrolling", "");
    const pending = timers.get(target);
    if (pending !== void 0)
      clearTimeout(pending);
    timers.set(target, setTimeout(() => {
      timers.delete(target);
      target.removeAttribute("data-oc-scrolling");
    }, 1e3));
  }, { capture: true, passive: true });
}
var GUEST_SCROLLBAR_SCRIPT = `(${installGuestScrollbarActivity.toString()})(document);`;

// node_modules/@openchamber/sdk/dist/manifest.js
var TRACKER_URL_TOKENS = ["{id}", "{segment}", "{segments+}"];
var TRACKER_URL_TOKEN_SET = new Set(TRACKER_URL_TOKENS);

// node_modules/@openchamber/sdk/dist/session-events.js
var GUEST_SESSION_EVENT_TYPES = [
  "turn-finished",
  "turn-failed",
  "permission-asked",
  "question-asked",
  "turn-started",
  "session-created",
  "session-archived",
  "session-deleted"
];
var SESSION_EVENTS_PATH = "/session-events";
var SESSION_EVENTS_WIRE_VERSION = 1;
var SESSION_EVENTS_IDLE_MS = 10 * 6e4;
var EVENT_TYPES = new Set(GUEST_SESSION_EVENT_TYPES);
var isGuestSessionEventType = (value) => EVENT_TYPES.has(value);
var readSessionEventRequest = (body) => {
  let wire;
  try {
    const parsed = JSON.parse(body);
    if (Object(parsed) !== parsed || parsed === null)
      return null;
    wire = parsed;
  } catch {
    return null;
  }
  const { v, requestId, event, content } = wire;
  if (v !== SESSION_EVENTS_WIRE_VERSION)
    return null;
  if (String(requestId) !== requestId || requestId.length === 0)
    return null;
  if (Object(event) !== event || event === void 0)
    return null;
  const { id, type, at, session, project, linked, permission, question } = event;
  if (String(id) !== id || id.length === 0)
    return null;
  if (String(type) !== type || !isGuestSessionEventType(type))
    return null;
  if (!Number.isFinite(at))
    return null;
  if (Object(session) !== session || session === void 0)
    return null;
  const sessionId = session.id;
  if (String(sessionId) !== sessionId || sessionId.length === 0)
    return null;
  const parentId = session.parentId;
  if (parentId !== null && (String(parentId) !== parentId || parentId.length === 0))
    return null;
  if (Object(project) !== project || project === void 0)
    return null;
  const directory = project.directory;
  if (directory !== null && (String(directory) !== directory || directory.length === 0))
    return null;
  if (!Array.isArray(linked))
    return null;
  const request = {
    v: SESSION_EVENTS_WIRE_VERSION,
    requestId,
    event: { id, type, at: Number(at), session: { id: sessionId, parentId }, project: { directory }, linked }
  };
  if (permission !== void 0) {
    if (Object(permission) !== permission)
      return null;
    const permissionRequestId = permission.requestId;
    if (String(permissionRequestId) !== permissionRequestId || permissionRequestId.length === 0)
      return null;
    request.event.permission = { requestId: permissionRequestId };
  }
  if (question !== void 0) {
    if (Object(question) !== question)
      return null;
    const { kind, id: questionId } = question;
    if (kind !== "form" && kind !== "page")
      return null;
    if (String(questionId) !== questionId || questionId.length === 0)
      return null;
    request.event.question = { kind, id: questionId };
  }
  if (content !== void 0) {
    if (Object(content) !== content || content.type !== type)
      return null;
    request.content = content;
  }
  return request;
};

// node_modules/@openchamber/sdk/dist/service-host.js
var SERVICE_HOST_PATH = "/service/call";
var OPENCHAMBER_HOST_CALLBACK_URL_ENV = "OPENCHAMBER_HOST_CALLBACK_URL";
var SERVICE_HOST_TIMEOUT_MS = 3e4;
var SERVICE_SCHEDULE_IDLE_MS = 10 * 6e4;
var MENTIONS_IDLE_MS = 10 * 6e4;
var ServiceHostError = class extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "ServiceHostError";
    this.code = code;
    this.status = status;
  }
};
var createServiceHost = ({ env }) => {
  const call = async (method, input) => {
    const base = env[OPENCHAMBER_HOST_CALLBACK_URL_ENV];
    const token = env.OPENCHAMBER_SERVICE_TOKEN;
    if (!base || !token)
      throw new ServiceHostError("This service was not started by OpenChamber.", "HOST_UNAVAILABLE", 0);
    let response;
    try {
      response = await fetch(`${base.replace(/\/+$/, "")}${SERVICE_HOST_PATH}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ method, input }),
        signal: AbortSignal.timeout(SERVICE_HOST_TIMEOUT_MS)
      });
    } catch {
      throw new ServiceHostError("OpenChamber did not answer.", "HOST_UNAVAILABLE", 0);
    }
    const body = await response.json().catch(() => null);
    if (response.ok && body?.result !== void 0)
      return body.result;
    throw new ServiceHostError(body?.error?.message ?? `OpenChamber answered HTTP ${response.status}.`, body?.error?.code ?? "HOST_UNAVAILABLE", response.status);
  };
  return {
    sessions: {
      start: (input) => call("sessions.start", input),
      send: (sessionId, prompt) => call("sessions.send", { sessionId, prompt }),
      retry: (sessionId) => call("sessions.retry", { sessionId }),
      status: (sessionId) => call("sessions.status", { sessionId }),
      lastReply: (sessionId) => call("sessions.lastReply", { sessionId }),
      stop: (sessionId) => call("sessions.stop", { sessionId }),
      answerPermission: (sessionId, requestId, answer) => call("sessions.answerPermission", { sessionId, requestId, ...answer }),
      answerForm: (sessionId, formId, values, message) => call("sessions.answerForm", { sessionId, formId, values, ...message === void 0 ? {} : { message } })
    },
    setInstructions: (directory, text) => call("instructions.set", { directory, text }),
    emit: (topic, data) => call("panels.emit", { topic, data }),
    readSettings: () => call("settings.read", {}).then(({ settings }) => settings),
    needsConfiguration: (message) => call("status.set", { needsConfiguration: message })
  };
};

// node_modules/@openchamber/sdk/dist/contract.js
var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
var GUEST_GENERATE_LATE_KEEP_MS = 60 * 6e4;
var HOST_REQUEST_ERROR_CODES = [
  "HOST_UNAVAILABLE",
  "HOST_TIMEOUT",
  "HOST_REJECTED",
  "DISCONNECTED",
  "DISABLED",
  "BAD_PATH",
  "NO_INTEGRATION",
  "NO_SERVICE",
  "SERVICE_FAILED",
  "REQUEST_FAILED",
  "RESPONSE_TOO_LARGE",
  "NO_SESSION",
  "SESSION_BUSY",
  "NOT_GRANTED",
  "NO_DIRECTORY",
  "NOT_FOUND",
  "FILE_TOO_LARGE",
  "DENIED",
  "NO_MODEL",
  "MODEL_FAILED",
  "UNSUPPORTED"
];
var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);

// node_modules/@openchamber/sdk/dist/service-providers.js
var BROWSER_CONTROL_ACTIONS = [
  "browser.open",
  "browser.snapshot",
  "browser.click",
  "browser.type",
  "browser.select",
  "browser.scroll",
  "browser.back",
  "browser.forward",
  "browser.inspect",
  "browser.capture",
  "browser.resize",
  "browser.close"
];
var BROWSER_PROVIDER_IDLE_MS = 10 * 6e4;
var CONTROL_ACTIONS = new Set(BROWSER_CONTROL_ACTIONS);
var SOURCE_CONTROL_PROVIDER_IDLE_MS = 10 * 6e4;
var NOTIFICATIONS_PROVIDER_IDLE_MS = 10 * 6e4;
var TRACKER_PROVIDER_IDLE_MS = 10 * 6e4;
var QUOTA_PROVIDER_IDLE_MS = 10 * 6e4;

// node_modules/@openchamber/sdk/dist/service-surface.js
var SURFACE_CONTROLLERS = ["none", "agent", "user"];
var CONTROLLERS = new Set(SURFACE_CONTROLLERS);

// src/shared/config.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var ROOT = (0, import_node_path.resolve)(__dirname, "..");
var CONFIG_PATH = (0, import_node_path.join)(ROOT, "config.json");
var DEFAULT_BASE_URL = "http://127.0.0.1:3040";
var EMPTY = {
  source: "planka",
  baseUrl: DEFAULT_BASE_URL,
  email: "",
  token: "",
  boardId: "",
  boardName: ""
};
var normalise = (value) => {
  const baseUrl = String(value?.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
  return {
    source: value?.source === "local" ? "local" : "planka",
    baseUrl,
    email: typeof value?.email === "string" ? value.email : "",
    token: typeof value?.token === "string" ? value.token : "",
    boardId: typeof value?.boardId === "string" ? value.boardId : "",
    boardName: typeof value?.boardName === "string" ? value.boardName : ""
  };
};
var readConfig = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs.readFileSync)(CONFIG_PATH, "utf8"));
    return normalise(parsed);
  } catch {
    return { ...EMPTY };
  }
};
var isConnected = (config = readConfig()) => config.source === "local" || Boolean(config.token);
var saveConfig = (patch) => {
  const next = normalise({ ...readConfig(), ...patch });
  const previous = readConfig();
  if (JSON.stringify(previous) === JSON.stringify(next)) return next;
  const temp = (0, import_node_path.join)(ROOT, ".config.json.tmp");
  (0, import_node_fs.writeFileSync)(temp, `${JSON.stringify(next, null, 2)}
`, { mode: 384 });
  (0, import_node_fs.renameSync)(temp, CONFIG_PATH);
  try {
    (0, import_node_fs.chmodSync)(CONFIG_PATH, 384);
  } catch {
  }
  return next;
};
var clearConfig = () => {
  const next = { ...EMPTY, baseUrl: readConfig().baseUrl };
  const temp = (0, import_node_path.join)(ROOT, ".config.json.tmp");
  (0, import_node_fs.writeFileSync)(temp, `${JSON.stringify(next, null, 2)}
`, { mode: 384 });
  (0, import_node_fs.renameSync)(temp, CONFIG_PATH);
  try {
    (0, import_node_fs.chmodSync)(CONFIG_PATH, 384);
  } catch {
  }
  return next;
};

// src/shared/links.js
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path2 = require("node:path");
var DIR = (0, import_node_path2.join)((0, import_node_os.homedir)(), ".kanban");
var FILE = (0, import_node_path2.join)(DIR, "links.json");
var empty = () => ({ version: 1, links: {} });
var readLinks = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs2.readFileSync)(FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.links !== "object" || !parsed.links) return empty();
    return parsed;
  } catch {
    return empty();
  }
};
var writeLinks = (data) => {
  (0, import_node_fs2.mkdirSync)(DIR, { recursive: true, mode: 448 });
  const temp = (0, import_node_path2.join)(DIR, `.links-${process.pid}.tmp`);
  (0, import_node_fs2.writeFileSync)(temp, `${JSON.stringify(data, null, 2)}
`, { mode: 384 });
  (0, import_node_fs2.renameSync)(temp, FILE);
  try {
    (0, import_node_fs2.chmodSync)(FILE, 384);
  } catch {
  }
};
var getLink = (cardId) => readLinks().links[String(cardId)] || null;
var setLink = (cardId, sessionId, meta = {}) => {
  const id = String(cardId || "");
  const session = String(sessionId || "").trim();
  if (!id || !session) throw new Error("La tarjeta y la sesi\xF3n son obligatorias.");
  const data = readLinks();
  data.links[id] = {
    sessionId: session,
    boardId: String(meta.boardId || ""),
    title: String(meta.title || "").slice(0, 200),
    sessionTitle: String(meta.sessionTitle || meta.title || session).slice(0, 120),
    linkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeLinks(data);
  return data.links[id];
};
var clearClosePending = (cardId) => {
  const id = String(cardId || "");
  const data = readLinks();
  if (!data.links[id]?.closePending) return false;
  delete data.links[id].closePending;
  delete data.links[id].closePendingAt;
  writeLinks(data);
  return true;
};
var linksForSession = (sessionId) => {
  const session = String(sessionId || "");
  return Object.entries(readLinks().links).filter(([, link]) => link.sessionId === session);
};
var pendingCloseForSession = (sessionId) => {
  const session = String(sessionId || "");
  const entry = Object.entries(readLinks().links).find(([, link]) => link.closePending && link.sessionId === session);
  return entry || null;
};
var removeLink = (cardId) => {
  const id = String(cardId || "");
  const data = readLinks();
  if (!data.links[id]) return false;
  delete data.links[id];
  writeLinks(data);
  return true;
};
var listLinks = () => readLinks().links;

// src/shared/board-projects.js
var import_node_fs3 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path3 = require("node:path");
var DIR2 = (0, import_node_path3.join)((0, import_node_os2.homedir)(), ".kanban");
var FILE2 = (0, import_node_path3.join)(DIR2, "board-projects.json");
var empty2 = () => ({ version: 1, boards: {} });
var readBoardProjects = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs3.readFileSync)(FILE2, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.boards !== "object" || !parsed.boards) return empty2();
    return parsed;
  } catch {
    return empty2();
  }
};
var write = (data) => {
  (0, import_node_fs3.mkdirSync)(DIR2, { recursive: true, mode: 448 });
  const temp = (0, import_node_path3.join)(DIR2, `.board-projects-${process.pid}.tmp`);
  (0, import_node_fs3.writeFileSync)(temp, `${JSON.stringify(data, null, 2)}
`, { mode: 384 });
  (0, import_node_fs3.renameSync)(temp, FILE2);
  try {
    (0, import_node_fs3.chmodSync)(FILE2, 384);
  } catch {
  }
};
var getBoardProject = (boardId) => {
  const id = String(boardId || "");
  if (!id) return null;
  const project = readBoardProjects().boards[id];
  return project && project.projectId && project.directory ? project : null;
};
var setBoardProject = (boardId, project) => {
  const id = String(boardId || "");
  if (!id) throw new Error("Falta el tablero.");
  const data = readBoardProjects();
  const projectId = String(project?.projectId || "").trim();
  const directory = String(project?.directory || "").trim();
  if (!projectId || !directory) {
    delete data.boards[id];
    write(data);
    return null;
  }
  const value = {
    projectId,
    directory,
    name: String(project?.name || projectId).slice(0, 120),
    autoSession: project?.autoSession === true,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  data.boards[id] = value;
  write(data);
  return value;
};

// src/shared/appearance.js
var import_node_fs4 = require("node:fs");
var import_node_os3 = require("node:os");
var import_node_path4 = require("node:path");
var DIR3 = (0, import_node_path4.join)((0, import_node_os3.homedir)(), ".kanban");
var FILE3 = (0, import_node_path4.join)(DIR3, "appearance.json");
var HEX = /^#[0-9a-f]{6}$/i;
var clean = (value) => {
  const text = String(value || "").trim();
  return HEX.test(text) ? text.toLowerCase() : "";
};
var STYLES = ["neumorphism", "brutalism", "glass"];
var cleanStyle = (value) => STYLES.includes(value) ? value : "neumorphism";
var empty3 = () => ({ version: 1, style: "neumorphism", columns: ["", "", ""], card: "" });
var readAppearance = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs4.readFileSync)(FILE3, "utf8"));
    if (!parsed || typeof parsed !== "object") return empty3();
    const columns = Array.isArray(parsed.columns) ? parsed.columns.slice(0, 3).map(clean) : [];
    while (columns.length < 3) columns.push("");
    return { version: 1, style: cleanStyle(parsed.style), columns, card: clean(parsed.card) };
  } catch {
    return empty3();
  }
};
var writeAppearance = (data) => {
  (0, import_node_fs4.mkdirSync)(DIR3, { recursive: true, mode: 448 });
  const temp = (0, import_node_path4.join)(DIR3, `.appearance-${process.pid}.tmp`);
  (0, import_node_fs4.writeFileSync)(temp, `${JSON.stringify(data, null, 2)}
`, { mode: 384 });
  (0, import_node_fs4.renameSync)(temp, FILE3);
  try {
    (0, import_node_fs4.chmodSync)(FILE3, 384);
  } catch {
  }
};
var setAppearance = (input = {}) => {
  const current = readAppearance();
  const columns = Array.isArray(input.columns) ? input.columns.slice(0, 3).map(clean) : current.columns;
  while (columns.length < 3) columns.push("");
  const next = {
    version: 1,
    style: input.style === void 0 ? current.style : cleanStyle(input.style),
    columns,
    card: input.card === void 0 ? current.card : clean(input.card)
  };
  writeAppearance(next);
  return next;
};

// src/shared/local.js
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var import_node_crypto = require("node:crypto");

// src/shared/planka.js
var POSITION_STEP = 65536;
var DONE_NAME = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;
var PlankaError = class extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "PlankaError";
    this.kind = options.kind || "api";
    this.status = options.status || 0;
    this.step = options.step || "";
    this.code = options.code || "";
  }
};
var byPosition = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
};
var textOf = (value) => typeof value === "string" ? value : "";
var messageFrom = (data, fallback) => {
  if (!data || typeof data !== "object") return fallback;
  if (typeof data.message === "string" && data.message) return data.message;
  if (Array.isArray(data.problems) && data.problems.length) return data.problems.join(" \xB7 ");
  return fallback;
};
var normaliseBaseUrl = (value) => {
  const raw = textOf(value).trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
};
var encode = (value) => encodeURIComponent(String(value));
var dueTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date2 = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    return Number.isNaN(date2.getTime()) ? null : date2.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
var PlankaClient = class {
  constructor(config, options = {}) {
    this.baseUrl = normaliseBaseUrl(config?.baseUrl);
    this.token = textOf(config?.token);
    this.email = textOf(config?.email);
    this.password = textOf(options.password);
    this.onToken = typeof options.onToken === "function" ? options.onToken : null;
    this.reauthing = null;
  }
  async request(path, options = {}) {
    const method = options.method || "GET";
    const auth = options.auth !== false;
    const retry = options.retry !== false;
    const headers = { Accept: "application/json" };
    if (options.body !== void 0) headers["Content-Type"] = "application/json";
    if (options.basic) headers.Authorization = `Basic ${options.basic}`;
    else if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body === void 0 ? void 0 : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeout || 15e3)
      });
    } catch (error) {
      throw new PlankaError(
        error?.name === "TimeoutError" || error?.name === "AbortError" ? "Planka no ha respondido a tiempo." : "No se puede conectar con Planka.",
        { kind: "network" }
      );
    }
    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw.slice(0, 300) };
      }
    }
    if (response.status === 401 && auth && retry && this.password) {
      await this.relogin();
      return this.request(path, { ...options, retry: false });
    }
    if (!response.ok) {
      const step = textOf(data?.step);
      const message = messageFrom(data, `Planka ha respondido ${response.status}.`);
      if (response.status === 403 && (step === "accept-terms" || /terms|t[eé]rminos/i.test(message))) {
        throw new PlankaError(
          "Planka pide aceptar los t\xE9rminos: entra una vez en Planka y vuelve a intentarlo.",
          { kind: "terms", status: 403, step, code: textOf(data?.code) }
        );
      }
      if (response.status === 403 && (step === "verify-totp" || /totp/i.test(message))) {
        throw new PlankaError("Planka pide el c\xF3digo de doble factor. Entra en Planka y vuelve a intentarlo.", {
          kind: "totp",
          status: 403,
          step
        });
      }
      if (response.status === 401) {
        if (options.basic) {
          throw new PlankaError("Correo o contrase\xF1a incorrectos.", {
            kind: "credentials",
            status: 401,
            code: textOf(data?.code)
          });
        }
        throw new PlankaError("La sesi\xF3n de Planka ha caducado. Vuelve a entrar en Kanban.", {
          kind: "auth",
          status: 401,
          code: textOf(data?.code)
        });
      }
      throw new PlankaError(message, {
        kind: "api",
        status: response.status,
        code: textOf(data?.code)
      });
    }
    return data;
  }
  async login() {
    if (!this.email || !this.password) {
      throw new PlankaError("Hacen falta el correo y la contrase\xF1a de Planka.", { kind: "credentials" });
    }
    const basic = Buffer.from(`${this.email}:${this.password}`).toString("base64");
    let data;
    try {
      data = await this.request("/api/access-tokens", {
        method: "POST",
        auth: false,
        basic,
        body: { emailOrUsername: this.email, password: this.password },
        timeout: 15e3
      });
    } catch (error) {
      if (!(error instanceof PlankaError) || error.status !== 400) throw error;
      data = await this.request("/api/access-tokens", {
        method: "POST",
        auth: false,
        basic,
        body: {},
        timeout: 15e3
      });
    }
    const token = typeof data?.item === "string" ? data.item : "";
    if (!token) {
      throw new PlankaError("Planka no ha devuelto un token de acceso.", { kind: "credentials" });
    }
    this.token = token;
    if (this.onToken) this.onToken(token);
    return token;
  }
  async relogin() {
    if (!this.password) {
      throw new PlankaError("La sesi\xF3n de Planka ha caducado. Vuelve a entrar en Kanban.", { kind: "auth" });
    }
    if (!this.reauthing) {
      this.reauthing = this.login().finally(() => {
        this.reauthing = null;
      });
    }
    return this.reauthing;
  }
  async getBoards() {
    const data = await this.request("/api/projects");
    const boards = Array.isArray(data?.included?.boards) ? data.included.boards : [];
    const seen = /* @__PURE__ */ new Set();
    return boards.filter((board) => board && board.id && !seen.has(board.id) && seen.add(board.id)).map((board) => ({
      id: String(board.id),
      name: textOf(board.name) || "Tablero",
      projectId: String(board.projectId || ""),
      position: Number.isFinite(board.position) ? board.position : 0,
      url: `${this.baseUrl}/boards/${board.id}`
    })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  async resolveBoardId(boardId) {
    if (boardId) return String(boardId);
    const boards = await this.getBoards();
    if (!boards.length) {
      throw new PlankaError("Tu usuario de Planka no tiene tableros.", { kind: "empty" });
    }
    return boards[0].id;
  }
  async readBoard(boardId) {
    const data = await this.request(`/api/boards/${encode(boardId)}`);
    return normaliseBoard(data, this.baseUrl, boardId);
  }
  async findCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    return { board, card };
  }
  async createCard(listId, name, boardId, options = {}) {
    const board = await this.readBoard(boardId);
    const list = board.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
    const position = topPosition(list.cards);
    const data = await this.request(`/api/lists/${encode(listId)}/cards`, {
      method: "POST",
      body: {
        type: "project",
        name: String(name || "").trim().slice(0, 1024),
        position,
        ...options.description ? { description: String(options.description) } : {},
        ...options.dueDate ? { dueDate: dueTimestamp(options.dueDate) } : {}
      }
    });
    return data?.item ?? null;
  }
  async updateCard(cardId, patch, boardId) {
    const body = {};
    if (typeof patch.name === "string") {
      const name = patch.name.trim();
      if (!name) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
      body.name = name.slice(0, 1024);
    }
    if (patch.description !== void 0) {
      const description = typeof patch.description === "string" ? patch.description : "";
      body.description = description.trim() ? description : null;
    }
    if (patch.dueDate !== void 0) body.dueDate = dueTimestamp(patch.dueDate);
    if (patch.isDueCompleted !== void 0) body.isDueCompleted = Boolean(patch.isDueCompleted);
    if (patch.listId !== void 0) {
      const board = await this.readBoard(boardId);
      const list = board.lists.find((item) => item.id === String(patch.listId));
      if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
      const index = Number.isInteger(patch.index) ? Math.max(0, Math.min(patch.index, list.cards.length)) : 0;
      body.listId = list.id;
      body.position = positionAtIndex(list.cards, index, cardId);
    }
    if (!Object.keys(body).length) return null;
    const data = await this.request(`/api/cards/${encode(cardId)}`, { method: "PATCH", body });
    return data?.item ?? null;
  }
  async renameList(listId, name) {
    const trimmed = String(name || "").trim().slice(0, 128);
    if (!trimmed) throw new PlankaError("El nombre de la columna no puede quedar vac\xEDo.", { kind: "validation" });
    const data = await this.request(`/api/lists/${encode(listId)}`, {
      method: "PATCH",
      body: { name: trimmed }
    });
    return data?.item ?? null;
  }
  async moveCard(cardId, listId, index, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    const list = board.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
    const targetIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, list.cards.filter((item) => item.id !== card.id).length)) : 0;
    const position = positionAtIndex(list.cards, targetIndex, card.id);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: "PATCH",
      body: { listId: list.id, position }
    });
    return data?.item ?? null;
  }
  async completeCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    if (!board.doneListId) {
      throw new PlankaError("Este tablero no tiene una columna HECHO donde completar la tarjeta.", {
        kind: "validation"
      });
    }
    if (card.listId === board.doneListId) return { item: null, already: true };
    const done = board.lists.find((item) => item.id === board.doneListId);
    const position = topPosition(done?.cards ?? []);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: "PATCH",
      body: { listId: board.doneListId, position }
    });
    return { item: data?.item ?? null, already: false };
  }
  async deleteCard(cardId) {
    await this.request(`/api/cards/${encode(cardId)}`, { method: "DELETE" });
    return true;
  }
  async addChecklist(cardId, name, boardId, tasks = []) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    const position = card.taskLists.length ? Math.max(...card.taskLists.map((item) => item.position || 0)) + POSITION_STEP : POSITION_STEP;
    const created = await this.request(`/api/cards/${encode(cardId)}/task-lists`, {
      method: "POST",
      body: { name: String(name || "Checklist").trim().slice(0, 128), position }
    });
    const taskListId = created?.item?.id;
    const added = [];
    if (taskListId) {
      let next = POSITION_STEP;
      for (const taskName of tasks) {
        const trimmed = String(taskName || "").trim();
        if (!trimmed) continue;
        const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
          method: "POST",
          body: { name: trimmed.slice(0, 1024), position: next }
        });
        next += POSITION_STEP;
        if (data?.item) added.push(data.item);
      }
    }
    return { taskList: created?.item ?? null, tasks: added };
  }
  async addTask(taskListId, name) {
    const boardId = await this.resolveBoardId();
    const board = await this.readBoard(boardId);
    const taskList = board.lists.flatMap((list) => list.cards).flatMap((card) => card.taskLists).find((item) => item.id === String(taskListId));
    const position = taskList && taskList.tasks.length ? Math.max(...taskList.tasks.map((task) => task.position || 0)) + POSITION_STEP : POSITION_STEP;
    const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
      method: "POST",
      body: { name: String(name || "").trim().slice(0, 1024), position }
    });
    return data?.item ?? null;
  }
  async checkTask(taskId, isCompleted) {
    const data = await this.request(`/api/tasks/${encode(taskId)}`, {
      method: "PATCH",
      body: { isCompleted: Boolean(isCompleted) }
    });
    return data?.item ?? null;
  }
  async addLabel(cardId, labelId) {
    const data = await this.request(`/api/cards/${encode(cardId)}/card-labels`, {
      method: "POST",
      body: { labelId: String(labelId) }
    });
    return data?.item ?? null;
  }
  async removeLabel(cardId, labelId, boardId) {
    const { board } = await this.findCard(cardId, boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (!match?.cardLabelId) return false;
    await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: "DELETE" });
    return true;
  }
  async toggleLabel(cardId, labelId, boardId) {
    const { board } = await this.findCard(cardId, boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (match) {
      await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: "DELETE" });
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
};
var flattenCards = (board) => board.lists.flatMap((list) => list.cards);
var topPosition = (cards) => {
  const positions = cards.map((card) => Number(card.position)).filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};
var positionAtIndex = (cards, index, movingId) => {
  const rest = cards.filter((card) => card.id !== String(movingId)).slice().sort(byPosition);
  const target = Math.max(0, Math.min(index, rest.length));
  const previous = rest[target - 1];
  const next = rest[target];
  const previousPosition = Number(previous?.position);
  const nextPositionValue = Number(next?.position);
  let position;
  if (Number.isFinite(previousPosition) && Number.isFinite(nextPositionValue)) {
    position = (previousPosition + nextPositionValue) / 2;
  } else if (Number.isFinite(nextPositionValue)) {
    position = nextPositionValue / 2;
  } else if (Number.isFinite(previousPosition)) {
    position = previousPosition + POSITION_STEP;
  } else {
    position = POSITION_STEP;
  }
  return position > 0 ? position : POSITION_STEP;
};
var normaliseBoard = (payload, baseUrl, requestedBoardId) => {
  const item = payload?.item || {};
  const included = payload?.included || {};
  const labels = Array.isArray(included.labels) ? included.labels : [];
  const labelsById = new Map(labels.map((label) => [String(label.id), label]));
  const cardLabels = Array.isArray(included.cardLabels) ? included.cardLabels : [];
  const taskLists = Array.isArray(included.taskLists) ? included.taskLists : [];
  const tasks = Array.isArray(included.tasks) ? included.tasks : [];
  const lists = (Array.isArray(included.lists) ? included.lists : []).filter((list) => list && list.type === "active").sort(byPosition).map((list) => ({
    id: String(list.id),
    name: textOf(list.name).trim() || "Sin nombre",
    color: textOf(list.color),
    position: Number.isFinite(list.position) ? list.position : 0,
    cards: []
  }));
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const doneList = lists.find((list) => DONE_NAME.test(list.name)) || lists[lists.length - 1] || null;
  const cards = (Array.isArray(included.cards) ? included.cards : []).filter((card) => card && !card.isClosed && listsById.has(String(card.listId))).sort(byPosition);
  for (const card of cards) {
    const list = listsById.get(String(card.listId));
    if (!list) continue;
    const cardTaskLists = taskLists.filter((taskList) => String(taskList.cardId) === String(card.id)).sort(byPosition).map((taskList) => {
      const cardTasks = tasks.filter((task) => String(task.taskListId) === String(taskList.id)).sort(byPosition).map((task) => ({
        id: String(task.id),
        name: textOf(task.name),
        isCompleted: Boolean(task.isCompleted),
        position: Number.isFinite(task.position) ? task.position : 0
      }));
      return {
        id: String(taskList.id),
        name: textOf(taskList.name) || "Checklist",
        position: Number.isFinite(taskList.position) ? taskList.position : 0,
        tasks: cardTasks
      };
    });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0
    );
    const cardLabelRows = cardLabels.filter((cardLabel) => String(cardLabel.cardId) === String(card.id)).map((cardLabel) => {
      const label = labelsById.get(String(cardLabel.labelId));
      return label ? {
        id: String(label.id),
        name: textOf(label.name) || "Etiqueta",
        color: textOf(label.color),
        cardLabelId: String(cardLabel.id)
      } : null;
    }).filter(Boolean);
    list.cards.push({
      id: String(card.id),
      name: textOf(card.name),
      description: textOf(card.description),
      dueDate: card.dueDate ? String(card.dueDate) : "",
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: Number.isFinite(card.position) ? card.position : 0,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done }
    });
  }
  for (const list of lists) list.cards.sort(byPosition);
  const allCards = lists.flatMap((list) => list.cards);
  const boardId = String(item.id || requestedBoardId || "");
  return {
    board: {
      id: boardId,
      name: textOf(item.name) || "Tablero",
      url: `${baseUrl}/boards/${boardId}`,
      baseUrl
    },
    lists,
    labels: labels.map((label) => ({
      id: String(label.id),
      name: textOf(label.name) || "Etiqueta",
      color: textOf(label.color)
    })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    doneListId: doneList?.id || "",
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length
    },
    updatedAt: Date.now()
  };
};
var searchCards = (board, query) => {
  const needle = textOf(query).trim().toLowerCase();
  const cards = flattenCards(board);
  if (!needle) return cards;
  return cards.filter(
    (card) => card.name.toLowerCase().includes(needle) || card.description.toLowerCase().includes(needle)
  );
};

// src/shared/local.js
var POSITION_STEP2 = 65536;
var DONE_NAME2 = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;
var BOARD_ID = "local";
var DEFAULT_LISTS = ["IDEAS", "EN PROGRESO", "HECHO"];
var DEFAULT_LABELS = [
  { name: "Urgente", color: "hsl(0 62% 58%)" },
  { name: "Importante", color: "hsl(38 78% 58%)" },
  { name: "Idea", color: "hsl(210 70% 62%)" }
];
var boardPath = () => process.env.KANBAN_LOCAL_PATH || (0, import_node_path5.join)(ROOT, "board.local.json");
var lockPath = () => `${boardPath()}.lock`;
var sleep = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
var byPosition2 = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
};
var uid = (prefix) => `${prefix}-${(0, import_node_crypto.randomUUID)()}`;
var toIso = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date2 = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    return Number.isNaN(date2.getTime()) ? "" : date2.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
var emptyStore = () => ({
  version: 1,
  board: { id: BOARD_ID, name: "Kanban local" },
  lists: DEFAULT_LISTS.map((name, index) => ({
    id: `list-${index + 1}`,
    name,
    position: (index + 1) * POSITION_STEP2
  })),
  cards: [],
  labels: DEFAULT_LABELS.map((label, index) => ({
    id: `label-${index + 1}`,
    name: label.name,
    color: label.color
  })),
  cardLabels: [],
  taskLists: [],
  tasks: []
});
var normaliseStore = (value) => {
  const base = emptyStore();
  const store = value && typeof value === "object" ? value : {};
  const lists = Array.isArray(store.lists) && store.lists.length ? store.lists : base.lists;
  return {
    version: 1,
    board: {
      id: BOARD_ID,
      name: typeof store.board?.name === "string" && store.board.name.trim() ? store.board.name.trim().slice(0, 120) : base.board.name
    },
    lists: lists.filter((list) => list && list.id).map((list, index) => ({
      id: String(list.id),
      name: String(list.name || `Columna ${index + 1}`).slice(0, 120),
      position: Number.isFinite(list.position) ? list.position : (index + 1) * POSITION_STEP2
    })),
    cards: (Array.isArray(store.cards) ? store.cards : []).filter((card) => card && card.id && card.listId).map((card) => ({
      id: String(card.id),
      listId: String(card.listId),
      name: String(card.name || "Sin t\xEDtulo").slice(0, 1024),
      description: typeof card.description === "string" ? card.description : "",
      position: Number.isFinite(card.position) ? card.position : 0,
      dueDate: typeof card.dueDate === "string" ? card.dueDate : "",
      isDueCompleted: Boolean(card.isDueCompleted),
      createdAt: Number.isFinite(card.createdAt) ? card.createdAt : Date.now()
    })),
    labels: (Array.isArray(store.labels) ? store.labels : base.labels).filter((label) => label && label.id).map((label) => ({
      id: String(label.id),
      name: String(label.name || "Etiqueta").slice(0, 120),
      color: String(label.color || "hsl(210 20% 60%)")
    })),
    cardLabels: (Array.isArray(store.cardLabels) ? store.cardLabels : []).filter((link) => link && link.id && link.cardId && link.labelId).map((link) => ({ id: String(link.id), cardId: String(link.cardId), labelId: String(link.labelId) })),
    taskLists: (Array.isArray(store.taskLists) ? store.taskLists : []).filter((taskList) => taskList && taskList.id && taskList.cardId).map((taskList) => ({
      id: String(taskList.id),
      cardId: String(taskList.cardId),
      name: String(taskList.name || "Checklist").slice(0, 120),
      position: Number.isFinite(taskList.position) ? taskList.position : POSITION_STEP2
    })),
    tasks: (Array.isArray(store.tasks) ? store.tasks : []).filter((task) => task && task.id && task.taskListId).map((task) => ({
      id: String(task.id),
      taskListId: String(task.taskListId),
      name: String(task.name || "").slice(0, 1024),
      isCompleted: Boolean(task.isCompleted),
      position: Number.isFinite(task.position) ? task.position : POSITION_STEP2
    }))
  };
};
var readStore = () => {
  try {
    return normaliseStore(JSON.parse((0, import_node_fs5.readFileSync)(boardPath(), "utf8")));
  } catch {
    return emptyStore();
  }
};
var writeStore = (store) => {
  const target = boardPath();
  const temp = `${target}.tmp`;
  (0, import_node_fs5.writeFileSync)(temp, `${JSON.stringify(store, null, 2)}
`, { mode: 384 });
  (0, import_node_fs5.renameSync)(temp, target);
  try {
    (0, import_node_fs5.chmodSync)(target, 384);
  } catch {
  }
};
var withLock = async (work) => {
  const deadline = Date.now() + 2500;
  let handle = null;
  while (handle === null) {
    try {
      handle = (0, import_node_fs5.openSync)(lockPath(), "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - (0, import_node_fs5.statSync)(lockPath()).mtimeMs > 5e3) {
          (0, import_node_fs5.unlinkSync)(lockPath());
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) {
        throw new PlankaError("El tablero local est\xE1 ocupado, int\xE9ntalo otra vez.", { kind: "busy" });
      }
      await sleep(25);
    }
  }
  try {
    return await work();
  } finally {
    try {
      (0, import_node_fs5.closeSync)(handle);
    } catch {
    }
    try {
      (0, import_node_fs5.unlinkSync)(lockPath());
    } catch {
    }
  }
};
var mutate = (work) => withLock(() => {
  const store = readStore();
  const result = work(store);
  writeStore(store);
  return result;
});
var topPosition2 = (cards) => {
  const positions = cards.map((card) => Number(card.position)).filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP2;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};
var nextPosition = (rows) => {
  const positions = rows.map((row) => Number(row.position)).filter((value) => Number.isFinite(value) && value >= 0);
  return positions.length ? Math.max(...positions) + POSITION_STEP2 : POSITION_STEP2;
};
var positionAtIndex2 = (cards, index, movingId) => {
  const rest = cards.filter((card) => card.id !== String(movingId)).slice().sort(byPosition2);
  const target = Math.max(0, Math.min(index, rest.length));
  const previous = rest[target - 1];
  const next = rest[target];
  const previousPosition = Number(previous?.position);
  const nextPositionValue = Number(next?.position);
  if (Number.isFinite(previousPosition) && Number.isFinite(nextPositionValue)) {
    return (previousPosition + nextPositionValue) / 2;
  }
  if (Number.isFinite(nextPositionValue)) return nextPositionValue / 2;
  if (Number.isFinite(previousPosition)) return previousPosition + POSITION_STEP2;
  return POSITION_STEP2;
};
var findCardRow = (store, cardId) => {
  const card = store.cards.find((item) => item.id === String(cardId));
  if (!card) throw new PlankaError("Esa tarjeta ya no existe en el tablero local.", { kind: "not-found", status: 404 });
  return card;
};
var findListRow = (store, listId) => {
  const list = store.lists.find((item) => item.id === String(listId));
  if (!list) throw new PlankaError("Esa columna ya no existe en el tablero local.", { kind: "not-found", status: 404 });
  return list;
};
var view = (store) => {
  const lists = store.lists.slice().sort(byPosition2).map((list) => ({ id: list.id, name: list.name, color: "", position: list.position, cards: [] }));
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const doneList = lists.find((list) => DONE_NAME2.test(list.name)) || lists[lists.length - 1] || null;
  for (const card of store.cards.slice().sort(byPosition2)) {
    const list = listsById.get(card.listId);
    if (!list) continue;
    const cardTaskLists = store.taskLists.filter((taskList) => taskList.cardId === card.id).sort(byPosition2).map((taskList) => {
      const cardTasks = store.tasks.filter((task) => task.taskListId === taskList.id).sort(byPosition2).map((task) => ({
        id: task.id,
        name: task.name,
        isCompleted: Boolean(task.isCompleted),
        position: task.position
      }));
      return { id: taskList.id, name: taskList.name, position: taskList.position, tasks: cardTasks };
    });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0
    );
    const cardLabelRows = store.cardLabels.filter((link) => link.cardId === card.id).map((link) => {
      const label = store.labels.find((item) => item.id === link.labelId);
      return label ? { id: label.id, name: label.name, color: label.color, cardLabelId: link.id } : null;
    }).filter(Boolean);
    list.cards.push({
      id: card.id,
      name: card.name,
      description: card.description,
      dueDate: card.dueDate || "",
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: card.position,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done }
    });
  }
  for (const list of lists) list.cards.sort(byPosition2);
  const allCards = lists.flatMap((list) => list.cards);
  return {
    board: { id: store.board.id, name: store.board.name, url: "", baseUrl: "" },
    lists,
    labels: store.labels.slice().map((label) => ({ id: label.id, name: label.name, color: label.color })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    doneListId: doneList?.id || "",
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length
    },
    updatedAt: Date.now()
  };
};
var LocalClient = class {
  constructor(config = {}) {
    this.boardId = BOARD_ID;
    this.boardName = typeof config?.boardName === "string" ? config.boardName : "";
  }
  async login() {
    return { token: "local" };
  }
  async getBoards() {
    const store = readStore();
    return [
      {
        id: BOARD_ID,
        name: store.board.name || "Kanban local",
        projectId: "local",
        position: 0,
        url: ""
      }
    ];
  }
  async resolveBoardId() {
    return BOARD_ID;
  }
  async readBoard() {
    return view(readStore());
  }
  async findCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = board.lists.flatMap((list) => list.cards).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en el tablero local.", { kind: "not-found", status: 404 });
    return { board, card };
  }
  async createCard(listId, name, boardId, options = {}) {
    return mutate((store) => {
      const list = findListRow(store, listId);
      const title = String(name || "").trim().slice(0, 1024);
      if (!title) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
      const card = {
        id: uid("card"),
        listId: list.id,
        name: title,
        description: typeof options.description === "string" ? options.description : "",
        position: topPosition2(store.cards.filter((item) => item.listId === list.id)),
        dueDate: toIso(options.dueDate),
        isDueCompleted: false,
        createdAt: Date.now()
      };
      store.cards.push(card);
      return card;
    });
  }
  async updateCard(cardId, patch = {}, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      if (typeof patch.name === "string") {
        const name = patch.name.trim();
        if (!name) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
        card.name = name.slice(0, 1024);
      }
      if (patch.description !== void 0) {
        const description = typeof patch.description === "string" ? patch.description : "";
        card.description = description.trim() ? description : "";
      }
      if (patch.dueDate !== void 0) card.dueDate = toIso(patch.dueDate);
      if (patch.isDueCompleted !== void 0) card.isDueCompleted = Boolean(patch.isDueCompleted);
      if (patch.listId !== void 0) {
        const list = findListRow(store, patch.listId);
        const index = Number.isInteger(patch.index) ? patch.index : 0;
        card.listId = list.id;
        card.position = positionAtIndex2(
          store.cards.filter((item) => item.listId === list.id),
          index,
          card.id
        );
      }
      return card;
    });
  }
  async moveCard(cardId, listId, index, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const list = findListRow(store, listId);
      const target = Number.isInteger(index) ? index : 0;
      card.listId = list.id;
      card.position = positionAtIndex2(
        store.cards.filter((item) => item.listId === list.id),
        target,
        card.id
      );
      return card;
    });
  }
  async completeCard(cardId, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const lists = store.lists.slice().sort(byPosition2);
      const done = lists.find((list) => DONE_NAME2.test(list.name)) || lists[lists.length - 1];
      if (!done) throw new PlankaError("Este tablero no tiene una columna HECHO.", { kind: "validation" });
      if (card.listId === done.id) return { item: null, already: true };
      card.listId = done.id;
      card.position = topPosition2(store.cards.filter((item) => item.listId === done.id));
      return { item: card, already: false };
    });
  }
  async deleteCard(cardId) {
    return mutate((store) => {
      const id = String(cardId);
      store.cards = store.cards.filter((card) => card.id !== id);
      const taskLists = new Set(store.taskLists.filter((taskList) => taskList.cardId === id).map((item) => item.id));
      store.taskLists = store.taskLists.filter((taskList) => taskList.cardId !== id);
      store.tasks = store.tasks.filter((task) => !taskLists.has(task.taskListId));
      store.cardLabels = store.cardLabels.filter((link) => link.cardId !== id);
      return true;
    });
  }
  async renameList(listId, name) {
    return mutate((store) => {
      const list = findListRow(store, listId);
      const trimmed = String(name || "").trim().slice(0, 120);
      if (!trimmed) throw new PlankaError("El nombre de la columna no puede quedar vac\xEDo.", { kind: "validation" });
      list.name = trimmed;
      return list;
    });
  }
  async addChecklist(cardId, name, boardId, tasks = []) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const taskList = {
        id: uid("checklist"),
        cardId: card.id,
        name: String(name || "Checklist").trim().slice(0, 120) || "Checklist",
        position: nextPosition(store.taskLists.filter((item) => item.cardId === card.id))
      };
      store.taskLists.push(taskList);
      const added = [];
      let position = POSITION_STEP2;
      for (const taskName of tasks) {
        const trimmed = String(taskName || "").trim();
        if (!trimmed) continue;
        const task = {
          id: uid("task"),
          taskListId: taskList.id,
          name: trimmed.slice(0, 1024),
          isCompleted: false,
          position
        };
        position += POSITION_STEP2;
        store.tasks.push(task);
        added.push(task);
      }
      return { taskList, tasks: added };
    });
  }
  async addTask(taskListId, name) {
    return mutate((store) => {
      const taskList = store.taskLists.find((item) => item.id === String(taskListId));
      if (!taskList) throw new PlankaError("Esa checklist ya no existe.", { kind: "not-found", status: 404 });
      const task = {
        id: uid("task"),
        taskListId: taskList.id,
        name: String(name || "").trim().slice(0, 1024),
        isCompleted: false,
        position: nextPosition(store.tasks.filter((item) => item.taskListId === taskList.id))
      };
      store.tasks.push(task);
      return task;
    });
  }
  async checkTask(taskId, isCompleted) {
    return mutate((store) => {
      const task = store.tasks.find((item) => item.id === String(taskId));
      if (!task) throw new PlankaError("Esa tarea ya no existe.", { kind: "not-found", status: 404 });
      task.isCompleted = Boolean(isCompleted);
      return task;
    });
  }
  async addLabel(cardId, labelId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const label = store.labels.find((item) => item.id === String(labelId));
      if (!label) throw new PlankaError("Esa etiqueta ya no existe.", { kind: "not-found", status: 404 });
      const existing = store.cardLabels.find((link2) => link2.cardId === card.id && link2.labelId === label.id);
      if (existing) return existing;
      const link = { id: uid("cardlabel"), cardId: card.id, labelId: label.id };
      store.cardLabels.push(link);
      return link;
    });
  }
  async removeLabel(cardId, labelId, boardId) {
    return mutate((store) => {
      const before = store.cardLabels.length;
      store.cardLabels = store.cardLabels.filter(
        (link) => !(link.cardId === String(cardId) && link.labelId === String(labelId))
      );
      return store.cardLabels.length !== before;
    });
  }
  async toggleLabel(cardId, labelId, boardId) {
    const store = readStore();
    const has = store.cardLabels.some(
      (link) => link.cardId === String(cardId) && link.labelId === String(labelId)
    );
    if (has) {
      await this.removeLabel(cardId, labelId, boardId);
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
};
var csvCell = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};
var storeRows = (store) => {
  const lists = store.lists.slice().sort(byPosition2);
  const doneId = (lists.find((list) => DONE_NAME2.test(list.name)) || lists[lists.length - 1])?.id;
  return lists.map((list) => ({
    list,
    cards: store.cards.filter((card) => card.listId === list.id).sort(byPosition2).map((card) => {
      const taskLists = store.taskLists.filter((taskList) => taskList.cardId === card.id);
      const tasks = store.tasks.filter((task) => taskLists.some((taskList) => taskList.id === task.taskListId));
      return {
        card,
        done: list.id === doneId,
        labels: store.cardLabels.filter((link) => link.cardId === card.id).map((link) => store.labels.find((label) => label.id === link.labelId)?.name).filter(Boolean),
        total: tasks.length,
        checked: tasks.filter((task) => task.isCompleted).length
      };
    })
  }));
};
var toMarkdown = (store) => {
  const lines = [`# ${store.board.name}`, ""];
  for (const { list, cards } of storeRows(store)) {
    lines.push(`## ${list.name} (${cards.length})`, "");
    if (!cards.length) lines.push("_Sin tarjetas._", "");
    for (const { card, done, labels, total, checked } of cards) {
      lines.push(`- [${done ? "x" : " "}] ${card.name}`);
      if (card.description.trim()) lines.push(`  - ${card.description.replace(/\n/g, " ").trim()}`);
      if (labels.length) lines.push(`  - Etiquetas: ${labels.join(", ")}`);
      if (total) lines.push(`  - Checklist: ${checked}/${total}`);
      if (card.dueDate) lines.push(`  - Fecha: ${card.dueDate.slice(0, 10)}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}
`;
};
var toCsv = (store) => {
  const rows = [["lista", "estado", "tarjeta", "descripcion", "etiquetas", "checklist_hechas", "checklist_total", "fecha"]];
  for (const { list, cards } of storeRows(store)) {
    for (const { card, done, labels, total, checked } of cards) {
      rows.push([
        list.name,
        done ? "hecha" : "pendiente",
        card.name,
        card.description,
        labels.join("; "),
        checked,
        total,
        card.dueDate ? card.dueDate.slice(0, 10) : ""
      ]);
    }
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}
`;
};
var exportBoard = (format = "json") => {
  const store = readStore();
  if (format === "md") return toMarkdown(store);
  if (format === "csv") return toCsv(store);
  return `${JSON.stringify(store, null, 2)}
`;
};
var importBoard = (raw) => {
  let parsed;
  try {
    parsed = JSON.parse(String(raw || ""));
  } catch {
    throw new PlankaError("Ese texto no es un tablero v\xE1lido.", { kind: "validation" });
  }
  if (!parsed || !Array.isArray(parsed.lists) || !parsed.lists.length) {
    throw new PlankaError("Ese tablero no tiene columnas.", { kind: "validation" });
  }
  const store = normaliseStore(parsed);
  writeStore(store);
  return view(store);
};
var LOCAL_BOARD_ID = BOARD_ID;

// src/service/main.js
var PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT);
var TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN || "";
var SNAPSHOT_TTL_MS = 1500;
var sessionPassword = "";
var cache = { boardId: "", at: 0, data: null, inflight: null };
var pendingCloses = /* @__PURE__ */ new Map();
var serviceHost = null;
try {
  serviceHost = createServiceHost({ env: process.env });
} catch {
  serviceHost = null;
}
var closePrompt = (title) => `La tarjeta \xAB${title || "sin t\xEDtulo"}\xBB se ha movido a HECHO. La tarea est\xE1 terminada. Cierra esta sesi\xF3n.`;
var sendClosePrompt = async (cardId, link) => {
  if (!serviceHost) return false;
  try {
    await serviceHost.sessions.send(link.sessionId, closePrompt(link.title));
    pendingCloses.set(link.sessionId, { cardId, phase: "wait-close", title: link.title });
    clearClosePending(cardId);
    return true;
  } catch {
    pendingCloses.delete(link.sessionId);
    removeLink(cardId);
    return false;
  }
};
var triggerClose = async (cardId) => {
  const link = getLink(cardId);
  if (!link || !serviceHost) return false;
  if (pendingCloses.has(link.sessionId)) return true;
  try {
    const status = await serviceHost.sessions.status(link.sessionId);
    if (status.status === "idle") return sendClosePrompt(cardId, link);
    pendingCloses.set(link.sessionId, { cardId, phase: "wait-idle", title: link.title });
    return true;
  } catch {
    removeLink(cardId);
    return false;
  }
};
var handleSessionEvent = async (event) => {
  const sessionId = event?.session?.id;
  let pending = sessionId ? pendingCloses.get(sessionId) : null;
  if (!pending && sessionId && event.type === "turn-finished") {
    const entry = pendingCloseForSession(sessionId);
    if (entry) {
      const [cardId, link] = entry;
      await sendClosePrompt(cardId, link);
      pending = pendingCloses.get(sessionId) || null;
      if (pending) return;
    }
    const links = linksForSession(sessionId);
    for (const [cardId, link] of links) {
      const boardId = link.boardId || readConfig().boardId;
      if (!boardId) continue;
      try {
        const snapshot = await getSnapshot({ boardId, fresh: true });
        const card = flattenCards(snapshot).find((entry2) => entry2.id === cardId);
        if (!card) {
          removeLink(cardId);
          continue;
        }
        if (card.listId === snapshot.doneListId) {
          await sendClosePrompt(cardId, link);
          return;
        }
      } catch {
      }
    }
  }
  if (!pending) return;
  if (event.type === "turn-finished") {
    if (pending.phase === "wait-idle") {
      const link = getLink(pending.cardId);
      if (link) await sendClosePrompt(pending.cardId, link);
      else pendingCloses.delete(sessionId);
      return;
    }
    if (pending.phase === "wait-close") {
      try {
        if (serviceHost) await serviceHost.sessions.stop(sessionId);
      } catch {
      }
      pendingCloses.delete(sessionId);
      removeLink(pending.cardId);
    }
    return;
  }
  if (event.type === "turn-failed" && pending.phase === "wait-close") {
    try {
      if (serviceHost) await serviceHost.sessions.stop(sessionId);
    } catch {
    }
    pendingCloses.delete(sessionId);
    removeLink(pending.cardId);
  }
};
var client = () => {
  const config = readConfig();
  if (config.source === "local") return new LocalClient(config);
  return new PlankaClient(config, {
    password: sessionPassword,
    onToken: (token) => {
      try {
        saveConfig({ token });
      } catch {
      }
    }
  });
};
var boardIdOf = async (config, requested) => {
  if (config.source === "local") return LOCAL_BOARD_ID;
  const candidate = requested || config.boardId;
  if (candidate) return String(candidate);
  return client().resolveBoardId();
};
var getSnapshot = async ({ boardId = "", fresh = false } = {}) => {
  const config = readConfig();
  if (!isConnected(config)) {
    throw new PlankaError("Conecta Kanban con Planka para ver el tablero.", { kind: "not-configured", status: 401 });
  }
  const id = await boardIdOf(config, boardId);
  const now = Date.now();
  if (!fresh && cache.data && cache.boardId === id && now - cache.at < SNAPSHOT_TTL_MS) {
    return cache.data;
  }
  if (cache.inflight && cache.inflight.id === id) return cache.inflight.promise;
  const promise = client().readBoard(id).then((data) => {
    cache = { boardId: id, at: Date.now(), data, inflight: null };
    return data;
  }).catch((error) => {
    if (cache.inflight?.id === id) cache.inflight = null;
    throw error;
  });
  cache.inflight = { id, promise };
  return promise;
};
var WORK_LIST_NAME = /(^|\b)(en progreso|en proceso|in progress|doing|en curso|wip)(\b|$)/i;
var workListFor = (snapshot) => {
  const named = snapshot?.lists?.find((list) => WORK_LIST_NAME.test(list.name));
  if (named) return named;
  const candidates = (snapshot?.lists || []).filter((list) => list.id !== snapshot.doneListId);
  return candidates[1] || null;
};
var snapshotView = (snapshot) => ({
  ...snapshot,
  project: getBoardProject(snapshot.board.id),
  workListId: workListFor(snapshot)?.id || ""
});
var sessionPrompt = (card, board, project) => {
  const checklist = (card?.taskLists || []).flatMap((taskList) => taskList.tasks.map((task) => `- ${task.name}`)).slice(0, 12);
  return [
    `Trabaja en la tarjeta del kanban \xAB${card?.name || "sin t\xEDtulo"}\xBB del tablero \xAB${board?.name || ""}\xBB.`,
    card?.description ? `Descripci\xF3n: ${card.description}` : "",
    checklist.length ? `Checklist:
${checklist.join("\n")}` : "",
    `Proyecto: ${project.name}.`
  ].filter(Boolean).join("\n");
};
var startWorkSession = async (card, board, project, boardId) => {
  if (!serviceHost) throw new Error("El servicio no puede abrir sesiones en este host.");
  const started = await serviceHost.sessions.start({
    prompt: sessionPrompt(card, board, project),
    title: String(card?.name || "Tarjeta de Kanban").slice(0, 120),
    directory: project.directory
  });
  setLink(card.id, started.sessionId, { boardId, title: card.name, sessionTitle: card.name });
  return { ...started, project: project.name };
};
var short = (value, max = 60) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
};
var sessionStateFor = async (cardId) => {
  const link = getLink(cardId);
  if (!link) return { state: "sin sesi\xF3n", tone: "warning" };
  if (!serviceHost) return { state: "sin control", tone: "muted" };
  try {
    const status = await serviceHost.sessions.status(link.sessionId);
    if (status.status === "busy") return { state: "trabajando", tone: "success" };
    if (status.status === "waiting") return { state: "esperando", tone: "warning" };
    return { state: "parada", tone: "muted" };
  } catch {
    return { state: "sesi\xF3n cerrada", tone: "muted" };
  }
};
var startCardFromStatus = async (cardId, { forceSession = false } = {}) => {
  const config = readConfig();
  if (!isConnected(config)) throw new PlankaError("Conecta Kanban con Planka.", { kind: "not-configured", status: 401 });
  const boardId = await boardIdOf(config);
  const project = getBoardProject(boardId);
  if (!project) throw new PlankaError("Asigna un proyecto al tablero en el panel de Kanban.", { kind: "validation" });
  const existing = getLink(cardId);
  if (existing) return { sessionId: existing.sessionId, project: project.name };
  const snapshot = await getSnapshot({ boardId, fresh: true });
  const card = flattenCards(snapshot).find((entry) => entry.id === String(cardId));
  if (!card) throw new PlankaError("Esa tarjeta ya no existe.", { kind: "not-found", status: 404 });
  const workList = workListFor(snapshot);
  if (!workList) throw new PlankaError("Este tablero no tiene una columna de trabajo.", { kind: "validation" });
  if (card.listId !== workList.id) {
    await client().moveCard(card.id, workList.id, void 0, boardId);
    invalidate();
  }
  if (!forceSession) {
    return { moved: true, autoPending: project.autoSession === true, project: project.name };
  }
  const started = await startWorkSession(card, snapshot.board, project, boardId);
  return { sessionId: started.sessionId, project: project.name };
};
var moveCardToBacklog = async (cardId) => {
  const config = readConfig();
  if (!isConnected(config)) throw new PlankaError("Conecta Kanban con Planka.", { kind: "not-configured", status: 401 });
  const boardId = await boardIdOf(config);
  const snapshot = await getSnapshot({ boardId, fresh: true });
  const card = flattenCards(snapshot).find((entry) => entry.id === String(cardId));
  if (!card) throw new PlankaError("Esa tarjeta ya no existe.", { kind: "not-found", status: 404 });
  const workList = workListFor(snapshot);
  const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId);
  if (!backlog) throw new PlankaError("Este tablero no tiene una lista de ideas.", { kind: "validation" });
  if (card.listId === backlog.id) return;
  await client().moveCard(card.id, backlog.id, 0, boardId);
  invalidate();
};
var handleStatusAction = async (body) => {
  const id = String(body.id || "");
  if (id.startsWith("back-")) {
    await moveCardToBacklog(id.slice("back-".length));
    return;
  }
  if (id.startsWith("start-idea-")) {
    await startCardFromStatus(id.slice("start-idea-".length));
    return;
  }
  if (id === "start-task") {
    const cardId = String(body.value || "");
    if (cardId && cardId !== "none") await startCardFromStatus(cardId);
    return;
  }
  if (id.startsWith("start-")) {
    await startCardFromStatus(id.slice("start-".length));
    return;
  }
  if (id.startsWith("complete-")) {
    const cardId = id.slice("complete-".length);
    const config = readConfig();
    const boardId = await boardIdOf(config);
    await client().completeCard(cardId, boardId);
    invalidate();
    await triggerClose(cardId);
    return;
  }
  throw new PlankaError("Acci\xF3n no reconocida.", { kind: "validation" });
};
var invalidate = () => {
  cache = { boardId: cache.boardId, at: 0, data: null, inflight: null };
};
var statusView = async () => {
  const config = readConfig();
  if (!isConnected(config)) {
    return {
      rows: [
        {
          kind: "note",
          id: "kanban-connect",
          text: "Kanban: abre la extensi\xF3n y conecta con Planka.",
          tone: "info"
        }
      ]
    };
  }
  try {
    const snapshot = await getSnapshot();
    const project = getBoardProject(snapshot.board.id);
    const workList = workListFor(snapshot);
    const doneList = snapshot.lists.find((list) => list.id === snapshot.doneListId) || null;
    const total = snapshot.counts.total;
    const completed = doneList?.cards.length || 0;
    const percent = total ? Math.round(completed / total * 100) : 0;
    const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId) || null;
    const current = workList?.cards[0] || null;
    const session = current ? await sessionStateFor(current.id) : null;
    const rows = [
      {
        kind: "line",
        id: "kanban-summary",
        label: snapshot.board.name,
        dot: snapshot.counts.incomplete > 0 ? "accent" : "success",
        content: { kind: "bar", value: percent, tone: "success" },
        value: `${completed}/${total}`,
        tooltip: project ? `Sesiones en ${project.name}` : "Sin proyecto asignado; as\xEDgnalo en el panel de Kanban."
      }
    ];
    if (current) {
      const actions = [
        {
          kind: "button",
          id: `complete-${current.id}`,
          label: "Completar",
          variant: "outline",
          confirm: `\xBFCompletar \xAB${short(current.name, 40)}\xBB?`
        }
      ];
      rows.push({
        kind: "line",
        id: "kanban-current",
        label: "En curso",
        dot: session.tone,
        value: short(current.name, 18),
        tooltip: `${current.name} \xB7 ${session.state}`,
        actions
      });
    } else {
      rows.push({
        kind: "note",
        id: "kanban-current",
        text: "Sin tarea en curso.",
        tone: "muted"
      });
    }
    const ideas = backlog?.cards || [];
    const ideaCards = ideas.slice(0, 3);
    ideaCards.forEach((card, index) => {
      rows.push({
        kind: "note",
        id: `kanban-idea-${card.id}`,
        text: `${index + 1}. ${String(card.name || "Idea").slice(0, 195)}`
      });
    });
    const controls = ideaCards.length ? ideaCards.map((card, index) => ({
      kind: "button",
      id: `start-idea-${card.id}`,
      label: String(index + 1)
    })) : void 0;
    if (ideas.length > 3) {
      rows.push({
        kind: "note",
        id: "kanban-more-ideas",
        text: `y ${ideas.length - 3} ideas m\xE1s en ${backlog?.name || "la lista"}.`,
        tone: "muted"
      });
    } else if (!ideas.length) {
      rows.push({
        kind: "note",
        id: "kanban-no-ideas",
        text: "No hay ideas en la lista de entrada.",
        tone: "muted"
      });
    }
    if (!project) {
      rows.push({
        kind: "note",
        id: "kanban-project",
        text: "Asigna un proyecto a este tablero en el panel de Kanban para crear sesiones.",
        tone: "warning"
      });
    }
    return controls ? { rows, controls } : { rows };
  } catch (error) {
    return {
      rows: [
        {
          kind: "note",
          id: "kanban-error",
          text: error instanceof PlankaError ? error.message : "No se puede leer Planka.",
          tone: "warning"
        }
      ]
    };
  }
};
var readBody = (req) => new Promise((resolve2, reject) => {
  let raw = "";
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > 2e6) {
      reject(new PlankaError("La petici\xF3n es demasiado grande.", { kind: "validation", status: 413 }));
      req.destroy();
      return;
    }
    raw += chunk;
  });
  req.on("end", () => {
    if (!raw) {
      resolve2({});
      return;
    }
    try {
      resolve2(JSON.parse(raw));
    } catch {
      reject(new PlankaError("El cuerpo de la petici\xF3n no es JSON v\xE1lido.", { kind: "validation", status: 400 }));
    }
  });
  req.on("error", reject);
});
var requireConnected = () => {
  const config = readConfig();
  if (!isConnected(config)) {
    throw new PlankaError("Conecta Kanban con Planka para continuar.", { kind: "not-configured", status: 401 });
  }
  return config;
};
var statusOf = (error) => {
  if (!(error instanceof PlankaError)) return 500;
  if (error.status) return error.status;
  if (error.kind === "network") return 502;
  if (error.kind === "auth" || error.kind === "credentials" || error.kind === "not-configured") return 401;
  if (error.kind === "terms" || error.kind === "totp") return 403;
  if (error.kind === "not-found") return 404;
  return 400;
};
var routes = {
  "POST /login": async (body) => {
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const baseUrl = String(body.baseUrl || readConfig().baseUrl || "").trim();
    if (!email || !password) {
      throw new PlankaError("Escribe tu correo y tu contrase\xF1a de Planka.", { kind: "validation" });
    }
    const next = new PlankaClient({ ...readConfig(), baseUrl, email }, {
      password,
      onToken: () => {
      }
    });
    const token = await next.login();
    sessionPassword = password;
    const boards = await next.getBoards().catch(() => []);
    const chosen = body.boardId && String(body.boardId) || (boards.find((board) => board.id === readConfig().boardId)?.id ?? "") || boards[0]?.id || "";
    const boardName = boards.find((board) => board.id === chosen)?.name || "";
    saveConfig({ baseUrl, email, token, boardId: chosen, boardName });
    invalidate();
    let snapshot = null;
    try {
      snapshot = await getSnapshot({ fresh: true });
    } catch {
      snapshot = null;
    }
    return { ok: true, boards, boardId: chosen, snapshot };
  },
  "POST /logout": async () => {
    sessionPassword = "";
    clearConfig();
    invalidate();
    return { ok: true };
  },
  "GET /config": async () => {
    const config = readConfig();
    if (config.source === "local") {
      let boards2 = [];
      try {
        boards2 = await client().getBoards();
      } catch {
        boards2 = [];
      }
      const board2 = boards2[0] || null;
      return {
        connected: true,
        source: "local",
        baseUrl: "",
        email: "",
        boardId: LOCAL_BOARD_ID,
        boardName: board2?.name || "Kanban local",
        boards: boards2,
        boardUrl: ""
      };
    }
    if (!isConnected(config)) {
      return {
        connected: false,
        source: "planka",
        baseUrl: config.baseUrl,
        email: config.email,
        boardId: config.boardId,
        boardName: config.boardName,
        boards: []
      };
    }
    let boards = [];
    try {
      boards = await client().getBoards();
    } catch {
      boards = [];
    }
    const board = boards.find((item) => item.id === config.boardId) || boards[0] || null;
    return {
      connected: true,
      baseUrl: config.baseUrl,
      email: config.email,
      boardId: board?.id || config.boardId,
      boardName: board?.name || config.boardName,
      boards,
      boardUrl: board?.url || "",
      source: "planka"
    };
  },
  "POST /config": async (body) => {
    const source = body?.source === "local" ? "local" : "planka";
    saveConfig({ source });
    invalidate();
    return { source };
  },
  "POST /local/export": async (body) => {
    if (readConfig().source !== "local") {
      throw new PlankaError("La copia solo existe en el tablero local.", { kind: "validation" });
    }
    const format = body?.format === "md" || body?.format === "csv" ? body.format : "json";
    const downloads = (0, import_node_path6.join)((0, import_node_os4.homedir)(), "Downloads");
    const dir = (0, import_node_fs6.existsSync)(downloads) ? downloads : ROOT;
    const file = (0, import_node_path6.join)(dir, `kanban-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.${format}`);
    (0, import_node_fs6.writeFileSync)(file, exportBoard(format), { mode: 384 });
    return { path: file.replace((0, import_node_os4.homedir)(), "~"), name: (0, import_node_path6.basename)(file), format };
  },
  "POST /local/import": async (body) => {
    if (readConfig().source !== "local") {
      throw new PlankaError("Restaurar solo vale en el tablero local.", { kind: "validation" });
    }
    importBoard(body?.data);
    invalidate();
    return { ok: true };
  },
  "GET /appearance": async () => ({ appearance: readAppearance() }),
  "POST /appearance": async (body) => ({ appearance: setAppearance(body || {}) }),
  "GET /work": async () => {
    const config = readConfig();
    if (!isConnected(config)) return { connected: false };
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId });
    const project = getBoardProject(boardId);
    const workList = workListFor(snapshot);
    const doneList = snapshot.lists.find((list) => list.id === snapshot.doneListId) || null;
    const total = snapshot.counts.total;
    const completed = doneList?.cards.length || 0;
    const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId) || null;
    const currentCard = workList?.cards[0] || null;
    let current = null;
    if (currentCard) {
      const state = await sessionStateFor(currentCard.id);
      const link = getLink(currentCard.id);
      current = {
        id: currentCard.id,
        name: currentCard.name,
        state: state.state,
        tone: state.tone,
        sessionId: link?.sessionId || ""
      };
    }
    return {
      connected: true,
      board: { id: snapshot.board.id, name: snapshot.board.name },
      style: readAppearance().style,
      counts: { total, completed, incomplete: total - completed },
      project: project ? {
        id: project.projectId,
        name: project.name,
        directory: project.directory,
        autoSession: project.autoSession === true
      } : null,
      current,
      ideas: (backlog?.cards || []).slice(0, 50).map((card) => ({ id: card.id, name: card.name })),
      backlogId: backlog?.id || "",
      backlogName: backlog?.name || ""
    };
  },
  "GET /boards": async () => {
    requireConnected();
    return { boards: await client().getBoards() };
  },
  "GET /sessions": async () => {
    const links = listLinks();
    const entries = await Promise.all(
      Object.keys(links).map(async (cardId) => [cardId, await sessionStateFor(cardId)])
    );
    return { sessions: Object.fromEntries(entries) };
  },
  "GET /link": async (_body, url) => ({
    link: getLink(url.searchParams.get("cardId") || "")
  }),
  "POST /link": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    const sessionId = String(body.sessionId || "");
    if (!cardId || !sessionId) throw new PlankaError("Faltan la tarjeta o la sesi\xF3n.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId });
    const card = flattenCards(snapshot).find((entry) => entry.id === cardId);
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    const link = setLink(cardId, sessionId, {
      boardId,
      title: card.name,
      sessionTitle: String(body.sessionTitle || "").trim() || sessionId
    });
    return { link };
  },
  "DELETE /link": async (body) => {
    const cardId = String(body.cardId || "");
    if (!cardId) throw new PlankaError("Falta la tarjeta.", { kind: "validation" });
    removeLink(cardId);
    return { ok: true };
  },
  "GET /snapshot": async (_body, url) => {
    const boardId = url.searchParams.get("boardId") || "";
    const fresh = url.searchParams.get("fresh") === "1";
    const snapshot = await getSnapshot({ boardId, fresh });
    return snapshotView(snapshot);
  },
  "GET /mapping": async (_body, url) => ({
    project: getBoardProject(url.searchParams.get("boardId") || "")
  }),
  "POST /mapping": async (body) => {
    requireConnected();
    const boardId = String(body.boardId || readConfig().boardId || "");
    if (!boardId) throw new PlankaError("Falta el tablero.", { kind: "validation" });
    const project = setBoardProject(boardId, body);
    return { project };
  },
  "GET /card": async (_body, url) => {
    requireConnected();
    const id = url.searchParams.get("id");
    if (!id) throw new PlankaError("Falta el id de la tarjeta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const board = await getSnapshot({ boardId, fresh: true });
    const card = flattenCards(board).find((item) => item.id === String(id));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    return { card, askedAt: Date.now() };
  },
  "GET /search": async (_body, url) => {
    requireConnected();
    const snapshot = await getSnapshot();
    const query = url.searchParams.get("q") || "";
    return {
      query,
      cards: searchCards(snapshot, query).map((card) => ({
        id: card.id,
        name: card.name,
        description: card.description,
        listId: card.listId,
        labels: card.labels
      }))
    };
  },
  "POST /card": async (body) => {
    requireConnected();
    const listId = String(body.listId || "");
    const name = String(body.name || "").trim();
    if (!listId || !name) throw new PlankaError("La tarjeta necesita columna y t\xEDtulo.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const item = await client().createCard(listId, name, boardId, {
      description: body.description,
      dueDate: body.dueDate
    });
    invalidate();
    return { card: item };
  },
  "PATCH /card": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    if (!id) throw new PlankaError("Falta el id de la tarjeta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const item = await client().updateCard(id, body, boardId);
    invalidate();
    return { card: item };
  },
  "PATCH /list": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    const name = String(body.name || "").trim();
    if (!id || !name) throw new PlankaError("La columna necesita id y nombre.", { kind: "validation" });
    const item = await client().renameList(id, name);
    invalidate();
    return { list: item };
  },
  "POST /card/move": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    const listId = String(body.listId || "");
    if (!id || !listId) throw new PlankaError("Faltan la tarjeta o la columna.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const before = await getSnapshot({ boardId, fresh: true }).catch(() => null);
    const beforeCard = before ? flattenCards(before).find((card) => card.id === id) : null;
    const workList = before ? workListFor(before) : null;
    const item = await client().moveCard(id, listId, Number.isInteger(body.index) ? body.index : void 0, boardId);
    invalidate();
    const snapshot = await getSnapshot({ boardId }).catch(() => null);
    if (snapshot?.doneListId !== listId) clearClosePending(id);
    let linked = false;
    let sessionId = "";
    let needsMapping = false;
    let manual = false;
    let autoPending = false;
    let sessionError = "";
    if (snapshot?.doneListId === listId) {
      linked = await triggerClose(id);
    } else if (workList && listId === workList.id && beforeCard?.listId !== workList.id) {
      const existing = getLink(id);
      if (existing) {
        sessionId = existing.sessionId;
      } else {
        const project = getBoardProject(boardId);
        if (!project) {
          needsMapping = true;
        } else if (project.autoSession !== true) {
          manual = true;
        } else {
          autoPending = true;
        }
      }
    }
    return {
      card: item,
      linked,
      sessionId,
      needsMapping,
      manual,
      autoPending,
      sessionError,
      project: getBoardProject(boardId)?.name || ""
    };
  },
  "POST /card/back": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    if (!cardId) throw new PlankaError("Falta la tarjeta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId, fresh: true });
    const workList = workListFor(snapshot);
    const backlog = snapshot.lists.find(
      (list) => list.id !== workList?.id && list.id !== snapshot.doneListId
    );
    if (!backlog) throw new PlankaError("Este tablero no tiene una lista de ideas.", { kind: "validation" });
    const card = flattenCards(snapshot).find((entry) => entry.id === cardId);
    if (!card) throw new PlankaError("Esa tarjeta ya no existe.", { kind: "not-found", status: 404 });
    const link = getLink(cardId);
    if (link) {
      if (serviceHost) {
        try {
          await serviceHost.sessions.stop(link.sessionId);
        } catch {
        }
      }
      removeLink(cardId);
    }
    await client().moveCard(card.id, backlog.id, 0, boardId);
    invalidate();
    return { ok: true, list: backlog.name, stopped: Boolean(link) };
  },
  "POST /session/start": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    if (!cardId) throw new PlankaError("Falta la tarjeta.", { kind: "validation" });
    return startCardFromStatus(cardId, { forceSession: true });
  },
  "POST /session/stop": async (body) => {
    requireConnected();
    const sessionId = String(body.sessionId || "");
    if (!sessionId) throw new PlankaError("Falta la sesi\xF3n.", { kind: "validation" });
    if (!serviceHost) throw new PlankaError("El servicio no puede controlar sesiones en este host.", { kind: "api" });
    const result = await serviceHost.sessions.stop(sessionId);
    pendingCloses.delete(sessionId);
    return result;
  },
  "POST /card/complete": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    if (!id) throw new PlankaError("Falta el id de la tarjeta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const result = await client().completeCard(id, boardId);
    invalidate();
    const linked = result.already ? false : await triggerClose(id);
    return { ...result, linked };
  },
  "DELETE /card": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    if (!id) throw new PlankaError("Falta el id de la tarjeta.", { kind: "validation" });
    const link = getLink(id);
    if (link) {
      if (serviceHost) {
        try {
          await serviceHost.sessions.stop(link.sessionId);
        } catch {
        }
      }
      removeLink(id);
    }
    await client().deleteCard(id);
    invalidate();
    return { ok: true };
  },
  "POST /board": async (body) => {
    requireConnected();
    const boardId = String(body.boardId || "");
    if (!boardId) throw new PlankaError("Elige un tablero.", { kind: "validation" });
    const boards = await client().getBoards();
    const board = boards.find((item) => item.id === boardId);
    if (!board) throw new PlankaError("Ese tablero no est\xE1 disponible.", { kind: "not-found", status: 404 });
    saveConfig({ boardId: board.id, boardName: board.name });
    invalidate();
    return snapshotView(await getSnapshot({ boardId, fresh: true }));
  },
  "POST /checklist": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    const name = String(body.name || "Checklist").trim();
    if (!cardId) throw new PlankaError("Falta la tarjeta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const result = await client().addChecklist(cardId, name, boardId, tasks);
    invalidate();
    return result;
  },
  "POST /task": async (body) => {
    requireConnected();
    const taskListId = String(body.taskListId || "");
    const name = String(body.name || "").trim();
    if (!taskListId || !name) throw new PlankaError("La tarea necesita checklist y nombre.", { kind: "validation" });
    const item = await client().addTask(taskListId, name);
    invalidate();
    return { task: item };
  },
  "PATCH /task": async (body) => {
    requireConnected();
    const id = String(body.id || "");
    if (!id) throw new PlankaError("Falta el id de la tarea.", { kind: "validation" });
    const item = await client().checkTask(id, body.isCompleted);
    invalidate();
    return { task: item };
  },
  "POST /label": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    const labelId = String(body.labelId || "");
    if (!cardId || !labelId) throw new PlankaError("Faltan la tarjeta o la etiqueta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const added = await client().toggleLabel(cardId, labelId, boardId);
    invalidate();
    return { added };
  },
  "DELETE /label": async (body) => {
    requireConnected();
    const cardId = String(body.cardId || "");
    const labelId = String(body.labelId || "");
    if (!cardId || !labelId) throw new PlankaError("Faltan la tarjeta o la etiqueta.", { kind: "validation" });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    await client().removeLabel(cardId, labelId, boardId);
    invalidate();
    return { ok: true };
  }
};
var server = import_node_http.default.createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end(JSON.stringify({ message: "No autorizado." }));
    return;
  }
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const path = url.pathname;
  const method = (req.method || "GET").toUpperCase();
  if (path === "/health") {
    res.writeHead(200).end("{}");
    return;
  }
  const run = async () => {
    if (path === "/status") {
      if (method === "POST") {
        const body2 = await readBody(req);
        await handleStatusAction(body2);
      }
      const view2 = await statusView();
      res.writeHead(200).end(JSON.stringify(view2));
      return;
    }
    if (path === SESSION_EVENTS_PATH && method === "POST") {
      const body2 = await readBody(req);
      res.writeHead(200).end(JSON.stringify({ ok: true }));
      const request = readSessionEventRequest(JSON.stringify(body2));
      if (request) void handleSessionEvent(request.event);
      return;
    }
    const handler = routes[`${method} ${path}`];
    if (!handler) {
      res.writeHead(404).end(JSON.stringify({ message: "Ruta no encontrada." }));
      return;
    }
    let body = {};
    if (method !== "GET" && method !== "DELETE") body = await readBody(req);
    else if (method === "DELETE") body = await readBody(req);
    const answer = await handler(body, url);
    res.writeHead(200).end(JSON.stringify(answer));
  };
  run().catch((error) => {
    const status = statusOf(error);
    res.writeHead(status).end(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Ha fallado la petici\xF3n.",
        kind: error instanceof PlankaError ? error.kind : "unknown"
      })
    );
  });
});
server.listen(PORT, "127.0.0.1");
var shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
