from enum import StrEnum
from os import getcwd, getenv, path
import re

from dotenv import load_dotenv

class EnvironmentVariables(StrEnum):
    BACKEND_PORT="BACKEND_PORT"
    BACKEND_HOSTNAME="BACKEND_HOSTNAME"
    APP_AUTH_SECRET="AUTH_SECRET"
    OPENAI_API_KEY="OPENAI_API_KEY"
    GENIUS_ACCESS_TOKEN="GENIUS_ACCESS_TOKEN"
    EXAMPLE_SONG_GDRIVE_ID = "EXAMPLE_SONG_GDRIVE_ID"
    ADMIN_ID = "ADMIN_ID"
    ADMIN_HASHED_PW = "ADMIN_HASHED_PW"

def get_env_variable(key: str) -> str:
    env_path = path.join(getcwd(), ".env")
    if load_dotenv(env_path):
        if key == EnvironmentVariables.ADMIN_HASHED_PW:
            with open(env_path, 'r') as f:
                for line in f.readlines():
                    match = re.match(r"^ADMIN_HASHED_PW=(\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9\.\/]{53})$", line)
                    if match is not None:
                        return match.group(1)

        return getenv(key)
    else:
        raise ValueError("Could not load dotenv.")