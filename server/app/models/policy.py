from typing import Optional
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    policy_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)

    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 분류
    lifecycle_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    service_field_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lifecycle_label: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    service_field_label: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)

    region: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    apply_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    apply_period: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # AI 생성 캐시
    easy_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    simplified_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
