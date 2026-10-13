from datetime import datetime, timedelta, timezone
from typing import Annotated

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, StringConstraints, field_validator

from .models import DiscussionKind, LeadStatus

# A follow-up may be "now-ish" (the rep picks the current minute), but not in the past.
FOLLOW_UP_GRACE = timedelta(minutes=5)

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
NoteBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


OptionalText = Annotated[Annotated[str, StringConstraints(max_length=120)] | None, AfterValidator(_blank_to_none)]
OptionalPhone = Annotated[Annotated[str, StringConstraints(max_length=40)] | None, AfterValidator(_blank_to_none)]


def _future_follow_up(value: datetime | None) -> datetime | None:
    if value is not None and value < datetime.now(timezone.utc) - FOLLOW_UP_GRACE:
        raise ValueError("follow-up must be in the future")
    return value


FollowUp = Annotated[AwareDatetime | None, AfterValidator(_future_follow_up)]


# ---------- requests ----------


class LeadCreate(BaseModel):
    name: Name
    company: OptionalText = None
    phone: OptionalPhone = None
    status: LeadStatus = LeadStatus.NEW

    @field_validator("phone")
    @classmethod
    def _phone_chars(cls, value: str | None) -> str | None:
        if value is not None and not all(ch.isdigit() or ch in " +-()." for ch in value):
            raise ValueError("phone may only contain digits, spaces and + - ( ) .")
        return value


class LeadUpdate(BaseModel):
    """Partial update. Only the fields sent are changed; send follow_up_at: null to clear it."""

    name: Name | None = None
    company: OptionalText = None
    phone: OptionalPhone = None
    status: LeadStatus | None = None
    follow_up_at: FollowUp = None


class DiscussionCreate(BaseModel):
    body: NoteBody
    follow_up_at: FollowUp = None


# ---------- responses ----------


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: DiscussionKind
    body: str
    follow_up_at: datetime | None
    created_at: datetime


class LeadSummary(BaseModel):
    """What the list needs: the lead plus its most recent discussion."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    follow_up_at: datetime | None
    created_at: datetime
    last_discussion: DiscussionOut | None
    last_activity_at: datetime


class LeadDetail(LeadSummary):
    discussions: list[DiscussionOut]


class LeadListOut(BaseModel):
    items: list[LeadSummary]
    # Leads per status for the current search (ignores the status filter), plus "all".
    counts: dict[str, int]


class DiscussionCreated(BaseModel):
    discussion: DiscussionOut
    lead: LeadSummary
