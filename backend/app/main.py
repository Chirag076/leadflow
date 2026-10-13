import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import get_settings
from .database import Base, engine
from .routers import leads

logger = logging.getLogger("leadflow")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Small app, one schema: create tables on boot. A real deployment would use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="LeadFlow API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


def _readable(error: dict) -> str:
    loc = list(error.get("loc", ()))
    if loc and loc[0] in ("body", "query", "path"):
        loc = loc[1:]  # drop where it came from, keep the field name (which may itself be "body")
    field = ".".join(str(part) for part in loc)
    message = error.get("msg", "invalid value").removeprefix("Value error, ")
    return f"{field}: {message}" if field else message


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """422 with one human-readable sentence in `detail`, and the full list in `errors`."""
    errors = exc.errors()
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": "; ".join(_readable(e) for e in errors), "errors": jsonable_encoder(errors)},
    )


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Something went wrong"})


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(leads.router)
