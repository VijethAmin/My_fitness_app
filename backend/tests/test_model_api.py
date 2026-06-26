import os
import tempfile
import uuid

os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tempfile.gettempdir(), f'ai_fitness_test_{uuid.uuid4().hex}.db')}"

from fastapi.testclient import TestClient

from backend.model_api import ADMIN_EMAIL, ADMIN_PASSWORD, app

client = TestClient(app)


def test_admin_login_succeeds():
    response = client.post(
        "/login",
        json={"role": "admin", "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["role"] == "admin"
    assert payload["email"] == ADMIN_EMAIL


def test_admin_user_list_requires_header():
    response = client.get("/admin/users")
    assert response.status_code == 403


def test_user_signup_and_login():
    email = f"test.user.{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    name = "Test User"

    signup = client.post(
        "/signup",
        json={"name": name, "email": email, "password": password},
    )
    assert signup.status_code == 200
    assert signup.json()["email"] == email

    login = client.post(
        "/login",
        json={"role": "user", "email": email, "password": password},
    )
    assert login.status_code == 200
    assert login.json()["role"] == "user"
    assert login.json()["email"] == email
