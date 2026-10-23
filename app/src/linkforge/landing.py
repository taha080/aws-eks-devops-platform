"""HTML landing page served at the service root."""

from html import escape

DEMO_URL = "https://taha080.github.io/aws-eks-devops-platform/"
REPO_URL = "https://github.com/taha080/aws-eks-devops-platform"

_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LinkForge</title>
  <meta name="description" content="LinkForge is a URL shortener API.">
  <style>
    :root {
      color-scheme: dark;
      --bg: #090d12;
      --ink: #f4f7fb;
      --dim: #a9b8c9;
      --line: rgba(186, 214, 236, 0.22);
      --teal: #2ee6c5;
      --copper: #e7a15a;
      --down: #ffb4a8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2.5rem 1.25rem;
      color: var(--ink);
      background:
        radial-gradient(720px 380px at 100% -10%, rgba(46, 230, 197, 0.16), transparent 60%),
        radial-gradient(640px 360px at -10% 0%, rgba(231, 161, 90, 0.14), transparent 58%),
        var(--bg);
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      line-height: 1.5;
    }
    body::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--copper), var(--teal));
    }
    main { width: min(40rem, 100%); }
    .logo { width: 48px; height: 48px; display: block; }
    h1 {
      margin: 1rem 0 0.4rem;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2.6rem, 7vw, 4rem);
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 0.95;
    }
    h1 em { color: var(--teal); font-style: italic; font-weight: 600; }
    .lede { margin: 0; max-width: 36rem; color: var(--dim); font-size: 1.08rem; }
    .kicker {
      margin: 1.6rem 0 0.45rem;
      color: var(--copper);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      margin: 0;
      padding: 0.4rem 0.8rem 0.4rem 0.65rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      font-weight: 650;
    }
    .dot {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 50%;
      background: var(--teal);
      box-shadow: 0 0 0 4px rgba(46, 230, 197, 0.16);
    }
    .status.is-down { color: var(--down); }
    .status.is-down .dot {
      background: var(--down);
      box-shadow: 0 0 0 4px rgba(255, 180, 168, 0.14);
    }
    nav { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.6rem; }
    a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0.45rem 0.95rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--ink);
      text-decoration: none;
    }
    a:hover { border-color: var(--teal); }
    a:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
    a span {
      margin-left: 0.45rem;
      color: var(--dim);
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <main>
    <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#101820"></rect>
      <g fill="none" stroke-linecap="round" stroke-width="2.6">
        <path stroke="#2ee6c5" d="M20 29.2 16.8 32.4a6.2 6.2 0 0 1-8.8-8.8L12.4 19"></path>
        <path stroke="#e7a15a" d="M28 18.8 31.2 15.6a6.2 6.2 0 0 1 8.8 8.8L35.6 29"></path>
        <path stroke="#f4f7fb" d="M21.2 26.8 26.8 21.2"></path>
      </g>
    </svg>
    <h1>Link<em>Forge</em></h1>
    <p class="lede">
      A URL shortener. A short code stands in for a long address,
      and opening it sends people to the original page.
    </p>
    <p class="kicker">Status</p>
    <p class="status is-__STATE__" role="status">
      <span class="dot" aria-hidden="true"></span>__LABEL__
    </p>
    <nav aria-label="LinkForge">
      <a href="__DEMO__">Live demo</a>
      <a href="/docs">API docs<span>/docs</span></a>
      <a href="/healthz">Health<span>/healthz</span></a>
      <a href="__REPO__">GitHub</a>
    </nav>
  </main>
</body>
</html>
"""


def render_landing(*, operational: bool) -> str:
    """Return the root HTML page. The status text reflects the database check."""
    if operational:
        label, state = "Operational", "up"
    else:
        label, state = "Database unavailable", "down"
    return (
        _PAGE.replace("__STATE__", state)
        .replace("__LABEL__", escape(label))
        .replace("__DEMO__", escape(DEMO_URL, quote=True))
        .replace("__REPO__", escape(REPO_URL, quote=True))
    )
