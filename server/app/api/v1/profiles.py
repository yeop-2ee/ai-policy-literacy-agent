from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.profile import Profile
from app.services.recommendation_service import invalidate_recommendation_cache

router = APIRouter()


class ProfileRequest(BaseModel):
    name: Optional[str] = None
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
    marital_status: Optional[str] = None
    military_status: Optional[str] = None


def _sync_profile_to_user(user: User, profile: Profile):
    user.birth_date = profile.birth_date
    user.age = profile.age
    user.gender = profile.gender
    user.region = profile.region
    user.district = profile.district
    user.employment_status = profile.employment_status
    user.disability = profile.disability
    user.multicultural = profile.multicultural
    user.interests = profile.interests
    user.household_income = profile.household_income
    user.children_count = profile.children_count
    user.children_ages = profile.children_ages
    user.is_pregnant = profile.is_pregnant
    user.is_single_parent = profile.is_single_parent
    user.marital_status = profile.marital_status
    user.military_status = profile.military_status


@router.get("/")
async def list_profiles(current_user: User = Depends(get_current_user)):
    return {
        "profiles": [p.model_dump() for p in current_user.profiles],
        "active_id": current_user.active_profile_id,
    }


@router.post("/")
async def create_profile(
    body: ProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = body.name or f"프로필 {len(current_user.profiles) + 1}"
    profile = Profile(
        name=name,
        birth_date=body.birth_date,
        age=body.age,
        gender=body.gender,
        region=body.region,
        district=body.district,
        employment_status=body.employment_status,
        disability=body.disability,
        multicultural=body.multicultural,
        interests=body.interests,
        household_income=body.household_income,
        children_count=body.children_count,
        children_ages=body.children_ages,
        is_pregnant=body.is_pregnant,
        is_single_parent=body.is_single_parent,
        marital_status=body.marital_status,
        military_status=body.military_status,
    )
    profiles = list(current_user.profiles)
    profiles.append(profile)
    current_user.profiles = profiles

    if not current_user.active_profile_id:
        current_user.active_profile_id = profile.id
        _sync_profile_to_user(current_user, profile)

    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    invalidate_recommendation_cache(str(current_user.id))
    return profile.model_dump()


@router.put("/{profile_id}")
async def update_profile(
    profile_id: str,
    body: ProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profiles = list(current_user.profiles)
    for i, p in enumerate(profiles):
        if p.id == profile_id:
            updated = Profile(
                id=p.id,
                name=body.name or p.name,
                birth_date=body.birth_date,
                age=body.age,
                gender=body.gender,
                region=body.region,
                district=body.district,
                employment_status=body.employment_status,
                disability=body.disability,
                multicultural=body.multicultural,
                interests=body.interests,
                household_income=body.household_income,
                children_count=body.children_count,
                children_ages=body.children_ages,
                is_pregnant=body.is_pregnant,
                is_single_parent=body.is_single_parent,
                marital_status=body.marital_status,
                military_status=body.military_status,
            )
            profiles[i] = updated
            current_user.profiles = profiles

            if current_user.active_profile_id == profile_id:
                _sync_profile_to_user(current_user, updated)

            await db.commit()
            await db.refresh(current_user)
            invalidate_recommendation_cache(str(current_user.id))
            return updated.model_dump()

    raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.profiles = [p for p in current_user.profiles if p.id != profile_id]

    if not current_user.profiles:
        current_user.active_profile_id = None
        current_user.onboarding_completed = False
    elif current_user.active_profile_id == profile_id:
        current_user.active_profile_id = current_user.profiles[0].id
        _sync_profile_to_user(current_user, current_user.profiles[0])

    await db.commit()
    await db.refresh(current_user)
    invalidate_recommendation_cache(str(current_user.id))
    return {"message": "삭제됐습니다."}


@router.post("/{profile_id}/activate")
async def activate_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for p in current_user.profiles:
        if p.id == profile_id:
            current_user.active_profile_id = profile_id
            _sync_profile_to_user(current_user, p)
            await db.commit()
            await db.refresh(current_user)
            invalidate_recommendation_cache(str(current_user.id))
            return {"message": "활성화됐습니다."}

    raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
