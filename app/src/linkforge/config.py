"""Runtime configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict

# Public GitHub Pages origin. Always sent as an allowed CORS origin.
PAGES_ORIGIN = "https://taha080.github.io"


class Settings(BaseSettings):
    """Process configuration.

    Every field maps to an environment variable with the ``LINKFORGE_`` prefix.
    ``LINKFORGE_DATABASE_URL`` wins when it is set. Otherwise, if
    ``LINKFORGE_DB_SECRET_ARN`` is set, the process loads an RDS-managed secret
    through IRSA. With neither set, the service uses a local SQLite file.
    """

    model_config = SettingsConfigDict(
        env_prefix="LINKFORGE_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "linkforge"
    environment: str = "local"
    log_level: str = "INFO"
    host: str = "127.0.0.1"
    port: int = 8000
    base_url: str = "http://127.0.0.1:8000"
    database_url: str = ""
    db_secret_arn: str = ""
    aws_region: str = ""
    api_token: str = ""
    # Extra comma-separated origins. PAGES_ORIGIN is always allowed in addition.
    cors_origins: str = PAGES_ORIGIN


def get_settings() -> Settings:
    return Settings()
