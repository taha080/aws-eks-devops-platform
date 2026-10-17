"""Settings and logging."""

import json
import logging

from linkforge.config import Settings
from linkforge.db import resolve_database_url
from linkforge.logconfig import JsonFormatter, RequestIdFilter, request_id_var


def test_environment_overrides(monkeypatch):
    monkeypatch.setenv("LINKFORGE_ENVIRONMENT", "ci")
    monkeypatch.setenv("LINKFORGE_PORT", "9001")
    monkeypatch.setenv("LINKFORGE_LOG_LEVEL", "DEBUG")
    settings = Settings(_env_file=None)
    assert settings.environment == "ci"
    assert settings.port == 9001
    assert settings.log_level == "DEBUG"


def test_explicit_database_url_wins_over_secret():
    settings = Settings(
        _env_file=None,
        database_url="sqlite:///./override.db",
        db_secret_arn="arn:aws:secretsmanager:us-east-1:example:secret:db",
    )
    assert resolve_database_url(settings) == "sqlite:///./override.db"


def test_json_formatter_includes_request_fields():
    token = request_id_var.set("req-123")
    try:
        record = logging.LogRecord(
            name="linkforge",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="request",
            args=(),
            exc_info=None,
        )
        RequestIdFilter().filter(record)
        record.method = "GET"
        record.path = "/healthz"
        record.status = 200
        record.duration_ms = 1.5
        payload = json.loads(JsonFormatter().format(record))
    finally:
        request_id_var.reset(token)

    assert payload["message"] == "request"
    assert payload["request_id"] == "req-123"
    assert payload["method"] == "GET"
    assert payload["status"] == 200
    assert payload["level"] == "INFO"
