
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title=settings.GOOGLE_CLOUD_PROJECT)

# CORS configuration - allow from specific origins in production, all origins in dev
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ALLOWED_ORIGINS") else ["*"]
print(f"🌐 CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include router in startup event to avoid blocking imports
@app.on_event("startup")
def _startup_event():
    """
    Includes the sessions router after the application has successfully started.
    This prevents potential module-level blocking during import.
    """
    from app.api import sessions
    app.include_router(sessions.router)

@app.get("/")
async def root():
    return {"status": "The Qwiz App backend is running"}

if __name__ == "__main__":
    # Get port from Cloud Run environment variable, default to 8080 for local development
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)