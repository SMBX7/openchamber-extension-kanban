(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

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
    const root2 = doc.documentElement;
    if (root2.hasAttribute("data-oc-scrollbar-activity"))
      return;
    root2.setAttribute("data-oc-scrollbar-activity", "");
    const timers = /* @__PURE__ */ new WeakMap();
    doc.addEventListener("scroll", (event) => {
      const target = event.target === doc ? root2 : event.target;
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

  // node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // node_modules/@openchamber/sdk/dist/shells.js
  var GUEST_SHELL_ID_MAX = 128;
  var GUEST_SHELL_OUTPUT_TAIL_MAX = 65536;

  // node_modules/@openchamber/sdk/dist/status-controls.js
  var GUEST_STATUS_CONTROLS_MAX = 4;
  var GUEST_STATUS_CONTROL_ID = /^[a-z][a-z0-9-]{0,39}$/;
  var GUEST_STATUS_CONTROL_LABEL_MAX = 60;
  var GUEST_STATUS_CONTROL_OPTIONS_MAX = 16;
  var GUEST_STATUS_CONTROL_VALUE_MAX = 80;
  var isControlObject = (value) => Object(value) === value && !Array.isArray(value);
  var hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
  var isLabel = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_LABEL_MAX;
  var isValue = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_VALUE_MAX;
  var isGuestStatusControls = (controls) => {
    if (!Array.isArray(controls) || controls.length > GUEST_STATUS_CONTROLS_MAX)
      return false;
    const ids = /* @__PURE__ */ new Set();
    for (const control of controls) {
      if (!isControlObject(control) || !GUEST_STATUS_CONTROL_ID.test(control.id) || !isLabel(control.label))
        return false;
      if (control.disabled !== void 0 && control.disabled !== true && control.disabled !== false)
        return false;
      if (ids.has(control.id))
        return false;
      ids.add(control.id);
      if (control.kind === "button") {
        if (!hasOnlyKeys(control, ["kind", "id", "label", "disabled"]))
          return false;
        continue;
      }
      if (control.kind !== "select" || !hasOnlyKeys(control, ["kind", "id", "label", "value", "options", "disabled"]))
        return false;
      if (!isValue(control.value) || !Array.isArray(control.options) || control.options.length < 1 || control.options.length > GUEST_STATUS_CONTROL_OPTIONS_MAX)
        return false;
      const values = /* @__PURE__ */ new Set();
      for (const option of control.options) {
        if (!isControlObject(option) || !hasOnlyKeys(option, ["value", "label"]) || !isValue(option.value) || !isLabel(option.label) || values.has(option.value))
          return false;
        values.add(option.value);
      }
      if (!values.has(control.value))
        return false;
    }
    return true;
  };

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
  var SESSION_EVENTS_IDLE_MS = 10 * 6e4;
  var EVENT_TYPES = new Set(GUEST_SESSION_EVENT_TYPES);

  // node_modules/@openchamber/sdk/dist/service-host.js
  var SERVICE_SCHEDULE_IDLE_MS = 10 * 6e4;
  var MENTIONS_IDLE_MS = 10 * 6e4;

  // node_modules/@openchamber/sdk/dist/file-editor.js
  var GUEST_FILE_EDITOR_CONTENT_MAX = 2e7;
  var GUEST_FILE_EDITOR_VERSION_MAX = 256;
  var fileEditorPayloadSize = (value) => "bytes" in value ? value.bytes.byteLength : value.content.length;
  var sameFileEditorDocument = (left, right) => {
    if (left.path !== right.path || left.readOnly !== right.readOnly)
      return false;
    if (left.encoding === "text" || right.encoding === "text") {
      return left.encoding === "text" && right.encoding === "text" && left.content === right.content;
    }
    if (left.bytes.byteLength !== right.bytes.byteLength)
      return false;
    for (let index = 0; index < left.bytes.byteLength; index += 1) {
      if (left.bytes[index] !== right.bytes[index])
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/popover.js
  var GUEST_POPOVER_ID = /^[A-Za-z0-9_-]{1,80}$/;
  var GUEST_POPOVER_COORDINATE_MAX = 1e5;
  var GUEST_POPOVER_WIDTH_MIN = 160;
  var GUEST_POPOVER_WIDTH_MAX = 640;
  var GUEST_POPOVER_HEIGHT_MIN = 48;
  var GUEST_POPOVER_HEIGHT_MAX = 480;
  var GUEST_POPOVER_DATA_MAX = 16e3;
  var GUEST_POPOVER_DATA_DEPTH_MAX = 32;
  var GUEST_POPOVER_SIDES = ["left", "right", "top", "bottom"];
  var hasBoundedJsonTree = (value, depth = 0, budget = { remaining: GUEST_POPOVER_DATA_MAX }) => {
    if (--budget.remaining < 0 || depth >= GUEST_POPOVER_DATA_DEPTH_MAX)
      return false;
    if (value === null)
      return true;
    const children = Array.isArray(value) ? value : Object(value) === value ? Object.values(value) : [];
    for (const item of children) {
      if (!hasBoundedJsonTree(item, depth + 1, budget))
        return false;
    }
    return true;
  };
  var isFiniteJson = (value) => {
    if (value === null || value === true || value === false)
      return true;
    if (Array.isArray(value))
      return Object.keys(value).every((key) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length) && value.every(isFiniteJson);
    if (Object(value) === value) {
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype) && Object.values(value).every(isFiniteJson);
    }
    return String(value) === value || Number.isFinite(value);
  };
  var isGuestPopoverRequest = (request) => {
    try {
      if (String(request.id) !== request.id || !GUEST_POPOVER_ID.test(request.id) || !Number.isFinite(request.anchor.x) || Math.abs(request.anchor.x) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.y) || Math.abs(request.anchor.y) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.width) || !Number.isFinite(request.anchor.height) || request.anchor.width <= 0 || request.anchor.height <= 0 || request.anchor.width > GUEST_POPOVER_COORDINATE_MAX || request.anchor.height > GUEST_POPOVER_COORDINATE_MAX || !Number.isInteger(request.width) || request.width < GUEST_POPOVER_WIDTH_MIN || request.width > GUEST_POPOVER_WIDTH_MAX || !Number.isInteger(request.height) || request.height < GUEST_POPOVER_HEIGHT_MIN || request.height > GUEST_POPOVER_HEIGHT_MAX || request.side !== void 0 && !GUEST_POPOVER_SIDES.includes(request.side) || request.focus !== void 0 && request.focus !== true && request.focus !== false || !hasBoundedJsonTree(request.data) || !isFiniteJson(request.data))
        return false;
      return JSON.stringify(request.data).length <= GUEST_POPOVER_DATA_MAX;
    } catch {
      return false;
    }
  };

  // node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_BLOCK_ANSWER_MAX = 2e3;
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
  var GUEST_COMMIT_SHA = /^[0-9a-f]{7,64}$/i;
  var isGuestCommitSha = (value) => GUEST_COMMIT_SHA.test(value);
  var GUEST_TOAST_MAX = 500;
  var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
  var GUEST_COMPOSE_TEXT_MAX = 16e3;
  var GUEST_ATTACH_ID_MAX = 128;
  var GUEST_ATTACH_TITLE_MAX = 200;
  var GUEST_ATTACH_URL_MAX = 2e3;
  var GUEST_ATTACH_TEXT_MAX = 16e3;
  var GUEST_ATTACH_AUTHOR_MAX = 80;
  var GUEST_ATTACH_BRANCH_MAX = 200;
  var GUEST_ATTACH_DATA_MAX = 16e3;
  var GUEST_REQUEST_PATH_MAX = 2e3;
  var GUEST_REQUEST_TIMEOUT_MS = 2e4;
  var GUEST_FILE_PATH_MAX = 1024;
  var GUEST_FILE_CONTENT_MAX = 2e6;
  var GUEST_GENERATE_PROMPT_MAX = 64e3;
  var GUEST_GENERATE_SYSTEM_MAX = 8e3;
  var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
  var GUEST_GENERATE_TIMEOUT_MS = 96e4;
  var GUEST_GENERATE_LATE_KEEP_MS = 60 * 6e4;
  var GUEST_BADGE_MAX = 999;
  var GUEST_FRAME_HEIGHT_MAX = 1e4;
  var GUEST_RESOLVE_ERROR_MAX = 500;
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
  var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
  var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
  var isJsonValue = (value) => {
    if (value === void 0)
      return false;
    if (value === null || value === true || value === false)
      return true;
    if (String(value) === value)
      return true;
    if (Number(value) === value)
      return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(isJsonValue);
    if (Object(value) === value)
      return Object.values(value).every(isJsonValue);
    return false;
  };
  var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= GUEST_ATTACH_DATA_MAX;
  var clampBranch = (value) => value?.trim().slice(0, GUEST_ATTACH_BRANCH_MAX) ?? "";
  var clampAttachRequest = (request) => {
    const id = request.id.trim().slice(0, GUEST_ATTACH_ID_MAX);
    const title = request.title.trim().slice(0, GUEST_ATTACH_TITLE_MAX);
    const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
    const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text) {
      next.text = text;
    }
    if (author) {
      next.author = author;
    }
    if (kind === "pull") {
      const head = clampBranch(request.branches?.head);
      const base = clampBranch(request.branches?.base);
      if (head && base) {
        next.branches = { head, base };
      }
    }
    if (isAttachData(request.data)) {
      next.data = request.data;
    }
    return next;
  };
  var clampStartSessionRequest = (request) => {
    const next = clampAttachRequest(request);
    if (request.projectId)
      next.projectId = request.projectId;
    if (request.navigation)
      next.navigation = request.navigation;
    if (request.worktree) {
      next.worktree = request.worktree;
    }
    return next;
  };
  var clampPromptRequest = (request) => {
    const next = {
      text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX)
    };
    if (request.send) {
      next.send = true;
    }
    return next;
  };
  var clampBadgeCount = (count) => {
    if (count === null || !Number.isFinite(count))
      return null;
    return Math.min(GUEST_BADGE_MAX, Math.max(0, Math.round(count)));
  };
  var clampFrameHeight = (height) => {
    if (!Number.isFinite(height))
      return 0;
    return Math.min(GUEST_FRAME_HEIGHT_MAX, Math.max(0, Math.ceil(height)));
  };
  var isGuestFilePath = (value) => value.length > 0 && value.length <= GUEST_FILE_PATH_MAX && !value.includes("\0") && !value.includes("\\");
  var isGuestRequestPath = (value) => {
    if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) {
      return false;
    }
    if (value.length > GUEST_REQUEST_PATH_MAX) {
      return false;
    }
    const segments = value.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  };
  var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
  var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
  var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
  var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
  var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
  var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
  var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
  var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
  var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
  var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
    "workspace",
    "shells",
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action",
    "service-event",
    "status-control-event",
    "popover-closed",
    "file-open",
    "file-snapshot",
    "file-saved",
    "generate-late"
  ]);
  var asWireRecord = (data) => Object(data) === data ? data : null;
  var isNonEmptyString = (value) => String(value) === value && value.length > 0;
  var readResultMessage = (wire) => {
    if (!isNonEmptyString(wire.id))
      return null;
    if (wire.ok === true) {
      const message = {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: true
      };
      if (Object(wire.payload) === wire.payload) {
        message.payload = wire.payload;
      }
      return message;
    }
    if (wire.ok === false && isNonEmptyString(wire.error)) {
      return {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: false,
        error: wire.error,
        code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
      };
    }
    return null;
  };
  var readHostMessage = (data) => {
    const wire = asWireRecord(data);
    if (!wire || wire.channel !== OPENCHAMBER_SDK_CHANNEL || wire.v !== OPENCHAMBER_SDK_API_VERSION)
      return null;
    if (wire.type === "result")
      return readResultMessage(wire);
    if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload)
      return null;
    return wire;
  };

  // node_modules/@openchamber/sdk/dist/host.js
  var isKeyEvent = (event) => "key" in event && "metaKey" in event && "ctrlKey" in event;
  var isSaveShortcut = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
  var HostRequestError = class extends Error {
    constructor(code, message) {
      super(message);
      __publicField(this, "code");
      this.name = "HostRequestError";
      this.code = code;
    }
  };
  var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", 'Request path must start with "/" and stay on the declared origin.'));
  var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
  var deviceStorageScope = (options) => {
    if (options === void 0)
      return void 0;
    if (Object(options) !== options || Array.isArray(options) || options.scope !== void 0 && options.scope !== "instance" && options.scope !== "device") {
      throw new HostRequestError("HOST_REJECTED", 'Storage scope must be "instance" or "device".');
    }
    return options.scope === "device" ? "device" : void 0;
  };
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options = {}) => {
    const target = options.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    const blockListeners = /* @__PURE__ */ new Set();
    const serviceEventListeners = /* @__PURE__ */ new Set();
    const statusControlListeners = /* @__PURE__ */ new Set();
    const popoverClosedListeners = /* @__PURE__ */ new Set();
    const lateGenerateListeners = /* @__PURE__ */ new Set();
    const unclaimedLateGenerate = [];
    let resolveHandler = null;
    let actionHandler = null;
    const fileOpenListeners = /* @__PURE__ */ new Set();
    const fileSavedListeners = /* @__PURE__ */ new Set();
    let fileSnapshotHandler = null;
    let lastFile = null;
    let saveShortcutInstalled = false;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    const shellsListeners = /* @__PURE__ */ new Map();
    let disposed = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
    let popoverPointerActive = false;
    let popoverFocusActive = false;
    let popoverActivityReported = null;
    const lifecycleFromSession = (session) => {
      if (!session)
        return null;
      return {
        sessionId: session.id,
        phase: session.busy ? "started" : "completed"
      };
    };
    const post = (message) => {
      target.parent.postMessage(message, "*");
    };
    const listenForLateGenerate = () => {
      if (disposed || target.parent === target || lateGenerateListeners.size === 0 || lastReady?.features?.lateGenerateResults !== true)
        return;
      post({ channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION, type: "generate-late-listen" });
    };
    const emit = (listeners, value) => {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const onMessage = (event) => {
      if (!(event instanceof MessageEvent))
        return;
      if (!acceptSource(event.source))
        return;
      const message = readHostMessage(event.data);
      if (!message)
        return;
      if (message.type === "workspace") {
        const listener = workspaceListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "shells") {
        const listener = shellsListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "ready") {
        lastReady = message.payload;
        lastLifecycle = lifecycleFromSession(message.payload.session);
        emit(readyListeners, message.payload);
        emit(directoryListeners, message.payload.directory);
        emit(sessionListeners, message.payload.session);
        if (lastLifecycle) {
          emit(lifecycleListeners, lastLifecycle);
        }
        emit(connectionListeners, message.payload.connection);
        emit(settingsListeners, message.payload.settings);
        emit(itemListeners, message.payload.item);
        if (message.payload.block)
          emit(blockListeners, message.payload.block);
        listenForLateGenerate();
        return;
      }
      if (message.type === "service-event") {
        emit(serviceEventListeners, message.payload);
        return;
      }
      if (message.type === "generate-late") {
        if (lateGenerateListeners.size === 0)
          unclaimedLateGenerate.push(message.payload);
        else
          emit(lateGenerateListeners, message.payload);
        return;
      }
      if (message.type === "directory") {
        if (lastReady) {
          lastReady = { ...lastReady, directory: message.payload.directory };
        }
        emit(directoryListeners, message.payload.directory);
        return;
      }
      if (message.type === "session") {
        if (lastReady) {
          lastReady = { ...lastReady, session: message.payload.session };
        }
        if (!message.payload.session) {
          lastLifecycle = null;
        } else if (lastLifecycle?.sessionId !== message.payload.session.id) {
          lastLifecycle = lifecycleFromSession(message.payload.session);
        }
        emit(sessionListeners, message.payload.session);
        return;
      }
      if (message.type === "session-lifecycle") {
        lastLifecycle = message.payload;
        emit(lifecycleListeners, message.payload);
        return;
      }
      if (message.type === "connection") {
        if (lastReady) {
          lastReady = { ...lastReady, connection: message.payload.connection };
        }
        emit(connectionListeners, message.payload.connection);
        return;
      }
      if (message.type === "settings") {
        if (lastReady) {
          lastReady = { ...lastReady, settings: message.payload.settings };
        }
        emit(settingsListeners, message.payload.settings);
        return;
      }
      if (message.type === "item") {
        if (lastReady) {
          lastReady = { ...lastReady, item: message.payload.item };
        }
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "status-control-event") {
        emit(statusControlListeners, message.payload);
        return;
      }
      if (message.type === "popover-closed") {
        emit(popoverClosedListeners, message.payload);
        return;
      }
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "action-result",
              id: message.id,
              payload
            });
        };
        const handler = actionHandler;
        if (!handler) {
          answer({ ok: false, error: "This extension does not handle background actions." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      if (message.type === "file-open") {
        const next = message.payload;
        if (lastFile && sameFileEditorDocument(lastFile, next))
          return;
        lastFile = next;
        emit(fileOpenListeners, message.payload);
        return;
      }
      if (message.type === "file-saved") {
        emit(fileSavedListeners, message.payload.version);
        return;
      }
      if (message.type === "file-snapshot") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "file-snapshot-result",
              id: message.id,
              payload
            });
        };
        const fail = (text) => answer({ error: (text.trim() || "Could not read the edited file.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        const handler = fileSnapshotHandler;
        if (!handler) {
          fail("This extension does not edit files.");
          return;
        }
        Promise.resolve().then(() => handler(message.payload.purpose)).then((snapshot) => {
          if (fileEditorPayloadSize(snapshot) > GUEST_FILE_EDITOR_CONTENT_MAX) {
            fail(`The file is over ${GUEST_FILE_EDITOR_CONTENT_MAX} ${"bytes" in snapshot ? "bytes" : "characters"}.`);
            return;
          }
          if (snapshot.version.length > GUEST_FILE_EDITOR_VERSION_MAX) {
            fail(`The snapshot version is over ${GUEST_FILE_EDITOR_VERSION_MAX} characters.`);
            return;
          }
          answer({ snapshot: "bytes" in snapshot ? { bytes: snapshot.bytes, version: snapshot.version } : { content: snapshot.content, version: snapshot.version } });
        }, (error) => fail(error instanceof Error ? error.message : String(error)));
        return;
      }
      if (message.type === "resolve") {
        const answer = (payload) => {
          post({
            channel: OPENCHAMBER_SDK_CHANNEL,
            v: OPENCHAMBER_SDK_API_VERSION,
            type: "resolve-result",
            id: message.id,
            payload
          });
        };
        const handler = resolveHandler;
        if (!handler) {
          answer({ error: "This extension does not resolve commands." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      const waiter = pending.get(message.id);
      if (!waiter)
        return;
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.ok) {
        waiter.resolve(message.payload);
        return;
      }
      waiter.reject(new HostRequestError(message.code, message.error));
    };
    target.addEventListener("message", onMessage);
    post({
      channel: OPENCHAMBER_SDK_CHANNEL,
      v: OPENCHAMBER_SDK_API_VERSION,
      type: "hello"
    });
    const send = (message, timeoutMs = requestTimeoutMs) => {
      if (disposed || target.parent === target) {
        return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(message.id);
          reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
        }, timeoutMs);
        pending.set(message.id, { resolve, reject, timer });
        post(message);
      });
    };
    const request = (message) => send(message).then(() => void 0);
    const envelope = { channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION };
    const notify = (message) => {
      if (!disposed && target.parent !== target)
        post(message);
    };
    const requestFileSave = () => notify({ ...envelope, type: "file-save" });
    const onSaveShortcut = (event) => {
      if (!isKeyEvent(event) || !isSaveShortcut(event))
        return;
      event.preventDefault();
      requestFileSave();
    };
    const onPopoverEscape = (event) => {
      if (!isKeyEvent(event) || event.key !== "Escape" || lastReady?.surface !== "popover" || !lastReady.popover)
        return;
      event.preventDefault();
      void closePopover(lastReady.popover.id, "escape").catch(() => void 0);
    };
    const reportPopoverActivity = () => {
      const popover = lastReady?.surface === "popover" ? lastReady.popover : void 0;
      if (!popover)
        return;
      const active2 = popoverPointerActive || popoverFocusActive;
      if (popoverActivityReported === active2)
        return;
      popoverActivityReported = active2;
      void setPopoverAnchorActive(popover.id, active2).catch(() => void 0);
    };
    const onPopoverPointerOver = () => {
      if (lastReady?.surface !== "popover" || popoverPointerActive)
        return;
      popoverPointerActive = true;
      reportPopoverActivity();
    };
    const onPopoverPointerOut = (event) => {
      if (lastReady?.surface !== "popover" || event.relatedTarget !== null || !popoverPointerActive)
        return;
      popoverPointerActive = false;
      reportPopoverActivity();
    };
    const onPopoverFocus = () => {
      if (lastReady?.surface !== "popover" || popoverFocusActive)
        return;
      popoverFocusActive = true;
      reportPopoverActivity();
    };
    const onPopoverBlur = () => {
      if (lastReady?.surface !== "popover" || !popoverFocusActive)
        return;
      popoverFocusActive = false;
      reportPopoverActivity();
    };
    const requireIdentity = (value, maximum = 1024) => {
      if (!value.trim() || value.length > maximum)
        throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
    };
    const readWorkspace = async (query) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const result = await send({ ...envelope, type: "workspace-read", id: nextId(ids), payload: query });
      if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) {
        throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
      }
      return result;
    };
    const subscribeWorkspace = async (query, listener) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const subscriptionId = nextId(ids);
      workspaceListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "workspace-subscribe", id: nextId(ids), payload: { subscriptionId, query } });
      } catch (error) {
        workspaceListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const subscribeShells = async (scope, listener) => {
      if (scope.kind === "session")
        requireIdentity(scope.sessionId);
      if (scope.kind === "project")
        requireIdentity(scope.projectId);
      const subscriptionId = nextId(ids);
      shellsListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "shells-subscribe", id: nextId(ids), payload: { subscriptionId, scope } });
      } catch (error) {
        shellsListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!shellsListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const storage = async (payload) => {
      if ("key" in payload && (payload.key.length === 0 || payload.key.length > GUEST_STORAGE_KEY_MAX)) {
        throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
      }
      if (payload.op === "set" && !isJsonValue(payload.value)) {
        throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
      }
      if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > GUEST_STORAGE_VALUE_BYTES) {
        throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
      }
      if (payload.scope === "device" && lastReady?.features?.deviceStorage !== true) {
        throw new HostRequestError("UNSUPPORTED", "This host does not support device storage.");
      }
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
    const closePopover = (id, reason) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-close", id: nextId(ids), payload: reason ? { id, reason } : { id } });
    const setPopoverAnchorActive = (id, active2) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-anchor", id: nextId(ids), payload: { id, active: active2 } });
    target.addEventListener("keydown", onPopoverEscape, true);
    target.addEventListener("pointerover", onPopoverPointerOver);
    target.addEventListener("pointermove", onPopoverPointerOver);
    target.addEventListener("pointerout", onPopoverPointerOut);
    target.addEventListener("focus", onPopoverFocus);
    target.addEventListener("blur", onPopoverBlur);
    return {
      onAction: (handler) => {
        actionHandler = handler;
        return () => {
          if (actionHandler === handler)
            actionHandler = null;
        };
      },
      listProjects: async () => {
        const result = await readWorkspace({ kind: "projects" });
        if (result.kind !== "projects")
          throw new HostRequestError("HOST_REJECTED", "Expected projects.");
        return result;
      },
      listWorktrees: async (projectId) => {
        const result = await readWorkspace({ kind: "worktrees", projectId });
        if (result.kind !== "worktrees")
          throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
        return result;
      },
      listSessions: async (projectId) => {
        const result = await readWorkspace({ kind: "sessions", projectId });
        if (result.kind !== "sessions")
          throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
        return result;
      },
      onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
        if (snapshot.kind === "projects")
          listener(snapshot);
      }),
      onWorktrees: (projectId, listener) => subscribeWorkspace({ kind: "worktrees", projectId }, (snapshot) => {
        if (snapshot.kind === "worktrees")
          listener(snapshot);
      }),
      onSessions: (projectId, listener) => subscribeWorkspace({ kind: "sessions", projectId }, (snapshot) => {
        if (snapshot.kind === "sessions")
          listener(snapshot);
      }),
      onRunningShells: (scope, listener) => subscribeShells(scope, listener),
      readShellOutput: async (shellId, options2) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const cursor = options2?.cursor;
        if (cursor !== void 0 && (!Number.isInteger(cursor) || cursor < 0)) {
          throw new HostRequestError("HOST_REJECTED", "Shell output cursor must be a non-negative integer.");
        }
        const tailBytes = options2?.tailBytes;
        if (tailBytes !== void 0 && (!Number.isInteger(tailBytes) || tailBytes < 1 || tailBytes > GUEST_SHELL_OUTPUT_TAIL_MAX)) {
          throw new HostRequestError("HOST_REJECTED", `Shell output tailBytes must be an integer between 1 and ${GUEST_SHELL_OUTPUT_TAIL_MAX}.`);
        }
        const result = await send({ ...envelope, type: "shell-output", id: nextId(ids), payload: { shellId, cursor, tailBytes } });
        const output = result;
        if (!output || typeof output.output !== "string" || !Number.isFinite(output.cursor)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return shell output.");
        }
        return output;
      },
      stopShell: async (shellId) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const result = await send({ ...envelope, type: "shell-stop", id: nextId(ids), payload: { shellId } });
        if (result?.stopped !== true)
          throw new HostRequestError("HOST_REJECTED", "Host did not stop the shell.");
        return { stopped: true };
      },
      openSession: async (sessionId) => {
        requireIdentity(sessionId);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId } });
      },
      storage: {
        get: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "get", key };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key, value, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "set", key, value };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        delete: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "delete", key };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        keys: async (options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "keys" };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          if (result.op !== "keys")
            throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
          return result.keys;
        }
      },
      onReady: (listener) => {
        readyListeners.add(listener);
        if (lastReady)
          listener(lastReady);
        return () => {
          readyListeners.delete(listener);
        };
      },
      onDirectory: (listener) => {
        directoryListeners.add(listener);
        if (lastReady)
          listener(lastReady.directory);
        return () => {
          directoryListeners.delete(listener);
        };
      },
      onSession: (listener) => {
        sessionListeners.add(listener);
        if (lastReady)
          listener(lastReady.session);
        return () => {
          sessionListeners.delete(listener);
        };
      },
      onSessionLifecycle: (listener) => {
        lifecycleListeners.add(listener);
        if (lastLifecycle)
          listener(lastLifecycle);
        return () => {
          lifecycleListeners.delete(listener);
        };
      },
      onConnection: (listener) => {
        connectionListeners.add(listener);
        if (lastReady)
          listener(lastReady.connection);
        return () => {
          connectionListeners.delete(listener);
        };
      },
      onSettings: (listener) => {
        settingsListeners.add(listener);
        if (lastReady)
          listener(lastReady.settings);
        return () => {
          settingsListeners.delete(listener);
        };
      },
      onItem: (listener) => {
        itemListeners.add(listener);
        if (lastReady)
          listener(lastReady.item);
        return () => {
          itemListeners.delete(listener);
        };
      },
      onBlock: (listener) => {
        blockListeners.add(listener);
        if (lastReady?.block)
          listener(lastReady.block);
        return () => {
          blockListeners.delete(listener);
        };
      },
      onServiceEvent: (listener) => {
        serviceEventListeners.add(listener);
        return () => {
          serviceEventListeners.delete(listener);
        };
      },
      onStatusControl: (listener) => {
        statusControlListeners.add(listener);
        return () => {
          statusControlListeners.delete(listener);
        };
      },
      onPopoverClosed: (listener) => {
        popoverClosedListeners.add(listener);
        return () => {
          popoverClosedListeners.delete(listener);
        };
      },
      setStatusControls: (controls) => {
        if (lastReady?.features?.statusControls !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support status controls."));
        }
        if (!isGuestStatusControls(controls)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Status controls must have unique bounded ids and valid selected options."));
        }
        return request({ ...envelope, type: "status-controls", id: nextId(ids), payload: { controls } });
      },
      openPopover: (payload) => {
        if (lastReady?.features?.popovers !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers."));
        }
        if (!isGuestPopoverRequest(payload)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Popover requests need bounded geometry and JSON data."));
        }
        return request({ ...envelope, type: "popover-open", id: nextId(ids), payload });
      },
      closePopover,
      setPopoverAnchorActive,
      onResolve: (handler) => {
        resolveHandler = handler;
        return () => {
          if (resolveHandler === handler)
            resolveHandler = null;
        };
      },
      toast: (payload) => {
        const message = payload.message.trim();
        if (!message || message.length > GUEST_TOAST_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to ${GUEST_TOAST_MAX} characters.`));
        }
        if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > GUEST_CLIPBOARD_TEXT_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
        }
        return request({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "toast",
          id: nextId(ids),
          payload: { ...payload, message }
        });
      },
      openUrl: (url) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-url",
        id: nextId(ids),
        payload: { url }
      }),
      openCommit: (sha) => isGuestCommitSha(sha) ? request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-commit",
        id: nextId(ids),
        payload: { sha }
      }) : Promise.reject(new HostRequestError("HOST_REJECTED", "Commit id must be 7 to 64 hex characters.")),
      answerBlock: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "block-answer",
        id: nextId(ids),
        payload: { text: text.trim().slice(0, GUEST_BLOCK_ANSWER_MAX) }
      }),
      openSurface: (surfaceId) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-surface",
        id: nextId(ids),
        payload: { surfaceId }
      }),
      writeClipboard: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text }
      }),
      compose: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "compose",
        id: nextId(ids),
        payload
      }),
      attach: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "attach",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      startSession: async (payload) => {
        if (payload.projectId !== void 0)
          requireIdentity(payload.projectId);
        const worktree = payload.worktree;
        if (worktree && worktree !== true) {
          if (worktree.kind === "existing")
            requireIdentity(worktree.directory);
          else {
            if (worktree.name !== void 0)
              requireIdentity(worktree.name, 200);
            if (worktree.baseBranch !== void 0)
              requireIdentity(worktree.baseBranch, 200);
          }
        }
        const result = await send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "start-session",
          id: nextId(ids),
          payload: clampStartSessionRequest(payload)
        }, options.requestTimeoutMs ?? 18e4);
        if (!isStartSessionResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
        }
        return result;
      },
      prompt: (payload) => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "prompt",
        id: nextId(ids),
        payload: clampPromptRequest(payload)
      }).then((result) => {
        if (!isPromptResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
        }
        return result;
      }),
      sessionLink: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "session-link",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      close: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "close",
        id: nextId(ids)
      }),
      oauthStart: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-start",
        id: nextId(ids)
      }),
      oauthDisconnect: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-disconnect",
        id: nextId(ids)
      }),
      request: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
        }
        return result;
      }),
      serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
        }
        return result;
      }),
      serviceStatus: () => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-status",
        id: nextId(ids)
      }).then((result) => {
        if (!isServiceStatusResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
        }
        return result;
      }),
      readFile: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-read",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileReadResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
        }
        return result;
      }),
      writeFile: (path, content) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content }
        }).then((result) => {
          if (!isFileWriteResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
          }
          return result;
        });
      },
      listDir: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-list",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileListResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
        }
        return result;
      }),
      stat: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-stat",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileStatResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
        }
        return result;
      }),
      generate: (input) => {
        const prompt = input.prompt.trim();
        const system = input.system?.trim();
        if (prompt.length === 0 || prompt.length > GUEST_GENERATE_PROMPT_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
        }
        if (system !== void 0 && (system.length === 0 || system.length > GUEST_GENERATE_SYSTEM_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
        }
        const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
        if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
        }
        const payload = { prompt };
        if (system !== void 0)
          payload.system = system;
        if (maxOutputTokens !== void 0)
          payload.maxOutputTokens = maxOutputTokens;
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "generate",
          id: nextId(ids),
          payload
        }, options.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      onLateGenerateResult: (listener) => {
        lateGenerateListeners.add(listener);
        for (const result of unclaimedLateGenerate.splice(0))
          emit([listener], result);
        listenForLateGenerate();
        return () => {
          lateGenerateListeners.delete(listener);
        };
      },
      setBadge: (count) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count) }
      }),
      setHeight: (height) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "resize",
        id: nextId(ids),
        payload: { height: clampFrameHeight(height) }
      }),
      onFileOpen: (listener) => {
        fileOpenListeners.add(listener);
        if (!saveShortcutInstalled) {
          saveShortcutInstalled = true;
          target.addEventListener("keydown", onSaveShortcut, true);
        }
        if (lastFile)
          listener(lastFile);
        return () => {
          fileOpenListeners.delete(listener);
        };
      },
      onFileSnapshot: (handler) => {
        fileSnapshotHandler = handler;
        return () => {
          if (fileSnapshotHandler === handler)
            fileSnapshotHandler = null;
        };
      },
      onFileSaved: (listener) => {
        fileSavedListeners.add(listener);
        return () => {
          fileSavedListeners.delete(listener);
        };
      },
      reportFileChange: (change) => notify({ ...envelope, type: "file-change", payload: { dirty: change.dirty, edited: change.edited } }),
      requestFileSave,
      reportFileUnsupported: () => notify({ ...envelope, type: "file-unsupported" }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        for (const subscriptionId of shellsListeners.keys()) {
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        shellsListeners.clear();
        disposed = true;
        resolveHandler = null;
        actionHandler = null;
        fileSnapshotHandler = null;
        fileOpenListeners.clear();
        fileSavedListeners.clear();
        if (saveShortcutInstalled)
          target.removeEventListener("keydown", onSaveShortcut, true);
        target.removeEventListener("message", onMessage);
        target.removeEventListener("keydown", onPopoverEscape, true);
        target.removeEventListener("pointerover", onPopoverPointerOver);
        target.removeEventListener("pointermove", onPopoverPointerOver);
        target.removeEventListener("pointerout", onPopoverPointerOut);
        target.removeEventListener("focus", onPopoverFocus);
        target.removeEventListener("blur", onPopoverBlur);
        for (const waiter of pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
        }
        pending.clear();
        readyListeners.clear();
        directoryListeners.clear();
        sessionListeners.clear();
        lifecycleListeners.clear();
        connectionListeners.clear();
        settingsListeners.clear();
        itemListeners.clear();
        blockListeners.clear();
        serviceEventListeners.clear();
        statusControlListeners.clear();
        popoverClosedListeners.clear();
        lateGenerateListeners.clear();
        unclaimedLateGenerate.length = 0;
      }
    };
  };

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

  // node_modules/@openchamber/sdk/dist/ui/theme.js
  var TOKEN_VARS = [
    ["--oc-bg", "background"],
    ["--oc-elevated", "elevated"],
    ["--oc-fg", "foreground"],
    ["--oc-muted", "muted"],
    ["--oc-subtle", "subtle"],
    ["--oc-border", "border"],
    ["--oc-hover", "hover"],
    ["--oc-selection", "selection"],
    ["--oc-focus", "focus"],
    ["--oc-primary", "primary"],
    ["--oc-muted-surface", "mutedSurface"],
    ["--oc-elevated-fg", "elevatedForeground"],
    ["--oc-active", "active"],
    ["--oc-selection-fg", "selectionForeground"],
    ["--oc-primary-fg", "primaryForeground"],
    ["--oc-primary-text", "primaryText"],
    ["--oc-success-text", "successText"],
    ["--oc-warning-text", "warningText"],
    ["--oc-error-text", "errorText"],
    ["--oc-info-text", "infoText"],
    ["--oc-success", "success"],
    ["--oc-warning", "warning"],
    ["--oc-error", "error"],
    ["--oc-info", "info"],
    ["--oc-font", "font"],
    ["--oc-mono", "mono"],
    ["--oc-radius", "radius"],
    ["--surface-background", "background"],
    ["--surface-elevated", "elevated"],
    ["--surface-foreground", "foreground"],
    ["--surface-muted-foreground", "muted"],
    ["--surface-subtle", "subtle"],
    ["--interactive-border", "border"],
    ["--interactive-hover", "hover"],
    ["--interactive-selection", "selection"],
    ["--interactive-focus-ring", "focus"],
    ["--primary", "primary"],
    ["--surface-muted", "mutedSurface"],
    ["--surface-elevated-foreground", "elevatedForeground"],
    ["--interactive-active", "active"],
    ["--interactive-selection-foreground", "selectionForeground"],
    ["--primary-foreground", "primaryForeground"],
    ["--primary-text", "primaryText"],
    ["--success-text", "successText"],
    ["--warning-text", "warningText"],
    ["--error-text", "errorText"],
    ["--info-text", "infoText"],
    ["--status-success", "success"],
    ["--status-warning", "warning"],
    ["--status-error", "error"],
    ["--status-info", "info"],
    ["--font-sans", "font"],
    ["--font-mono", "mono"],
    ["--radius", "radius"]
  ];
  var SYNTAX_TOKEN_VARS = [
    ["--oc-syntax-keyword", "--syntax-keyword", "syntaxKeyword"],
    ["--oc-syntax-string", "--syntax-string", "syntaxString"],
    ["--oc-syntax-number", "--syntax-number", "syntaxNumber"],
    ["--oc-syntax-function", "--syntax-function", "syntaxFunction"],
    ["--oc-syntax-type", "--syntax-type", "syntaxType"],
    ["--oc-syntax-comment", "--syntax-comment", "syntaxComment"],
    ["--oc-syntax-variable", "--syntax-variable", "syntaxVariable"],
    ["--oc-syntax-operator", "--syntax-operator", "syntaxOperator"]
  ];
  var applyHostTheme = (theme, root2) => {
    root2.style.colorScheme = theme.mode;
    for (const [name, key] of TOKEN_VARS) {
      root2.style.setProperty(name, theme.tokens[key]);
    }
    for (const [alias, hostName, key] of SYNTAX_TOKEN_VARS) {
      const value = theme.tokens[key] ?? "";
      root2.style.setProperty(alias, value);
      root2.style.setProperty(hostName, value);
    }
    root2.style.setProperty("font-family", theme.tokens.font);
    root2.style.setProperty("font-size", "0.875rem");
    root2.style.setProperty("line-height", "1.45");
    root2.style.setProperty("color", theme.tokens.foreground);
  };
  var applyHostReady = (ctx, root2) => {
    applyHostTheme(ctx.theme, root2);
    if (root2.dataset) {
      root2.dataset.ocSurface = ctx.surface;
      root2.dataset.ocTheme = ctx.theme.mode;
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/style.js
  var OC_ALIAS = {
    "surface-background": "bg",
    "surface-elevated": "elevated",
    "surface-elevated-foreground": "elevated-fg",
    "surface-foreground": "fg",
    "surface-muted-foreground": "muted",
    "surface-muted": "muted-surface",
    "surface-subtle": "subtle",
    "interactive-border": "border",
    "interactive-hover": "hover",
    "interactive-active": "active",
    "interactive-selection": "selection",
    "interactive-selection-foreground": "selection-fg",
    "interactive-focus-ring": "focus",
    "primary": "primary",
    "primary-foreground": "primary-fg",
    "primary-text": "primary-text",
    "success-text": "success-text",
    "warning-text": "warning-text",
    "error-text": "error-text",
    "info-text": "info-text",
    "status-success": "success",
    "status-warning": "warning",
    "status-error": "error",
    "status-info": "info",
    "font-sans": "font",
    "font-mono": "mono",
    "radius": "radius"
  };
  var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
  var bg = v("surface-background", "transparent");
  var elevated = v("surface-elevated", "transparent");
  var elevatedFg = v("surface-elevated-foreground", "inherit");
  var fg = v("surface-foreground", "inherit");
  var muted = v("surface-muted-foreground", "gray");
  var secondary = v("surface-muted", "transparent");
  var border = v("interactive-border", "currentColor");
  var hover = v("interactive-hover", "transparent");
  var active = v("interactive-active", "transparent");
  var selection = v("interactive-selection", "transparent");
  var selectionFg = v("interactive-selection-foreground", "inherit");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var controlRadius = `calc(${radius} - 2px)`;
  var smallRadius = `calc(${radius} - 4px)`;
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusFill = `background-image: linear-gradient(${hover}, ${hover});`;
  var field = (edge, width = "0.5px") => `box-shadow: inset 0 0 0 ${width} ${edge}, var(--oc-sdk-field-lift);`;
  var raised = "border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);";
  var litButton = "box-shadow: var(--oc-sdk-lit);";
  var darkLift = `inset 0 0.5px 0 0 ${mix(fg, 8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`;
  var THEME_VARS = `
:root {
  --oc-sdk-edge: ${mix(fg, 16)};
  --oc-sdk-field-bg: ${elevated};
  --oc-sdk-raised-bg: ${bg};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${mix(fg, 14)};
  --oc-sdk-field-bg: ${mix(bg, 50, elevated)};
  --oc-sdk-raised-bg: ${elevated};
  --oc-sdk-field-lift: ${darkLift};
  --oc-sdk-raised-lift: ${darkLift};
  --oc-sdk-lit: ${darkLift};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var UI_SIZE_CSS = `
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: 2px; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`;
  var GUEST_UI_LOOK_CSS = `${THEME_VARS}
.oc-sdk { color: ${fg}; font-family: ${font}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${focusFill} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { border-radius: ${controlRadius}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${smallRadius}; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; ${litButton} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; ${litButton} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; box-shadow: none; }

.oc-sdk-field-note { color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { border-radius: ${controlRadius}; background: var(--oc-sdk-field-bg); color: ${elevatedFg}; ${field("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${field(mix(fg, 26), "1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${field(v("status-error", "red"), "1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search-icon { color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { border-radius: ${smallRadius}; color: ${muted}; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-trigger { border-radius: ${controlRadius}; background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { color: ${muted}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${elevated}; background-clip: padding-box; color: ${elevatedFg}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option-check { color: ${fg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-hint { color: ${muted}; }
.oc-sdk-popup-empty { color: ${muted}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${border}; border-radius: 4px; color: ${fg}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(fg, 60, border)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusFill} }
.oc-sdk-check-desc { color: ${muted}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${muted}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${elevatedFg}; background: var(--oc-sdk-raised-bg); ${raised} }
.oc-sdk-tab-count { color: ${muted}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${mix(fg, 6)}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { font-family: ${mono}; color: ${muted}; }
.oc-sdk-row-sub { color: ${muted}; }
.oc-sdk-row-meta { color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${muted}; }

.oc-sdk-empty-body { color: ${muted}; }

.oc-sdk-spinner { color: ${muted}; }
.oc-sdk-spinner-ring { border-color: ${border}; border-top-color: ${primary}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${muted}; }

.oc-sdk-separator { color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${mix(border, 40)}; }

.oc-sdk-progress-label { color: ${muted}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${mix(fg, 6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${v("status-success", "currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${v("success-text", "inherit")}; }

.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
${UI_SIZE_CSS}
${GUEST_UI_LOOK_CSS}`;

  // src/panel/main.js
  var host = connectHost();
  var root = document.querySelector("#root");
  var COLUMN_TOKENS = ["var(--oc-info)", "var(--oc-warning)", "var(--oc-success)"];
  var SAVE_DEBOUNCE_MS = 650;
  var POLL_MS = 2500;
  var ICONS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    external: '<path d="M14 4h6v6M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 6.5 3 3"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
    compress: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
    expand: '<path d="m13 7 5 5-5 5"/><path d="m6 7 5 5-5 5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6h.09A1.65 1.65 0 0 0 9.1 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09A1.65 1.65 0 0 0 21 10.1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"/>'
  };
  var state = {
    loginSource: "",
    features: {},
    popoverMounted: false,
    surface: "panel",
    booted: false,
    view: "boot",
    config: null,
    boards: [],
    projects: [],
    session: null,
    snapshot: null,
    sessions: {},
    search: "",
    labels: /* @__PURE__ */ new Set(),
    sheetId: "",
    sheet: null,
    settings: null,
    settingsDirty: false,
    appearance: { style: "neumorphism", columns: ["", "", ""], card: "" },
    hiddenCards: /* @__PURE__ */ new Set(),
    pendingDelete: null,
    stoppedOnly: false,
    dragId: "",
    dragging: false,
    composerListId: "",
    saving: 0,
    fetching: false,
    poll: null,
    refs: null,
    bannerText: ""
  };
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var el2 = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  var makeIcon = (name) => {
    const span = el2("span", "icon");
    span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
    return span;
  };
  var labelColor = (name) => {
    const palette = String(name || "label");
    let hash = 0;
    for (let index = 0; index < palette.length; index += 1) {
      hash = (hash * 31 + palette.charCodeAt(index)) % 360;
    }
    return `hsl(${hash} 58% 62%)`;
  };
  var startOfDay = (date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  var dueInfo = (iso) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const today = startOfDay(/* @__PURE__ */ new Date());
    const due = startOfDay(date);
    const diff = Math.round((due.getTime() - today.getTime()) / 864e5);
    let label;
    if (diff < 0) label = "Atrasada";
    else if (diff === 0) label = "Hoy";
    else if (diff === 1) label = "Ma\xF1ana";
    else label = date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    return { label, late: diff < 0, due };
  };
  var toDateInput = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  var parseBody = (text) => {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return {};
    }
  };
  var api = async (method, path, body) => {
    let result;
    try {
      result = await host.serviceRequest({
        method,
        path,
        body: body === void 0 ? void 0 : JSON.stringify(body)
      });
    } catch (error2) {
      const wrapped = new Error(
        error2?.code === "NO_SERVICE" ? "El servicio de Kanban no est\xE1 disponible." : "No se puede hablar con el servicio de Kanban."
      );
      wrapped.kind = "service";
      throw wrapped;
    }
    const data = parseBody(result.body);
    if (result.status >= 200 && result.status < 300) return data;
    const error = new Error(data.message || `Kanban ha respondido ${result.status}.`);
    error.kind = data.kind || "api";
    error.status = result.status;
    throw error;
  };
  var toast = (kind, message) => {
    host.toast({ kind, message }).catch(() => {
    });
  };
  var renderPopover = (context) => {
    if (state.popoverMounted) return;
    state.popoverMounted = true;
    state.view = "popover";
    stopPolling();
    const data = context.popover?.data || {};
    document.documentElement.dataset.style = data.style || "neumorphism";
    document.body.classList.add("popover-surface");
    const wrap = el2("div", "popover-card");
    const head = el2("div", "popover-head");
    head.append(el2("span", "popover-dot"), el2("span", "popover-title", "Sesi\xF3n autom\xE1tica"));
    const text = el2("div", "popover-text", data.name || "Esta tarjeta");
    const where = el2("div", "popover-meta", data.project || "");
    const note = el2("div", "popover-note", "No se abre nada hasta que lo confirmes.");
    const actions = el2("div", "popover-actions");
    const open = el2("button", "btn-mint", "Abrir sesi\xF3n");
    open.type = "button";
    const skip = el2("button", "ghost-btn", "Ahora no");
    skip.type = "button";
    open.addEventListener("click", async () => {
      open.disabled = true;
      skip.disabled = true;
      open.textContent = "Abriendo\u2026";
      try {
        const result = await api("POST", "/session/start", { cardId: data.cardId });
        await host.close();
        if (result?.sessionId) {
          try {
            await host.openSession(result.sessionId);
          } catch {
          }
        }
      } catch (error) {
        note.textContent = error.message;
        note.classList.add("error");
        open.disabled = false;
        skip.disabled = false;
        open.textContent = "Abrir sesi\xF3n";
      }
    });
    skip.addEventListener("click", () => host.close());
    actions.append(open, skip);
    wrap.append(head, text, where, note, actions);
    root.replaceChildren(wrap);
  };
  var closeAutoBars = () => {
    for (const node of document.querySelectorAll(".auto-bar")) node.remove();
  };
  var showAutoBar = (cardId, name, project) => {
    closeAutoBars();
    const bar = el2("div", "undo-bar auto-bar");
    const text = el2("span", "undo-text", `\xBFAbrir sesi\xF3n para \xAB${name || "la tarjeta"}\xBB?`);
    const open = el2("button", "undo-action", "Abrir sesi\xF3n");
    open.type = "button";
    const skip = el2("button", "undo-cancel", "Ahora no");
    skip.type = "button";
    const progress = el2("span", "undo-progress");
    let timer = null;
    const close = () => {
      clearTimeout(timer);
      bar.remove();
    };
    open.addEventListener("click", async () => {
      close();
      try {
        const result = await api("POST", "/session/start", { cardId });
        await refresh(true);
        if (result?.sessionId) {
          toast("success", `Sesi\xF3n creada en ${result.project || project || "el proyecto"}.`);
          try {
            await host.openSession(result.sessionId);
          } catch {
            toast("error", "La sesi\xF3n se cre\xF3, pero no se pudo abrir.");
          }
        }
      } catch (error) {
        toast("error", error.message);
      }
    });
    skip.addEventListener("click", close);
    bar.append(text, open, skip, progress);
    document.body.append(bar);
    timer = setTimeout(close, 15e3);
  };
  var offerSession = (cardId, name, project, node) => {
    const rect = node?.getBoundingClientRect?.();
    const canPopover = state.features?.popovers === true && typeof host.openPopover === "function";
    if (!canPopover) {
      showAutoBar(cardId, name, project);
      return;
    }
    host.openPopover({
      id: `session-${Date.now().toString(36)}`,
      anchor: rect && rect.width ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : { x: 40, y: 40, width: 40, height: 40 },
      width: 300,
      height: 150,
      side: "top",
      focus: true,
      data: { cardId, name: name || "", project: project || "", style: state.appearance.style || "neumorphism" }
    }).catch(() => showAutoBar(cardId, name, project));
  };
  var removeUndoBar = () => {
    state.pendingDelete?.bar?.remove();
  };
  var undoDelete = () => {
    const pending = state.pendingDelete;
    if (!pending) return;
    clearTimeout(pending.timer);
    removeUndoBar();
    state.pendingDelete = null;
    state.hiddenCards.delete(pending.card.id);
    renderBoard();
    toast("success", "Tarjeta restaurada.");
  };
  var commitPendingDelete = async () => {
    const pending = state.pendingDelete;
    if (!pending) return;
    clearTimeout(pending.timer);
    removeUndoBar();
    state.pendingDelete = null;
    try {
      await api("DELETE", "/card", { id: pending.card.id });
      state.hiddenCards.delete(pending.card.id);
      toast("success", `\xAB${pending.card.name}\xBB eliminada.`);
    } catch (error) {
      state.hiddenCards.delete(pending.card.id);
      toast("error", error.message);
    }
    renderBoard();
  };
  var queueDelete = async (card, node) => {
    if (state.pendingDelete) await commitPendingDelete();
    const bar = el2("div", "undo-bar");
    const progress = el2("span", "undo-progress");
    const text = el2("span", "undo-text", `\xAB${card.name}\xBB eliminada`);
    const action = el2("button", "undo-action", "Deshacer");
    action.type = "button";
    action.addEventListener("click", () => undoDelete());
    bar.append(text, action, progress);
    node.classList.add("leaving");
    await sleep(140);
    state.hiddenCards.add(card.id);
    document.body.append(bar);
    const timer = setTimeout(() => {
      void commitPendingDelete();
    }, 5e3);
    state.pendingDelete = { card, bar, timer };
    renderBoard();
  };
  var findCard = (id) => {
    const snapshot = state.snapshot;
    if (!snapshot) return null;
    for (const list of snapshot.lists) {
      const card = list.cards.find((item) => item.id === id);
      if (card) return { card, list };
    }
    return null;
  };
  var findList = (id) => state.snapshot?.lists.find((list) => list.id === id) || null;
  var mergeCard = (serverCard) => {
    for (const list of state.snapshot?.lists || []) {
      const index = list.cards.findIndex((item) => item.id === serverCard.id);
      if (index >= 0) {
        list.cards[index] = { ...list.cards[index], ...serverCard };
        return;
      }
    }
  };
  var sessionActive = (cardId) => {
    const info = state.sessions?.[cardId];
    return Boolean(info && (info.state === "trabajando" || info.state === "esperando"));
  };
  var isStoppedCard = (card) => !sessionActive(card.id);
  var matchesFilters = (card) => {
    const query = state.search.trim().toLowerCase();
    if (query) {
      const haystack = `${card.name}
${card.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (state.labels.size > 0 && !card.labels.some((label) => state.labels.has(label.id))) return false;
    if (state.stoppedOnly) {
      if (card.listId !== state.snapshot?.workListId) return false;
      if (!isStoppedCard(card)) return false;
    }
    return true;
  };
  var isPaused = () => state.view !== "board" || Boolean(state.sheetId) || state.dragging || Boolean(state.composerListId) || state.saving > 0;
  host.onReady((context) => {
    state.features = context.features || {};
    applyHostReady(context, document.documentElement);
    if (context.surface === "popover") {
      renderPopover(context);
      return;
    }
    state.session = context.session || null;
    state.surface = context.surface === "page" ? "page" : "panel";
    if (state.booted) return;
    state.booted = true;
    void boot();
  });
  var configWithRetry = async () => {
    let lastError;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        return await api("GET", "/config");
      } catch (error) {
        lastError = error;
        if (error.kind !== "service") break;
        await sleep(400);
      }
    }
    throw lastError;
  };
  var loadProjects = async () => {
    try {
      const snapshot = await host.listProjects();
      state.projects = Array.isArray(snapshot?.projects) ? snapshot.projects : [];
    } catch {
      state.projects = state.projects || [];
    }
    return state.projects;
  };
  var applyAppearance = () => {
    const rootEl = document.documentElement;
    const appearance = state.appearance || {};
    rootEl.dataset.style = appearance.style || "neumorphism";
    for (let index = 0; index < 3; index += 1) {
      const color = appearance.columns?.[index];
      if (color) rootEl.style.setProperty(`--col-tone-${index}`, color);
      else rootEl.style.removeProperty(`--col-tone-${index}`);
    }
    if (appearance.card) rootEl.style.setProperty("--kanban-card-bg", appearance.card);
    else rootEl.style.removeProperty("--kanban-card-bg");
  };
  var loadAppearance = async () => {
    try {
      const answer = await api("GET", "/appearance");
      if (answer?.appearance) state.appearance = answer.appearance;
    } catch {
    }
    applyAppearance();
  };
  var saveAppearance = async (patch) => {
    const next = {
      style: state.appearance.style || "neumorphism",
      columns: state.appearance.columns.slice(),
      card: state.appearance.card,
      ...patch
    };
    state.appearance = next;
    applyAppearance();
    try {
      const answer = await api("POST", "/appearance", next);
      if (answer?.appearance) state.appearance = answer.appearance;
    } catch (error) {
      toast("error", error.message);
    }
    applyAppearance();
    renderBoardOnly();
  };
  var boot = async () => {
    stopPolling();
    try {
      const config = await configWithRetry();
      state.config = config;
      state.boards = Array.isArray(config.boards) ? config.boards : [];
      if (!config.connected) {
        showLogin();
        return;
      }
      await loadProjects();
      await loadAppearance();
      await loadSnapshot();
      await loadSessionStates();
      showBoard();
      startPolling();
    } catch (error) {
      showFatal(error.message);
    }
  };
  var loadSessionStates = async () => {
    try {
      const answer = await api("GET", "/sessions");
      state.sessions = answer?.sessions || {};
    } catch {
      state.sessions = state.sessions || {};
    }
  };
  var loadSnapshot = async () => {
    try {
      state.snapshot = await api("GET", "/snapshot?fresh=1");
    } catch (error) {
      if (error.kind === "not-configured" || error.kind === "auth") {
        state.snapshot = null;
        showLogin(error.message);
        return;
      }
      throw error;
    }
  };
  var showLogin = (message = "") => {
    state.view = "login";
    stopPolling();
    closeSheet(true);
    const config = state.config || {};
    const wrapper = el2("div", "center");
    const card = el2("div", "login-card");
    const title = el2("h1");
    title.append(makeIcon("check"), el2("span", "", "Kanban"));
    const source = state.loginSource || ((state.config || {}).source === "local" ? "local" : "planka");
    const subtitle = el2("p", "", source === "local" ? "Un tablero guardado en este equipo. No necesita servidor, cuenta ni red." : "Planka es la \xFAnica fuente de verdad. Entra con tu cuenta para leer y editar el tablero desde aqu\xED.");
    const toggle = el2("div", "source-toggle");
    const sourceButton = (key, label) => {
      const button2 = el2("button", "source-btn", label);
      button2.type = "button";
      button2.setAttribute("aria-pressed", source === key ? "true" : "false");
      button2.addEventListener("click", () => {
        state.loginSource = key;
        showLogin(message);
      });
      return button2;
    };
    toggle.append(sourceButton("planka", "Planka"), sourceButton("local", "Local"));
    const form = el2("div");
    form.style.display = "contents";
    const emailField = el2("label", "field");
    emailField.append(el2("span", "", "Correo o usuario"));
    const email = el2("input");
    email.type = "text";
    email.autocomplete = "username";
    email.value = config.email || "";
    email.placeholder = "tu@correo.com";
    email.required = true;
    emailField.append(email);
    const passwordField = el2("label", "field");
    passwordField.append(el2("span", "", "Contrase\xF1a"));
    const password = el2("input");
    password.type = "password";
    password.autocomplete = "current-password";
    password.placeholder = "Contrase\xF1a de Planka";
    password.required = true;
    passwordField.append(password);
    const urlField = el2("label", "field");
    urlField.append(el2("span", "", "Servidor de Planka"));
    const baseUrl = el2("input");
    baseUrl.type = "url";
    baseUrl.value = config.baseUrl || "http://127.0.0.1:3040";
    baseUrl.placeholder = "http://127.0.0.1:3040";
    urlField.append(baseUrl);
    const errorBox = el2("div", "login-error");
    errorBox.hidden = true;
    if (message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
    const note = el2("div", "login-note");
    note.hidden = true;
    const noteText2 = el2("span", "", "");
    const noteButton2 = el2("button", "", "Abrir Planka");
    noteButton2.type = "button";
    note.append(noteText2, noteButton2);
    const actions = el2("div", "login-actions");
    const submit = el2("button", "btn-mint", "Entrar");
    submit.type = "button";
    actions.append(submit);
    const useLocal = el2("button", "btn-mint", "Usar tablero local");
    useLocal.type = "button";
    useLocal.addEventListener("click", async () => {
      useLocal.disabled = true;
      useLocal.textContent = "Preparando\u2026";
      try {
        await api("POST", "/config", { source: "local" });
        await boot();
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        useLocal.disabled = false;
        useLocal.textContent = "Usar tablero local";
      }
    });
    if (source === "local") {
      const localNote = el2("p", "login-note-text", "Las tarjetas se guardan en board.local.json junto a la extensi\xF3n. Las sesiones del agente funcionan igual.");
      form.append(toggle, localNote, errorBox, useLocal);
    } else {
      form.append(toggle, emailField, passwordField, urlField, errorBox, note, actions);
    }
    card.append(title, subtitle, form);
    const submitLogin = () => {
      void doLogin({ email: email.value, password: password.value, baseUrl: baseUrl.value.trim() }, submit, errorBox, note);
    };
    submit.addEventListener("click", submitLogin);
    for (const input of [email, password, baseUrl]) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitLogin();
        }
      });
    }
    noteButton2.addEventListener("click", () => {
      const target = baseUrl.value.trim() || "http://127.0.0.1:3040";
      host.openUrl(target).catch(() => {
      });
    });
    wrapper.append(card);
    root.replaceChildren(wrapper);
    state.refs = null;
    setTimeout(() => source === "local" ? useLocal.focus() : email.focus(), 30);
  };
  var doLogin = async (values, submit, errorBox, note) => {
    submit.disabled = true;
    submit.textContent = "Entrando\u2026";
    errorBox.hidden = true;
    note.hidden = true;
    try {
      const result = await api("POST", "/login", values);
      state.boards = Array.isArray(result.boards) ? result.boards : [];
      state.config = {
        ...state.config || {},
        connected: true,
        email: values.email,
        baseUrl: values.baseUrl,
        boardId: result.boardId,
        boards: state.boards
      };
      if (result.snapshot) state.snapshot = result.snapshot;
      else await loadSnapshot();
      await loadProjects();
      await loadAppearance();
      await loadSessionStates();
      showBoard();
      startPolling();
    } catch (error) {
      if (error.kind === "terms") {
        noteText.textContent = error.message;
        noteButton.onclick = () => host.openUrl(values.baseUrl || "http://127.0.0.1:3040").catch(() => {
        });
        note.hidden = false;
      } else if (error.kind === "service") {
        await sleep(1e3);
        try {
          const config = await api("GET", "/config");
          if (config.connected) {
            state.config = config;
            state.boards = config.boards || [];
            await loadSnapshot();
            await loadSessionStates();
            showBoard();
            startPolling();
            return;
          }
        } catch {
        }
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } else {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  };
  var syncBoardOptions = () => {
    const refs = state.refs;
    if (!refs) return;
    const boards = state.boards.length ? state.boards : state.snapshot ? [{ id: state.snapshot.board.id, name: state.snapshot.board.name }] : [];
    const selected = state.snapshot?.board?.id || state.config?.boardId || "";
    const control = refs.boardSelect;
    if (control) {
      const options = boards.map((board) => ({ value: board.id, label: board.name }));
      const value = boards.some((board) => board.id === selected) ? selected : control.value || boards[0]?.id || "";
      control.update(options, value, boards.length < 2);
    }
    if (refs.openButton) refs.openButton.disabled = !state.snapshot?.board?.url;
  };
  var syncProjectChip = () => {
    const refs = state.refs;
    if (!refs?.projectChip) return;
    const mapping = state.snapshot?.project || null;
    const auto = mapping?.autoSession === true;
    const mode = mapping ? auto ? "Autom\xE1tica" : "Manual" : "Sin proyecto";
    refs.projectChip.textContent = mapping ? `${mapping.name} \xB7 ${mode}` : "Sin proyecto \xB7 Asignar";
    refs.projectChip.classList.toggle("missing", !mapping);
    refs.projectChip.classList.toggle("auto", Boolean(mapping) && auto);
    refs.projectChip.setAttribute("aria-pressed", auto ? "true" : "false");
    refs.projectChip.title = mapping ? `${mapping.name} \xB7 Delegaci\xF3n ${mode.toLowerCase()}. Pulsa para cambiar.` : "Asigna este tablero a un proyecto de OpenChamber";
  };
  var syncProjectSelect = () => {
    const control = state.refs?.projectSelect;
    if (!control) return;
    const mapping = state.snapshot?.project || null;
    const options = [{ value: "", label: "Sin proyecto" }];
    for (const project of state.projects) options.push({ value: project.id, label: project.name });
    if (mapping && !state.projects.some((project) => project.id === mapping.projectId)) {
      options.push({ value: mapping.projectId, label: mapping.name });
    }
    control.update(options, mapping?.projectId || "", state.projects.length === 0);
    control.button.title = mapping ? `Proyecto de las sesiones: ${mapping.name}` : "Asigna un proyecto a este tablero";
  };
  var labeledField = (text, control) => {
    const wrap = el2("label", "labeled-field");
    wrap.append(el2("span", "labeled-field-label", text), control);
    return wrap;
  };
  var changeBoardProject = async (projectId) => {
    const snapshot = state.snapshot;
    if (!snapshot) return;
    const project = state.projects.find((item) => item.id === projectId) || null;
    try {
      const answer = await api("POST", "/mapping", {
        boardId: snapshot.board.id,
        projectId: project?.id || "",
        directory: project?.directory || "",
        name: project?.name || "",
        autoSession: snapshot.project?.autoSession === true
      });
      state.snapshot.project = answer.project || null;
      toast("success", project ? `Tablero asignado a ${project.name}.` : "Proyecto quitado del tablero.");
    } catch (error) {
      toast("error", error.message);
    }
    renderAll();
    reopenSettings();
  };
  var showBoard = () => {
    state.view = "board";
    state.bannerText = "";
    closeSheet(true);
    if (state.surface === "page") buildPage();
    else buildPanel();
    renderAll();
  };
  var setBanner = (message) => {
    state.bannerText = message;
    const banner = state.refs?.banner;
    if (!banner) return;
    if (!message) {
      banner.hidden = true;
      banner.replaceChildren();
      return;
    }
    banner.hidden = false;
    banner.replaceChildren();
    banner.append(el2("span", "", message));
    const retry = el2("button", "", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", () => void refresh(false));
    banner.append(retry);
  };
  var MENU_SELECTS = /* @__PURE__ */ new Set();
  var closeMenuSelects = () => {
    for (const item of MENU_SELECTS) item.close();
  };
  var menuSelect = ({ ariaLabel = "", options = [], value = "", onChange = () => {
  } }) => {
    const wrap = el2("div", "menu-select");
    const button2 = el2("button", "menu-select-button");
    button2.type = "button";
    button2.setAttribute("aria-haspopup", "listbox");
    button2.setAttribute("aria-expanded", "false");
    button2.setAttribute("aria-label", ariaLabel);
    const label = el2("span", "menu-select-label");
    const chevron = makeIcon("chevron");
    chevron.classList.add("menu-select-chevron");
    button2.append(label, chevron);
    const menu = el2("div", "menu-select-menu");
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    wrap.append(button2, menu);
    let currentOptions = options;
    let currentValue = value;
    let disabled = false;
    let signature = "";
    const render = () => {
      const found = currentOptions.find((option) => option.value === currentValue);
      label.textContent = found?.label || currentOptions[0]?.label || "Selecciona\u2026";
      button2.disabled = disabled;
      menu.replaceChildren();
      for (const option of currentOptions) {
        const item2 = el2("button", "menu-select-option", option.label);
        item2.type = "button";
        item2.dataset.value = option.value;
        item2.setAttribute("role", "option");
        item2.setAttribute("aria-selected", option.value === currentValue ? "true" : "false");
        item2.addEventListener("click", (event) => {
          event.stopPropagation();
          currentValue = option.value;
          render();
          close();
          onChange(option.value);
        });
        menu.append(item2);
      }
    };
    const close = () => {
      if (menu.hidden) return;
      menu.hidden = true;
      button2.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      if (disabled) return;
      closeMenuSelects();
      menu.hidden = false;
      button2.setAttribute("aria-expanded", "true");
    };
    button2.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menu.hidden) open();
      else close();
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    const item = {
      wrap,
      button: button2,
      menu,
      close,
      get value() {
        return currentValue;
      },
      update(nextOptions, nextValue, nextDisabled = false) {
        const nextSignature = `${JSON.stringify(nextOptions)}|${nextValue}|${nextDisabled}`;
        if (nextSignature === signature) return;
        signature = nextSignature;
        currentOptions = nextOptions || [];
        currentValue = nextValue || "";
        disabled = Boolean(nextDisabled);
        render();
      }
    };
    MENU_SELECTS.add(item);
    render();
    return item;
  };
  document.addEventListener("click", () => closeMenuSelects());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenuSelects();
  });
  var buildPage = () => {
    const app = el2("div", "app");
    const topbar = el2("div", "topbar");
    const brand = el2("div", "brand");
    brand.append(el2("span", "brand-dot"), el2("span", "", "Kanban"), el2("span", "brand-sub", "Planka"));
    const boardSelect = menuSelect({
      ariaLabel: "Tablero",
      onChange: (value) => void switchBoard(value)
    });
    const projectSelect = menuSelect({
      ariaLabel: "Proyecto del tablero",
      onChange: (value) => void changeBoardProject(value)
    });
    const projectChip = el2("button", "project-chip");
    projectChip.type = "button";
    projectChip.title = "Cambiar delegaci\xF3n manual o autom\xE1tica";
    projectChip.addEventListener("click", () => {
      const mapping = state.snapshot?.project;
      if (!mapping) {
        openSettings();
        return;
      }
      void changeAutoMode(mapping.autoSession !== true);
    });
    const stoppedChip = el2("button", "quick-filter");
    stoppedChip.type = "button";
    stoppedChip.title = "Ver solo tarjetas en progreso sin sesi\xF3n o con la sesi\xF3n parada";
    stoppedChip.addEventListener("click", () => toggleStopped());
    const settingsButton = el2("button", "icon-btn");
    settingsButton.type = "button";
    settingsButton.title = "Ajustes de Kanban";
    settingsButton.setAttribute("aria-label", "Ajustes de Kanban");
    settingsButton.append(makeIcon("settings"));
    settingsButton.addEventListener("click", () => openSettings());
    const searchWrap = el2("div", "field-wrap");
    const searchInput = el2("input", "search-input");
    searchInput.type = "search";
    searchInput.placeholder = "Buscar por t\xEDtulo o descripci\xF3n";
    searchInput.setAttribute("aria-label", "Buscar tarjetas");
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      renderBoard();
    });
    searchWrap.append(makeIcon("search"), searchInput);
    const labelFilters = el2("div", "label-filters");
    labelFilters.setAttribute("aria-label", "Filtrar por etiqueta");
    const spacer = el2("div", "toolbar-spacer");
    const openButton = el2("button", "ghost-btn");
    openButton.type = "button";
    openButton.append(makeIcon("external"), el2("span", "", "Abrir en Planka"));
    openButton.addEventListener("click", () => {
      const url = state.snapshot?.board?.url;
      if (url) host.openUrl(url).catch(() => {
      });
    });
    topbar.append(
      brand,
      labeledField("Proyecto", projectSelect.wrap),
      labeledField("Tablero", boardSelect.wrap),
      projectChip,
      stoppedChip,
      settingsButton,
      searchWrap,
      labelFilters,
      spacer,
      openButton
    );
    const banner = el2("div", "banner");
    banner.hidden = true;
    banner.setAttribute("role", "status");
    const board = el2("div", "board");
    app.append(topbar, banner, board);
    root.replaceChildren(app);
    state.refs = { board, banner, boardSelect, projectSelect, projectChip, stoppedChip, settingsButton, searchInput, labelFilters, openButton };
    setBanner(state.bannerText);
  };
  var buildPanel = () => {
    const app = el2("div", "app panel-app");
    const topbar = el2("div", "topbar panel-topbar");
    const brand = el2("div", "brand");
    brand.append(el2("span", "brand-dot"), el2("span", "", "Kanban"));
    const boardSelect = menuSelect({
      ariaLabel: "Tablero",
      onChange: (value) => void switchBoard(value)
    });
    const projectSelect = menuSelect({
      ariaLabel: "Proyecto del tablero",
      onChange: (value) => void changeBoardProject(value)
    });
    const projectChip = el2("button", "project-chip");
    projectChip.type = "button";
    projectChip.title = "Cambiar delegaci\xF3n manual o autom\xE1tica";
    projectChip.addEventListener("click", () => {
      const mapping = state.snapshot?.project;
      if (!mapping) {
        openSettings();
        return;
      }
      void changeAutoMode(mapping.autoSession !== true);
    });
    const stoppedChip = el2("button", "quick-filter");
    stoppedChip.type = "button";
    stoppedChip.title = "Ver solo tarjetas en progreso sin sesi\xF3n o con la sesi\xF3n parada";
    stoppedChip.addEventListener("click", () => toggleStopped());
    const settingsButton = el2("button", "icon-btn");
    settingsButton.type = "button";
    settingsButton.title = "Ajustes de Kanban";
    settingsButton.setAttribute("aria-label", "Ajustes de Kanban");
    settingsButton.append(makeIcon("settings"));
    settingsButton.addEventListener("click", () => openSettings());
    const spacer = el2("div", "toolbar-spacer");
    const openButton = el2("button", "icon-btn");
    openButton.type = "button";
    openButton.title = "Abrir en Planka";
    openButton.setAttribute("aria-label", "Abrir en Planka");
    openButton.append(makeIcon("external"));
    openButton.addEventListener("click", () => {
      const url = state.snapshot?.board?.url;
      if (url) host.openUrl(url).catch(() => {
      });
    });
    topbar.append(brand, spacer, openButton, settingsButton);
    const selectorRow = el2("div", "selector-row");
    selectorRow.append(
      labeledField("Proyecto", projectSelect.wrap),
      labeledField("Tablero", boardSelect.wrap)
    );
    const delegationRow = el2("div", "delegation-row");
    delegationRow.append(projectChip, stoppedChip);
    const banner = el2("div", "banner");
    banner.hidden = true;
    banner.setAttribute("role", "status");
    const board = el2("div", "board panel-board");
    app.append(topbar, selectorRow, delegationRow, banner, board);
    root.replaceChildren(app);
    state.refs = { board, banner, boardSelect, projectSelect, projectChip, stoppedChip, settingsButton, openButton };
    setBanner(state.bannerText);
  };
  var syncStoppedChip = () => {
    const chip = state.refs?.stoppedChip;
    if (!chip) return;
    const workList = state.snapshot?.lists?.find((list) => list.id === state.snapshot?.workListId);
    const count = workList ? workList.cards.filter(isStoppedCard).length : 0;
    chip.replaceChildren(el2("span", "", "Paradas"), el2("span", "quick-filter-count", String(count)));
    chip.setAttribute("aria-pressed", state.stoppedOnly ? "true" : "false");
    chip.title = count ? `${count} tarjeta${count === 1 ? "" : "s"} en progreso sin sesi\xF3n o parada${count === 1 ? "" : "s"}` : "No hay tarjetas paradas en progreso";
  };
  var toggleStopped = () => {
    state.stoppedOnly = !state.stoppedOnly;
    if (state.surface === "page") renderFilters();
    syncStoppedChip();
    renderBoard();
  };
  var changeAutoMode = async (enabled) => {
    const snapshot = state.snapshot;
    const mapping = snapshot?.project;
    if (!snapshot || !mapping) {
      renderAll();
      return;
    }
    try {
      const answer = await api("POST", "/mapping", {
        boardId: snapshot.board.id,
        projectId: mapping.projectId,
        directory: mapping.directory,
        name: mapping.name,
        autoSession: Boolean(enabled)
      });
      state.snapshot.project = answer.project || mapping;
      toast("success", enabled ? "Delegaci\xF3n autom\xE1tica: te pedir\xE1 confirmaci\xF3n al mover una tarjeta." : "Delegaci\xF3n manual: usa Crear sesi\xF3n en la tarjeta.");
    } catch (error) {
      toast("error", error.message);
    }
    renderAll();
    reopenSettings();
  };
  var reopenSettings = () => {
    if (!state.settings) return;
    closeSettings(true);
    openSettings();
  };
  var closeSettings = (force = false) => {
    const settings = state.settings;
    if (!settings) return;
    if (!force && state.settingsDirty) state.settingsDirty = false;
    settings.backdrop.remove();
    settings.sheet.remove();
    state.settings = null;
  };
  var openSettings = () => {
    if (state.settings) closeSettings(true);
    const snapshot = state.snapshot;
    if (!snapshot) return;
    const config = state.config || {};
    const mapping = snapshot.project || null;
    const backdrop = el2("div", "sheet-backdrop open");
    const sheet = el2("aside", "sheet settings-sheet open");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Ajustes de Kanban");
    const head = el2("div", "sheet-head");
    const title = el2("div", "settings-title", "Ajustes de Kanban");
    const close = el2("button", "icon-btn");
    close.type = "button";
    close.title = "Cerrar";
    close.setAttribute("aria-label", "Cerrar ajustes");
    close.append(makeIcon("close"));
    head.append(title, close);
    const scroll = el2("div", "sheet-scroll settings-scroll");
    const conexion = el2("section", "settings-section");
    conexion.append(el2("div", "settings-heading", "Conexi\xF3n"));
    const isLocal = (config.source || "planka") === "local";
    const connRow = el2("div", "settings-line");
    const connDot = el2("span", "col-dot");
    connDot.style.setProperty("--dot", config.connected ? "var(--oc-success)" : "var(--oc-error)");
    connRow.append(connDot, el2("span", "settings-line-text", isLocal ? "Tablero local en este equipo" : config.connected ? `${config.email || "Planka"} en ${config.baseUrl || "Planka"}` : "Sin conexi\xF3n con Planka"));
    conexion.append(connRow);
    const sourceRow = el2("div", "source-toggle");
    const switchSource = async (target) => {
      try {
        await api("POST", "/config", { source: target });
        closeSettings(true);
        await boot();
        toast("success", target === "local" ? "Tablero local activado." : "Has vuelto a Planka.");
      } catch (error) {
        toast("error", error.message);
      }
    };
    const sourcePick = (key, label) => {
      const button2 = el2("button", "source-btn", label);
      button2.type = "button";
      button2.setAttribute("aria-pressed", (isLocal ? "local" : "planka") === key ? "true" : "false");
      button2.addEventListener("click", () => void switchSource(key));
      return button2;
    };
    sourceRow.append(sourcePick("planka", "Planka"), sourcePick("local", "Local"));
    conexion.append(sourceRow);
    const connActions = el2("div", "settings-actions");
    const openPlanka = el2("button", "ghost-btn", "Abrir Planka");
    openPlanka.type = "button";
    openPlanka.addEventListener("click", () => {
      const url = snapshot.board?.url || config.baseUrl || "http://127.0.0.1:3040";
      host.openUrl(url).catch(() => {
      });
    });
    const logout = el2("button", "ghost-btn", "Desconectar");
    logout.type = "button";
    logout.addEventListener("click", async () => {
      try {
        await api("POST", "/logout");
        state.config = { ...config, connected: false };
        toast("success", "Kanban desconectado de Planka.");
        closeSettings(true);
        await boot();
      } catch (error) {
        toast("error", error.message);
      }
    });
    if (!isLocal) connActions.append(openPlanka, logout);
    conexion.append(connActions);
    const tablero = el2("section", "settings-section");
    tablero.append(el2("div", "settings-heading", "Tablero y proyecto"));
    const projectField = el2("label", "field");
    projectField.append(el2("span", "", "Proyecto de OpenChamber"));
    const projectSelect = el2("select", "settings-select");
    projectSelect.append(new Option("Sin proyecto (solo vista del tablero)", ""));
    for (const project of state.projects) projectSelect.append(new Option(project.name, project.id));
    if (mapping && !state.projects.some((project) => project.id === mapping.projectId)) {
      projectSelect.append(new Option(mapping.name, mapping.projectId));
    }
    projectSelect.value = mapping?.projectId || "";
    projectSelect.addEventListener("change", () => void changeBoardProject(projectSelect.value));
    projectField.append(projectSelect);
    tablero.append(projectField);
    tablero.append(el2("p", "settings-note", mapping ? `Las sesiones se crean en ${mapping.name}.` : "Sin proyecto no se pueden crear sesiones desde el Kanban."));
    const delegacion = el2("section", "settings-section");
    delegacion.append(el2("div", "settings-heading", "Delegaci\xF3n"));
    delegacion.append(el2("p", "settings-note", "Elige qui\xE9n abre la sesi\xF3n."));
    const modes = el2("div", "settings-modes");
    const modeCard = (label, description, active2, enabled) => {
      const button2 = el2("button", "mode-card");
      button2.type = "button";
      button2.disabled = !enabled;
      button2.setAttribute("aria-pressed", active2 ? "true" : "false");
      button2.append(el2("span", "mode-card-title", label), el2("span", "mode-card-text", description));
      return button2;
    };
    const manualCard = modeCard("Manual", "T\xFA abres la sesi\xF3n.", mapping?.autoSession !== true, Boolean(mapping));
    const autoCard = modeCard("Autom\xE1tica", "Te la ofrece al moverla.", mapping?.autoSession === true, Boolean(mapping));
    manualCard.addEventListener("click", () => {
      if (mapping?.autoSession === true) void changeAutoMode(false);
    });
    autoCard.addEventListener("click", () => {
      if (mapping?.autoSession !== true) void changeAutoMode(true);
    });
    modes.append(manualCard, autoCard);
    delegacion.append(modes);
    if (!mapping) delegacion.append(el2("p", "settings-note warning", "Asigna primero un proyecto al tablero."));
    const estilo = el2("section", "settings-section");
    estilo.append(el2("div", "settings-heading", "Apariencia"));
    estilo.append(el2("p", "settings-note", "Acabado visual. Los colores no cambian."));
    const styleGrid = el2("div", "style-grid");
    const styleOptions = [
      ["neumorphism", "Neumorfismo", "Relieve suave."],
      ["brutalism", "Brutalismo", "Bordes y sombras duros."],
      ["glass", "Cristal", "Transl\xFAcido y difuminado."]
    ];
    for (const [key, label, text] of styleOptions) {
      const option = el2("button", "style-card");
      option.type = "button";
      option.setAttribute("aria-pressed", (state.appearance.style || "neumorphism") === key ? "true" : "false");
      const preview = el2("span", "style-preview");
      preview.dataset.preview = key;
      option.append(preview, el2("span", "style-name", label), el2("span", "style-text", text));
      option.addEventListener("click", () => {
        void saveAppearance({ style: key });
        reopenSettings();
      });
      styleGrid.append(option);
    }
    estilo.append(styleGrid);
    const sesiones = el2("section", "settings-section");
    sesiones.append(el2("div", "settings-heading", "Sesiones"));
    sesiones.append(el2("p", "settings-note", "Al pasar a HECHO: se cierra la sesi\xF3n, guarda el resumen en Engram y se detiene. Si la vuelves a mover, se crea una nueva."));
    const avanzado = el2("section", "settings-section");
    avanzado.append(el2("div", "settings-heading", "Avanzado"));
    avanzado.append(el2("p", "settings-note", "El agente puede crear, mover y completar tarjetas. Tras actualizar la extensi\xF3n, reinicia OpenCode."));
    scroll.append(conexion, tablero, estilo, delegacion, sesiones, avanzado);
    const foot = el2("div", "sheet-foot settings-foot");
    const done = el2("button", "btn-mint", "Listo");
    done.type = "button";
    done.addEventListener("click", () => closeSettings(true));
    foot.append(el2("span", "settings-foot-text", "Se guarda al elegir."), done);
    sheet.append(head, scroll, foot);
    close.addEventListener("click", () => closeSettings(true));
    backdrop.addEventListener("click", () => closeSettings(true));
    root.append(backdrop, sheet);
    state.settings = { backdrop, sheet };
  };
  var switchBoard = async (boardId) => {
    if (!boardId) return;
    const previous = state.snapshot?.board?.id;
    if (boardId === previous) return;
    try {
      const snapshot = await api("POST", "/board", { boardId });
      state.snapshot = snapshot;
      state.config = { ...state.config, boardId, boardName: snapshot.board.name };
      renderAll();
    } catch (error) {
      if (error.kind === "service") {
        await sleep(900);
        try {
          const config = await api("GET", "/config");
          state.config = config;
          state.boards = config.boards || [];
          state.snapshot = await api("GET", "/snapshot?fresh=1");
          renderAll();
          return;
        } catch {
        }
      }
      toast("error", error.message);
      renderAll();
    }
  };
  var renderAll = () => {
    if (state.view !== "board") return;
    syncBoardOptions();
    syncProjectSelect();
    syncProjectChip();
    syncStoppedChip();
    if (state.surface === "page") renderFilters();
    renderBoard();
  };
  var renderFilters = () => {
    const holder = state.refs?.labelFilters;
    if (!holder) return;
    holder.replaceChildren();
    const labels = state.snapshot?.labels || [];
    holder.hidden = labels.length === 0;
    for (const label of labels) {
      const chip = el2("button", "label-chip");
      chip.type = "button";
      chip.style.setProperty("--label", labelColor(label.color || label.name));
      chip.setAttribute("aria-pressed", state.labels.has(label.id) ? "true" : "false");
      const dot = el2("span", "label-dot");
      chip.append(dot, el2("span", "", label.name));
      chip.addEventListener("click", () => {
        if (state.labels.has(label.id)) state.labels.delete(label.id);
        else state.labels.add(label.id);
        renderFilters();
        renderBoard();
      });
      holder.append(chip);
    }
  };
  var buildCard = (card, listIndex) => {
    const node = el2("article", "card");
    node.tabIndex = 0;
    node.draggable = !state.search.trim() && state.labels.size === 0;
    node.dataset.cardId = card.id;
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", `${card.name}. Abrir tarjeta`);
    const actions = el2("div", "card-actions");
    node.append(actions);
    const title = el2("div", "card-title", card.name || "Sin t\xEDtulo");
    node.append(title);
    if (card.description.trim()) node.append(el2("div", "card-desc", card.description));
    const meta = el2("div", "card-meta");
    const sessionState = state.sessions?.[card.id];
    if (sessionState) {
      const dot = el2("span", "session-dot");
      const tone2 = sessionState.tone === "success" ? "var(--oc-success)" : sessionState.tone === "warning" ? "var(--oc-warning)" : "var(--oc-muted)";
      dot.style.setProperty("--session-tone", tone2);
      dot.title = `Sesi\xF3n: ${sessionState.state}`;
      dot.setAttribute("aria-label", `Sesi\xF3n: ${sessionState.state}`);
      meta.append(dot);
    }
    if (card.labels.length) {
      const dots = el2("div", "card-labels");
      for (const label of card.labels) {
        const dot = el2("span", "label-dot");
        dot.style.setProperty("--label", labelColor(label.color || label.name));
        dot.title = label.name;
        dots.append(dot);
      }
      meta.append(dots);
    }
    const due = dueInfo(card.dueDate);
    if (due) {
      const dueNode = el2("span", `due${due.late ? " late" : ""}`);
      dueNode.append(makeIcon("calendar"), el2("span", "", due.label));
      meta.append(dueNode);
    }
    if (card.checklist.total > 0) {
      const check = el2("span", "check-mini");
      const bar = el2("span", "bar");
      const fill = el2("i");
      fill.style.width = `${Math.round(card.checklist.done / card.checklist.total * 100)}%`;
      bar.append(fill);
      check.append(bar, el2("span", "", `${card.checklist.done}/${card.checklist.total}`));
      meta.append(check);
    }
    if (meta.childNodes.length) node.append(meta);
    const edit = el2("button", "card-edit");
    edit.type = "button";
    edit.title = "Editar tarjeta";
    edit.setAttribute("aria-label", `Editar ${card.name}`);
    edit.append(makeIcon("edit"));
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      openSheet(card.id);
    });
    const remove = el2("button", "card-delete");
    remove.type = "button";
    remove.title = "Eliminar tarjeta";
    remove.setAttribute("aria-label", `Eliminar ${card.name}`);
    remove.append(makeIcon("trash"));
    let confirming = false;
    let confirmTimer = null;
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirming) {
        confirming = true;
        remove.classList.add("confirming");
        remove.title = "Pulsa otra vez para eliminar";
        remove.setAttribute("aria-label", `Confirmar eliminar ${card.name}`);
        confirmTimer = setTimeout(() => {
          confirming = false;
          remove.classList.remove("confirming");
          remove.title = "Eliminar tarjeta";
          remove.setAttribute("aria-label", `Eliminar ${card.name}`);
        }, 2500);
        return;
      }
      clearTimeout(confirmTimer);
      remove.disabled = true;
      void queueDelete(card, node);
    });
    actions.append(edit, remove);
    const open = () => openSheet(card.id);
    node.title = "Abrir y editar";
    node.addEventListener("click", open);
    node.addEventListener("dblclick", (event) => {
      event.preventDefault();
      open();
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    node.addEventListener("dragstart", (event) => {
      state.dragging = true;
      state.dragId = card.id;
      node.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.id);
      }
    });
    node.addEventListener("dragend", () => {
      state.dragging = false;
      state.dragId = "";
      node.classList.remove("dragging");
      clearDropDecorations();
    });
    return node;
  };
  var clearDropDecorations = () => {
    const board = state.refs?.board;
    if (!board) return;
    for (const line of board.querySelectorAll(".drop-line")) line.remove();
    for (const column of board.querySelectorAll(".column.drop-target")) column.classList.remove("drop-target");
  };
  var attachDropTarget = (column, cardsEl, listId) => {
    const showTopLine = () => {
      for (const line2 of cardsEl.querySelectorAll(".drop-line")) line2.remove();
      const line = el2("div", "drop-line");
      const first = [...cardsEl.querySelectorAll(".card")].find((card) => card.dataset.cardId !== state.dragId);
      if (first) cardsEl.insertBefore(line, first);
      else cardsEl.append(line);
    };
    const onDragOver = (event) => {
      if (!state.dragId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      column.classList.add("drop-target");
      showTopLine();
    };
    const onDrop = (event) => {
      if (!state.dragId) return;
      event.preventDefault();
      const cardId = state.dragId;
      clearDropDecorations();
      state.dragging = false;
      state.dragId = "";
      void moveCard(cardId, listId, 0);
    };
    cardsEl.addEventListener("dragover", onDragOver);
    cardsEl.addEventListener("drop", onDrop);
    cardsEl.addEventListener("dragleave", (event) => {
      if (!cardsEl.contains(event.relatedTarget)) {
        for (const line of cardsEl.querySelectorAll(".drop-line")) line.remove();
      }
    });
    column.addEventListener("dragover", (event) => {
      if (event.target.closest(".cards")) return;
      onDragOver(event);
    });
    column.addEventListener("drop", (event) => {
      if (event.target.closest(".cards")) return;
      if (!state.dragId) return;
      event.preventDefault();
      const cardId = state.dragId;
      clearDropDecorations();
      state.dragging = false;
      state.dragId = "";
      void moveCard(cardId, listId, 0);
    });
    column.addEventListener("dragleave", (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove("drop-target");
    });
  };
  var renderBoard = () => {
    const board = state.refs?.board;
    if (!board) return;
    const snapshot = state.snapshot;
    const scrollState = /* @__PURE__ */ new Map();
    for (const existing of board.querySelectorAll(".column")) {
      const cards = existing.querySelector(".cards");
      if (!cards) continue;
      const overflowing = cards.scrollHeight > cards.clientHeight + 2;
      scrollState.set(existing.dataset.listId, {
        top: cards.scrollTop,
        atBottom: overflowing && cards.scrollHeight - cards.scrollTop - cards.clientHeight <= 2
      });
    }
    board.replaceChildren();
    if (!snapshot) return;
    if (!snapshot.lists.length) {
      board.append(el2("div", "board-empty", "Este tablero no tiene columnas activas. A\xF1\xE1delas en Planka."));
      return;
    }
    snapshot.lists.forEach((list, listIndex) => {
      const column = el2("section", "column");
      column.dataset.listId = list.id;
      if (state.composerListId === list.id) column.classList.add("composing");
      const head = el2("div", "col-head");
      const dot = el2("span", "col-dot");
      const tone2 = state.appearance?.columns?.[listIndex] || COLUMN_TOKENS[listIndex % COLUMN_TOKENS.length];
      dot.style.setProperty("--dot", tone2);
      column.style.setProperty("--column-tone", tone2);
      const name = el2("button", "col-name", list.name);
      name.type = "button";
      name.title = "Editar nombre de la columna";
      name.setAttribute("aria-label", `Editar nombre de la columna ${list.name}`);
      name.addEventListener("click", (event) => {
        event.stopPropagation();
        startListRename(column, list, name);
      });
      const visible = list.cards.filter((card) => !state.hiddenCards.has(card.id) && matchesFilters(card));
      const count = el2("span", "col-count", String(visible.length));
      head.append(dot, name, count);
      const cardsEl = el2("div", "cards");
      if (!visible.length) {
        const hint2 = el2("div", "column-hint", state.search || state.labels.size ? "Sin coincidencias" : "Arrastra una tarjeta aqu\xED");
        cardsEl.append(hint2);
      }
      for (const card of visible) cardsEl.append(buildCard(card, listIndex));
      const composer = el2("div", "composer");
      const input = el2("input");
      input.type = "text";
      input.placeholder = "T\xEDtulo y Enter";
      input.setAttribute("aria-label", `Nueva tarjeta en ${list.name}`);
      const row = el2("div", "composer-row");
      const hint = el2("span", "composer-hint", "Enter guarda \xB7 Esc cierra");
      const cancel = el2("button", "ghost-btn", "Cancelar");
      cancel.type = "button";
      const create = el2("button", "btn-mint", "Crear");
      create.type = "button";
      row.append(hint, cancel, create);
      composer.append(input, row);
      const submitComposer = () => {
        const value = input.value.trim();
        if (!value) return;
        void createCard(list.id, value, input);
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitComposer();
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeComposer();
        }
      });
      input.addEventListener("input", () => {
        state.composerListId = list.id;
      });
      input.addEventListener("blur", () => {
        setTimeout(() => {
          if (state.composerListId !== list.id) return;
          const focused = document.activeElement;
          if (focused && composer.contains(focused)) return;
          if (!input.value.trim()) closeComposer();
        }, 120);
      });
      cancel.addEventListener("click", () => closeComposer());
      create.addEventListener("click", submitComposer);
      const addCard = el2("button", "add-card");
      addCard.type = "button";
      addCard.title = `Crear tarjeta en ${list.name}`;
      addCard.setAttribute("aria-label", `Crear tarjeta en ${list.name}`);
      addCard.append(makeIcon("plus"));
      addCard.addEventListener("click", () => openComposer(list.id));
      column.append(head, cardsEl, addCard, composer);
      attachDropTarget(column, cardsEl, list.id);
      board.append(column);
      if (state.composerListId === list.id) {
        setTimeout(() => input.focus(), 0);
      }
    });
    for (const column of board.querySelectorAll(".column")) {
      const saved = scrollState.get(column.dataset.listId);
      if (!saved) continue;
      const cards = column.querySelector(".cards");
      if (!cards) continue;
      cards.scrollTop = saved.atBottom ? cards.scrollHeight : saved.top;
    }
  };
  var startListRename = (column, list, nameButton) => {
    if (column.querySelector(".col-name-input")) return;
    const input = el2("input", "col-name-input");
    input.value = list.name;
    input.setAttribute("aria-label", "Nombre de la columna");
    let finished = false;
    const finish = async (save) => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      if (!save || !value || value === list.name) {
        renderBoard();
        return;
      }
      try {
        await api("PATCH", "/list", { id: list.id, name: value });
        await refresh(true);
      } catch (error) {
        toast("error", error.message);
        renderBoard();
      }
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        void finish(false);
      }
    });
    input.addEventListener("blur", () => void finish(true));
    nameButton.replaceWith(input);
    input.focus();
    input.select();
  };
  var openComposer = (listId) => {
    state.composerListId = listId;
    renderBoard();
  };
  var closeComposer = () => {
    state.composerListId = "";
    renderBoard();
  };
  var createCard = async (listId, name, input) => {
    try {
      await api("POST", "/card", { listId, name });
      if (input) input.value = "";
      await refresh(true);
    } catch (error) {
      toast("error", error.message);
    }
  };
  var moveCard = async (cardId, listId, index) => {
    const found = findCard(cardId);
    if (!found) return;
    const target = findList(listId);
    if (!target) return;
    const currentIndex = found.list.cards.findIndex((card2) => card2.id === cardId);
    if (found.list.id === listId) {
      const destination = Math.max(0, Math.min(index, found.list.cards.length - 1));
      if (destination === currentIndex) return;
    }
    const [card] = found.list.cards.splice(currentIndex, 1);
    const bounded = Math.max(0, Math.min(index, target.cards.length));
    target.cards.splice(bounded, 0, { ...card, listId });
    renderBoard();
    try {
      const answer = await api("POST", "/card/move", { id: cardId, listId, index: bounded });
      await refresh(true);
      if (answer?.sessionId) {
        toast("success", `Sesi\xF3n creada en ${answer.project || "el proyecto del tablero"}.`);
        try {
          await host.openSession(answer.sessionId);
        } catch {
          toast("error", "La sesi\xF3n se cre\xF3, pero no se pudo abrir.");
        }
      } else if (answer?.autoPending) {
        offerSession(cardId, card?.name, answer.project, document.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`));
      } else if (answer?.manual) {
        toast("info", "Delegaci\xF3n manual: abre la tarjeta y pulsa Crear sesi\xF3n.");
      } else if (answer?.needsMapping) {
        toast("error", "Asigna un proyecto a este tablero para crear la sesi\xF3n.");
      } else if (answer?.sessionError) {
        toast("error", `No se pudo crear la sesi\xF3n: ${answer.sessionError}`);
      } else if (answer?.linked) {
        toast("success", "Sesi\xF3n enlazada: se cerrar\xE1 al guardar Engram.");
      }
    } catch (error) {
      toast("error", error.message);
      await refresh(true);
    }
  };
  var renderBoardOnly = () => {
    if (state.view === "board") renderBoard();
  };
  var buildSheet = (card) => {
    const backdrop = el2("div", "sheet-backdrop");
    const sheet = el2("aside", "sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", `Tarjeta ${card.name}`);
    const head = el2("div", "sheet-head");
    const title = el2("input", "sheet-title");
    title.type = "text";
    title.value = card.name;
    title.setAttribute("aria-label", "T\xEDtulo");
    const close = el2("button", "icon-btn");
    close.type = "button";
    close.title = "Cerrar";
    close.setAttribute("aria-label", "Cerrar");
    close.append(makeIcon("close"));
    head.append(title, close);
    const scroll = el2("div", "sheet-scroll");
    const labelsSection = el2("div");
    labelsSection.append(el2("span", "section-label", "Etiquetas"));
    const labels = el2("div", "sheet-labels");
    labelsSection.append(labels);
    const sessionSection = el2("div", "sheet-session-section");
    sessionSection.append(el2("span", "section-label", "Sesi\xF3n"));
    const sessionRow = el2("div", "sheet-session");
    const sessionSelect = el2("select", "session-select");
    sessionSelect.setAttribute("aria-label", "Sesi\xF3n enlazada a la tarjeta");
    const sessionRemove = el2("button", "ghost-btn", "Quitar");
    sessionRemove.type = "button";
    sessionRemove.style.display = "none";
    const sessionStart = el2("button", "btn-mint session-start", "Crear sesi\xF3n");
    sessionStart.type = "button";
    sessionStart.style.display = "none";
    const sessionOpen = el2("button", "btn-mint session-open", "Abrir sesi\xF3n");
    sessionOpen.type = "button";
    sessionOpen.style.display = "none";
    const sessionNote = el2("div", "session-note", "Cargando sesiones\u2026");
    sessionRow.append(sessionSelect, sessionRemove);
    sessionSection.append(sessionRow, sessionStart, sessionOpen, sessionNote);
    const grid = el2("div", "sheet-grid");
    const dateField = el2("label", "field");
    dateField.append(el2("span", "", "Fecha"));
    const date = el2("input");
    date.type = "date";
    date.value = toDateInput(card.dueDate);
    dateField.append(date);
    const columnField = el2("label", "field");
    columnField.append(el2("span", "", "Columna"));
    const column = el2("select");
    for (const list of state.snapshot?.lists || []) {
      column.append(new Option(list.name, list.id));
    }
    column.value = card.listId;
    columnField.append(column);
    grid.append(dateField, columnField);
    const checklistSection = el2("div", "checklist");
    const checklistHead = el2("div", "checklist-head");
    checklistHead.append(el2("span", "section-label", "Checklist"));
    const progress = el2("div", "progress");
    const progressFill = el2("i");
    progress.append(progressFill);
    const countLabel = el2("span", "count", "");
    checklistHead.append(progress, countLabel);
    const checklistBody = el2("div");
    checklistBody.style.display = "flex";
    checklistBody.style.flexDirection = "column";
    checklistBody.style.gap = "10px";
    const checklistAdd = el2("div", "task-add");
    const checklistName = el2("input");
    checklistName.placeholder = "Nueva checklist";
    const checklistButton = el2("button", "", "A\xF1adir");
    checklistButton.type = "button";
    checklistAdd.append(checklistName, checklistButton);
    checklistSection.append(checklistHead, checklistBody, checklistAdd);
    const descriptionSection = el2("div");
    descriptionSection.append(el2("span", "section-label", "Descripci\xF3n"));
    const description = el2("textarea", "description");
    description.value = card.description;
    description.placeholder = "A\xF1ade una descripci\xF3n\u2026";
    descriptionSection.append(description);
    scroll.append(labelsSection, sessionSection, grid, checklistSection, descriptionSection);
    const foot = el2("div", "sheet-foot");
    const saveState = el2("span", "save-state", "");
    const complete = el2("button", "btn-complete");
    complete.type = "button";
    complete.append(makeIcon("check"), el2("span", "", card.listId === state.snapshot?.doneListId ? "Completada" : "Completar"));
    complete.disabled = card.listId === state.snapshot?.doneListId;
    foot.append(saveState, complete);
    sheet.append(head, scroll, foot);
    const session = {
      card,
      backdrop,
      sheet,
      title,
      date,
      column,
      labels,
      checklistBody,
      progressFill,
      countLabel,
      checklistName,
      description,
      saveState,
      complete,
      sessionSelect,
      sessionRemove,
      sessionStart,
      sessionOpen,
      sessionNote,
      link: null,
      sessions: [],
      pending: /* @__PURE__ */ new Set(),
      timer: null
    };
    state.sheet = session;
    title.addEventListener("input", () => {
      session.card.name = title.value;
      session.pending.add("name");
      scheduleSave();
    });
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        title.blur();
      }
    });
    title.addEventListener("blur", () => {
      if (!title.value.trim()) {
        title.value = session.card.name || "Sin t\xEDtulo";
      }
    });
    description.addEventListener("input", () => {
      session.card.description = description.value;
      session.pending.add("description");
      scheduleSave();
    });
    date.addEventListener("change", () => {
      session.card.dueDate = date.value ? `${date.value}T12:00:00` : "";
      session.pending.add("dueDate");
      scheduleSave();
    });
    column.addEventListener("change", () => {
      session.card.listId = column.value;
      session.pending.add("listId");
      scheduleSave();
    });
    const toggleLabel = async (labelId) => {
      try {
        await api("POST", "/label", { cardId: session.card.id, labelId });
        await rereadSheet();
      } catch (error) {
        toast("error", error.message);
      }
    };
    const addTask = async (taskListId, input) => {
      const name = input.value.trim();
      if (!name) return;
      try {
        await api("POST", "/task", { taskListId, name });
        input.value = "";
        await rereadSheet();
      } catch (error) {
        toast("error", error.message);
      }
    };
    const checkTask = async (task) => {
      try {
        await api("PATCH", "/task", { id: task.id, isCompleted: !task.isCompleted });
        await rereadSheet();
      } catch (error) {
        toast("error", error.message);
      }
    };
    const addChecklist = async () => {
      const name = checklistName.value.trim() || "Checklist";
      try {
        await api("POST", "/checklist", { cardId: session.card.id, name });
        checklistName.value = "";
        await rereadSheet();
      } catch (error) {
        toast("error", error.message);
      }
    };
    checklistButton.addEventListener("click", () => void addChecklist());
    checklistName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void addChecklist();
      }
    });
    session.renderLabels = () => {
      const current = new Map(session.card.labels.map((label) => [label.id, label]));
      labels.replaceChildren();
      for (const label of state.snapshot?.labels || []) {
        const chip = el2("button", "label-chip");
        chip.type = "button";
        chip.style.setProperty("--label", labelColor(label.color || label.name));
        chip.setAttribute("aria-pressed", current.has(label.id) ? "true" : "false");
        chip.append(el2("span", "label-dot"), el2("span", "", label.name));
        chip.addEventListener("click", () => void toggleLabel(label.id));
        labels.append(chip);
      }
      if (!(state.snapshot?.labels || []).length) labels.append(el2("span", "compact-empty", "Este tablero no tiene etiquetas."));
    };
    session.renderChecklist = () => {
      const taskLists = session.card.taskLists || [];
      const total = taskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
      const done = taskLists.reduce(
        (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
        0
      );
      session.progressFill.style.width = `${total ? Math.round(done / total * 100) : 0}%`;
      session.countLabel.textContent = total ? `${done}/${total}` : "0/0";
      checklistBody.replaceChildren();
      if (!taskLists.length) {
        checklistBody.append(el2("div", "compact-empty", "Sin checklist."));
        return;
      }
      for (const taskList of taskLists) {
        const block = el2("div", "task-list");
        block.append(el2("div", "task-list-name", taskList.name));
        for (const task of taskList.tasks) {
          const row = el2("div", `task-row${task.isCompleted ? " done" : ""}`);
          const check = el2("button", "task-check");
          check.type = "button";
          check.setAttribute("role", "checkbox");
          check.setAttribute("aria-checked", task.isCompleted ? "true" : "false");
          check.setAttribute("aria-label", task.name);
          check.append(makeIcon("check"));
          check.addEventListener("click", () => void checkTask(task));
          row.append(check, el2("span", "task-name", task.name));
          block.append(row);
        }
        const add = el2("div", "task-add");
        const input = el2("input");
        input.placeholder = "A\xF1adir tarea";
        input.setAttribute("aria-label", `A\xF1adir tarea a ${taskList.name}`);
        const button2 = el2("button", "", "A\xF1adir");
        button2.type = "button";
        button2.addEventListener("click", () => void addTask(taskList.id, input));
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void addTask(taskList.id, input);
          }
        });
        add.append(input, button2);
        block.append(add);
        checklistBody.append(block);
      }
    };
    session.renderLabels();
    session.renderChecklist();
    close.addEventListener("click", () => void closeSheet());
    backdrop.addEventListener("click", () => void closeSheet());
    complete.addEventListener("click", () => void completeFromSheet());
    root.append(backdrop, sheet);
    void loadSessionBlock(session);
    requestAnimationFrame(() => {
      backdrop.classList.add("open");
      sheet.classList.add("open");
      title.focus();
      title.setSelectionRange(title.value.length, title.value.length);
    });
    return session;
  };
  var loadSessionBlock = async (session) => {
    if (!session) return;
    let link = null;
    try {
      const answer = await api("GET", `/link?cardId=${encodeURIComponent(session.card.id)}`);
      link = answer.link || null;
    } catch {
      link = null;
    }
    if (state.sheet !== session) return;
    session.link = link;
    const mapping = state.snapshot?.project || null;
    const options = [{ id: "", title: "Sin sesi\xF3n", activity: "" }];
    const add = (id, title, activity = "") => {
      if (!id || options.some((option) => option.id === id)) return;
      options.push({ id, title: title || id, activity });
    };
    if (state.session?.id) add(state.session.id, state.session.title || "Esta sesi\xF3n", "");
    if (mapping?.projectId) {
      try {
        const snapshot = await host.listSessions(mapping.projectId);
        const sessions = (snapshot?.sessions || []).filter((entry) => !entry.archivedAt).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 30);
        for (const entry of sessions) add(entry.id, entry.title || entry.id, entry.activity || "");
      } catch {
      }
    }
    if (link?.sessionId) add(link.sessionId, link.sessionTitle || link.title || link.sessionId, "");
    if (state.sheet !== session) return;
    session.sessions = options;
    session.sessionSelect.replaceChildren();
    for (const option of options) {
      const label = option.title.length > 60 ? `${option.title.slice(0, 59)}\u2026` : option.title;
      const suffix = option.activity === "running" ? " \xB7 trabajando" : "";
      session.sessionSelect.append(new Option(`${label}${suffix}`, option.id));
    }
    const isDone = session.card.listId === state.snapshot?.doneListId;
    session.sessionSelect.value = link?.sessionId || "";
    session.sessionRemove.style.display = link ? "" : "none";
    session.sessionStart.style.display = !link && mapping && !isDone ? "" : "none";
    session.sessionStart.textContent = mapping ? `Crear sesi\xF3n en ${mapping.name}` : "Crear sesi\xF3n";
    session.sessionOpen.style.display = link ? "" : "none";
    session.sessionStart.onclick = async () => {
      try {
        const answer = await api("POST", "/session/start", { cardId: session.card.id });
        toast("success", `Sesi\xF3n creada en ${answer.project || mapping?.name || "el proyecto"}.`);
        if (answer.sessionId) {
          try {
            await host.openSession(answer.sessionId);
          } catch {
            toast("error", "La sesi\xF3n se cre\xF3, pero no se pudo abrir.");
          }
        }
      } catch (error) {
        toast("error", error.message);
      }
    };
    session.sessionOpen.onclick = async () => {
      if (!link?.sessionId) return;
      try {
        await host.openSession(link.sessionId);
        await closeSheet(true);
      } catch {
        toast("error", "No se pudo abrir la sesi\xF3n enlazada.");
      }
    };
    session.sessionNote.textContent = link ? "Sesi\xF3n enlazada. Al pasar la tarjeta a HECHO se cerrar\xE1 esta sesi\xF3n." : isDone ? "Tarjeta completada. Sin sesi\xF3n enlazada." : mapping ? "Sin sesi\xF3n enlazada. Si ya tienes una abierta para esta tarjeta, selecci\xF3nala aqu\xED." : "Sin proyecto asignado al tablero. Puedes enlazar la sesi\xF3n actual.";
    session.sessionSelect.onchange = async () => {
      const value = session.sessionSelect.value;
      try {
        if (!value) {
          await api("DELETE", "/link", { cardId: session.card.id });
          toast("success", "Sesi\xF3n desvinculada.");
        } else {
          const chosen = session.sessions.find((option) => option.id === value);
          const answer = await api("POST", "/link", {
            cardId: session.card.id,
            sessionId: value,
            sessionTitle: chosen?.title || ""
          });
          session.link = answer.link || null;
          toast("success", "Sesi\xF3n vinculada a la tarjeta.");
        }
      } catch (error) {
        toast("error", error.message);
      }
      await loadSessionBlock(session);
    };
    session.sessionRemove.onclick = async () => {
      try {
        await api("DELETE", "/link", { cardId: session.card.id });
        toast("success", "Sesi\xF3n desvinculada.");
      } catch (error) {
        toast("error", error.message);
      }
      await loadSessionBlock(session);
    };
  };
  var openSheet = (cardId) => {
    const found = findCard(cardId);
    if (!found) return;
    if (state.sheet) {
      removeSheetNodes();
      state.sheet = null;
    }
    state.sheetId = cardId;
    buildSheet(found.card);
  };
  var removeSheetNodes = () => {
    const session = state.sheet;
    if (!session) return;
    session.backdrop.remove();
    session.sheet.remove();
  };
  var closeSheet = async (force = false) => {
    const session = state.sheet;
    if (!session) {
      state.sheetId = "";
      return;
    }
    if (session.timer) clearTimeout(session.timer);
    if (!force && session.pending.size) {
      try {
        await saveSheet();
      } catch {
      }
    }
    removeSheetNodes();
    state.sheet = null;
    state.sheetId = "";
    renderBoardOnly();
  };
  var scheduleSave = () => {
    const session = state.sheet;
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      session.timer = null;
      void saveSheet();
    }, SAVE_DEBOUNCE_MS);
  };
  var setSaveState = (text, kind = "") => {
    const node = state.sheet?.saveState;
    if (!node) return;
    node.textContent = text;
    node.className = `save-state${kind ? ` ${kind}` : ""}`;
  };
  var saveSheet = async () => {
    const session = state.sheet;
    if (!session) return;
    const fields = [...session.pending];
    if (!fields.length) return;
    session.pending.clear();
    const card = session.card;
    const payload = { id: card.id };
    if (fields.includes("name")) payload.name = session.title.value;
    if (fields.includes("description")) payload.description = session.description.value;
    if (fields.includes("dueDate")) payload.dueDate = session.date.value;
    if (fields.includes("listId")) payload.listId = session.column.value;
    state.saving += 1;
    setSaveState("Guardando\u2026");
    try {
      await api("PATCH", "/card", payload);
      const answer = await api("GET", `/card?id=${encodeURIComponent(card.id)}`);
      applyServerCard(answer.card);
      setSaveState("Guardado");
      await refreshBoardOnly();
    } catch (error) {
      setSaveState(error.message, "error");
      toast("error", error.message);
      try {
        const answer = await api("GET", `/card?id=${encodeURIComponent(card.id)}`);
        applyServerCard(answer.card);
      } catch {
        await closeSheet(true);
      }
    } finally {
      state.saving -= 1;
      if (state.sheet?.pending.size) scheduleSave();
    }
  };
  var rereadSheet = async (silent = false) => {
    const session = state.sheet;
    if (!session) return;
    try {
      const answer = await api("GET", `/card?id=${encodeURIComponent(session.card.id)}`);
      applyServerCard(answer.card);
      if (!silent) setSaveState("Guardado");
      await refreshBoardOnly();
    } catch (error) {
      if (!silent) {
        setSaveState(error.message, "error");
        toast("error", error.message);
      }
      if (error.kind === "not-found") await closeSheet(true);
    }
  };
  var applyServerCard = (server) => {
    const session = state.sheet;
    if (!session || server.id !== session.card.id) return;
    session.card = server;
    mergeCard(server);
    const pending = session.pending;
    if (!pending.has("name") && document.activeElement !== session.title) {
      session.title.value = server.name;
    }
    if (!pending.has("description") && document.activeElement !== session.description) {
      session.description.value = server.description;
    }
    if (!pending.has("dueDate")) session.date.value = toDateInput(server.dueDate);
    if (!pending.has("listId")) session.column.value = server.listId;
    session.renderLabels();
    session.renderChecklist();
    const done = server.listId === state.snapshot?.doneListId;
    session.complete.disabled = done;
    session.complete.lastChild.textContent = done ? "Completada" : "Completar";
  };
  var completeFromSheet = async () => {
    const session = state.sheet;
    if (!session) return;
    const id = session.card.id;
    const cardNode = state.refs?.board?.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
    if (cardNode) cardNode.classList.add("leaving");
    session.sheet.classList.add("closing");
    session.backdrop.classList.remove("open");
    const name = session.card.name;
    const backdrop = session.backdrop;
    const sheetNode = session.sheet;
    setTimeout(() => {
      backdrop.remove();
      sheetNode.remove();
    }, 220);
    state.sheet = null;
    state.sheetId = "";
    try {
      const result = await api("POST", "/card/complete", { id });
      toast("success", result.already ? "Ya estaba en HECHO." : `\xAB${name}\xBB movida a HECHO.`);
    } catch (error) {
      toast("error", error.message);
    }
    await refresh(true);
  };
  var refresh = async (silent = false) => {
    if (state.fetching || state.view !== "board") return;
    state.fetching = true;
    try {
      const [snapshot] = await Promise.all([
        api("GET", "/snapshot"),
        loadSessionStates()
      ]);
      state.snapshot = snapshot;
      setBanner("");
      renderAll();
    } catch (error) {
      if (error.kind === "not-configured" || error.kind === "auth") {
        showLogin(error.message);
        return;
      }
      if (!silent) toast("error", error.message);
      setBanner(error.message);
    } finally {
      state.fetching = false;
    }
  };
  var refreshBoardOnly = async () => {
    if (state.view !== "board") return;
    try {
      const [snapshot] = await Promise.all([
        api("GET", "/snapshot"),
        loadSessionStates()
      ]);
      state.snapshot = snapshot;
      setBanner("");
      renderAll();
    } catch {
    }
  };
  var startPolling = () => {
    stopPolling();
    state.poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (isPaused()) return;
      void refresh(true);
    }, POLL_MS);
  };
  var stopPolling = () => {
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
  };
  window.addEventListener("pagehide", () => {
    const pending = state.pendingDelete;
    if (!pending) return;
    api("DELETE", "/card", { id: pending.card.id }).catch(() => {
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !isPaused()) void refresh(true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.sheet) {
      event.preventDefault();
      void closeSheet();
    } else if (state.settings) {
      event.preventDefault();
      closeSettings(true);
    } else if (state.composerListId) {
      event.preventDefault();
      closeComposer();
    }
  });
  var showFatal = (message) => {
    state.view = "error";
    stopPolling();
    const wrapper = el2("div", "center");
    const box = el2("div", "empty-state");
    box.append(
      el2("h2", "", "No se puede abrir Kanban"),
      el2("p", "", message || "Int\xE9ntalo de nuevo en unos segundos.")
    );
    const retry = el2("button", "btn-mint", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", () => void boot());
    box.append(retry);
    wrapper.append(box);
    root.replaceChildren(wrapper);
    state.refs = null;
  };
})();
