"""Link CRUD and redirects."""


def test_create_get_and_redirect(client):
    created = client.post("/v1/links", json={"target_url": "https://example.com/docs"})
    assert created.status_code == 201
    body = created.json()
    assert body["target_url"] == "https://example.com/docs"
    assert body["short_url"] == f"http://testserver/{body['code']}"
    assert body["clicks"] == 0
    assert created.headers["location"] == f"/v1/links/{body['code']}"

    fetched = client.get(f"/v1/links/{body['code']}")
    assert fetched.status_code == 200
    assert fetched.json()["code"] == body["code"]

    redirected = client.get(f"/{body['code']}", follow_redirects=False)
    assert redirected.status_code == 302
    assert redirected.headers["location"] == "https://example.com/docs"

    counted = client.get(f"/v1/links/{body['code']}")
    assert counted.json()["clicks"] == 1


def test_custom_code_and_conflict(client):
    first = client.post(
        "/v1/links",
        json={"target_url": "https://example.com/a", "code": "docs-link"},
    )
    assert first.status_code == 201
    assert first.json()["code"] == "docs-link"

    second = client.post(
        "/v1/links",
        json={"target_url": "https://example.com/b", "code": "docs-link"},
    )
    assert second.status_code == 409


def test_reserved_code_rejected(client):
    response = client.post(
        "/v1/links",
        json={"target_url": "https://example.com", "code": "metrics"},
    )
    assert response.status_code == 400


def test_invalid_url_rejected(client):
    response = client.post("/v1/links", json={"target_url": "javascript:alert(1)"})
    assert response.status_code == 422


def test_unknown_link(client):
    assert client.get("/v1/links/missing1").status_code == 404
    missing = client.get("/missing1", follow_redirects=False)
    assert missing.status_code == 404


def test_list_and_delete(client):
    client.post("/v1/links", json={"target_url": "https://example.com/1", "code": "one111"})
    client.post("/v1/links", json={"target_url": "https://example.com/2", "code": "two222"})

    listed = client.get("/v1/links", params={"limit": 1})
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["count"] == 2
    assert len(payload["items"]) == 1

    deleted = client.delete("/v1/links/one111")
    assert deleted.status_code == 204
    assert client.get("/v1/links/one111").status_code == 404
    assert client.delete("/v1/links/one111").status_code == 404


def test_generated_code_skips_collision(client, monkeypatch):
    codes = iter(["taken00", "fresh01"])
    monkeypatch.setattr("linkforge.service.generate_code", lambda: next(codes))
    seeded = client.post(
        "/v1/links",
        json={"target_url": "https://example.com/seed", "code": "taken00"},
    )
    assert seeded.status_code == 201

    created = client.post("/v1/links", json={"target_url": "https://example.org/next"})
    assert created.status_code == 201
    assert created.json()["code"] == "fresh01"


def test_generated_code_conflict_after_retries(client, monkeypatch):
    monkeypatch.setattr("linkforge.service.generate_code", lambda: "abc1234")
    first = client.post("/v1/links", json={"target_url": "https://example.com"})
    assert first.status_code == 201
    second = client.post("/v1/links", json={"target_url": "https://example.org"})
    assert second.status_code == 409


def test_api_token_required(authed_client):
    denied = authed_client.post("/v1/links", json={"target_url": "https://example.com"})
    assert denied.status_code == 401

    allowed = authed_client.post(
        "/v1/links",
        json={"target_url": "https://example.com", "code": "locked1"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert allowed.status_code == 201

    public = authed_client.get("/locked1", follow_redirects=False)
    assert public.status_code == 302


def test_limit_validation(client):
    response = client.get("/v1/links", params={"limit": 500})
    assert response.status_code == 422
