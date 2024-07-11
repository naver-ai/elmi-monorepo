from enum import StrEnum
from os import getcwd, getenv, path

from dotenv import load_dotenv

class EnvironmentVariables(StrEnum):
    BACKEND_PORT="BACKEND_PORT"
    BACKEND_HOSTNAME="BACKEND_HOSTNAME"
    APP_AUTH_SECRET="AUTH_SECRET"
    OPENAI_API_KEY="OPENAI_API_KEY"
    GENIUS_ACCESS_TOKEN="GENIUS_ACCESS_TOKEN"

def get_env_variable(key: str) -> str:
    load_dotenv(path.join(getcwd(), ".env"))
    return getenv(key)