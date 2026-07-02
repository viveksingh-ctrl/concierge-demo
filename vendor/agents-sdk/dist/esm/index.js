function createNoopLogger() {
    return {};
}
function createConsoleLogger() {
    const log = (level, message, meta) => {
        const payload = meta === undefined ? [message] : [message, meta];
        switch (level) {
            case "debug":
                console.debug(...payload);
                return;
            case "info":
                console.info(...payload);
                return;
            case "warn":
                console.warn(...payload);
                return;
            case "error":
                console.error(...payload);
                return;
        }
    };
    return {
        log,
        debug: (message, meta) => {
            log("debug", message, meta);
        },
        info: (message, meta) => {
            log("info", message, meta);
        },
        warn: (message, meta) => {
            log("warn", message, meta);
        },
        error: (message, meta) => {
            log("error", message, meta);
        }
    };
}

var ContentstackRegion;
(function (ContentstackRegion) {
    ContentstackRegion["AWS_NA"] = "AWS_NA";
    ContentstackRegion["AZURE_EU"] = "AZURE_EU";
})(ContentstackRegion || (ContentstackRegion = {}));
const Region = ContentstackRegion;

function randomUid() {
    const c = globalThis.crypto;
    const uuid = c?.randomUUID?.();
    if (uuid)
        return uuid;
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now().toString()}-${rand}`;
}

const DEFAULT_STORAGE_KEY = "contentstack:agents-sdk:threadMessages";
const DEFAULT_MAX_MESSAGES = 200;
function resolveStorage(explicit) {
    if (explicit)
        return explicit;
    const g = globalThis;
    const s = g.localStorage;
    if (!s)
        return null;
    if (typeof s.getItem !== "function")
        return null;
    if (typeof s.setItem !== "function")
        return null;
    if (typeof s.removeItem !== "function")
        return null;
    return s;
}
function resolvePersistThreadMessages(persist) {
    if (!persist)
        return null;
    const opts = persist === true ? {} : persist;
    const storage = resolveStorage(opts.storage);
    if (!storage)
        return null;
    const storageKey = typeof opts.storageKey === "string" && opts.storageKey.trim() ? opts.storageKey.trim() : DEFAULT_STORAGE_KEY;
    const maxMessagesPerThread = typeof opts.maxMessagesPerThread === "number" && Number.isFinite(opts.maxMessagesPerThread) && opts.maxMessagesPerThread > 0
        ? Math.floor(opts.maxMessagesPerThread)
        : DEFAULT_MAX_MESSAGES;
    return { storageKey, maxMessagesPerThread, storage };
}
function safeParseState(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object")
        return null;
    const p = parsed;
    if (p.v !== 1)
        return null;
    if (typeof p.userId !== "string")
        return null;
    if (!(p.currentThreadId === null || typeof p.currentThreadId === "string"))
        return null;
    if (!Array.isArray(p.threadIds))
        return null;
    if (!p.threads || typeof p.threads !== "object")
        return null;
    return p;
}
function readState(r) {
    try {
        const raw = r.storage.getItem(r.storageKey);
        if (!raw)
            return null;
        return safeParseState(raw);
    }
    catch {
        return null;
    }
}
function writeState(r, state) {
    try {
        r.storage.setItem(r.storageKey, JSON.stringify(state));
    }
    catch {
    }
}
function ensureState(r) {
    const existing = readState(r);
    if (existing)
        return existing;
    const init = {
        v: 1,
        userId: randomUid(),
        currentThreadId: null,
        threadIds: [],
        threads: {}
    };
    writeState(r, init);
    return init;
}
function getPersistedUserId(r) {
    return ensureState(r).userId;
}
function setPersistedUserId(r, userId) {
    const nextId = userId.trim();
    if (!nextId)
        return;
    const state = ensureState(r);
    if (state.userId === nextId)
        return;
    const next = { ...state, userId: nextId };
    writeState(r, next);
}
function getPersistedCurrentThreadId(r) {
    return ensureState(r).currentThreadId;
}
function setPersistedCurrentThreadId(r, threadId) {
    const state = ensureState(r);
    const trimmed = threadId?.trim();
    const nextTid = trimmed === "" ? null : trimmed ?? null;
    if (state.currentThreadId === nextTid)
        return;
    const next = { ...state, currentThreadId: nextTid };
    writeState(r, next);
}
function getPersistedThreadIds(r) {
    return ensureState(r).threadIds;
}
function addPersistedThreadId(r, threadId) {
    const tid = threadId.trim();
    if (!tid)
        return;
    const state = ensureState(r);
    if (state.threadIds.includes(tid))
        return;
    const next = { ...state, threadIds: [...state.threadIds, tid] };
    writeState(r, next);
}
function clearPersistedAll(r) {
    try {
        r.storage.removeItem(r.storageKey);
    }
    catch {
    }
}
function clearPersistedThread(r, threadId) {
    const tid = threadId.trim();
    if (!tid)
        return;
    const state = readState(r);
    if (!state)
        return;
    const rest = Object.fromEntries(Object.entries(state.threads).filter(([k]) => k !== tid));
    const nextThreadIds = state.threadIds.filter((t) => t !== tid);
    const nextCurrent = state.currentThreadId === tid ? null : state.currentThreadId;
    const next = { ...state, currentThreadId: nextCurrent, threadIds: nextThreadIds, threads: rest };
    writeState(r, next);
}
function getThreadMessages(params) {
    const persist = {
        maxMessagesPerThread: DEFAULT_MAX_MESSAGES,
        ...(typeof params.storageKey === "string" ? { storageKey: params.storageKey } : {}),
        ...(params.storage ? { storage: params.storage } : {})
    };
    const resolved = resolvePersistThreadMessages(persist);
    if (!resolved)
        return [];
    const tid = params.threadId.trim();
    if (!tid)
        return [];
    const state = readState(resolved);
    const msgs = state?.threads[tid]?.messages;
    return Array.isArray(msgs) ? msgs : [];
}
function setThreadMessages(params) {
    const persist = {
        maxMessagesPerThread: DEFAULT_MAX_MESSAGES,
        ...(typeof params.storageKey === "string" ? { storageKey: params.storageKey } : {}),
        ...(params.storage ? { storage: params.storage } : {})
    };
    const resolved = resolvePersistThreadMessages(persist);
    if (!resolved)
        return;
    const tid = params.threadId.trim();
    if (!tid)
        return;
    const state = ensureState(resolved);
    const nextMessages = Array.isArray(params.messages) ? params.messages.slice(-resolved.maxMessagesPerThread) : [];
    const nextThreads = { ...state.threads, [tid]: { messages: nextMessages } };
    const nextThreadIds = state.threadIds.includes(tid) ? state.threadIds : [...state.threadIds, tid];
    const next = { ...state, threadIds: nextThreadIds, threads: nextThreads };
    writeState(resolved, next);
}
function shouldSkipAppend(existing, role, text) {
    const last = existing[existing.length - 1];
    if (!last)
        return false;
    return last.role === role && last.text === text;
}
function appendThreadMessage(r, threadId, message) {
    const tid = threadId.trim();
    if (!tid)
        return;
    const txt = message.text.trim();
    if (!txt)
        return;
    const state = ensureState(r);
    const prev = state.threads[tid]?.messages ?? [];
    if (shouldSkipAppend(prev, message.role, txt))
        return;
    const nextMsg = {
        id: message.id ?? randomUid(),
        role: message.role,
        text: txt,
        ts: typeof message.ts === "number" && Number.isFinite(message.ts) ? message.ts : Date.now()
    };
    const nextMessages = [...prev, nextMsg].slice(-r.maxMessagesPerThread);
    const nextThreads = { ...state.threads, [tid]: { messages: nextMessages } };
    const nextThreadIds = state.threadIds.includes(tid) ? state.threadIds : [...state.threadIds, tid];
    const next = {
        ...state,
        currentThreadId: state.currentThreadId ?? tid,
        threadIds: nextThreadIds,
        threads: nextThreads
    };
    writeState(r, next);
}

const DIGITAL_CONCIERGE_BASE_URL_BY_REGION = {
    AWS_NA: "https://digital-concierge-api.csnonprod.com",
    AZURE_EU: "https://azure-eu-digital-concierge-api.contentstack.com",
};
const JSON_CONTENT_TYPE = "application/json";
const HEADER_CONTENT_TYPE = "content-type";
const DIGITAL_CONCIERGE_EXECUTE_PATH_PREFIX = "/digital-concierge/agents/";
const DIGITAL_CONCIERGE_EXECUTE_PATH_SUFFIX = "/execute";
const DIGITAL_CONCIERGE_HEADER_USER_ID = "x-user-id";
const DIGITAL_CONCIERGE_HEADER_ACCEPT = "accept";
const DIGITAL_CONCIERGE_HEADER_PLATFORM = "x-platform";
const DIGITAL_CONCIERGE_ACCEPT_ANY = "*/*";
const DIGITAL_CONCIERGE_DEFAULT_PLATFORM = "SDK";
const DIGITAL_CONCIERGE_SSE_EVENT_CHUNK_TEXT = "chunk-text-dc";
const DIGITAL_CONCIERGE_SSE_EVENT_TOOL_RESULT = "tool-result-dc";
const DIGITAL_CONCIERGE_SSE_EVENT_METADATA = "metadata-dc";
const DIGITAL_CONCIERGE_LOG_REQUEST = "digitalConcierge.request";

class ConversationStore {
    byUserId = new Map();
    getMessages(userId, threadId) {
        const userThreads = this.byUserId.get(userId);
        if (!userThreads)
            return [];
        return userThreads.get(threadId) ?? [];
    }
    setMessages(userId, threadId, messages) {
        let userThreads = this.byUserId.get(userId);
        if (!userThreads) {
            userThreads = new Map();
            this.byUserId.set(userId, userThreads);
        }
        userThreads.set(threadId, messages);
    }
    appendMessage(userId, threadId, message) {
        let userThreads = this.byUserId.get(userId);
        if (!userThreads) {
            userThreads = new Map();
            this.byUserId.set(userId, userThreads);
        }
        let messages = userThreads.get(threadId);
        if (!messages) {
            messages = [];
            userThreads.set(threadId, messages);
        }
        messages.push({ ...message, createdAtMs: Date.now() });
    }
    clearThread(userId, threadId) {
        const userThreads = this.byUserId.get(userId);
        if (!userThreads)
            return;
        userThreads.delete(threadId);
        if (userThreads.size === 0)
            this.byUserId.delete(userId);
    }
    clearAllThreads(userId) {
        this.byUserId.delete(userId);
    }
}

function resolveDigitalConciergeBaseUrl(region, environment) {
    const baseUrl = DIGITAL_CONCIERGE_BASE_URL_BY_REGION[region];
    if (!baseUrl)
        throw new Error(`No Digital Concierge base URL configured for region=${region}`);
    return baseUrl;
}
function resolveDigitalConciergeExecuteUrl(params) {
    if (params.endpoint) {
        return `${params.endpoint}${DIGITAL_CONCIERGE_EXECUTE_PATH_PREFIX}${params.apiKey}${DIGITAL_CONCIERGE_EXECUTE_PATH_SUFFIX}`;
    }
    if (!params.region) {
        throw new Error("Either region or endpoint must be provided");
    }
    const baseUrl = resolveDigitalConciergeBaseUrl(params.region);
    return `${baseUrl}${DIGITAL_CONCIERGE_EXECUTE_PATH_PREFIX}${params.apiKey}${DIGITAL_CONCIERGE_EXECUTE_PATH_SUFFIX}`;
}

async function* parseSseDataJson(response) {
    const body = response.body;
    if (!body)
        return;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        for (;;) {
            const newlineIdx = buffer.indexOf("\n");
            if (newlineIdx === -1)
                break;
            const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
            buffer = buffer.slice(newlineIdx + 1);
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            if (!trimmed.startsWith("data:"))
                continue;
            const data = trimmed.slice("data:".length).trim();
            if (!data)
                continue;
            yield JSON.parse(data);
        }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
        const data = tail.slice("data:".length).trim();
        if (data)
            yield JSON.parse(data);
    }
}

function createEmitter$1() {
    const buffer = [];
    let isEnded = false;
    let notify = null;
    const iterable = {
        async *[Symbol.asyncIterator]() {
            for (;;) {
                if (buffer.length > 0) {
                    yield buffer.shift();
                    continue;
                }
                if (isEnded)
                    return;
                await new Promise((r) => {
                    notify = r;
                });
            }
        }
    };
    return {
        emit: (item) => {
            if (isEnded)
                return;
            buffer.push(item);
            notify?.();
            notify = null;
        },
        end: () => {
            isEnded = true;
            notify?.();
            notify = null;
        },
        iterable
    };
}
function createDeferred$1() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
function toDcMessages(history, prompt) {
    const messages = history.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.text }]
    }));
    messages.push({ role: "user", content: [{ type: "text", text: prompt }] });
    return messages;
}
function extractSourcesFromCustomRecord(custom, out) {
    if (!custom || typeof custom !== "object")
        return;
    for (const [key, value] of Object.entries(custom)) {
        if (!value || typeof value !== "object")
            continue;
        const v = value;
        if (v.isSource !== true)
            continue;
        if (typeof v.value !== "string")
            continue;
        const contentType = typeof v.type === "string" ? v.type : undefined;
        const source = contentType
            ? { key, value: v.value, contentType }
            : { key, value: v.value };
        out.set(`${key}:${v.value}`, source);
    }
}
function extractSourcesFromToolResult(result) {
    const out = new Map();
    if (result && typeof result === "object") {
        const r = result;
        const rootCustom = r.custom;
        if (Array.isArray(rootCustom)) {
            for (const entry of rootCustom)
                extractSourcesFromCustomRecord(entry, out);
        }
        else {
            extractSourcesFromCustomRecord(rootCustom, out);
        }
        const results = r.results;
        if (Array.isArray(results)) {
            for (const item of results) {
                if (!item || typeof item !== "object")
                    continue;
                const metadata = item.metadata;
                if (!metadata || typeof metadata !== "object")
                    continue;
                const custom = metadata.custom;
                extractSourcesFromCustomRecord(custom, out);
            }
        }
    }
    return Array.from(out.values());
}
function extractMetadataResults(results) {
    const out = [];
    for (const r of results) {
        if (!r || typeof r !== "object")
            continue;
        const item = r;
        if (typeof item.content_uid !== "string")
            continue;
        const custom = item.custom;
        out.push({ content_uid: item.content_uid, ...(custom ? { custom } : {}) });
    }
    return out;
}
function safeTextDelta(nextText, prevText) {
    if (nextText.startsWith(prevText))
        return nextText.slice(prevText.length);
    return nextText;
}
function safeCallback(fn, ...args) {
    if (!fn)
        return;
    try {
        fn(...args);
    }
    catch {
        // callbacks are fire-and-forget
    }
}
const VALID_REGIONS$1 = new Set(Object.values(ContentstackRegion));
function validateConfig$1(config) {
    if (!config.apiKey || typeof config.apiKey !== "string" || !config.apiKey.trim()) {
        throw new Error("ConciergeAgent: apiKey is required and must be a non-empty string");
    }
    const raw = config;
    const hasRegion = "region" in raw && raw.region !== undefined;
    const hasEndpoint = "endpoint" in raw && raw.endpoint !== undefined;
    if (!hasRegion && !hasEndpoint) {
        throw new Error("ConciergeAgent: either region or endpoint must be provided");
    }
    if (hasRegion && hasEndpoint) {
        throw new Error("ConciergeAgent: region and endpoint are mutually exclusive — provide one, not both");
    }
    if (hasRegion && !VALID_REGIONS$1.has(raw.region)) {
        throw new Error(`ConciergeAgent: invalid region "${raw.region}". Valid regions: ${Array.from(VALID_REGIONS$1).join(", ")}`);
    }
    if (hasEndpoint && (typeof raw.endpoint !== "string" || !raw.endpoint.trim())) {
        throw new Error("ConciergeAgent: endpoint must be a non-empty string");
    }
}
class ConciergeAgent {
    config;
    logger;
    store = new ConversationStore();
    platform;
    persist;
    currentUserId;
    currentThreadId;
    constructor(config) {
        validateConfig$1(config);
        this.config = config;
        this.logger = config.logger ?? {};
        this.platform = config.platform ?? DIGITAL_CONCIERGE_DEFAULT_PLATFORM;
        this.persist = resolvePersistThreadMessages(config.persistThreadMessages);
    }
    setUserId(userId) {
        this.currentUserId = userId;
        return this;
    }
    setThreadId(threadId) {
        this.currentThreadId = threadId;
        return this;
    }
    clearThread(threadId) {
        const userId = this.currentUserId;
        if (!userId)
            return;
        const tid = threadId ?? this.currentThreadId;
        if (!tid)
            return;
        this.store.clearThread(userId, tid);
        if (this.persist)
            clearPersistedThread(this.persist, tid);
    }
    clearAllThreads() {
        const userId = this.currentUserId;
        if (!userId)
            return;
        this.store.clearAllThreads(userId);
        if (this.persist)
            clearPersistedAll(this.persist);
    }
    async generateText(input) {
        const run = this.streamText(input);
        try {
            return await run.done;
        }
        finally {
            run.cancel();
        }
    }
    streamText(input) {
        const abortController = new AbortController();
        const events = createEmitter$1();
        const textEmitter = createEmitter$1();
        const doneDeferred = createDeferred$1();
        const textDeferred = createDeferred$1();
        const sourcesDeferred = createDeferred$1();
        const metadataDeferred = createDeferred$1();
        if (input.signal) {
            if (input.signal.aborted) {
                abortController.abort(input.signal.reason);
            }
            else {
                input.signal.addEventListener("abort", () => {
                    abortController.abort(input.signal?.reason);
                }, { once: true });
            }
        }
        void (async () => {
            try {
                for await (const ev of this.streamTextEvents(input, abortController.signal)) {
                    safeCallback(input.onChunk, ev);
                    events.emit(ev);
                    if (ev.type === "text") {
                        textEmitter.emit(ev.textDelta);
                    }
                    if (ev.type === "done") {
                        const result = {
                            threadId: ev.threadId,
                            userId: ev.userId,
                            text: ev.text,
                            sources: ev.sources,
                            metadata: ev.metadata
                        };
                        textDeferred.resolve(ev.text);
                        sourcesDeferred.resolve(ev.sources);
                        metadataDeferred.resolve(ev.metadata);
                        doneDeferred.resolve(result);
                        safeCallback(input.onFinish, result);
                    }
                }
            }
            catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                events.emit({ type: "error", message: error.message });
                doneDeferred.reject(error);
                textDeferred.reject(error);
                sourcesDeferred.reject(error);
                metadataDeferred.reject(error);
                safeCallback(input.onError, error);
            }
            finally {
                events.end();
                textEmitter.end();
            }
        })();
        const toSSEResponse = (init) => {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const ev of events.iterable) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
                        }
                    }
                    catch {
                        // stream ended
                    }
                    finally {
                        controller.close();
                    }
                }
            });
            const sseHeaders = new Headers({
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache, no-transform",
                connection: "keep-alive"
            });
            if (init?.headers)
                new Headers(init.headers).forEach((v, k) => { sseHeaders.set(k, v); });
            return new Response(stream, { ...init, headers: sseHeaders });
        };
        const toTextStreamResponse = (init) => {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const delta of textEmitter.iterable) {
                            controller.enqueue(encoder.encode(delta));
                        }
                    }
                    catch {
                        // stream ended
                    }
                    finally {
                        controller.close();
                    }
                }
            });
            const textHeaders = new Headers({ "content-type": "text/plain; charset=utf-8" });
            if (init?.headers)
                new Headers(init.headers).forEach((v, k) => { textHeaders.set(k, v); });
            return new Response(stream, { ...init, headers: textHeaders });
        };
        return {
            events: events.iterable,
            textStream: textEmitter.iterable,
            text: textDeferred.promise,
            sources: sourcesDeferred.promise,
            metadata: metadataDeferred.promise,
            done: doneDeferred.promise,
            cancel: () => { abortController.abort(); },
            toSSEResponse,
            toTextStreamResponse
        };
    }
    async *streamTextEvents(input, signal) {
        const persist = this.persist;
        let userId = input.userId ?? this.currentUserId;
        let threadId = input.threadId ?? this.currentThreadId;
        if (persist) {
            userId ??= getPersistedUserId(persist);
            threadId ??= getPersistedCurrentThreadId(persist) ?? undefined;
        }
        userId = userId ?? randomUid();
        threadId = threadId ?? randomUid();
        this.currentUserId = userId;
        this.currentThreadId = threadId;
        if (persist) {
            setPersistedUserId(persist, userId);
            setPersistedCurrentThreadId(persist, threadId);
            addPersistedThreadId(persist, threadId);
            const persistedMessages = getThreadMessages({
                threadId,
                storageKey: persist.storageKey,
                storage: persist.storage
            });
            if (persistedMessages.length && this.store.getMessages(userId, threadId).length === 0) {
                this.store.setMessages(userId, threadId, persistedMessages.map((m) => ({ role: m.role, text: m.text, createdAtMs: m.ts })));
            }
        }
        const historyAll = this.store.getMessages(userId, threadId);
        const maxHistory = this.config.options?.conversation?.maxHistoryMessages;
        const history = typeof maxHistory === "number" && maxHistory >= 0
            ? historyAll.slice(-maxHistory)
            : historyAll;
        this.store.appendMessage(userId, threadId, { role: "user", text: input.prompt });
        if (persist)
            appendThreadMessage(persist, threadId, { role: "user", text: input.prompt });
        const cfgRaw = this.config;
        const url = resolveDigitalConciergeExecuteUrl({
            apiKey: this.config.apiKey,
            ...("region" in cfgRaw && cfgRaw.region ? { region: cfgRaw.region } : {}),
            ...("endpoint" in cfgRaw && cfgRaw.endpoint ? { endpoint: cfgRaw.endpoint } : {}),
            ...(this.config.environment !== undefined ? { environment: this.config.environment } : {})
        });
        const requestBody = {
            messages: toDcMessages(history.map((m) => ({ role: m.role, text: m.text })), input.prompt),
            threadId
        };
        this.logger.debug?.(DIGITAL_CONCIERGE_LOG_REQUEST, { url, userId, threadId });
        this.logger.log?.("debug", DIGITAL_CONCIERGE_LOG_REQUEST, { url, userId, threadId });
        const res = await fetch(url, {
            method: "POST",
            headers: {
                [DIGITAL_CONCIERGE_HEADER_ACCEPT]: DIGITAL_CONCIERGE_ACCEPT_ANY,
                [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
                [DIGITAL_CONCIERGE_HEADER_USER_ID]: userId,
                [DIGITAL_CONCIERGE_HEADER_PLATFORM]: this.platform
            },
            body: JSON.stringify(requestBody),
            ...(signal ? { signal } : {})
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Digital Concierge request failed: ${String(res.status)} ${res.statusText} ${text}`);
        }
        let lastText = "";
        const sourceMap = new Map();
        const allMetadata = [];
        for await (const raw of parseSseDataJson(res)) {
            if (!raw || typeof raw !== "object")
                continue;
            const evt = raw;
            const type = evt.type;
            if (type === DIGITAL_CONCIERGE_SSE_EVENT_CHUNK_TEXT) {
                const payload = evt.payload;
                const text = typeof payload?.text === "string" ? payload.text : "";
                if (!text)
                    continue;
                const delta = safeTextDelta(text, lastText);
                lastText = text;
                if (delta)
                    yield { type: "text", textDelta: delta, text };
                continue;
            }
            if (type === DIGITAL_CONCIERGE_SSE_EVENT_TOOL_RESULT) {
                const payload = evt.payload;
                const toolName = typeof payload?.toolName === "string" ? payload.toolName : "tool";
                const toolCallId = typeof payload?.toolCallId === "string" ? payload.toolCallId : undefined;
                const result = payload?.result;
                const sources = extractSourcesFromToolResult(result);
                for (const s of sources)
                    sourceMap.set(`${s.key}:${s.value}`, s);
                yield {
                    type: "toolResult",
                    toolName,
                    ...(toolCallId ? { toolCallId } : {}),
                    result,
                    sources
                };
                continue;
            }
            if (type === DIGITAL_CONCIERGE_SSE_EVENT_METADATA) {
                const rawResults = evt.results;
                if (Array.isArray(rawResults)) {
                    const metadataResults = extractMetadataResults(rawResults);
                    allMetadata.push(...metadataResults);
                    for (const item of metadataResults) {
                        if (item.custom) {
                            extractSourcesFromCustomRecord(item.custom, sourceMap);
                        }
                    }
                    const sources = Array.from(sourceMap.values());
                    yield { type: "metadata", results: metadataResults, sources };
                }
                continue;
            }
        }
        if (lastText)
            this.store.appendMessage(userId, threadId, { role: "assistant", text: lastText });
        if (persist && lastText)
            appendThreadMessage(persist, threadId, { role: "assistant", text: lastText });
        const sources = Array.from(sourceMap.values());
        yield { type: "done", threadId, userId, text: lastText, sources, metadata: allMetadata };
    }
}

function isConciergeSearchHit(item) {
    return "uid" in item;
}
function isConciergeSearchContentRef(item) {
    return "content_uid" in item;
}

const DIGITAL_CONCIERGE_SEARCH_PATH_PREFIX = "/digital-concierge/";
const DIGITAL_CONCIERGE_SEARCH_PATH_SUFFIX = "/search";
const DIGITAL_CONCIERGE_HEADER_SESSION_ID = "x-session-id";
const DIGITAL_CONCIERGE_HEADER_LIMIT = "x-limit";
function resolveDigitalConciergeSearchUrl(params) {
    if (params.endpoint) {
        return `${params.endpoint}${DIGITAL_CONCIERGE_SEARCH_PATH_PREFIX}${params.apiKey}${DIGITAL_CONCIERGE_SEARCH_PATH_SUFFIX}`;
    }
    if (!params.region) {
        throw new Error("Either region or endpoint must be provided");
    }
    const baseUrl = DIGITAL_CONCIERGE_BASE_URL_BY_REGION[params.region];
    if (!baseUrl)
        throw new Error(`No Digital Concierge base URL configured for region=${params.region}`);
    return `${baseUrl}${DIGITAL_CONCIERGE_SEARCH_PATH_PREFIX}${params.apiKey}${DIGITAL_CONCIERGE_SEARCH_PATH_SUFFIX}`;
}

const VALID_REGIONS = new Set(Object.values(ContentstackRegion));
function validateConfig(config) {
    if (!config.apiKey || typeof config.apiKey !== "string" || !config.apiKey.trim()) {
        throw new Error("ConciergeSearch: apiKey is required and must be a non-empty string");
    }
    const raw = config;
    const hasRegion = "region" in raw && raw.region !== undefined;
    const hasEndpoint = "endpoint" in raw && raw.endpoint !== undefined;
    if (!hasRegion && !hasEndpoint) {
        throw new Error("ConciergeSearch: either region or endpoint must be provided");
    }
    if (hasRegion && hasEndpoint) {
        throw new Error("ConciergeSearch: region and endpoint are mutually exclusive — provide one, not both");
    }
    if (hasRegion && !VALID_REGIONS.has(raw.region)) {
        throw new Error(`ConciergeSearch: invalid region "${raw.region}". Valid regions: ${Array.from(VALID_REGIONS).join(", ")}`);
    }
    if (hasEndpoint && (typeof raw.endpoint !== "string" || !raw.endpoint.trim())) {
        throw new Error("ConciergeSearch: endpoint must be a non-empty string");
    }
}
function isSearchMetadataField(value) {
    if (!value || typeof value !== "object")
        return false;
    const v = value;
    const valueType = typeof v.value;
    return (valueType === "string" || valueType === "number") && typeof v.isSource === "boolean";
}
function normalizeMetadata(raw) {
    const out = {};
    if (!raw || typeof raw !== "object")
        return out;
    for (const [key, value] of Object.entries(raw)) {
        if (!isSearchMetadataField(value))
            continue;
        const field = { value: value.value, isSource: value.isSource };
        if (typeof value.type === "string") {
            field.type = value.type;
        }
        out[key] = field;
    }
    return out;
}
function normalizeHit(obj) {
    if (typeof obj.uid !== "string" || typeof obj.project_uid !== "string")
        return null;
    return {
        uid: obj.uid,
        project_uid: obj.project_uid,
        metadata: normalizeMetadata(obj.metadata)
    };
}
function normalizeResults(raw) {
    if (!Array.isArray(raw))
        return [];
    const items = [];
    for (const r of raw) {
        if (!r || typeof r !== "object")
            continue;
        const obj = r;
        const hit = normalizeHit(obj);
        if (hit) {
            items.push(hit);
            continue;
        }
        if (typeof obj.content_uid === "string") {
            items.push({ content_uid: obj.content_uid });
            continue;
        }
    }
    return items;
}
function extractSources(items) {
    const map = new Map();
    for (const item of items) {
        if (!isConciergeSearchHit(item))
            continue;
        for (const [key, field] of Object.entries(item.metadata)) {
            if (!field.isSource)
                continue;
            if (typeof field.value !== "string")
                continue;
            const source = field.type
                ? { key, value: field.value, contentType: field.type }
                : { key, value: field.value };
            map.set(`${key}:${field.value}`, source);
        }
    }
    return Array.from(map.values());
}
class ConciergeSearch {
    config;
    logger;
    platform;
    currentSessionId;
    lastQuery = null;
    constructor(config) {
        validateConfig(config);
        this.config = config;
        this.logger = config.logger ?? {};
        this.platform = config.platform ?? DIGITAL_CONCIERGE_DEFAULT_PLATFORM;
        this.currentSessionId = config.sessionId ?? randomUid();
    }
    setSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
            throw new Error("ConciergeSearch: sessionId must be a non-empty string");
        }
        this.currentSessionId = sessionId;
        this.lastQuery = null;
        return this;
    }
    getSessionId() {
        return this.currentSessionId;
    }
    clearSession() {
        this.currentSessionId = randomUid();
        this.lastQuery = null;
    }
    async search(input) {
        if (!input.query.trim()) {
            throw new Error("ConciergeSearch: query is required and must be a non-empty string");
        }
        const trimmedQuery = input.query.trim();
        const perCallSession = typeof input.sessionId === "string" && input.sessionId.trim().length > 0
            ? input.sessionId
            : null;
        let sessionId;
        let omitQueryInBody;
        if (perCallSession !== null) {
            sessionId = perCallSession;
            omitQueryInBody = false;
        }
        else {
            if (this.lastQuery !== null && this.lastQuery !== trimmedQuery) {
                this.currentSessionId = randomUid();
            }
            sessionId = this.currentSessionId;
            omitQueryInBody = this.lastQuery === trimmedQuery;
            this.lastQuery = trimmedQuery;
        }
        const limit = input.limit ?? this.config.defaultLimit;
        const cfgRaw = this.config;
        const url = resolveDigitalConciergeSearchUrl({
            apiKey: this.config.apiKey,
            ...("region" in cfgRaw && cfgRaw.region ? { region: cfgRaw.region } : {}),
            ...("endpoint" in cfgRaw && cfgRaw.endpoint ? { endpoint: cfgRaw.endpoint } : {})
        });
        const headers = {
            [DIGITAL_CONCIERGE_HEADER_ACCEPT]: DIGITAL_CONCIERGE_ACCEPT_ANY,
            [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
            [DIGITAL_CONCIERGE_HEADER_PLATFORM]: this.platform,
            [DIGITAL_CONCIERGE_HEADER_SESSION_ID]: sessionId
        };
        if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
            headers[DIGITAL_CONCIERGE_HEADER_LIMIT] = String(Math.floor(limit));
        }
        this.logger.debug?.("digitalConcierge.search.request", { url, sessionId, limit });
        this.logger.log?.("debug", "digitalConcierge.search.request", { url, sessionId, limit });
        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(omitQueryInBody ? {} : { query: trimmedQuery }),
            ...(input.signal ? { signal: input.signal } : {})
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Digital Concierge search failed: ${String(res.status)} ${res.statusText} ${text}`);
        }
        const raw = await res.json();
        const rawResults = raw && typeof raw === "object" ? raw.results : undefined;
        const results = normalizeResults(rawResults);
        const sources = extractSources(results);
        return { sessionId, results, sources, raw };
    }
}

function createEmitter() {
    const buffer = [];
    let isEnded = false;
    let notify = null;
    const iterable = {
        async *[Symbol.asyncIterator]() {
            for (;;) {
                if (buffer.length > 0) {
                    yield buffer.shift();
                    continue;
                }
                if (isEnded)
                    return;
                await new Promise((r) => {
                    notify = r;
                });
            }
        }
    };
    return {
        emit: (item) => {
            if (isEnded)
                return;
            buffer.push(item);
            notify?.();
            notify = null;
        },
        end: () => {
            isEnded = true;
            notify?.();
            notify = null;
        },
        iterable
    };
}
function normalizeChunk(chunk) {
    return chunk.replace(/\r/g, "");
}
function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
function createConciergeClient(params) {
    const fetchImpl = params.fetch ?? fetch;
    const streamText = (input) => {
        const abortController = new AbortController();
        const events = createEmitter();
        const text = createEmitter();
        const done = createDeferred();
        void (async () => {
            try {
                const res = await fetchImpl(params.endpoint, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(input),
                    signal: abortController.signal
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    const msg = `Request failed: ${String(res.status)} ${res.statusText}${text ? ` — ${text}` : ""}`;
                    events.emit({ type: "error", message: msg });
                    done.reject(new Error(msg));
                    return;
                }
                const body = res.body;
                if (!body) {
                    const msg = "No response body";
                    events.emit({ type: "error", message: msg });
                    done.reject(new Error(msg));
                    return;
                }
                const reader = body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let sawDone = false;
                let shouldStop = false;
                for (;;) {
                    if (shouldStop)
                        break;
                    const { value, done: readerDone } = await reader.read();
                    if (readerDone)
                        break;
                    buffer = normalizeChunk(buffer + decoder.decode(value, { stream: true }));
                    for (;;) {
                        const boundary = buffer.indexOf("\n\n");
                        if (boundary === -1)
                            break;
                        const rawEvent = buffer.slice(0, boundary);
                        buffer = buffer.slice(boundary + 2);
                        const lines = rawEvent
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean);
                        for (const line of lines) {
                            if (!line.startsWith("data:"))
                                continue;
                            const jsonStr = line.slice("data:".length).trim();
                            if (!jsonStr)
                                continue;
                            let parsed;
                            try {
                                parsed = JSON.parse(jsonStr);
                            }
                            catch {
                                const msg = "Failed to parse stream event JSON";
                                events.emit({ type: "error", message: msg });
                                done.reject(new Error(msg));
                                return;
                            }
                            switch (parsed.type) {
                                case "text":
                                    events.emit(parsed);
                                    text.emit(parsed.textDelta);
                                    break;
                                case "toolResult":
                                    if (parsed.sources.length)
                                        events.emit({ type: "sources", sources: parsed.sources });
                                    break;
                                case "metadata":
                                    events.emit(parsed);
                                    break;
                                case "done":
                                    sawDone = true;
                                    events.emit(parsed);
                                    done.resolve({
                                        threadId: parsed.threadId,
                                        userId: parsed.userId,
                                        text: parsed.text,
                                        sources: parsed.sources,
                                        metadata: parsed.metadata
                                    });
                                    shouldStop = true;
                                    void reader.cancel().catch(() => undefined);
                                    break;
                                case "error":
                                    events.emit(parsed);
                                    done.reject(new Error(parsed.message));
                                    return;
                            }
                        }
                    }
                }
                if (!sawDone)
                    done.reject(new Error("Stream ended without done event"));
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                events.emit({ type: "error", message });
                done.reject(e);
            }
            finally {
                events.end();
                text.end();
            }
        })();
        return {
            events: events.iterable,
            textStream: text.iterable,
            done: done.promise,
            cancel: () => {
                abortController.abort();
            }
        };
    };
    const generateText = async (input) => {
        const run = streamText(input);
        try {
            return await run.done;
        }
        finally {
            run.cancel();
        }
    };
    return { streamText, generateText };
}

export { ConciergeAgent, ConciergeSearch, ContentstackRegion, Region, addPersistedThreadId, appendThreadMessage, clearPersistedAll, clearPersistedThread, createConciergeClient, createConsoleLogger, createNoopLogger, getPersistedCurrentThreadId, getPersistedThreadIds, getPersistedUserId, getThreadMessages, isConciergeSearchContentRef, isConciergeSearchHit, randomUid, resolvePersistThreadMessages, setPersistedCurrentThreadId, setPersistedUserId, setThreadMessages };
//# sourceMappingURL=index.js.map
