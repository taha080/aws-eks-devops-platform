"""Shared API fixtures."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from linkforge.config import Settings
from linkforge.main import create_app


def _settings(tmp_path: Path, api_token: str = "") -> Settings:
    return Settings(
        _env_file=None,
        environment="test",
        log_level="WARNING",
        database_url=f"sqlite:///{tmp_path / 'links.db'}",
        base_url="http://testserver",
        api_token=api_token,
    )


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    application = create_app(_settings(tmp_path))
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def authed_client(tmp_path: Path) -> Iterator[TestClient]:
    application = create_app(_settings(tmp_path, api_token="test-token"))
    with TestClient(application) as test_client:
        yield test_client
