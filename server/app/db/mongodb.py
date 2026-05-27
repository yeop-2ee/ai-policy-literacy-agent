from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.models.user import User
from app.models.policy import Policy
from app.models.bookmark import Bookmark
from app.models.conversation import Conversation


async def init_db():
    client = AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[User, Policy, Bookmark, Conversation],
    )
