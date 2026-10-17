"""Link persistence."""

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from linkforge.codes import generate_code, is_reserved
from linkforge.models import Link, utcnow
from linkforge.schemas import LinkOut

GENERATE_ATTEMPTS = 5


class LinkError(Exception):
    """Base class for expected link failures."""


class CodeReservedError(LinkError):
    pass


class CodeConflictError(LinkError):
    pass


class LinkNotFoundError(LinkError):
    pass


class LinkService:
    def __init__(self, session: Session, base_url: str) -> None:
        self.session = session
        self.base_url = base_url.rstrip("/")

    def create_link(self, target_url: str, code: str | None) -> Link:
        if code is not None:
            if is_reserved(code):
                raise CodeReservedError(code)
            return self._insert(target_url, code)

        last_error: CodeConflictError | None = None
        for _ in range(GENERATE_ATTEMPTS):
            candidate = generate_code()
            if is_reserved(candidate):
                continue
            try:
                return self._insert(target_url, candidate)
            except CodeConflictError as exc:
                last_error = exc
        raise CodeConflictError("could not allocate a unique code") from last_error

    def get_link(self, code: str) -> Link:
        link = self.session.scalar(select(Link).where(Link.code == code))
        if link is None:
            raise LinkNotFoundError(code)
        return link

    def list_links(self, limit: int, offset: int) -> tuple[list[Link], int]:
        total = self.session.scalar(select(func.count()).select_from(Link)) or 0
        rows = self.session.scalars(
            select(Link)
            .order_by(Link.created_at.desc(), Link.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        return list(rows), int(total)

    def delete_link(self, code: str) -> None:
        link = self.get_link(code)
        self.session.delete(link)
        self.session.commit()

    def record_click(self, code: str) -> Link:
        link = self.get_link(code)
        self.session.execute(update(Link).where(Link.code == code).values(clicks=Link.clicks + 1))
        self.session.commit()
        self.session.refresh(link)
        return link

    def to_out(self, link: Link) -> LinkOut:
        return LinkOut(
            code=link.code,
            target_url=link.target_url,
            short_url=f"{self.base_url}/{link.code}",
            clicks=link.clicks,
            created_at=link.created_at,
        )

    def _insert(self, target_url: str, code: str) -> Link:
        link = Link(code=code, target_url=target_url, clicks=0, created_at=utcnow())
        self.session.add(link)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise CodeConflictError(code) from exc
        self.session.refresh(link)
        return link
