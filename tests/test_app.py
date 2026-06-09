"""
Tests for the Mergington High School Activities API

These tests verify basic API behavior for GET, POST and DELETE endpoints.
"""

import copy
import uuid

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


@pytest.fixture(autouse=True)
def reset_activities():
    # Preserve original activities and restore after each test for idempotency
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


@pytest.fixture
def client():
    return TestClient(app)


def generate_unique_email():
    return f"test_{uuid.uuid4().hex[:12]}@test.mergington.edu"


def test_get_activities_returns_dict(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_adds_participant(client):
    activity = "Chess Club"
    email = generate_unique_email()
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]


def test_signup_duplicate_fails(client):
    activity = "Soccer Team"
    email = generate_unique_email()
    r1 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r1.status_code == 200
    r2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r2.status_code == 400


def test_unregister_removes_participant(client):
    activity = "Basketball Club"
    email = generate_unique_email()
    r1 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r1.status_code == 200
    r2 = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert r2.status_code == 200
    assert email not in activities[activity]["participants"]


def test_unregister_nonexistent_participant_fails(client):
    activity = "Art Studio"
    email = generate_unique_email()
    r = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 404

