"""Build a database URL from an RDS-managed Secrets Manager payload."""

import json
from urllib.parse import quote_plus


def database_url_from_rds_secret(payload: dict) -> str:
    """Turn the JSON object RDS stores for a managed master password into a URL."""

    try:
        username = payload["username"]
        password = payload["password"]
        host = payload["host"]
    except KeyError as exc:
        raise ValueError(f"RDS secret is missing {exc.args[0]}") from exc

    port = payload.get("port", 5432)
    dbname = payload.get("dbname") or payload.get("dbName") or "linkforge"
    user = quote_plus(str(username))
    secret = quote_plus(str(password))
    return f"postgresql+psycopg://{user}:{secret}@{host}:{port}/{dbname}"


def database_url_from_secret_arn(secret_arn: str, region: str | None = None) -> str:
    """Fetch a secret with the default AWS credential chain (IRSA on EKS)."""

    import boto3

    if region:
        client = boto3.client("secretsmanager", region_name=region)
    else:
        client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_arn)
    raw = response.get("SecretString")
    if not raw:
        raise ValueError("RDS secret has no SecretString")
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("RDS secret JSON must be an object")
    return database_url_from_rds_secret(payload)
