import uvicorn
from backend.utils.env_helper import get_env_variable, EnvironmentVariables

if __name__ == "__main__":
    uvicorn.run("server:app", 
                host=get_env_variable(EnvironmentVariables.BACKEND_HOSTNAME), 
                port=int(get_env_variable(EnvironmentVariables.BACKEND_PORT)), 
                reload=True)