from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..models import Lead, LeadStatus
from ..schemas import DiscussionCreate, DiscussionCreated, DiscussionOut, LeadCreate, LeadDetail, LeadListOut, LeadUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])

DB = Annotated[Session, Depends(get_db)]


def _lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = services.get_lead(db, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Lead {lead_id} not found")
    return lead


def _detail(db: Session, lead: Lead) -> LeadDetail:
    summary = services.summary_for(db, lead)
    return LeadDetail(
        **summary.model_dump(),
        discussions=[DiscussionOut.model_validate(d) for d in lead.discussions],
    )


@router.get("", response_model=LeadListOut)
def list_leads(
    db: DB,
    status_filter: Annotated[LeadStatus | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=120, description="Case-insensitive match on name or company")] = None,
) -> LeadListOut:
    items, counts = services.list_leads(db, status=status_filter, q=(q or "").strip() or None)
    return LeadListOut(items=items, counts=counts)


@router.post("", response_model=LeadDetail, status_code=status.HTTP_201_CREATED)
def create_lead(data: LeadCreate, db: DB, response: Response) -> LeadDetail:
    lead = services.create_lead(db, data)
    response.headers["Location"] = f"/api/leads/{lead.id}"
    return _detail(db, lead)


@router.get("/{lead_id}", response_model=LeadDetail)
def get_lead(lead_id: int, db: DB) -> LeadDetail:
    return _detail(db, _lead_or_404(db, lead_id))


@router.patch("/{lead_id}", response_model=LeadDetail)
def update_lead(lead_id: int, data: LeadUpdate, db: DB) -> LeadDetail:
    if not data.model_fields_set:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nothing to update")
    lead = services.update_lead(db, _lead_or_404(db, lead_id), data)
    return _detail(db, lead)


@router.post("/{lead_id}/discussions", response_model=DiscussionCreated, status_code=status.HTTP_201_CREATED)
def add_discussion(lead_id: int, data: DiscussionCreate, db: DB) -> DiscussionCreated:
    lead = _lead_or_404(db, lead_id)
    discussion = services.add_discussion(db, lead, data)
    return DiscussionCreated(
        discussion=DiscussionOut.model_validate(discussion),
        lead=services.summary_for(db, lead),
    )
