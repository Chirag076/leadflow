"""Fill the database with sample leads and discussions.

    python -m app.seed              # add the sample data
    python -m app.seed --reset      # wipe everything first
    python -m app.seed --if-empty   # only seed a fresh database (used by Docker)

Times are relative to now, so there is always a follow-up due today, one overdue
and one coming up, whatever day you run it. "Yesterday at 4 PM" and similar are
computed in SEED_TIMEZONE (default: this machine's timezone).
"""

import argparse
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from .database import Base, SessionLocal, engine
from .models import Discussion, DiscussionKind, Lead, LeadStatus


@dataclass
class Entry:
    at: datetime
    body: str
    kind: DiscussionKind = DiscussionKind.NOTE
    follow_up_at: datetime | None = None


@dataclass
class Sample:
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    created: datetime
    entries: list[Entry] = field(default_factory=list)


def _local_tz():
    name = os.environ.get("SEED_TIMEZONE")
    return ZoneInfo(name) if name else datetime.now().astimezone().tzinfo


def _quarter_hour(dt: datetime) -> datetime:
    return dt.replace(minute=dt.minute - dt.minute % 15, second=0, microsecond=0)


def build_samples(now: datetime) -> list[Sample]:
    def days_ago(days: int, hour: int, minute: int = 0) -> datetime:
        return (now - timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)

    def at_day(days: int, hour: int, minute: int = 0) -> datetime:
        return (now + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)

    later_today = _quarter_hour(now + timedelta(minutes=90))
    earlier_today = _quarter_hour(now - timedelta(minutes=45))
    created = lambda d, h, m=0: days_ago(d, h, m)  # noqa: E731

    return [
        Sample(
            "Sarah Connor", "Acme Corp", "555-0199", LeadStatus.PROPOSAL_SENT, created(6, 16),
            [
                Entry(created(6, 16), "Lead created via web form.", DiscussionKind.EVENT),
                Entry(days_ago(5, 9), "Initial discovery call. They need a CRM for 50 reps. Pain points include "
                      "dropping leads and no follow-up tracking."),
                Entry(days_ago(5, 9, 5), "Status changed from New to Qualified.", DiscussionKind.EVENT),
                Entry(days_ago(2, 10, 30), "Sent pricing tier PDF. Said she would review with her boss.",
                      follow_up_at=later_today),
                Entry(days_ago(2, 10, 31), "Status changed from Qualified to Proposal sent.", DiscussionKind.EVENT),
            ],
        ),
        Sample(
            "Arjun Mehta", "Northwind Advisors", "+91 98100 22113", LeadStatus.QUALIFIED, created(9, 11),
            [
                Entry(created(9, 11), "Lead created from referral (Priya Sharma).", DiscussionKind.EVENT),
                Entry(days_ago(8, 15), "Intro call. Runs a 12-advisor practice; wants client review reminders."),
                Entry(days_ago(1, 12), "Demo went well. Needs a security questionnaire before the partners meet.",
                      follow_up_at=earlier_today),
            ],
        ),
        Sample(
            "Hank Scorpio", "Globex", "555-0142", LeadStatus.NEW, now - timedelta(hours=2),
            [Entry(now - timedelta(hours=2), "Inbound lead from website contact form.")],
        ),
        Sample(
            "Bill Lumbergh", "Initech", "555-0123", LeadStatus.CONTACTED, created(14, 10),
            [
                Entry(created(14, 10), "Lead created at the fintech meetup.", DiscussionKind.EVENT),
                Entry(days_ago(7, 11), "Left a voicemail with his assistant.", follow_up_at=days_ago(1, 16)),
            ],
        ),
        Sample(
            "Priya Sharma", "Zephyr Wealth", "+91 99300 41870", LeadStatus.CONTACTED, created(4, 14),
            [
                Entry(created(4, 14), "Lead created via web form.", DiscussionKind.EVENT),
                Entry(days_ago(3, 17), "Emailed the case study. Asked for a call slot next week.",
                      follow_up_at=at_day(3, 11)),
            ],
        ),
        Sample(
            "Bruce Wayne", "Wayne Enterprises", None, LeadStatus.WON, created(40, 10),
            [
                Entry(created(40, 10), "Lead created via web form.", DiscussionKind.EVENT),
                Entry(days_ago(30, 15), "Proposal accepted in principle; legal reviewing the MSA."),
                Entry(days_ago(21, 12), "Contract signed! Sending welcome package."),
            ],
        ),
        Sample(
            "Leena Kapoor", "Blue Peak Capital", "+91 98450 77002", LeadStatus.LOST, created(25, 9),
            [
                Entry(created(25, 9), "Lead created at the fintech meetup.", DiscussionKind.EVENT),
                Entry(days_ago(18, 16), "Pricing call. Budget is tight this quarter."),
                Entry(days_ago(10, 13), "Went with an in-house build. Check back in six months."),
            ],
        ),
    ]


def seed(*, reset: bool = False, if_empty: bool = False) -> int:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if if_empty and db.scalar(select(func.count()).select_from(Lead)):
            print("Database already has leads; skipping seed.")
            return 0

        now = datetime.now(_local_tz())
        samples = build_samples(now)
        for sample in samples:
            lead = Lead(
                name=sample.name,
                company=sample.company,
                phone=sample.phone,
                status=sample.status,
                created_at=sample.created,
                updated_at=max(e.at for e in sample.entries),
            )
            for entry in sample.entries:
                lead.discussions.append(
                    Discussion(kind=entry.kind, body=entry.body, follow_up_at=entry.follow_up_at, created_at=entry.at)
                )
            notes = [e for e in sample.entries if e.kind == DiscussionKind.NOTE]
            lead.follow_up_at = max(notes, key=lambda e: e.at).follow_up_at if notes else None
            db.add(lead)
        db.commit()

    total = sum(len(s.entries) for s in samples)
    print(f"Seeded {len(samples)} leads and {total} timeline entries.")
    return len(samples)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables first")
    parser.add_argument("--if-empty", action="store_true", help="do nothing if the database already has leads")
    args = parser.parse_args()
    seed(reset=args.reset, if_empty=args.if_empty)


if __name__ == "__main__":
    main()
