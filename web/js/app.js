/* DOM for the LinkForge demo. Storage and redirects stay in the browser. */
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
    const fallback = { baseUrl: "", token: "", transport: "browser" };
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return fallback;
      const baseUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl : "";
      const token = typeof parsed.token === "string" ? parsed.token : "";
      const transport = parsed.transport === "api" && baseUrl ? "api" : "browser";
      return { baseUrl, token, transport };
    } catch {
      return fallback;
    }
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
    const settings = loadSettings();
    if (settings.transport === "api" && settings.baseUrl && LF.isValidCode(code)) {
      openRedirect(`${settings.baseUrl.replace(/\/$/, "")}/${code}`, "api");
      return;
    }
    openMissing(code);
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

  function render(highlightCode) {
    const settings = loadSettings();
    const apiMode = settings.transport === "api" && settings.baseUrl;
    const links = currentLinks(settings);
    const clickTotal = links.reduce((sum, link) => sum + (Number(link.clicks) || 0), 0);

    ledgerMode.textContent = apiMode ? `API · ${new URL(settings.baseUrl).host}` : "This browser";
    storageHint.textContent = apiMode
      ? "Saving to the API. Open follows its redirect."
      : "Stored in this browser. Nothing is uploaded.";
    apiStatus.textContent = apiMode
      ? `Connected to ${settings.baseUrl}.`
      : "Not connected. The demo is using this browser.";
    apiForget.hidden = !settings.token;
    if (!apiBaseInput.value && settings.baseUrl) apiBaseInput.value = settings.baseUrl;

    stats.textContent = `${LF.plural(links.length, "link")} · ${LF.plural(clickTotal, "click")}`;
    list.replaceChildren();
    links.forEach((link) => {
      list.appendChild(renderLink(link, settings, link.code === highlightCode));
    });

    const showEmpty = links.length === 0;
    empty.hidden = !showEmpty;
    if (showEmpty && apiMode && remoteError) {
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
    let response;
    try {
      response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}${path}`, {
        method: (options && options.method) || "GET",
        headers,
        body: options && options.body,
      });
    } catch {
      throw Object.assign(new Error("network"), { status: 0, payload: null });
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

  async function refreshRemote(settings) {
    const data = await apiFetch(settings, "/v1/links?limit=100");
    remoteLinks = data && Array.isArray(data.items) ? data.items : [];
    remoteTotal = data && Number.isFinite(data.count) ? data.count : remoteLinks.length;
    remoteError = "";
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
    const settings = loadSettings();
    submitBtn.disabled = true;
    submitBtn.textContent = "Shortening…";
    try {
      if (settings.transport === "api" && settings.baseUrl) {
        const body = { target_url: target.url };
        if (codeResult.code) body.code = codeResult.code;
        const created = await apiFetch(settings, "/v1/links", {
          method: "POST",
          body: JSON.stringify(body),
        });
        await refreshRemote(settings);
        freshCode = created && created.code ? created.code : codeResult.code;
      } else {
        const links = loadLinks();
        const taken = new Set(links.map((link) => link.code));
        let code = codeResult.code;
        if (code) {
          if (taken.has(code)) {
            fail("That code is already in this browser.");
            return;
          }
        } else {
          code = LF.generateCode(taken);
          if (!code) {
            fail("Could not allocate a unique code. Try again.");
            return;
          }
        }
        links.push({
          code,
          target_url: target.url,
          clicks: 0,
          created_at: new Date().toISOString(),
        });
        try {
          saveLinks(links);
        } catch {
          fail("This browser blocked local storage, so the link was not saved.");
          return;
        }
        freshCode = code;
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
    const settings = loadSettings();
    if (settings.transport === "api") {
      button.disabled = true;
      button.textContent = "Deleting…";
      try {
        await apiFetch(settings, `/v1/links/${encodeURIComponent(code)}`, { method: "DELETE" });
        await refreshRemote(settings);
      } catch (error) {
        button.disabled = false;
        button.textContent = "Delete";
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
    apiConnect.disabled = true;
    apiConnect.textContent = "Connecting…";
    try {
      await refreshRemote(next);
      saveSettings(next);
      apiTokenInput.value = "";
      freshCode = "";
      render();
    } catch (error) {
      remoteError = LF.describeApiError(error.status, error.payload);
      showApiError(remoteError);
    } finally {
      apiConnect.disabled = false;
      apiConnect.textContent = "Connect";
    }
  }

  function disconnectApi() {
    const settings = loadSettings();
    settings.transport = "browser";
    saveSettings(settings);
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
        try {
          await refreshRemote(settings);
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
      refreshRemote(settings)
        .catch((error) => {
          remoteError = LF.describeApiError(error.status, error.payload);
        })
        .finally(route);
      return;
    }
    route();
  }

  boot();
})();
