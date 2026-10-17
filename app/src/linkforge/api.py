"""HTTP routes for links and redirects."""

import secrets
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from linkforge.schemas import LinkCreate, LinkList, LinkOut
from linkforge.service import (
    CodeConflictError,
    CodeReservedError,
    LinkNotFoundError,
    LinkService,
)

router = APIRouter()
_CODE = Path(pattern=r"^[A-Za-z0-9_-]{3,32}$")


def require_token(request: Request) -> None:
    expected = request.app.state.settings.api_token
    if not expected:
        return
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")


def get_session(request: Request) -> Iterator[Session]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def link_service(
    request: Request,
    session: Session = Depends(get_session),
) -> LinkService:
    return LinkService(session, request.app.state.settings.base_url)


@router.post("/v1/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(
    body: LinkCreate,
    request: Request,
    response: Response,
    service: LinkService = Depends(link_service),
) -> LinkOut:
    require_token(request)
    try:
        link = service.create_link(str(body.target_url), body.code)
    except CodeReservedError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="code is reserved",
        ) from exc
    except CodeConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="code already exists",
        ) from exc
    request.app.state.metrics.links_created.inc()
    created = service.to_out(link)
    response.headers["Location"] = f"/v1/links/{created.code}"
    return created


@router.get("/v1/links", response_model=LinkList)
def list_links(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: LinkService = Depends(link_service),
) -> LinkList:
    require_token(request)
    rows, total = service.list_links(limit, offset)
    return LinkList(items=[service.to_out(row) for row in rows], count=total)


@router.get("/v1/links/{code}", response_model=LinkOut)
def get_link(
    request: Request,
    code: str = _CODE,
    service: LinkService = Depends(link_service),
) -> LinkOut:
    require_token(request)
    try:
        link = service.get_link(code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="link not found") from exc
    return service.to_out(link)


@router.delete("/v1/links/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    request: Request,
    code: str = _CODE,
    service: LinkService = Depends(link_service),
) -> None:
    require_token(request)
    try:
        service.delete_link(code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="link not found") from exc


@router.get("/{code}", status_code=status.HTTP_302_FOUND)
def redirect_link(
    request: Request,
    code: str = _CODE,
    service: LinkService = Depends(link_service),
) -> RedirectResponse:
    try:
        link = service.record_click(code)
    except LinkNotFoundError as exc:
        request.app.state.metrics.redirects.labels(result="miss").inc()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="link not found") from exc
    request.app.state.metrics.redirects.labels(result="hit").inc()
    return RedirectResponse(url=link.target_url, status_code=status.HTTP_302_FOUND)
