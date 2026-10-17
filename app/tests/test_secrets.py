"""RDS secret URL construction. These tests never call AWS."""

import json
import subprocess
import sys
from pathlib import Path

from linkforge.secrets_loader import database_url_from_rds_secret, database_url_from_secret_arn

ROOT = Path(__file__).resolve().parents[2]


def test_database_url_encodes_reserved_characters():
    url = database_url_from_rds_secret(
        {
            "username": "linkforge",
            "password": "p@ss/word",
            "host": "db.internal",
            "port": 5432,
            "dbname": "linkforge",
        }
    )
    assert url == "postgresql+psycopg://linkforge:p%40ss%2Fword@db.internal:5432/linkforge"


def test_database_url_defaults_dbname():
    url = database_url_from_rds_secret(
        {"username": "linkforge", "password": "secret", "host": "db.internal"}
    )
    assert url.endswith("@db.internal:5432/linkforge")


def test_missing_field():
    try:
        database_url_from_rds_secret({"username": "linkforge"})
    except ValueError as exc:
        assert "password" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_secret_arn_uses_injected_client(monkeypatch):
    class FakeClient:
        def get_secret_value(self, SecretId):
            assert SecretId == "test-secret"
            return {
                "SecretString": json.dumps(
                    {
                        "username": "linkforge",
                        "password": "secret",
                        "host": "db.internal",
                        "port": 5432,
                        "dbname": "linkforge",
                    }
                )
            }

    monkeypatch.setitem(
        __import__("sys").modules,
        "boto3",
        type("Boto3", (), {"client": staticmethod(lambda *args, **kwargs: FakeClient())}),
    )
    url = database_url_from_secret_arn("test-secret", region="us-east-1")
    assert url == "postgresql+psycopg://linkforge:secret@db.internal:5432/linkforge"


def test_render_script_reads_stdin():
    payload = json.dumps(
        {
            "username": "linkforge",
            "password": "p@ss/word",
            "host": "db.internal",
            "port": 5432,
            "dbname": "linkforge",
        }
    )
    completed = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "render-db-url.py")],
        input=payload,
        text=True,
        capture_output=True,
        check=True,
    )
    assert (
        completed.stdout
        == "postgresql+psycopg://linkforge:p%40ss%2Fword@db.internal:5432/linkforge"
    )
    assert completed.stderr == ""
