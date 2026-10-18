/* Pure helpers for the browser demo. No DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.LinkForge = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const CODE_LENGTH = 7;
  const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
  const MAX_URL_LENGTH = 2048;
  const RESERVED = new Set(["healthz", "readyz", "metrics", "docs", "redoc", "openapi"]);

  function isReserved(code) {
    return RESERVED.has(String(code || "").toLowerCase());
  }

  function isValidCode(code) {
    return typeof code === "string" && CODE_PATTERN.test(code);
  }

  function defaultRandomIndex(limit) {
    const max = Math.floor(256 / limit) * limit;
    const buf = new Uint8Array(1);
    while (true) {
      crypto.getRandomValues(buf);
      if (buf[0] < max) return buf[0] % limit;
    }
  }

  function generateCode(taken, randomIndex) {
    const pick = randomIndex || defaultRandomIndex;
    const blocked = taken instanceof Set ? taken : new Set(taken || []);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i += 1) {
        code += ALPHABET[pick(ALPHABET.length)];
      }
      if (isValidCode(code) && !isReserved(code) && !blocked.has(code)) return code;
    }
    return "";
  }

  function normalizeTarget(raw) {
    const value = String(raw || "").trim();
    if (!value) return { ok: false, error: "Paste a URL to shorten." };
    if (value.length > MAX_URL_LENGTH) {
      return { ok: false, error: "That URL is longer than 2048 characters." };
    }
    let url;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, error: "Enter a full URL, including https://." };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Only http and https links can be shortened." };
    }
    if (url.href.length > MAX_URL_LENGTH) {
      return { ok: false, error: "That URL is longer than 2048 characters." };
    }
    return { ok: true, url: url.href };
  }

  function safeHttpUrl(value) {
    if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function normalizeCode(raw) {
    const code = String(raw || "").trim();
    if (!code) return { ok: true, code: "" };
    if (!isValidCode(code)) {
      return {
        ok: false,
        error: "Codes are 3 to 32 characters: letters, numbers, hyphens, and underscores.",
      };
    }
    if (isReserved(code)) {
      return {
        ok: false,
        error: "That code is reserved. healthz, readyz, metrics, docs, redoc, and openapi belong to the API.",
      };
    }
    return { ok: true, code };
  }

  function normalizeBase(raw) {
    const value = String(raw || "").trim();
    if (!value) return { ok: false, error: "Enter the API base URL." };
    let url;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, error: "Enter a full base URL, including http:// or https://." };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "The API base URL must be http or https." };
    }
    if (url.username || url.password) {
      return { ok: false, error: "Put the token in the token field, not in the URL." };
    }
    const path = url.pathname.replace(/\/+$/, "");
    return { ok: true, url: url.origin + path };
  }

  function pageBaseFrom(href) {
    const url = new URL(href);
    url.hash = "";
    url.search = "";
    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -"index.html".length);
    }
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  }

  function shortHashUrl(base, code) {
    return `${base}#/${code}`;
  }

  function parseHash(hash) {
    const match = /^#\/([A-Za-z0-9_-]{3,32})$/.exec(hash || "");
    return match ? match[1] : null;
  }

  function plural(count, noun) {
    const n = Number(count) || 0;
    return `${n} ${noun}${n === 1 ? "" : "s"}`;
  }

  function detailText(payload) {
    if (!payload || typeof payload !== "object") return "";
    const detail = payload.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (item && item.msg) || "")
        .filter(Boolean)
        .join(" ");
    }
    return "";
  }

  function describeApiError(status, payload) {
    const detail = detailText(payload);
    if (!status) {
      return "Could not reach the API. Check the base URL, and set LINKFORGE_CORS_ORIGINS to this page's origin.";
    }
    if (status === 401) return "The API refused that token.";
    if (status === 409) return "That code already exists.";
    if (status === 400) return detail || "That code is reserved.";
    if (status === 404) return "That link was not found.";
    if (status === 422) return "The API rejected that URL or code.";
    return detail || `The API returned ${status}.`;
  }

  return {
    CODE_LENGTH,
    generateCode,
    normalizeTarget,
    safeHttpUrl,
    normalizeCode,
    normalizeBase,
    isReserved,
    isValidCode,
    pageBaseFrom,
    shortHashUrl,
    parseHash,
    plural,
    describeApiError,
  };
});
