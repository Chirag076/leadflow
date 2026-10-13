"""Queries and state changes for leads, kept out of the HTTP layer."""

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, aliased

from .database import utcnow
from .models import Discussion, DiscussionKind, Lead, LeadStatus
from .schemas import DiscussionCreate, DiscussionOut, LeadCreate, LeadSummary, LeadUpdate


def _latest_discussion_subquery():
    """One row per lead: its latest note, or its latest event if it has no notes yet.

    A window function picks the row in the same query as the leads, so the list is a
    single round trip however many leads there are (no N+1).
    """
    prefer_notes = case((Discussion.kind == DiscussionKind.NOTE, 0), else_=1)
    rank = (
        func.row_number()
        .over(
            partition_by=Discussion.lead_id,
            order_by=(prefer_notes, Discussion.created_at.desc(), Discussion.id.desc()),
        )
        .label("rank")
    )
    return select(Discussion, rank).subquery()


def _summaries(db: Session, *, status: LeadStatus | None = None, q: str | None = None) -> list[LeadSummary]:
    latest = _latest_discussion_subquery()
    last = aliased(Discussion, latest)
    last_activity = func.coalesce(latest.c.created_at, Lead.created_at)

    stmt = (
        select(Lead, last)
        .outerjoin(latest, (latest.c.lead_id == Lead.id) & (latest.c.rank == 1))
        .order_by(last_activity.desc(), Lead.id.desc())
    )
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    if q:
        stmt = stmt.where(Lead.name.icontains(q, autoescape=True) | Lead.company.icontains(q, autoescape=True))

    return [_to_summary(lead, discussion) for lead, discussion in db.execute(stmt).all()]


def _to_summary(lead: Lead, last: Discussion | None) -> LeadSummary:
    return LeadSummary(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=lead.status,
        follow_up_at=lead.follow_up_at,
        created_at=lead.created_at,
        last_discussion=DiscussionOut.model_validate(last) if last else None,
        last_activity_at=last.created_at if last else lead.created_at,
    )


def list_leads(db: Session, *, status: LeadStatus | None, q: str | None) -> tuple[list[LeadSummary], dict[str, int]]:
    items = _summaries(db, status=status, q=q)

    count_stmt = select(Lead.status, func.count()).group_by(Lead.status)
    if q:
        count_stmt = count_stmt.where(Lead.name.icontains(q, autoescape=True) | Lead.company.icontains(q, autoescape=True))
    by_status = {row[0].value: row[1] for row in db.execute(count_stmt).all()}
    counts = {"all": sum(by_status.values())} | {s.value: by_status.get(s.value, 0) for s in LeadStatus}
    return items, counts


def get_lead(db: Session, lead_id: int) -> Lead | None:
    return db.get(Lead, lead_id)


def summary_for(db: Session, lead: Lead) -> LeadSummary:
    latest = _latest_discussion_subquery()
    last = aliased(Discussion, latest)
    row = db.execute(select(last).where(latest.c.lead_id == lead.id, latest.c.rank == 1)).scalar_one_or_none()
    return _to_summary(lead, row)


def create_lead(db: Session, data: LeadCreate) -> Lead:
    lead = Lead(name=data.name, company=data.company, phone=data.phone, status=data.status)
    lead.discussions.append(Discussion(kind=DiscussionKind.EVENT, body="Lead created."))
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, lead: Lead, data: LeadUpdate) -> Lead:
    changes = data.model_dump(exclude_unset=True)
    new_status = changes.pop("status", None)

    for field, value in changes.items():
        setattr(lead, field, value)

    if new_status is not None and new_status != lead.status:
        lead.discussions.append(
            Discussion(kind=DiscussionKind.EVENT, body=f"Status changed from {lead.status.label} to {new_status.label}.")
        )
        lead.status = new_status

    lead.updated_at = utcnow()
    db.commit()
    db.refresh(lead)
    return lead


def add_discussion(db: Session, lead: Lead, data: DiscussionCreate) -> Discussion:
    """Log a discussion. Its follow-up (or none) replaces the lead's current one:
    talking to the lead completes whatever follow-up was pending."""
    discussion = Discussion(kind=DiscussionKind.NOTE, body=data.body, follow_up_at=data.follow_up_at)
    lead.discussions.append(discussion)
    lead.follow_up_at = data.follow_up_at
    lead.updated_at = utcnow()
    db.commit()
    db.refresh(discussion)
    db.refresh(lead)
    return discussion
