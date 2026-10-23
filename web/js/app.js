/* DOM for the LinkForge demo. The live API is the default; localStorage is the fallback. */
(function () {
  const LF = window.LinkForge;
  const LINKS_KEY = "linkforge.links.v1";
  const SETTINGS_KEY = "linkforge.settings.v1";
  const REDIRECT_MS = 2000;
  const EXAMPLES = [
    ["EKS docs", "https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html"],
    ["FastAPI", "https://fastapi.tiangolo.com/"],
    ["This repo", "https://github.com/taha080/aws-eks-devops-platform"],
  ];

  const $ = (id) => document.getElementById(id);
  const urlInput = $("url");
  const codeInput = $("code");
  const composer = $("composer");
  const formError = $("form-error");
  const submitBtn = $("shorten");
  const storageHint = $("storage-hint");
  const chips = $("chips");
  const apiBaseInput = $("api-base");
  const apiTokenInput = $("api-token");
  const apiError = $("api-error");
  const apiStatus = $("api-status");
  const apiConnect = $("api-connect");
  const apiDisconnect = $("api-disconnect");
  const apiForget = $("api-forget");
  const ledgerMode = $("ledger-mode");
  const stats = $("stats");
  const empty = $("empty");
  const emptyKicker = $("empty-kicker");
  const emptyCopy = $("empty-copy");
  const list = $("list");
  const ledgerNote = $("ledger-note");
  const gate = $("gate");
  const gateKicker = $("gate-kicker");
  const gateTitle = $("gate-title");
  const gateCopy = $("gate-copy");
  const gateUrl = $("gate-url");
  const gateGo = $("gate-go");
  const gateStay = $("gate-stay");
  const gateBar = $("gate-bar");
  const shell = document.querySelectorAll(".site-header, main, .site-footer");

  let remoteLinks = [];
  let remoteTotal = 0;
  let remoteError = "";
  let redirectTimer = 0;
  let freshCode = "";
  let sessionToken = 0;
  let probePromise = null;
  let waking = false;
  let sessionFallback = false;
  const copyTimers = new WeakMap();

  function loadLinks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LINKS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => {
          if (!item || !LF.isValidCode(item.code) || !LF.safeHttpUrl(item.target_url)) return null;
          const clicks = Number(item.clicks);
          return {
            code: item.code,
            target_url: item.target_url,
            clicks: Number.isFinite(clicks) && clicks > 0 ? Math.floor(clicks) : 0,
            created_at: typeof item.created_at === "string" ? item.created_at : "",
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
    } catch {
      return [];
    }
  }

  function saveLinks(links) {
    const trimmed = links
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 200);
    localStorage.setItem(LINKS_KEY, JSON.stringify(trimmed));
  }

  function loadSettings() {
    const fallback = { baseUrl: LF.DEFAULT_API_BASE, token: "", transport: "api" };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;
      const token = typeof parsed.token === "string" ? parsed.token : "";
      if (parsed.transport === "browser") {
        const baseUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl : "";
        return { baseUrl, token, transport: "browser" };
      }
      const baseUrl =
        typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()
          ? parsed.baseUrl.trim()
          : LF.DEFAULT_API_BASE;
      return { baseUrl, token, transport: "api" };
    } catch {
      return fallback;
    }
  }

  function activeSettings() {
    const settings = loadSettings();
    if (sessionFallback && settings.transport === "api") {
      return {
        baseUrl: settings.baseUrl,
        token: settings.token,
        transport: "browser",
        unreachable: true,
      };
    }
    return {
      baseUrl: settings.baseUrl,
      token: settings.token,
      transport: settings.transport,
      unreachable: false,
    };
  }

  function saveSettings(settings) {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        baseUrl: settings.baseUrl || "",
        token: settings.token || "",
        transport: settings.transport === "api" ? "api" : "browser",
      }),
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clearRedirectTimer() {
    if (redirectTimer) {
      window.clearTimeout(redirectTimer);
      redirectTimer = 0;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function invalidateApiSession() {
    sessionToken += 1;
    probePromise = null;
    waking = false;
  }

  function setInert(on) {
    shell.forEach((el) => {
      el.inert = on;
    });
  }

  function showGate() {
    gate.hidden = false;
    setInert(true);
    document.title = "Short link — LinkForge";
  }

  function closeGate() {
    gate.hidden = true;
    setInert(false);
    document.title = "LinkForge — URL shortener on EKS";
  }

  function restartBar() {
    const span = gateBar.querySelector("span");
    span.classList.remove("is-running");
    void span.offsetWidth;
    span.classList.add("is-running");
  }

  function showWakingGate(code) {
    clearRedirectTimer();
    gateKicker.textContent = "Short link";
    gateTitle.textContent = "Waking server";
    gateCopy.textContent = "The free instance is starting. This can take about 50 seconds.";
    gateUrl.textContent = code ? `#/${code}` : "";
    gateGo.hidden = true;
    gateGo.removeAttribute("href");
    gateBar.hidden = true;
    gateStay.hidden = false;
    gateStay.textContent = "Stay here";
    showGate();
    gateStay.focus();
  }

  function openMissing(code, message) {
    clearRedirectTimer();
    gateKicker.textContent = "Short link";
    gateTitle.textContent = "No link in this browser";
    gateCopy.textContent =
      message ||
      "Links created here stay on this device. Shorten a URL, or connect an API if the code lives there.";
    gateUrl.textContent = `#/${code}`;
    gateGo.hidden = true;
    gateGo.removeAttribute("href");
    gateBar.hidden = true;
    gateStay.hidden = false;
    gateStay.textContent = "Back to the shortener";
    showGate();
    gateStay.focus();
  }

  function openRedirect(target, kind) {
    clearRedirectTimer();
    const reduce = prefersReducedMotion();
    gateKicker.textContent = "Short link";
    gateTitle.textContent = kind === "api" ? "Sending you to the API" : "Taking you there";
    gateCopy.textContent =
      kind === "api"
        ? "The service redirects and counts the click."
        : reduce
          ? "The click is counted. Continue when you are ready."
          : "The click is counted. Continuing in a moment.";
    gateUrl.textContent = target;
    gateGo.hidden = false;
    gateGo.href = target;
    gateGo.textContent = "Continue";
    gateStay.hidden = false;
    gateStay.textContent = "Stay here";
    if (reduce) {
      gateBar.hidden = true;
    } else {
      gateBar.hidden = false;
      restartBar();
      redirectTimer = window.setTimeout(() => {
        window.location.replace(target);
      }, REDIRECT_MS);
    }
    showGate();
    gateGo.focus();
  }

  function followCode(code) {
    const persisted = loadSettings();
    if (waking && persisted.transport === "api" && !sessionFallback) {
      showWakingGate(code);
      return;
    }
    const links = loadLinks();
    const local = links.find((link) => link.code === code);
    if (local) {
      if (!LF.safeHttpUrl(local.target_url)) {
        openMissing(code, "This saved target is not an http(s) URL, so it will not open.");
        return;
      }
      local.clicks += 1;
      try {
        saveLinks(links);
      } catch {
        local.clicks -= 1;
        openMissing(code, "This browser blocked storage, so the click was not counted.");
        return;
      }
      openRedirect(local.target_url, "local");
      return;
    }
    const settings = activeSettings();
    if (!settings.unreachable && settings.transport === "api" && settings.baseUrl && LF.isValidCode(code)) {
      openRedirect(`${settings.baseUrl.replace(/\/$/, "")}/${code}`, "api");
      return;
    }
    openMissing(
      code,
      settings.unreachable
        ? "The API was unreachable, and this code is not saved in this browser."
        : undefined,
    );
  }

  function route() {
    const code = LF.parseHash(window.location.hash);
    if (!code) {
      clearRedirectTimer();
      closeGate();
      render(freshCode);
      freshCode = "";
      return;
    }
    followCode(code);
  }

  function fail(message) {
    formError.hidden = false;
    formError.textContent = message;
    composer.classList.remove("is-shaking");
    void composer.offsetWidth;
    composer.classList.add("is-shaking");
  }

  function clearFormError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function showApiError(message) {
    apiError.hidden = false;
    apiError.textContent = message;
  }

  function clearApiError() {
    apiError.hidden = true;
    apiError.textContent = "";
  }

  function formatWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function shortUrlFor(link, settings) {
    if (settings.transport === "api") {
      if (typeof link.short_url === "string" && LF.safeHttpUrl(link.short_url)) return link.short_url;
      return `${settings.baseUrl.replace(/\/$/, "")}/${link.code}`;
    }
    return LF.shortHashUrl(LF.pageBaseFrom(window.location.href), link.code);
  }

  function disarm() {
    list.querySelectorAll("[data-armed='yes']").forEach((button) => {
      button.dataset.armed = "no";
      button.textContent = "Delete";
    });
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    button.textContent = "Copied";
    button.classList.add("is-copied");
    const prior = copyTimers.get(button);
    if (prior) window.clearTimeout(prior);
    copyTimers.set(
      button,
      window.setTimeout(() => {
        button.textContent = "Copy";
        button.classList.remove("is-copied");
      }, 1600),
    );
  }

  function renderLink(link, settings, highlight) {
    const article = document.createElement("article");
    article.className = highlight ? "link is-new" : "link";
    article.dataset.code = link.code;

    const head = document.createElement("div");
    head.className = "link-head";
    const code = document.createElement("h3");
    code.className = "link-code";
    code.textContent = link.code;
    const meta = document.createElement("div");
    meta.className = "link-meta";
    const clicks = document.createElement("p");
    clicks.className = "link-clicks";
    clicks.textContent = LF.plural(link.clicks, "click");
    meta.appendChild(clicks);
    const when = formatWhen(link.created_at);
    if (when) {
      const stamp = document.createElement("p");
      stamp.className = "link-when";
      stamp.textContent = when;
      meta.appendChild(stamp);
    }
    head.append(code, meta);

    const target = document.createElement("p");
    target.className = "link-target";
    target.textContent = link.target_url;
    target.title = link.target_url;

    const shortUrl = shortUrlFor(link, settings);
    const short = document.createElement("p");
    short.className = "link-short";
    short.textContent = shortUrl;

    const actions = document.createElement("div");
    actions.className = "link-actions";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "ghost copy";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", `Copy short link for ${link.code}`);
    copy.addEventListener("click", () => {
      copyText(shortUrl, copy);
    });

    const open = document.createElement("a");
    open.className = "ghost";
    open.textContent = "Open";
    open.setAttribute("aria-label", `Open ${link.code}`);
    if (settings.transport === "api") {
      open.href = shortUrl;
      open.rel = "noopener noreferrer";
    } else {
      open.href = `#/${link.code}`;
    }

    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost danger";
    del.textContent = "Delete";
    del.setAttribute("aria-label", `Delete ${link.code}`);
    del.addEventListener("click", () => {
      removeLink(link.code, del);
    });

    actions.append(copy, open, del);
    article.append(head, target, short, actions);
    return article;
  }

  function currentLinks(settings) {
    if (settings.transport === "api") {
      return remoteLinks
        .filter((link) => link && LF.isValidCode(link.code) && LF.safeHttpUrl(link.target_url))
        .map((link) => ({
          code: link.code,
          target_url: link.target_url,
          short_url: link.short_url,
          clicks: Number(link.clicks) || 0,
          created_at: link.created_at || "",
        }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
    }
    return loadLinks();
  }

  function syncApiBase(settings) {
    if (apiBaseInput.dataset.touched === "yes") return;
    apiBaseInput.value = settings.baseUrl || LF.DEFAULT_API_BASE;
  }

  function render(highlightCode) {
    const settings = activeSettings();
    const apiMode = settings.transport === "api" && settings.baseUrl;
    const showWaking = waking && !settings.unreachable;
    const links = currentLinks(settings);
    const clickTotal = links.reduce((sum, link) => sum + (Number(link.clicks) || 0), 0);

    ledgerMode.classList.toggle("is-waking", showWaking);
    storageHint.classList.toggle("is-waking", showWaking);
    composer.setAttribute("aria-busy", showWaking ? "true" : "false");
    if (showWaking) {
      ledgerMode.textContent = "Waking server";
      storageHint.textContent = "Waking server…";
      apiStatus.textContent = "Waking server… a free instance can take about 50 seconds.";
    } else if (settings.unreachable) {
      ledgerMode.textContent = "This browser";
      storageHint.textContent = "The API was unreachable, so links stay in this browser.";
      apiStatus.textContent = "Could not reach the API. This visit is using the browser. Reload to try the server again.";
    } else if (apiMode) {
      ledgerMode.textContent = `API · ${new URL(settings.baseUrl).host}`;
      storageHint.textContent = "Saving to the API. Open follows its redirect.";
      apiStatus.textContent = `Connected to ${settings.baseUrl}.`;
    } else {
      ledgerMode.textContent = "This browser";
      storageHint.textContent = "Stored in this browser. Nothing is uploaded.";
      apiStatus.textContent = "Not connected. The demo is using this browser.";
    }
    apiForget.hidden = !settings.token;
    syncApiBase(settings);

    stats.textContent = `${LF.plural(links.length, "link")} · ${LF.plural(clickTotal, "click")}`;
    list.replaceChildren();
    links.forEach((link) => {
      list.appendChild(renderLink(link, settings, link.code === highlightCode));
    });

    const showEmpty = links.length === 0;
    empty.hidden = !showEmpty;
    if (showEmpty && showWaking) {
      emptyKicker.textContent = "Waking server";
      emptyCopy.textContent =
        "The free instance is starting. This can take about 50 seconds. If it does not answer, links stay in this browser.";
    } else if (showEmpty && settings.unreachable) {
      emptyKicker.textContent = "Using this browser";
      emptyCopy.textContent = "The API was unreachable. Shorten a URL and it stays on this device.";
    } else if (showEmpty && apiMode && remoteError) {
      emptyKicker.textContent = "The API did not answer";
      emptyCopy.textContent = remoteError;
    } else if (showEmpty && apiMode) {
      emptyKicker.textContent = "No links on the API";
      emptyCopy.textContent = "Shorten a URL and it will show up here.";
    } else if (showEmpty) {
      emptyKicker.textContent = "No links yet";
      emptyCopy.textContent = "Shorten a URL. The code, the click count, and the short link land here.";
    }

    if (apiMode && remoteTotal > links.length) {
      ledgerNote.hidden = false;
      ledgerNote.textContent = `Showing the latest ${links.length} of ${remoteTotal}.`;
    } else if (apiMode && remoteError && links.length > 0) {
      ledgerNote.hidden = false;
      ledgerNote.textContent = remoteError;
    } else {
      ledgerNote.hidden = true;
      ledgerNote.textContent = "";
    }

    syncChips();
  }

  function syncChips() {
    const value = urlInput.value.trim();
    chips.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-on", chip.dataset.url === value);
    });
  }

  async function apiFetch(settings, path, options) {
    const headers = new Headers();
    headers.set("accept", "application/json");
    if (options && options.body) headers.set("content-type", "application/json");
    if (settings.token) headers.set("authorization", `Bearer ${settings.token}`);
    const timeoutMs = options && options.timeoutMs ? options.timeoutMs : LF.WAKE_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}${path}`, {
        method: (options && options.method) || "GET",
        headers,
        body: options && options.body,
        signal: controller.signal,
      });
    } catch {
      throw Object.assign(new Error("network"), { status: 0, payload: null });
    } finally {
      window.clearTimeout(timer);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      throw Object.assign(new Error("api"), { status: response.status, payload });
    }
    return payload;
  }

  async function probeApi(settings) {
    const deadline = Date.now() + LF.WAKE_TIMEOUT_MS;
    let attempt = 0;
    let lastError = Object.assign(new Error("network"), { status: 0, payload: null });
    while (Date.now() < deadline) {
      attempt += 1;
      const started = Date.now();
      const timeoutMs = Math.max(1, deadline - Date.now());
      try {
        await apiFetch(settings, "/healthz", { timeoutMs });
        return;
      } catch (error) {
        lastError = error;
        const wait = LF.nextProbeDelay(error.status, Date.now() - started, attempt);
        if (wait < 0 || Date.now() + wait >= deadline) throw error;
        await delay(wait);
      }
    }
    throw lastError;
  }

  function ensureApi(settings) {
    if (sessionFallback) return Promise.resolve(false);
    if (!settings || settings.transport !== "api" || !settings.baseUrl) return Promise.resolve(false);
    if (!probePromise) {
      const session = sessionToken;
      waking = true;
      probePromise = probeApi(settings)
        .then(() => {
          if (session !== sessionToken) return false;
          waking = false;
          sessionFallback = false;
          return true;
        })
        .catch((error) => {
          if (session !== sessionToken) return false;
          waking = false;
          if (LF.isUnreachable(error.status)) {
            sessionFallback = true;
            remoteLinks = [];
            remoteTotal = 0;
            remoteError = "";
            return false;
          }
          remoteError = LF.describeApiError(error.status, error.payload);
          throw error;
        });
    }
    return probePromise;
  }

  async function beginApiSession(settings) {
    const session = sessionToken;
    waking = true;
    const code = LF.parseHash(window.location.hash);
    if (code) showWakingGate(code);
    render();
    try {
      const up = await ensureApi(settings);
      if (session !== sessionToken) return;
      if (up) await refreshRemote(settings);
    } catch (error) {
      if (session !== sessionToken) return;
      if (!remoteError) remoteError = LF.describeApiError(error.status, error.payload);
    }
  }

  async function refreshRemote(settings) {
    const data = await apiFetch(settings, "/v1/links?limit=100");
    remoteLinks = data && Array.isArray(data.items) ? data.items : [];
    remoteTotal = data && Number.isFinite(data.count) ? data.count : remoteLinks.length;
    remoteError = "";
  }

  function saveLocalLink(targetUrl, requestedCode) {
    const links = loadLinks();
    const taken = new Set(links.map((link) => link.code));
    let code = requestedCode;
    if (code) {
      if (taken.has(code)) {
        fail("That code is already in this browser.");
        return "";
      }
    } else {
      code = LF.generateCode(taken);
      if (!code) {
        fail("Could not allocate a unique code. Try again.");
        return "";
      }
    }
    links.push({
      code,
      target_url: targetUrl,
      clicks: 0,
      created_at: new Date().toISOString(),
    });
    try {
      saveLinks(links);
    } catch {
      fail("This browser blocked local storage, so the link was not saved.");
      return "";
    }
    return code;
  }

  async function onSubmit(event) {
    event.preventDefault();
    clearFormError();
    const target = LF.normalizeTarget(urlInput.value);
    if (!target.ok) {
      fail(target.error);
      return;
    }
    const codeResult = LF.normalizeCode(codeInput.value);
    if (!codeResult.ok) {
      fail(codeResult.error);
      return;
    }
    const persisted = loadSettings();
    submitBtn.disabled = true;
    submitBtn.textContent = "Shortening…";
    try {
      if (persisted.transport === "api" && persisted.baseUrl && !sessionFallback) {
        if (waking || !probePromise) submitBtn.textContent = "Waking server…";
        let up = false;
        try {
          up = await ensureApi(persisted);
        } catch (error) {
          fail(remoteError || LF.describeApiError(error.status, error.payload));
          return;
        }
        const stillApi = loadSettings().transport === "api" && !sessionFallback;
        if (!up || !stillApi) {
          freshCode = saveLocalLink(target.url, codeResult.code);
          if (!freshCode) return;
        } else {
          submitBtn.textContent = "Shortening…";
          try {
            const body = { target_url: target.url };
            if (codeResult.code) body.code = codeResult.code;
            const created = await apiFetch(persisted, "/v1/links", {
              method: "POST",
              body: JSON.stringify(body),
            });
            freshCode = created && created.code ? created.code : codeResult.code;
            if (created && created.code) {
              remoteLinks = [created].concat(remoteLinks.filter((link) => link.code !== created.code));
            }
            try {
              await refreshRemote(persisted);
            } catch (error) {
              remoteError = LF.describeApiError(error.status, error.payload);
            }
          } catch (error) {
            if (!LF.isUnreachable(error.status)) throw error;
            sessionFallback = true;
            probePromise = null;
            waking = false;
            freshCode = saveLocalLink(target.url, codeResult.code);
            if (!freshCode) return;
          }
        }
      } else {
        freshCode = saveLocalLink(target.url, codeResult.code);
        if (!freshCode) return;
      }
      urlInput.value = "";
      codeInput.value = "";
      render(freshCode);
      const row = list.querySelector(`[data-code="${CSS.escape(freshCode)}"]`);
      if (row) row.scrollIntoView({ block: "nearest" });
    } catch (error) {
      fail(LF.describeApiError(error.status, error.payload));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Shorten";
    }
  }

  async function removeLink(code, button) {
    if (button.dataset.armed !== "yes") {
      disarm();
      button.dataset.armed = "yes";
      button.textContent = "Confirm";
      return;
    }
    const settings = activeSettings();
    if (settings.transport === "api") {
      button.disabled = true;
      button.textContent = "Deleting…";
      try {
        await apiFetch(loadSettings(), `/v1/links/${encodeURIComponent(code)}`, { method: "DELETE" });
        await refreshRemote(loadSettings());
      } catch (error) {
        button.disabled = false;
        button.textContent = "Delete";
        if (LF.isUnreachable(error.status)) {
          sessionFallback = true;
          probePromise = null;
          waking = false;
          fail("Could not reach the API, so this link was not deleted. New links will stay in this browser.");
          render();
          return;
        }
        fail(LF.describeApiError(error.status, error.payload));
        return;
      }
    } else {
      try {
        saveLinks(loadLinks().filter((link) => link.code !== code));
      } catch {
        fail("This browser blocked local storage, so the link is still here.");
        return;
      }
    }
    freshCode = "";
    render();
  }

  async function connectToApi() {
    clearApiError();
    const base = LF.normalizeBase(apiBaseInput.value);
    if (!base.ok) {
      showApiError(base.error);
      return;
    }
    const existing = loadSettings();
    const typed = apiTokenInput.value;
    const token = typed.trim() === "" ? existing.token : typed.trim();
    const next = { baseUrl: base.url, token, transport: "api" };
    invalidateApiSession();
    const session = sessionToken;
    sessionFallback = false;
    remoteError = "";
    waking = true;
    apiConnect.disabled = true;
    apiConnect.textContent = "Waking server…";
    render();
    try {
      const up = await ensureApi(next);
      if (session !== sessionToken) return;
      if (!up) {
        showApiError("Could not reach the API. Links will stay in this browser.");
        render();
        return;
      }
      await refreshRemote(next);
      if (session !== sessionToken) return;
      saveSettings(next);
      apiTokenInput.value = "";
      apiBaseInput.value = next.baseUrl;
      apiBaseInput.dataset.touched = "no";
      freshCode = "";
      render();
    } catch (error) {
      if (session !== sessionToken) return;
      if (!remoteError) remoteError = LF.describeApiError(error.status, error.payload);
      showApiError(remoteError);
      render();
    } finally {
      if (session === sessionToken) {
        apiConnect.disabled = false;
        apiConnect.textContent = "Connect";
      }
    }
  }

  function disconnectApi() {
    const settings = loadSettings();
    settings.transport = "browser";
    if (!settings.baseUrl) settings.baseUrl = LF.DEFAULT_API_BASE;
    saveSettings(settings);
    invalidateApiSession();
    sessionFallback = false;
    remoteError = "";
    clearApiError();
    freshCode = "";
    render();
  }

  function forgetToken() {
    const settings = loadSettings();
    settings.token = "";
    saveSettings(settings);
    apiTokenInput.value = "";
    render();
  }

  function consumeApiQuery() {
    const url = new URL(window.location.href);
    const api = url.searchParams.get("api");
    if (!api) return false;
    apiBaseInput.value = api;
    apiBaseInput.dataset.touched = "yes";
    url.searchParams.delete("api");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
    const panel = $("api-panel");
    if (panel) panel.open = true;
    return true;
  }

  function buildChips() {
    EXAMPLES.forEach(([label, href]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = label;
      button.dataset.url = href;
      button.addEventListener("click", () => {
        urlInput.value = href;
        clearFormError();
        syncChips();
        urlInput.focus();
      });
      chips.appendChild(button);
    });
  }

  function stayHere() {
    clearRedirectTimer();
    const alreadyHome = window.location.hash === "#demo" || window.location.hash === "";
    closeGate();
    render();
    if (!alreadyHome) window.location.hash = "demo";
  }

  function boot() {
    buildChips();
    composer.addEventListener("submit", onSubmit);
    urlInput.addEventListener("input", () => {
      clearFormError();
      syncChips();
    });
    codeInput.addEventListener("input", clearFormError);
    apiBaseInput.addEventListener("input", () => {
      apiBaseInput.dataset.touched = "yes";
      clearApiError();
    });
    $("api-form").addEventListener("submit", (event) => {
      event.preventDefault();
      connectToApi();
    });
    apiDisconnect.addEventListener("click", disconnectApi);
    apiForget.addEventListener("click", forgetToken);
    gateStay.addEventListener("click", stayHere);
    gateGo.addEventListener("click", () => clearRedirectTimer());
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest && event.target.closest("[data-armed='yes']")) return;
      disarm();
    });
    window.addEventListener("hashchange", route);
    window.addEventListener("storage", (event) => {
      if (event.key === LINKS_KEY && !LF.parseHash(window.location.hash)) render();
    });
    let ignoredFirstShow = false;
    window.addEventListener("pageshow", async () => {
      if (!ignoredFirstShow) {
        ignoredFirstShow = true;
        return;
      }
      const settings = loadSettings();
      if (settings.transport === "api" && !LF.parseHash(window.location.hash)) {
        invalidateApiSession();
        sessionFallback = false;
        try {
          const up = await ensureApi(settings);
          if (up) await refreshRemote(settings);
        } catch (error) {
          remoteError = LF.describeApiError(error.status, error.payload);
        }
      }
      route();
    });

    const auto = consumeApiQuery();
    if (auto) {
      connectToApi().finally(route);
      return;
    }
    const settings = loadSettings();
    if (settings.transport === "api") {
      beginApiSession(settings).finally(route);
      return;
    }
    route();
  }

  boot();
})();
