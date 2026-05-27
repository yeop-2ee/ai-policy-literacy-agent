from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database (PostgreSQL)
    database_url: str = "postgresql+asyncpg://sangyeop@localhost/policy_agent"

    # Auth
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Local LLM (Ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:1b"

    # 공공 API
    mois_api_key: str = ""
    bokjiro_api_key: str = ""
    bokjiro_local_api_key: str = ""
    onyouth_api_key: str = ""

    @property
    def bokjiro_local_key(self) -> str:
        return self.bokjiro_local_api_key or self.bokjiro_api_key

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
