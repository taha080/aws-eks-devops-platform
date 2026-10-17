"""Short-code generation."""

import secrets
import string

ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
RESERVED = frozenset({"healthz", "readyz", "metrics", "docs", "redoc", "openapi"})


def generate_code(length: int = CODE_LENGTH) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def is_reserved(code: str) -> bool:
    return code.lower() in RESERVED
