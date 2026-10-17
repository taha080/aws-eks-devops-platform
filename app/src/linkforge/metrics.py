"""Prometheus metrics bound to a per-app registry."""

from dataclasses import dataclass

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Histogram,
    PlatformCollector,
    ProcessCollector,
)


@dataclass(frozen=True)
class AppMetrics:
    registry: CollectorRegistry
    http_requests: Counter
    http_duration: Histogram
    links_created: Counter
    redirects: Counter


def create_metrics() -> AppMetrics:
    registry = CollectorRegistry()
    ProcessCollector(registry=registry)
    PlatformCollector(registry=registry)
    return AppMetrics(
        registry=registry,
        http_requests=Counter(
            "linkforge_http_requests_total",
            "HTTP requests processed by LinkForge.",
            ["method", "route", "status"],
            registry=registry,
        ),
        http_duration=Histogram(
            "linkforge_http_request_duration_seconds",
            "HTTP request latency in seconds.",
            ["method", "route"],
            registry=registry,
        ),
        links_created=Counter(
            "linkforge_links_created_total",
            "Short links created.",
            registry=registry,
        ),
        redirects=Counter(
            "linkforge_redirects_total",
            "Redirect lookups by result.",
            ["result"],
            registry=registry,
        ),
    )
