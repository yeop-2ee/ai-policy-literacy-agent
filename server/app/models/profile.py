from typing import Optional
from pydantic import BaseModel, Field
from uuid import uuid4


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str                                   # "프로필 1", "프로필 2" 등
    birth_date: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    employment_status: Optional[str] = None
    disability: bool = False
    multicultural: bool = False
    interests: list[str] = []
    household_income: Optional[str] = None
    children_count: Optional[int] = None
    children_ages: list[int] = []
    is_pregnant: bool = False
    is_single_parent: bool = False
    marital_status: Optional[str] = None    # 미혼 / 기혼 / 이혼·사별
    military_status: Optional[str] = None   # 미필 / 현역 / 사회복무요원 / 군필 / 예비역 / 면제
