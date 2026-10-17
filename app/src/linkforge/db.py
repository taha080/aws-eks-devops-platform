"""Engine and session helpers."""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from linkforge.config import Settings
from linkforge.models import Base
from linkforge.secrets_loader import database_url_from_secret_arn


def resolve_database_url(settings: Settings) -> str:
    if settings.database_url:
        return settings.database_url
    if settings.db_secret_arn:
        region = settings.aws_region or None
        return database_url_from_secret_arn(settings.db_secret_arn, region)
    return "sqlite:///./data/linkforge.db"


def ensure_sqlite_parent(url: str) -> None:
    if not url.startswith("sqlite:") or ":memory:" in url:
        return
    raw = url.removeprefix("sqlite:///")
    if raw.startswith("file:"):
        return
    parent = Path(raw).parent
    if str(parent) not in {"", "."}:
        parent.mkdir(parents=True, exist_ok=True)


def create_db_engine(url: str) -> Engine:
    connect_args: dict[str, object] = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


def init_database(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def check_database(session: Session) -> None:
    session.execute(text("SELECT 1"))


def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    session = factory()
    try:
        yield session
    finally:
        session.close()
