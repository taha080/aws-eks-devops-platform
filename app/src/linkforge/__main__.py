"""`python -m linkforge` entrypoint."""

import uvicorn

from linkforge.config import get_settings
from linkforge.logconfig import configure_logging


def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    uvicorn.run(
        "linkforge.main:app",
        host=settings.host,
        port=settings.port,
        log_config=None,
        access_log=False,
    )


if __name__ == "__main__":
    main()
