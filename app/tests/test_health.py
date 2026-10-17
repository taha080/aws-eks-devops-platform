"""Liveness and readiness."""


def test_healthz(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-request-id"]


def test_readyz(client):
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readyz_reports_database_outage(client, monkeypatch):
    def fail(_session):
        raise RuntimeError("down")

    monkeypatch.setattr("linkforge.main.check_database", fail)
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json()["detail"] == "database unavailable"


def test_health_route_is_not_a_short_code(client):
    response = client.get("/healthz", follow_redirects=False)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
