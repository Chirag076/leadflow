import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base, UTCDateTime, utcnow


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"

    @property
    def label(self) -> str:
        return self.value.replace("_", " ").capitalize()


class DiscussionKind(str, enum.Enum):
    NOTE = "note"  # something a rep wrote
    EVENT = "event"  # something the system recorded (lead created, status changed)


def _enum(cls: type[enum.Enum]) -> Enum:
    # Store the readable value ("proposal_sent"), not the member name, as a plain string column.
    return Enum(cls, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[LeadStatus] = mapped_column(_enum(LeadStatus), default=LeadStatus.NEW, index=True)
    follow_up_at: Mapped[datetime | None] = mapped_column(UTCDateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    discussions: Mapped[list["Discussion"]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="(Discussion.created_at.desc(), Discussion.id.desc())",
    )


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    kind: Mapped[DiscussionKind] = mapped_column(_enum(DiscussionKind), default=DiscussionKind.NOTE)
    body: Mapped[str] = mapped_column(Text)
    # The follow-up this note scheduled, kept for the timeline even after it is done.
    follow_up_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)

    lead: Mapped[Lead] = relationship(back_populates="discussions")
