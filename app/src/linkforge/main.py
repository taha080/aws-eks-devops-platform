"""Application factory, probes, and request instrumentation."""

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from linkforge import __version__
from linkforge.api import router
from linkforge.config import PAGES_ORIGIN, Settings, get_settings
from linkforge.db import (
    check_database,
    create_db_engine,
    ensure_sqlite_parent,
    init_database,
    resolve_database_url,
    session_factory,
)
from linkforge.logconfig import configure_logging, request_id_var
from linkforge.metrics import create_metrics

logger = logging.getLogger("linkforge")
_QUIET_ROUTES = {"/healthz", "/readyz", "/metrics"}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    configure_logging(settings.log_level)
    url = resolve_database_url(settings)
    ensure_sqlite_parent(url)
    engine = create_db_engine(url)
    init_database(engine)
    app.state.engine = engine
    app.state.session_factory = session_factory(engine)
    logger.info("database ready", extra={"path": _database_label(url)})
    try:
        yield
    finally:
        engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="LinkForge",
        version=__version__,
        summary="URL shortener API.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.metrics = create_metrics()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(settings),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    )

    @app.middleware("http")
    async def observe(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
            duration = time.perf_counter() - started
            route = request.scope.get("route")
            path = getattr(route, "path", "unmatched")
            metrics = request.app.state.metrics
            metrics.http_requests.labels(request.method, path, str(response.status_code)).inc()
            metrics.http_duration.labels(request.method, path).observe(duration)
            response.headers["x-request-id"] = request_id
            log = logger.debug if path in _QUIET_ROUTES else logger.info
            log(
                "request",
                extra={
                    "method": request.method,
                    "path": path,
                    "status": response.status_code,
                    "duration_ms": round(duration * 1000, 2),
                },
            )
            return response
        finally:
            request_id_var.reset(token)

    @app.get("/healthz", tags=["probes"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz", tags=["probes"])
    def readyz(request: Request) -> dict[str, str]:
        session = request.app.state.session_factory()
        try:
            check_database(session)
        except Exception as exc:
            logger.exception("readiness check failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="database unavailable",
            ) from exc
        finally:
            session.close()
        return {"status": "ready"}

    @app.get("/metrics", tags=["probes"])
    def metrics(request: Request) -> Response:
        payload = generate_latest(request.app.state.metrics.registry)
        return Response(content=payload, media_type=CONTENT_TYPE_LATEST)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, HTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        logger.exception("unhandled error", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "internal server error"},
        )

    app.include_router(router)
    return app


def _allowed_origins(settings: Settings) -> list[str]:
    """Origins for browser calls. The public Pages origin is always included."""
    origins: list[str] = []
    for item in settings.cors_origins.split(","):
        origin = item.strip()
        if origin and origin not in origins:
            origins.append(origin)
    if PAGES_ORIGIN not in origins:
        origins.append(PAGES_ORIGIN)
    return origins


def _database_label(url: str) -> str:
    if url.startswith("sqlite"):
        return "sqlite"
    if "://" in url:
        return url.split("://", 1)[0]
    return "database"


app = create_app()
