from fastapi.testclient import TestClient
from app.main import app, users_db  # Corrected import to users_db

client = TestClient(app)


# Clean up users_db before each test
def setup_function():
    users_db.clear()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "message": "QynAuth API is running!",
    }  # Corrected assertion to match app.main.py


def test_register_user_success():
    response = client.post(
        "/auth/register", json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"
    assert "testuser" in users_db  # Check that user is added to the in-memory db


def test_register_user_conflict():
    client.post(
        "/auth/register", json={"username": "existinguser", "password": "password123"}
    )
    response = client.post(
        "/auth/register", json={"username": "existinguser", "password": "newpassword"}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Username already registered"


def test_login_success():
    client.post(
        "/auth/register", json={"username": "loginuser", "password": "loginpassword"}
    )
    response = client.post(
        "/auth/login", json={"username": "loginuser", "password": "loginpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_incorrect_password():
    client.post(
        "/auth/register",
        json={"username": "wrongpassuser", "password": "correctpassword"},
    )
    response = client.post(
        "/auth/login",
        json={"username": "wrongpassuser", "password": "incorrectpassword"},
    )
    assert response.status_code == 401
    assert (
        response.json()["detail"] == "Invalid credentials"
    )  # Corrected assertion to match app.main.py


def test_login_nonexistent_user():
    response = client.post(
        "/auth/login", json={"username": "nonexistentuser", "password": "anypassword"}
    )
    assert response.status_code == 401
    assert (
        response.json()["detail"] == "Invalid credentials"
    )  # Corrected assertion to match app.main.py
