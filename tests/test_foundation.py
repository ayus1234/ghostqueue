from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ghostqueue-api"
    assert data["version"] == settings.VERSION


def test_cors_settings():
    assert len(settings.CORS_ORIGINS) > 0
    assert "http://localhost:3000" in settings.CORS_ORIGINS


def test_demo_summary_endpoint():
    client = TestClient(app)
    response = client.get("/api/demo/summary")
    assert response.status_code == 200
    assert response.json()["status"] in ("dataset_pending", "ready")
