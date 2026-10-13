from fastapi.testclient import TestClient

from .conftest import iso_in


def test_adding_a_discussion_with_follow_up_updates_the_lead_and_list(client: TestClient, make_lead):
    lead = make_lead()
    follow_up = iso_in(days=1)

    response = client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"body": "Sent pricing tier PDF.", "follow_up_at": follow_up},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["discussion"]["kind"] == "note"
    assert body["discussion"]["follow_up_at"] is not None
    assert body["lead"]["follow_up_at"] == body["discussion"]["follow_up_at"]
    assert body["lead"]["last_discussion"]["body"] == "Sent pricing tier PDF."

    listed = client.get("/api/leads").json()["items"][0]
    assert listed["follow_up_at"] == body["lead"]["follow_up_at"]
    assert listed["last_discussion"]["body"] == "Sent pricing tier PDF."


def test_timeline_is_reverse_chronological(client: TestClient, make_lead):
    lead = make_lead()
    for note in ["first", "second", "third"]:
        client.post(f"/api/leads/{lead['id']}/discussions", json={"body": note})

    timeline = [d["body"] for d in client.get(f"/api/leads/{lead['id']}").json()["discussions"]]
    assert timeline == ["third", "second", "first", "Lead created."]


def test_a_new_discussion_completes_the_previous_follow_up(client: TestClient, make_lead):
    lead = make_lead()
    client.post(f"/api/leads/{lead['id']}/discussions", json={"body": "Call back tomorrow", "follow_up_at": iso_in(days=1)})

    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"body": "Called back, all sorted."})

    assert response.json()["lead"]["follow_up_at"] is None
    timeline = client.get(f"/api/leads/{lead['id']}").json()["discussions"]
    assert timeline[1]["follow_up_at"] is not None  # history keeps what was scheduled


def test_follow_up_must_be_timezone_aware_and_not_in_the_past(client: TestClient, make_lead):
    lead = make_lead()
    url = f"/api/leads/{lead['id']}/discussions"

    past = client.post(url, json={"body": "x", "follow_up_at": iso_in(hours=-2)})
    naive = client.post(url, json={"body": "x", "follow_up_at": "2030-01-01T10:00:00"})
    just_now = client.post(url, json={"body": "x", "follow_up_at": iso_in(minutes=-1)})

    assert past.status_code == 422
    assert "future" in past.json()["detail"]
    assert naive.status_code == 422
    assert just_now.status_code == 201


def test_discussion_needs_a_body(client: TestClient, make_lead):
    lead = make_lead()
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"body": "   "})
    assert response.status_code == 422
    assert response.json()["detail"].startswith("body:")


def test_follow_up_can_be_cleared_with_patch(client: TestClient, make_lead):
    lead = make_lead()
    client.post(f"/api/leads/{lead['id']}/discussions", json={"body": "x", "follow_up_at": iso_in(days=2)})

    response = client.patch(f"/api/leads/{lead['id']}", json={"follow_up_at": None})

    assert response.status_code == 200
    assert response.json()["follow_up_at"] is None
