import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .github_client import GitHubError
from .routes import router

log = logging.getLogger("reanimate")
app = FastAPI(title="Reanimate", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins, allow_methods=["GET", "POST"], allow_headers=["*"], expose_headers=["Retry-After"])
app.include_router(router)


@app.exception_handler(GitHubError)
async def github_error(_: Request, exc: GitHubError) -> JSONResponse:
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
    return JSONResponse({"error": {"code": exc.code, "message": exc.message}}, status_code=exc.status, headers=headers)


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse({"error": {"code": "internal_error", "message": "Something went wrong while analyzing the repository."}}, status_code=500)
