from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.profile import Profile
from app.services.recommendation_service import invalidate_recommendation_cache

router = APIRouter()


class OnboardingRequest(BaseModel):
    birth_date: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    employment_status: Optional[str] = None
    household_income: Optional[str] = None
    disability: bool = False
    multicultural: bool = False
    interests: list[str] = []
    children_count: Optional[int] = None
    children_ages: list[int] = []
    is_pregnant: bool = False
    is_single_parent: bool = False
    marital_status: Optional[str] = None
    military_status: Optional[str] = None


@router.post("/onboarding")
async def save_onboarding(
    body: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.birth_date = body.birth_date
    current_user.age = body.age
    current_user.gender = body.gender
    current_user.region = body.region
    current_user.district = body.district
    current_user.employment_status = body.employment_status
    current_user.household_income = body.household_income
    current_user.children_count = body.children_count
    current_user.children_ages = body.children_ages
    current_user.is_pregnant = body.is_pregnant
    current_user.is_single_parent = body.is_single_parent
    current_user.disability = body.disability
    current_user.multicultural = body.multicultural
    current_user.interests = body.interests
    current_user.marital_status = body.marital_status
    current_user.military_status = body.military_status
    current_user.onboarding_completed = True

    if not current_user.profiles:
        default_profile = Profile(
            name="내 프로필",
            birth_date=body.birth_date,
            age=body.age,
            gender=body.gender,
            region=body.region,
            district=body.district,
            employment_status=body.employment_status,
            household_income=body.household_income,
            children_count=body.children_count,
            children_ages=body.children_ages,
            is_pregnant=body.is_pregnant,
            is_single_parent=body.is_single_parent,
            disability=body.disability,
            multicultural=body.multicultural,
            interests=body.interests,
            marital_status=body.marital_status,
            military_status=body.military_status,
        )
        current_user.profiles = [default_profile]
        current_user.active_profile_id = default_profile.id
    else:
        profiles = list(current_user.profiles)
        for i, p in enumerate(profiles):
            if p.id == current_user.active_profile_id:
                profiles[i] = Profile(
                    id=p.id,
                    name=p.name,
                    birth_date=body.birth_date,
                    age=body.age,
                    gender=body.gender,
                    region=body.region,
                    district=body.district,
                    employment_status=body.employment_status,
                    household_income=body.household_income,
                    children_count=body.children_count,
                    children_ages=body.children_ages,
                    is_pregnant=body.is_pregnant,
                    is_single_parent=body.is_single_parent,
                    disability=body.disability,
                    multicultural=body.multicultural,
                    interests=body.interests,
                    marital_status=body.marital_status,
                    military_status=body.military_status,
                )
                break
        current_user.profiles = profiles

    await db.commit()
    await db.refresh(current_user)
    invalidate_recommendation_cache(str(current_user.id))
    return {"message": "온보딩 완료", "user_id": str(current_user.id)}


@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "birth_date": current_user.birth_date,
        "age": current_user.age,
        "gender": current_user.gender,
        "region": current_user.region,
        "district": current_user.district,
        "employment_status": current_user.employment_status,
        "disability": current_user.disability,
        "multicultural": current_user.multicultural,
        "interests": current_user.interests,
        "household_income": current_user.household_income,
        "children_count": current_user.children_count,
        "children_ages": current_user.children_ages,
        "is_pregnant": current_user.is_pregnant,
        "is_single_parent": current_user.is_single_parent,
        "marital_status": current_user.marital_status,
        "military_status": current_user.military_status,
        "onboarding_completed": current_user.onboarding_completed,
        "profiles": [p.model_dump() for p in current_user.profiles],
        "active_profile_id": current_user.active_profile_id,
        "created_at": current_user.created_at,
    }
