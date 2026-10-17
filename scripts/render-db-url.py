#!/usr/bin/env python3
"""Read an RDS-managed secret from stdin and write a SQLAlchemy URL to stdout."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app" / "src"))

from linkforge.secrets_loader import database_url_from_rds_secret


def main() -> None:
    sys.stdout.write(database_url_from_rds_secret(json.load(sys.stdin)))


if __name__ == "__main__":
    main()
