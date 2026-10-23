"""Root HTML landing page."""


def test_root_is_an_html_landing_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.headers["cache-control"] == "no-store"
    body = response.text
    assert "<h1>Link<em>Forge</em></h1>" in body
    assert "A URL shortener." in body
    assert 'class="status is-up"' in body
    assert "Operational" in body
    assert 'href="https://taha080.github.io/aws-eks-devops-platform/"' in body
    assert 'href="/docs"' in body
    assert 'href="/healthz"' in body
    assert 'href="https://github.com/taha080/aws-eks-devops-platform"' in body

    health = client.get("/healthz")
    assert health.status_code == 200
    assert health.headers["content-type"].startswith("application/json")
    assert health.json() == {"status": "ok"}


def test_root_reports_database_outage_without_changing_healthz(client, monkeypatch):
    def fail(_session):
        raise RuntimeError("down")

    monkeypatch.setattr("linkforge.main.check_database", fail)
    response = client.get("/")
    assert response.status_code == 200
    assert 'class="status is-down"' in response.text
    assert "Database unavailable" in response.text
    assert "Operational" not in response.text

    health = client.get("/healthz")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}


def test_root_does_not_capture_redirects_or_reserved_codes(client):
    created = client.post(
        "/v1/links",
        json={"target_url": "https://example.com/land", "code": "land01"},
    )
    assert created.status_code == 201

    redirected = client.get("/land01", follow_redirects=False)
    assert redirected.status_code == 302
    assert redirected.headers["location"] == "https://example.com/land"
    assert "LinkForge" not in redirected.text

    reserved = client.post(
        "/v1/links",
        json={"target_url": "https://example.com", "code": "healthz"},
    )
    assert reserved.status_code == 400

    docs = client.get("/docs")
    assert docs.status_code == 200
    assert "LinkForge" in docs.text
