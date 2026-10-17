"""Prometheus exposition."""


def test_metrics_record_requests_and_domain_events(client):
    created = client.post(
        "/v1/links",
        json={"target_url": "https://example.com/metrics", "code": "metric1"},
    )
    assert created.status_code == 201
    client.get("/metric1", follow_redirects=False)
    client.get("/missing1", follow_redirects=False)

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    body = response.text
    assert "linkforge_http_requests_total" in body
    assert "linkforge_http_request_duration_seconds" in body
    assert "linkforge_links_created_total" in body
    assert 'linkforge_redirects_total{result="hit"}' in body
    assert 'linkforge_redirects_total{result="miss"}' in body
    assert 'route="/v1/links"' in body
