import os
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, build_engine, get_db
from app.main import app

# Runs on in-memory SQLite by default; set TEST_DATABASE_URL to run the same suite on Postgres.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if TEST_DATABASE_URL == "sqlite://":
        from sqlalchemy import create_engine

        engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    else:
        engine = build_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def iso_in(**delta) -> str:
    """An aware ISO timestamp relative to now, the way the browser sends it."""
    return (datetime.now(timezone.utc) + timedelta(**delta)).isoformat()


@pytest.fixture
def make_lead(client: TestClient):
    def _make(name: str = "Sarah Connor", **fields) -> dict:
        response = client.post("/api/leads", json={"name": name, **fields})
        assert response.status_code == 201, response.text
        return response.json()

    return _make
