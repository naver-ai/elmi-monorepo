import re


def spinalcase(text: str) -> str:
    return re.sub(r"\s+", "-", text).lower()