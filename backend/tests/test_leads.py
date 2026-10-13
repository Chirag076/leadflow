from fastapi.testclient import TestClient


def test_health(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_create_lead_defaults_to_new_and_records_creation(client: TestClient):
    response = client.post("/api/leads", json={"name": "  Sarah Connor ", "company": "Acme Corp", "phone": "555-0199"})

    assert response.status_code == 201
    assert response.headers["Location"] == f"/api/leads/{response.json()['id']}"
    lead = response.json()
    assert lead["name"] == "Sarah Connor"  # trimmed
    assert lead["status"] == "new"
    assert lead["follow_up_at"] is None
    assert [d["kind"] for d in lead["discussions"]] == ["event"]
    assert lead["last_discussion"]["body"] == "Lead created."


def test_company_and_phone_are_optional(client: TestClient):
    response = client.post("/api/leads", json={"name": "Hank Scorpio", "company": "  ", "phone": ""})
    assert response.status_code == 201
    assert response.json()["company"] is None
    assert response.json()["phone"] is None


def test_create_lead_requires_a_name(client: TestClient):
    missing = client.post("/api/leads", json={"company": "Acme"})
    blank = client.post("/api/leads", json={"name": "   "})

    assert missing.status_code == 422
    assert missing.json()["detail"].startswith("name:")
    assert blank.status_code == 422


def test_create_lead_rejects_junk_phone(client: TestClient):
    response = client.post("/api/leads", json={"name": "Bill", "phone": "call me maybe"})
    assert response.status_code == 422
    assert "phone" in response.json()["detail"]


def test_unknown_lead_is_404(client: TestClient):
    assert client.get("/api/leads/999").status_code == 404
    assert client.get("/api/leads/999").json() == {"detail": "Lead 999 not found"}
    assert client.patch("/api/leads/999", json={"status": "won"}).status_code == 404
    assert client.post("/api/leads/999/discussions", json={"body": "hi"}).status_code == 404


def test_list_shows_last_note_and_time_and_sorts_by_latest_activity(client: TestClient, make_lead):
    older = make_lead("Bill Lumbergh")
    newer = make_lead("Hank Scorpio")
    client.post(f"/api/leads/{older['id']}/discussions", json={"body": "Left a voicemail with his assistant."})

    items = client.get("/api/leads").json()["items"]

    assert [i["name"] for i in items] == ["Bill Lumbergh", "Hank Scorpio"]
    assert items[0]["last_discussion"]["body"] == "Left a voicemail with his assistant."
    assert items[0]["last_activity_at"] == items[0]["last_discussion"]["created_at"]
    assert items[1]["last_discussion"]["body"] == "Lead created."
    assert newer["id"] == items[1]["id"]


def test_last_note_prefers_a_real_note_over_a_status_event(client: TestClient, make_lead):
    lead = make_lead()
    client.post(f"/api/leads/{lead['id']}/discussions", json={"body": "Discovery call done."})
    client.patch(f"/api/leads/{lead['id']}", json={"status": "qualified"})

    item = client.get("/api/leads").json()["items"][0]
    assert item["last_discussion"]["body"] == "Discovery call done."


def test_filter_by_status_and_counts(client: TestClient, make_lead):
    make_lead("A")
    make_lead("B", status="contacted")
    make_lead("C", status="contacted")

    body = client.get("/api/leads", params={"status": "contacted"}).json()

    assert [i["name"] for i in body["items"]] == ["C", "B"]
    assert body["counts"]["all"] == 3
    assert body["counts"]["new"] == 1
    assert body["counts"]["contacted"] == 2
    assert body["counts"]["won"] == 0


def test_invalid_status_filter_is_422(client: TestClient):
    response = client.get("/api/leads", params={"status": "maybe"})
    assert response.status_code == 422
    assert response.json()["detail"].startswith("status:")


def test_search_matches_name_or_company_case_insensitively(client: TestClient, make_lead):
    make_lead("Sarah Connor", company="Acme Corp")
    make_lead("Bruce Wayne", company="Wayne Enterprises")
    make_lead("Diana 100% Prince")

    assert [i["name"] for i in client.get("/api/leads", params={"q": "sarah"}).json()["items"]] == ["Sarah Connor"]
    assert [i["name"] for i in client.get("/api/leads", params={"q": "WAYNE"}).json()["items"]] == ["Bruce Wayne"]
    # % is matched literally, not as a wildcard
    assert [i["name"] for i in client.get("/api/leads", params={"q": "100%"}).json()["items"]] == ["Diana 100% Prince"]
    assert client.get("/api/leads", params={"q": "sarah"}).json()["counts"]["all"] == 1


def test_status_update_persists_and_is_logged(client: TestClient, make_lead):
    lead = make_lead()

    response = client.patch(f"/api/leads/{lead['id']}", json={"status": "proposal_sent"})

    assert response.status_code == 200
    assert response.json()["status"] == "proposal_sent"
    assert response.json()["discussions"][0]["body"] == "Status changed from New to Proposal sent."
    assert client.get(f"/api/leads/{lead['id']}").json()["status"] == "proposal_sent"


def test_setting_the_same_status_does_not_log_an_event(client: TestClient, make_lead):
    lead = make_lead()
    response = client.patch(f"/api/leads/{lead['id']}", json={"status": "new"})
    assert len(response.json()["discussions"]) == 1


def test_patch_validation(client: TestClient, make_lead):
    lead = make_lead()
    assert client.patch(f"/api/leads/{lead['id']}", json={}).json() == {"detail": "Nothing to update"}
    assert client.patch(f"/api/leads/{lead['id']}", json={}).status_code == 422
    assert client.patch(f"/api/leads/{lead['id']}", json={"status": "archived"}).status_code == 422
