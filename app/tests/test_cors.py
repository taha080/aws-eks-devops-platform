"""CORS for the public GitHub Pages demo."""

from pathlib import Path

from fastapi.testclient import TestClient

from linkforge.config import PAGES_ORIGIN, Settings
from linkforge.main import create_app


def _client(tmp_path: Path, cors_origins: str | None = None) -> TestClient:
    kwargs: dict[str, str] = {}
    if cors_origins is not None:
        kwargs["cors_origins"] = cors_origins
    settings = Settings(
        _env_file=None,
        environment="test",
        log_level="WARNING",
        database_url=f"sqlite:///{tmp_path / 'links.db'}",
        base_url="http://testserver",
        **kwargs,
    )
    return TestClient(create_app(settings))


def test_pages_origin_is_allowed_by_default(tmp_path: Path):
    with _client(tmp_path) as client:
        response = client.get("/healthz", headers={"Origin": PAGES_ORIGIN})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PAGES_ORIGIN


def test_pages_origin_stays_allowed_when_empty_or_replaced(tmp_path: Path):
    with _client(tmp_path, cors_origins="") as client:
        response = client.get("/healthz", headers={"Origin": PAGES_ORIGIN})
    assert response.headers["access-control-allow-origin"] == PAGES_ORIGIN

    with _client(tmp_path, cors_origins="https://example.com") as client:
        page = client.get("/healthz", headers={"Origin": PAGES_ORIGIN})
        extra = client.get("/healthz", headers={"Origin": "https://example.com"})
    assert page.headers["access-control-allow-origin"] == PAGES_ORIGIN
    assert extra.headers["access-control-allow-origin"] == "https://example.com"


def test_other_origins_are_not_allowed(tmp_path: Path):
    with _client(tmp_path) as client:
        response = client.get("/healthz", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_preflight_allows_pages_writes(tmp_path: Path):
    with _client(tmp_path) as client:
        response = client.options(
            "/v1/links",
            headers={
                "Origin": PAGES_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PAGES_ORIGIN
    allow_methods = response.headers["access-control-allow-methods"].upper()
    assert "POST" in allow_methods
    assert "GET" in allow_methods
    assert "DELETE" in allow_methods
    allow_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers
