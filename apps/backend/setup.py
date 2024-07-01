from os import path, getcwd, getenv
from dotenv import find_dotenv, set_key, load_dotenv
import questionary

from backend.utils import env_helper
from backend.utils.cli import make_non_empty_string_validator



if __name__ == "__main__":
    print("Setting up backend...")

    env_file = find_dotenv()

    if not path.exists(env_file):
        env_file = open(path.join(getcwd(), '.env'), 'w')
        env_file.close()
        env_file = find_dotenv()
    
    
    if env_helper.get_env_variable(env_helper.EnvironmentVariables.APP_AUTH_SECRET) is None:
        auth_secret = questionary.text("Insert auth secret (Any random string):", default="Naver1784", validate=make_non_empty_string_validator("Put a string with length > 0.")).ask()
        set_key(env_file, env_helper.EnvironmentVariables.APP_AUTH_SECRET, auth_secret)


    if env_helper.get_env_variable(env_helper.EnvironmentVariables.OPENAI_API_KEY) is None:
        api_key = questionary.text("Insert OpenAI API Key:", validate=make_non_empty_string_validator("Put a string with length > 0.")).ask()
        set_key(env_file, env_helper.EnvironmentVariables.OPENAI_API_KEY, api_key)

    print("Setup complete.")