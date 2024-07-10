from contextlib import asynccontextmanager
from os import getcwd, path
from time import perf_counter

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from backend.router.app import router as app_router
from re import compile

@asynccontextmanager
async def server_lifespan(app: FastAPI):
    print("Server launched.")
    # await create_db_and_tables(engine)
    #await create_test_dyad()
    #await create_test_freetopics()

    yield

    # Cleanup logic will come below.

app = FastAPI(lifespan=server_lifespan)

# Setup routers
app.include_router(
    app_router,
    prefix="/api/v1/app"
)

@app.head("/api/v1/ping")
def ping():
    return Response(status_code=status.HTTP_204_NO_CONTENT)

##############

asset_path_regex = compile("\.[a-z][a-z0-9]+$")

static_frontend_path = path.join(getcwd(), "../../dist/apps/elmi-web")
if path.exists(static_frontend_path):
    @app.get("/{rest_of_path:path}", response_class=HTMLResponse)
    def redirect_frontend_nested_url(*, rest_of_path: str):

        if len(asset_path_regex.findall(rest_of_path)) > 0:
            # This is a static asset file path.
            return FileResponse(path.join(static_frontend_path, rest_of_path))
        else:
            return HTMLResponse(
                status_code=200,
                content=open(path.join(static_frontend_path, "index.html")).read()
            )


    app.mount("/", StaticFiles(directory=static_frontend_path, html=True), name="static")
    print("Compiled static frontend file path was found. Mount the file.")

##############

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    # or logger.error(f'{exc}')
    print(request, exc_str)
    content = {'status_code': 10422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

# Setup middlewares
origins = [
    "http://localhost:3000",
    "localhost:3000",
    "0.0.0.0:3000",
    "http://0.0.0.0:3000",
    "localhost:4200",
    "http://localhost:4200",
    "http://localhost:8000",
    "localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-processing-time", "X-request-id", "X-context-id"]
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = perf_counter()
    response = await call_next(request)
    end = perf_counter()
    response.headers["X-processing-time"] = str(end - start)
    return response


@app.middleware("http")
async def pass_request_ids_header(request: Request, call_next):
    response = await call_next(request)

    if "X-request-id" in request.headers:
        response.headers["X-request-id"] = request.headers["x-request-id"]

    if "X-context-id" in request.headers:
        response.headers["X-context-id"] = request.headers["x-context-id"]

    return response