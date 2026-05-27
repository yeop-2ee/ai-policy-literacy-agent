from typing import Optional
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # 온보딩 프로필
    birth_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    employment_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    disability: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    multicultural: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    interests: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # 가구 정보
    household_income: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    children_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    children_ages: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_pregnant: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_single_parent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    marital_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    military_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active_profile_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # 프로필 목록 — JSON으로 저장 (List[Profile] 직렬화)
    _profiles_json: Mapped[list] = mapped_column("profiles", JSON, default=list, nullable=False)

    @property
    def profiles(self):
        from app.models.profile import Profile
        return [Profile(**p) if isinstance(p, dict) else p for p in (self._profiles_json or [])]

    @profiles.setter
    def profiles(self, value):
        self._profiles_json = [
            p.model_dump() if hasattr(p, "model_dump") else (p if isinstance(p, dict) else dict(p))
            for p in (value or [])
        ]
