"""API schemas."""

from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator


class LinkCreate(BaseModel):
    target_url: AnyHttpUrl
    code: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{3,32}$")

    @field_validator("target_url")
    @classmethod
    def limit_length(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        if len(str(value)) > 2048:
            raise ValueError("target_url must be at most 2048 characters")
        return value


class LinkOut(BaseModel):
    code: str
    target_url: str
    short_url: str
    clicks: int
    created_at: datetime


class LinkList(BaseModel):
    items: list[LinkOut]
    count: int
