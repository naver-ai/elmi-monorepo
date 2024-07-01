from enum import StrEnum
from os import getcwd, getenv, path

from dotenv import load_dotenv

class EnvironmentVariables(StrEnum):
    APP_AUTH_SECRET="AUTH_SECRET"
    OPENAI_API_KEY="OPENAI_API_KEY"

def get_env_variable(key: str) -> str:
    load_dotenv(path.join(getcwd(), ".env"))
    return getenv(key)